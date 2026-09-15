const AI_PROVIDERS = {
  OPENAI: "openai",
  LOCAL: "local",
  HYBRID: "hybrid",
};

const MODEL_CAPABILITIES = {
  text: ["chat", "script", "strategy", "summarize", "rewrite", "book"],
  image: ["image-gen", "thumbnail", "cover-art", "branding"],
  audio: ["voiceover", "music-ideas", "lyrics", "podcast-outline"],
  video: ["video-script", "shot-plan", "scene-breakdown", "hooks"],
  finance: ["budget-analysis", "savings-plan", "income-review"],
};

const AI_MODELS = {
  defaultTextModel: {
    id: "astramind-core-text",
    provider: AI_PROVIDERS.HYBRID,
    temperature: 0.7,
    maxTokens: 2200,
    supports: ["chat", "script", "strategy", "book", "finance"],
  },

  fastTextModel: {
    id: "astramind-fast-response",
    provider: AI_PROVIDERS.HYBRID,
    temperature: 0.45,
    maxTokens: 1200,
    supports: ["chat", "summarize", "rewrite"],
  },

  creativeTextModel: {
    id: "astramind-creative-studio",
    provider: AI_PROVIDERS.HYBRID,
    temperature: 0.9,
    maxTokens: 3000,
    supports: ["script", "book", "lyrics", "branding", "storytelling"],
  },

  imageModel: {
  id: "astramind-vision-forge",
  provider: AI_PROVIDERS.OPENAI,

  sizes: {
    TikTok: "1024x1536",
    Shorts: "1024x1536",
    Reels: "1024x1536",

    YouTube: "1536x1024",

    Thumbnail: "1024x1024"
  }
},

  audioModel: {
    id: "astramind-audio-pulse",
    provider: AI_PROVIDERS.HYBRID,
    voiceStyle: "cinematic",
    supports: ["voiceover", "lyrics", "podcast-outline", "music-ideas"],
  },

  financeModel: {
    id: "astramind-finance-intel",
    provider: AI_PROVIDERS.HYBRID,
    temperature: 0.25,
    maxTokens: 1800,
    supports: ["budget-analysis", "savings-plan", "income-review"],
  },
};

const AI_WORKFLOWS = {
  chat: {
    label: "Chappy Chat",
    model: AI_MODELS.defaultTextModel.id,
    systemIntent: "General assistant conversation with Aigenikz personality.",
  },

  creatorScript: {
    label: "Creator Script Engine",
    model: AI_MODELS.creativeTextModel.id,
    systemIntent: "Generates high-retention social content scripts and outlines.",
  },

  bookWriter: {
    label: "Book Writer Engine",
    model: AI_MODELS.creativeTextModel.id,
    systemIntent: "Builds outlines, chapters, hooks, and publishing-ready longform content.",
  },

  financeReview: {
    label: "Finance Intelligence",
    model: AI_MODELS.financeModel.id,
    systemIntent: "Analyzes finances with practical, risk-aware recommendations.",
  },

  thumbnailBrief: {
    label: "Thumbnail Brief Builder",
    model: AI_MODELS.imageModel.id,
    systemIntent: "Creates image prompts and direction for covers and thumbnails.",
  },

  contentFactory: {
    label: "Content Factory Pipeline",
    model: AI_MODELS.defaultTextModel.id,
    systemIntent: "Coordinates multi-step generation for creator workflows.",
  },
};

export const AI_CONFIG = {
  appName: "Aigenikz Intelligence OS",
  defaultProvider: AI_PROVIDERS.HYBRID,
  fallbackProvider: AI_PROVIDERS.LOCAL,
  timeouts: {
    text: 30000,
    image: 45000,
    audio: 45000,
    video: 60000,
  },
  retryPolicy: {
    retries: 2,
    retryDelayMs: 1200,
  },
  capabilities: MODEL_CAPABILITIES,
  models: AI_MODELS,
  workflows: AI_WORKFLOWS,
};

export function getWorkflowConfig(workflowKey) {
  return AI_CONFIG.workflows[workflowKey] || AI_CONFIG.workflows.chat;
}

export function getModelConfigById(modelId) {
  return Object.values(AI_CONFIG.models).find((model) => model.id === modelId) || null;
}

export function getModelsByCapability(capability) {
  return Object.values(AI_CONFIG.models).filter((model) =>
    Array.isArray(model.supports) && model.supports.includes(capability)
  );
}

export default AI_CONFIG;