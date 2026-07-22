const RESEARCH_CAPABILITIES = Object.freeze([
  "conversation.classify",
  "conversation.memory.recall",
  "conversation.context.prepare",
  "research.plan",
  "research.collect",
  "research.validate",
  "research.synthesize",
  "workflow.execute",
]);

export function createBoundedResearchPlan({ objective, input = {}, bounds = {} } = {}) {
  const cleanObjective = String(objective || input.message || "").replace(/\s+/g, " ").trim();
  if (!cleanObjective) throw Object.assign(new Error("An autonomous research objective is required."), { code: "OBJECTIVE_REQUIRED", status: 400 });
  if (cleanObjective.length > 4000) throw Object.assign(new Error("The autonomous objective must be 4,000 characters or fewer."), { code: "OBJECTIVE_TOO_LONG", status: 400 });

  const request = { ...input, message: input.message || cleanObjective };
  const plan = [
    { id: "classify-objective", capability: "conversation.classify", input: request, creditCost: 0 },
    { id: "recall-memory", capability: "conversation.memory.recall", input: request, creditCost: 0 },
    { id: "prepare-context", capability: "conversation.context.prepare", input: request, creditCost: 0 },
    { id: "plan-research", capability: "research.plan", input: request, creditCost: 0 },
    {
      id: "collect-sources",
      capability: "research.collect",
      input: request,
      creditCost: 1,
      risk: "external-read",
      requiresApproval: true,
      successCriteria: { type: "minimum_sources", minimum: 1 },
    },
    { id: "validate-sources", capability: "research.validate", input: request, creditCost: 0, successCriteria: { type: "minimum_valid_sources", minimum: 1 } },
    { id: "synthesize-evidence", capability: "research.synthesize", input: request, creditCost: 1, successCriteria: { type: "minimum_citations", minimum: 1 } },
    { id: "persist-and-present", capability: "workflow.execute", input: request, creditCost: 1 },
  ];

  const normalizedBounds = {
    maxSteps: Math.min(Math.max(Number(bounds.maxSteps) || 8, 1), 12),
    maxToolCalls: Math.min(Math.max(Number(bounds.maxToolCalls) || 8, 1), 20),
    maxProviderQueries: Math.min(Math.max(Number(bounds.maxProviderQueries) || 6, 1), 8),
    maxCredits: Math.min(Math.max(Number(bounds.maxCredits) || 3, 0), 100),
    maxRetriesPerStep: Math.min(Math.max(Number(bounds.maxRetriesPerStep) || 1, 0), 3),
    timeoutMs: Math.min(Math.max(Number(bounds.timeoutMs) || 120000, 1000), 300000),
    allowedCapabilities: [...RESEARCH_CAPABILITIES],
  };
  if (plan.length > normalizedBounds.maxSteps) throw Object.assign(new Error("The research plan exceeds its step budget."), { code: "AUTONOMY_STEP_BUDGET_EXCEEDED", status: 400 });

  return {
    objective: cleanObjective,
    template: "bounded-research-v1",
    strategy: "sequential-checkpointed",
    plan,
    bounds: normalizedBounds,
    governance: {
      mode: "supervised-autonomy",
      approvalCheckpoint: "collect-sources",
      irreversibleActionsAllowed: false,
      externalWritesAllowed: false,
      paidRenderingAllowed: false,
    },
  };
}

export default createBoundedResearchPlan;
