export const AGENT_TYPES = {
  RESEARCH: "research",
  BOOK: "book",
  CONTENT: "content",
  FINANCE: "finance",
  STRATEGY: "strategy",
  SAAS: "saas",
  GENERAL: "general",
};

export const AGENT_REGISTRY = {
  [AGENT_TYPES.RESEARCH]: {
    key: AGENT_TYPES.RESEARCH,
    label: "Research Agent",
    description:
      "Finds, summarizes, compares, and validates information from live web sources.",
  },
  [AGENT_TYPES.BOOK]: {
    key: AGENT_TYPES.BOOK,
    label: "Book Agent",
    description:
      "Builds books, project bibles, chapter plans, and continuity-safe drafts.",
  },
  [AGENT_TYPES.CONTENT]: {
    key: AGENT_TYPES.CONTENT,
    label: "Content Agent",
    description:
      "Generates scripts, captions, hooks, outlines, campaigns, and packaging.",
  },
  [AGENT_TYPES.FINANCE]: {
    key: AGENT_TYPES.FINANCE,
    label: "Finance Agent",
    description:
      "Handles budget reviews, financial analysis, savings planning, pricing, and cashflow strategy.",
  },
  [AGENT_TYPES.STRATEGY]: {
    key: AGENT_TYPES.STRATEGY,
    label: "Strategy Agent",
    description:
      "Builds plans, roadmaps, positioning, monetization strategy, and execution direction.",
  },
  [AGENT_TYPES.SAAS]: {
    key: AGENT_TYPES.SAAS,
    label: "AI SaaS Builder Agent",
    description:
      "Designs AI SaaS concepts, feature stacks, pricing models, launch plans, and MVP architecture.",
  },
  [AGENT_TYPES.GENERAL]: {
    key: AGENT_TYPES.GENERAL,
    label: "General Agent",
    description: "Fallback general-purpose reasoning and support agent.",
  },
};

export function getAgentConfig(agentKey) {
  return AGENT_REGISTRY[agentKey] || AGENT_REGISTRY[AGENT_TYPES.GENERAL];
}

export function getAllAgents() {
  return Object.values(AGENT_REGISTRY);
}
