import { AGENT_TYPES } from "./agentRegistry.js";

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function hasWholeTerm(text, patterns) {
  return patterns.some((pattern) => {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "i").test(text);
  });
}

export function detectAgentIntent(input = "") {
  const text = String(input || "").toLowerCase().trim();

  if (!text) {
    return {
      primaryAgent: AGENT_TYPES.GENERAL,
      workflow: null,
      confidence: 0.2,
      reasoning: "Empty input routed to general agent.",
    };
  }

  const actionPatterns = [
    "generate",
    "create",
    "make",
    "build",
    "write",
    "draft",
    "produce",
  ];

  const newsPatterns = [
    "news",
    "breaking",
    "latest news",
    "current events",
    "what's happening",
    "iran",
    "war",
    "conflict",
    "world news",
    "headlines",
  ];

  const researchPatterns = [
    "research",
    "search",
    "find articles",
    "find sources",
    "look this up",
    "browse",
    "latest",
    "recent",
    "today",
    "current",
    "verify",
    "fact check",
  ];

  const bookPatterns = [
    "book",
    "novel",
    "chapter",
    "story bible",
    "write chapter",
    "plot",
    "scene",
    "author",
  ];

  const contentPatterns = [
    "script",
    "caption",
    "content",
    "youtube",
    "tiktok",
    "hook",
    "video",
    "video idea",
    "campaign",
    "reel",
    "short",
    "shorts",
  ];

  const financePatterns = [
    "stock",
    "stocks",
    "market",
    "crypto",
    "bitcoin",
    "ethereum",
    "price",
    "trading",
    "investment",
    "portfolio",
    "accountant",
    "cpa",
    "tax",
    "taxes",
    "bookkeeper",
    "broker",
    "financial advisor",
    "investment banker",
    "banker",
    "loan",
    "credit",
    "debt",
    "profit",
    "loss",
    "revenue",
    "cash flow",
    "business finance",
  ];

  const strategyPatterns = [
    "strategy",
    "plan",
    "business idea",
    "monetize",
    "income",
    "launch",
  ];

  const saasPatterns = ["saas", "app", "software", "mvp", "startup"];

  // ============================
  // ACTION-FIRST ROUTING
  // Prevents "war/Iran" from hijacking video/book generation.
  // ============================

  if (hasAny(text, actionPatterns) && hasAny(text, bookPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.BOOK,
      workflow: "book_full",
      confidence: 0.95,
      reasoning: "Detected book creation request.",
    };
  }

  if (hasAny(text, actionPatterns) && hasAny(text, contentPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.CONTENT,
      workflow: "content_generation",
      confidence: 0.95,
      reasoning: "Detected content/video creation request.",
    };
  }

  // ============================
  // WORKFLOW DETECTION
  // ============================

  if (
    hasAny(text, ["research"]) &&
    hasAny(text, ["summarize", "analyze", "report"])
  ) {
    return {
      primaryAgent: AGENT_TYPES.RESEARCH,
      workflow: "research_summary",
      confidence: 0.9,
      reasoning: "Detected research workflow request.",
    };
  }

  if (
    hasWholeTerm(text, ["saas", "app", "software"]) &&
    hasAny(text, ["build", "create", "launch"])
  ) {
    return {
      primaryAgent: AGENT_TYPES.SAAS,
      workflow: "saas_builder",
      confidence: 0.95,
      reasoning: "Detected SaaS builder workflow.",
    };
  }

  if (hasAny(text, ["business", "income", "monetize", "idea"])) {
    return {
      primaryAgent: AGENT_TYPES.STRATEGY,
      workflow: "business_strategy_scan",
      confidence: 0.9,
      reasoning: "Detected business strategy workflow.",
    };
  }

  // ============================
  // NEWS DETECTION AFTER CREATION REQUESTS
  // ============================

  if (hasAny(text, newsPatterns)) {
    return {
      primaryAgent: "news",
      workflow: "news_live",
      confidence: 0.9,
      reasoning: "Detected real-time news request.",
    };
  }

  // ============================
  // BASIC AGENT MATCHING
  // ============================

  if (hasAny(text, financePatterns)) {
    return {
      primaryAgent: AGENT_TYPES.FINANCE,
      workflow: null,
      confidence: 0.8,
      reasoning: "Detected finance intent.",
    };
  }

  if (hasAny(text, contentPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.CONTENT,
      workflow: null,
      confidence: 0.8,
      reasoning: "Detected content intent.",
    };
  }

  if (hasAny(text, bookPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.BOOK,
      workflow: null,
      confidence: 0.75,
      reasoning: "Detected book writing intent.",
    };
  }

  if (hasAny(text, researchPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.RESEARCH,
      workflow: null,
      confidence: 0.75,
      reasoning: "Detected research intent.",
    };
  }

  if (hasAny(text, strategyPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.STRATEGY,
      workflow: null,
      confidence: 0.7,
      reasoning: "Detected strategy intent.",
    };
  }

  if (hasWholeTerm(text, saasPatterns)) {
    return {
      primaryAgent: AGENT_TYPES.SAAS,
      workflow: null,
      confidence: 0.7,
      reasoning: "Detected SaaS intent.",
    };
  }

  return {
    primaryAgent: AGENT_TYPES.GENERAL,
    workflow: null,
    confidence: 0.5,
    reasoning: "No strong match, using general agent.",
  };
}
