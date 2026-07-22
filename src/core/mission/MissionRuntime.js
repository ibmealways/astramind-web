import { randomUUID } from "node:crypto";

export const MISSION_STATUS = Object.freeze({
  PENDING: "pending", RUNNING: "running", COMPLETED: "completed",
  FAILED: "failed", CANCELLED: "cancelled", TIMED_OUT: "timed_out",
});

export default class MissionRuntime {
  constructor({ executor, capabilityRouter, store, eventBus, defaultTimeoutMs = 30000 }) {
    this.executor = executor;
    this.capabilityRouter = capabilityRouter;
    this.store = store;
    this.eventBus = eventBus;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.active = new Map();
  }

  normalizePlan(plan, metadata) {
    const steps = plan?.length ? plan : [{ capability: metadata.capability || "workflow.execute" }];
    if (!Array.isArray(steps) || steps.length > 20) throw Object.assign(new Error("Mission plan must contain between 1 and 20 steps."), { code: "INVALID_MISSION_PLAN", status: 400 });
    return steps.map((step, index) => {
      if (!step || typeof step.capability !== "string") throw Object.assign(new Error(`Mission plan step ${index + 1} requires a capability.`), { code: "INVALID_MISSION_PLAN", status: 400 });
      return { id: step.id || `step-${index + 1}`, capability: step.capability, input: step.input, status: MISSION_STATUS.PENDING };
    });
  }

  async execute({ mission, input = {}, plan, user = {}, context = {}, preferences = {}, constraints = {}, metadata = {}, timeoutMs } = {}) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const steps = this.normalizePlan(plan, metadata);
    const record = { id, name: mission, capability: steps[0].capability, plan: steps, status: MISSION_STATUS.PENDING, createdAt, updatedAt: createdAt, input, metadata };
    this.store.create(record);
    const controller = new AbortController();
    const effectiveTimeout = Math.min(Math.max(Number(timeoutMs || constraints.timeoutMs || this.defaultTimeoutMs), 1), 300000);
    const timer = setTimeout(() => controller.abort(new Error("Mission timed out.")), effectiveTimeout);
    this.active.set(id, controller);
    this.store.update(id, { status: MISSION_STATUS.RUNNING, startedAt: new Date().toISOString() });
    this.eventBus.publish("mission.started", { missionId: id, steps: steps.length });

    let currentInput = input;
    let lastExecution = null;
    const executions = [];
    try {
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const route = this.capabilityRouter.resolve(step.capability);
        steps[index] = { ...step, status: MISSION_STATUS.RUNNING, startedAt: new Date().toISOString() };
        this.store.update(id, { plan: steps });
        lastExecution = await this.executor.execute({
          authority: route.authority, action: route.action,
          payload: { mission, input: step.input ?? currentInput, previousResult: currentInput, user, context, preferences, constraints },
          metadata: { ...metadata, missionId: id, stepId: step.id, capability: step.capability }, signal: controller.signal,
        });
        currentInput = lastExecution.data;
        executions.push({ stepId: step.id, capability: step.capability, executionId: lastExecution.requestId, result: lastExecution.data });
        steps[index] = { ...steps[index], status: MISSION_STATUS.COMPLETED, completedAt: new Date().toISOString(), executionId: lastExecution.requestId };
        this.store.update(id, { plan: steps });
        this.eventBus.publish("mission.step.completed", { missionId: id, stepId: step.id, capability: step.capability });
      }
      const completed = this.store.update(id, { status: MISSION_STATUS.COMPLETED, completedAt: new Date().toISOString(), executionId: lastExecution.requestId, result: currentInput, executions });
      this.eventBus.publish("mission.completed", { missionId: id, executionId: lastExecution.requestId });
      return { mission: completed, execution: { ...lastExecution, data: currentInput, executions } };
    } catch (error) {
      const timedOut = controller.signal.aborted && controller.signal.reason?.message === "Mission timed out.";
      const status = timedOut ? MISSION_STATUS.TIMED_OUT : controller.signal.aborted ? MISSION_STATUS.CANCELLED : MISSION_STATUS.FAILED;
      const activeIndex = steps.findIndex(({ status: stepStatus }) => stepStatus === MISSION_STATUS.RUNNING);
      if (activeIndex >= 0) steps[activeIndex] = { ...steps[activeIndex], status, completedAt: new Date().toISOString(), error: error.message };
      this.store.update(id, { status, plan: steps, completedAt: new Date().toISOString(), executions, error: { code: error.code || (timedOut ? "MISSION_TIMEOUT" : "MISSION_FAILED"), message: error.message } });
      this.eventBus.publish("mission.failed", { missionId: id, status, error: error.message });
      error.missionId = id;
      if (timedOut) { error.code = "MISSION_TIMEOUT"; error.status = 408; }
      if (status === MISSION_STATUS.CANCELLED) { error.code = "MISSION_CANCELLED"; error.status = 409; }
      throw error;
    } finally {
      clearTimeout(timer);
      this.active.delete(id);
    }
  }

  cancel(id) { const controller = this.active.get(id); if (!controller) return false; controller.abort(new Error("Mission cancelled.")); return true; }
  get(id) { return this.store.get(id); }
  list(options) { return this.store.list(options); }
  health() { return { healthy: true, activeMissions: this.active.size, storedMissions: this.store.count() }; }
}
