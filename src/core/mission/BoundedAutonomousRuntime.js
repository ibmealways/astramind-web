import { randomUUID } from "node:crypto";

const TERMINAL = new Set(["completed", "failed", "cancelled", "timed_out"]);

function missionError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function validateResult(step, result) {
  const criteria = step.successCriteria;
  if (!criteria) return { valid: true };
  const research = result?.research || {};
  const counts = {
    minimum_sources: Array.isArray(research.sources) ? research.sources.length : 0,
    minimum_valid_sources: Number(research.validSourceCount || 0),
    minimum_citations: Array.isArray(research.citations) ? research.citations.length : 0,
  };
  const actual = counts[criteria.type];
  if (actual === undefined) return { valid: false, reason: `Unsupported success criterion: ${criteria.type}` };
  const minimum = Math.max(Number(criteria.minimum) || 1, 1);
  return actual >= minimum
    ? { valid: true, actual, minimum }
    : { valid: false, actual, minimum, reason: `${criteria.type} expected at least ${minimum}; received ${actual}.` };
}

export default class BoundedAutonomousRuntime {
  constructor({ executor, capabilityRouter, store, eventBus }) {
    this.executor = executor;
    this.capabilityRouter = capabilityRouter;
    this.store = store;
    this.eventBus = eventBus;
    this.active = new Map();
  }

  normalizePlan(plan, bounds) {
    if (!Array.isArray(plan) || !plan.length || plan.length > bounds.maxSteps) {
      throw missionError(`Autonomous plans must contain 1-${bounds.maxSteps} steps.`, "INVALID_AUTONOMOUS_PLAN");
    }
    const ids = new Set();
    return plan.map((step, index) => {
      if (!step?.capability || !step?.id || ids.has(step.id)) throw missionError(`Autonomous step ${index + 1} requires a unique id and capability.`, "INVALID_AUTONOMOUS_PLAN");
      if (!bounds.allowedCapabilities.includes(step.capability)) throw missionError(`Capability is outside this mission boundary: ${step.capability}`, "AUTONOMY_CAPABILITY_BLOCKED", 403);
      this.capabilityRouter.resolve(step.capability);
      ids.add(step.id);
      return { ...structuredClone(step), status: "pending", attempts: 0 };
    });
  }

