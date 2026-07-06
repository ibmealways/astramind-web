export const APP_MODES = {
  CREATOR: "creator",
  FOCUS: "focus",
  FINANCE: "finance",
  EXECUTION: "execution",
  DEEP_WORK: "deep-work",
};

export const MODE_CONFIG = {
  [APP_MODES.CREATOR]: {
    label: "Creator Mode",
    description: "Optimized for scripts, content planning, thumbnails, books, and media output.",
    accent: "#40ffc5",
    surfaceClass: "mode-creator",
    defaultRoute: "/creator-dashboard",
    enabledModules: [
      "/content",
      "/content-lab",
      "/content/script",
      "/content/image",
      "/content/video",
      "/content/audio",
      "/content/book",
      "/chat",
    ],
    aiWorkflow: "creatorScript",
  },

  [APP_MODES.FOCUS]: {
    label: "Focus Mode",
    description: "Reduced distractions and streamlined workspace for one-task execution.",
    accent: "#52c4ff",
    surfaceClass: "mode-focus",
    defaultRoute: "/",
    enabledModules: [
      "/chat",
      "/setup",
      "/content/script",
      "/content/book",
    ],
    aiWorkflow: "chat",
  },

  [APP_MODES.FINANCE]: {
    label: "Finance Mode",
    description: "Budget reviews, cashflow, savings planning, and financial analysis.",
    accent: "#ffd166",
    surfaceClass: "mode-finance",
    defaultRoute: "/finance",
    enabledModules: [
      "/finance",
      "/finance/income",
      "/finance/expenses",
      "/finance/savings",
      "/chat",
    ],
    aiWorkflow: "financeReview",
  },

  [APP_MODES.EXECUTION]: {
    label: "Execution Mode",
    description: "High-output operating mode for moving fast across modules.",
    accent: "#ff7af6",
    surfaceClass: "mode-execution",
    defaultRoute: "/creator-dashboard",
    enabledModules: [
      "/",
      "/creator-dashboard",
      "/setup",
      "/chat",
      "/finance",
      "/content",
      "/content-lab",
      "/content/script",
      "/content/image",
      "/content/video",
      "/content/audio",
      "/content/book",
      "/settings",
    ],
    aiWorkflow: "contentFactory",
  },

  [APP_MODES.DEEP_WORK]: {
    label: "Deep Work Mode",
    description: "Minimal routing surface with writing-first and strategy-first module access.",
    accent: "#b794f4",
    surfaceClass: "mode-deep-work",
    defaultRoute: "/content/book",
    enabledModules: [
      "/chat",
      "/content/script",
      "/content/book",
      "/settings",
    ],
    aiWorkflow: "bookWriter",
  },
};

export function getModeConfig(modeKey) {
  return MODE_CONFIG[modeKey] || MODE_CONFIG[APP_MODES.CREATOR];
}

export function getAllModes() {
  return Object.entries(MODE_CONFIG).map(([key, value]) => ({
    key,
    ...value,
  }));
}

export default MODE_CONFIG;