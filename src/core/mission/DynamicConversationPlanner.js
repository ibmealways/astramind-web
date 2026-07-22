const BASE_STEPS = Object.freeze([
  { id: "classify-intent", capability: "conversation.classify" },
  { id: "recall-memory", capability: "conversation.memory.recall" },
  { id: "prepare-context", capability: "conversation.context.prepare" },
]);

const RESEARCH_STEPS = Object.freeze([
  { id: "plan-research", capability: "research.plan" },
  { id: "collect-sources", capability: "research.collect" },
  { id: "validate-sources", capability: "research.validate" },
  { id: "synthesize-research", capability: "research.synthesize" },
]);

export const DYNAMIC_PLAN_CAPABILITIES = new Set([
  ...BASE_STEPS.map(({ capability }) => capability),
  ...RESEARCH_STEPS.map(({ capability }) => capability),
  "workflow.execute",
]);

export function createDynamicConversationPlan({ classification, input = {} } = {}) {
  const intent = classification?.intent || {};
  const isResearch = ["research", "news"].includes(intent.primaryAgent)
    || ["research_summary", "news_live", "product_research"].includes(intent.workflow);
  const selected = [
    ...BASE_STEPS,
    ...(isResearch ? RESEARCH_STEPS : []),
    { id: "execute-response", capability: "workflow.execute" },
  ];
  const plan = selected.map((step) => ({
    ...step,
    input: step.id === "classify-intent" ? undefined : input,
  }));
  validateDynamicConversationPlan(plan);
  return {
    plan,
    strategy: "sequential",
    template: isResearch ? "research-os-v1" : "conversation-v1",
    intent: intent.primaryAgent || "general",
    approval: isResearch ? {
      required: true,
      checkpoint: "collect-sources",
      reason: "Research OS may contact external sources and persist a research artifact.",
      risk: "external-read",
    } : { required: false },
  };
}

export function validateDynamicConversationPlan(plan) {
  if (!Array.isArray(plan) || plan.length < 2 || plan.length > 12) {
    throw new Error("Dynamic conversation plan must contain between 2 and 12 steps.");
  }
  const ids = new Set();
  for (const step of plan) {
    if (!step?.id || ids.has(step.id)) throw new Error("Dynamic plan step IDs must be unique.");
    if (!DYNAMIC_PLAN_CAPABILITIES.has(step.capability)) throw new Error(`Dynamic plan contains unsupported capability: ${step.capability}`);
    ids.add(step.id);
  }
  if (plan.at(-1).capability !== "workflow.execute") throw new Error("Dynamic plans must end with response execution.");
  return true;
}

export default createDynamicConversationPlan;