  async start({ mission = "autonomous.mission", objective, input = {}, plan, bounds, user = {}, context = {}, preferences = {}, constraints = {}, metadata = {} } = {}) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const normalizedPlan = this.normalizePlan(plan, bounds);
    const record = {
      id,
      name: mission,
      capability: normalizedPlan[0].capability,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      input,
      plan: normalizedPlan,
      metadata,
      autonomy: {
        version: "bounded-autonomy-v1",
        objective,
        bounds,
        usage: { steps: 0, toolCalls: 0, providerQueries: 0, credits: 0, retries: 0, elapsedMs: 0 },
        nextStepIndex: 0,
        checkpoint: { nextStepIndex: 0, state: input, savedAt: createdAt },
        approval: null,
        user,
        context,
        preferences,
        constraints,
      },
    };
    this.store.create(record);
    this.eventBus?.publish("autonomy.mission.created", { missionId: id, objective, bounds });
    return this.run(id);
  }

  async approve(id, { userId, approvalId } = {}) {
    const record = this.store.get(id);
    if (!record || record.status !== "awaiting_approval") throw missionError("Pending autonomous mission approval not found.", "AUTONOMY_APPROVAL_NOT_FOUND", 404);
    if (record.metadata?.userId && record.metadata.userId !== userId) throw missionError("Mission approval does not belong to this creator.", "AUTONOMY_APPROVAL_NOT_FOUND", 404);
    if (!approvalId || record.autonomy?.approval?.id !== approvalId) throw missionError("The approval token is invalid or stale.", "AUTONOMY_APPROVAL_INVALID", 409);
    this.store.update(id, { autonomy: { ...record.autonomy, approval: { ...record.autonomy.approval, status: "approved", approvedAt: new Date().toISOString(), approvedBy: userId } } });
    this.eventBus?.publish("autonomy.mission.approved", { missionId: id, stepId: record.autonomy.approval.stepId, userId });
    return this.run(id);
  }

  async run(id) {
    let record = this.store.get(id);
    if (!record) throw missionError("Autonomous mission not found.", "AUTONOMY_MISSION_NOT_FOUND", 404);
    if (TERMINAL.has(record.status)) throw missionError(`Mission is already ${record.status}.`, "AUTONOMY_MISSION_TERMINAL", 409);
    if (this.active.has(id)) throw missionError("Mission is already running.", "AUTONOMY_MISSION_ACTIVE", 409);

    const controller = new AbortController();
    this.active.set(id, controller);
    const segmentStarted = Date.now();
    let segmentAccountedAt = segmentStarted;
    const remainingMs = Math.max(1, record.autonomy.bounds.timeoutMs - Number(record.autonomy.usage.elapsedMs || 0));
    const timer = setTimeout(() => controller.abort(missionError("Autonomous mission timed out.", "AUTONOMY_TIMEOUT", 408)), remainingMs);
    let state = record.autonomy.checkpoint?.state ?? record.input;
    const executions = Array.isArray(record.executions) ? [...record.executions] : [];
    let lastExecution = null;

    try {
      this.store.update(id, { status: "running", startedAt: record.startedAt || new Date().toISOString() });
      this.eventBus?.publish("autonomy.mission.running", { missionId: id, nextStepIndex: record.autonomy.nextStepIndex });
      for (let index = record.autonomy.nextStepIndex; index < record.plan.length; index++) {
        record = this.store.get(id);
        const step = record.plan[index];
        const usage = record.autonomy.usage;
        if (usage.toolCalls >= record.autonomy.bounds.maxToolCalls) throw missionError("Autonomous tool-call budget exhausted.", "AUTONOMY_TOOL_BUDGET_EXCEEDED", 409);
        if (usage.credits + Number(step.creditCost || 0) > record.autonomy.bounds.maxCredits) throw missionError("Autonomous credit budget exhausted.", "AUTONOMY_CREDIT_BUDGET_EXCEEDED", 402);

        const approval = record.autonomy.approval;
        const approvedForStep = approval?.stepId === step.id && approval.status === "approved";
        if (step.requiresApproval && !approvedForStep) {
          const pendingApproval = { id: randomUUID(), stepId: step.id, capability: step.capability, risk: step.risk || "guarded", status: "pending", requestedAt: new Date().toISOString() };
          const planUpdate = record.plan.map((item, itemIndex) => itemIndex === index ? { ...item, status: "awaiting_approval" } : item);
          const paused = this.store.update(id, { status: "awaiting_approval", plan: planUpdate, autonomy: { ...record.autonomy, approval: pendingApproval, nextStepIndex: index } });
          this.eventBus?.publish("autonomy.mission.awaiting_approval", { missionId: id, approval: pendingApproval });
          return { mission: paused, awaitingApproval: true, approval: pendingApproval, execution: null };
        }

        const route = this.capabilityRouter.resolve(step.capability);
        const runningPlan = record.plan.map((item, itemIndex) => itemIndex === index ? { ...item, status: "running", startedAt: new Date().toISOString() } : item);
        this.store.update(id, { plan: runningPlan });
        let attempt = 0;
        while (attempt <= record.autonomy.bounds.maxRetriesPerStep) {
          try {
            attempt += 1;
            lastExecution = await this.executor.execute({
              authority: route.authority,
              action: route.action,
              payload: { mission: record.name, input: step.input ?? state, previousResult: state, user: record.autonomy.user, context: record.autonomy.context, preferences: record.autonomy.preferences, constraints: record.autonomy.constraints },
              metadata: { ...record.metadata, autonomous: true, missionId: id, stepId: step.id, capability: step.capability, attempt },
              signal: controller.signal,
            });
            break;
          } catch (error) {
            if (controller.signal.aborted || error.retryable === false || attempt > record.autonomy.bounds.maxRetriesPerStep) throw error;
            const latest = this.store.get(id);
            this.store.update(id, { autonomy: { ...latest.autonomy, usage: { ...latest.autonomy.usage, retries: latest.autonomy.usage.retries + 1 } } });
            this.eventBus?.publish("autonomy.step.retry", { missionId: id, stepId: step.id, attempt, error: error.message });
          }
        }

        state = lastExecution.data;
        const providerQueries = Number(state?.research?.collection?.queryCount || 0);
        if (providerQueries > record.autonomy.bounds.maxProviderQueries) throw missionError("Autonomous provider-query budget exhausted.", "AUTONOMY_PROVIDER_BUDGET_EXCEEDED", 409);
        const validation = validateResult(step, state);
        if (!validation.valid) throw missionError(validation.reason, "AUTONOMY_VALIDATION_FAILED", 422);
        const latest = this.store.get(id);
        const completedAt = new Date().toISOString();
        const completedPlan = latest.plan.map((item, itemIndex) => itemIndex === index ? { ...item, status: "completed", attempts: attempt, executionId: lastExecution.requestId, validation, completedAt } : item);
        const stepElapsedMs = Date.now() - segmentAccountedAt;
        segmentAccountedAt = Date.now();
        const nextUsage = {
          ...latest.autonomy.usage,
          steps: latest.autonomy.usage.steps + 1,
          toolCalls: latest.autonomy.usage.toolCalls + 1,
          providerQueries: Math.max(latest.autonomy.usage.providerQueries || 0, providerQueries),
          credits: latest.autonomy.usage.credits + Number(step.creditCost || 0),
          elapsedMs: latest.autonomy.usage.elapsedMs + stepElapsedMs,
        };
        const checkpoint = { nextStepIndex: index + 1, completedStepId: step.id, state, savedAt: completedAt };
        executions.push({ stepId: step.id, capability: step.capability, executionId: lastExecution.requestId, attempt, validation });
        this.store.update(id, { plan: completedPlan, executions, autonomy: { ...latest.autonomy, usage: nextUsage, nextStepIndex: index + 1, checkpoint, approval: null } });
        this.eventBus?.publish("autonomy.step.completed", { missionId: id, stepId: step.id, usage: nextUsage });
      }

      const latest = this.store.get(id);
      const completed = this.store.update(id, { status: "completed", completedAt: new Date().toISOString(), result: state, executions, autonomy: { ...latest.autonomy, checkpoint: { ...latest.autonomy.checkpoint, state, nextStepIndex: latest.plan.length, savedAt: new Date().toISOString() } } });
      this.eventBus?.publish("autonomy.mission.completed", { missionId: id, usage: completed.autonomy.usage });
      return { mission: completed, awaitingApproval: false, execution: { ...lastExecution, data: state, executions } };
    } catch (error) {
      const latest = this.store.get(id);
      const timedOut = controller.signal.aborted && (controller.signal.reason?.code === "AUTONOMY_TIMEOUT" || controller.signal.reason?.message?.includes("timed out"));
      const paused = controller.signal.aborted && controller.signal.reason?.code === "AUTONOMY_PAUSED";
      const cancelled = controller.signal.aborted && !timedOut && !paused;
      const status = timedOut ? "timed_out" : paused ? "paused" : cancelled ? "cancelled" : "failed";
      const planUpdate = latest.plan.map((step) => step.status === "running"
        ? paused ? { ...step, status: "pending", pausedAt: new Date().toISOString() } : { ...step, status, error: error.message, completedAt: new Date().toISOString() }
        : step);
      this.store.update(id, {
        status,
        plan: planUpdate,
        ...(paused ? { pausedAt: new Date().toISOString(), error: null } : { completedAt: new Date().toISOString(), error: { code: error.code || "AUTONOMY_FAILED", message: error.message } }),
        autonomy: { ...latest.autonomy, usage: { ...latest.autonomy.usage, elapsedMs: latest.autonomy.usage.elapsedMs + (Date.now() - segmentAccountedAt) } },
      });
      this.eventBus?.publish("autonomy.mission.failed", { missionId: id, status, error: error.message });
      error.missionId = id;
      throw error;
    } finally {
      clearTimeout(timer);
      this.active.delete(id);
    }
  }

  cancel(id, userId) {
    const record = this.store.get(id);
    if (!record || (record.metadata?.userId && userId && record.metadata.userId !== userId) || TERMINAL.has(record.status)) return false;
    const controller = this.active.get(id);
    if (controller) controller.abort(missionError("Autonomous mission cancelled.", "AUTONOMY_CANCELLED", 409));
    else this.store.update(id, { status: "cancelled", completedAt: new Date().toISOString(), error: { code: "AUTONOMY_CANCELLED", message: "Autonomous mission cancelled by creator." } });
    return true;
  }

  pause(id, userId) {
    const record = this.store.get(id);
    if (!record || record.metadata?.userId !== userId || record.status !== "running") return false;
    const controller = this.active.get(id);
    if (!controller) return false;
    controller.abort(missionError("Autonomous mission paused by creator.", "AUTONOMY_PAUSED", 409));
    return true;
  }

  resume(id, userId) {
    const record = this.store.get(id);
    if (!record || record.metadata?.userId !== userId || record.status !== "paused") throw missionError("Paused autonomous mission not found.", "AUTONOMY_MISSION_NOT_PAUSED", 409);
    return this.run(id);
  }

  get(id) { return this.store.get(id); }
  health() { return { healthy: true, activeMissions: this.active.size, mode: "supervised-bounded" }; }
}
