// src/core/platform/developerPlans.js

export const API_PLANS = {
  FREE: "FREE",
  STARTER: "STARTER",
  CREATOR_API: "CREATOR_API",
  BUSINESS_API: "BUSINESS_API",
  ENTERPRISE: "ENTERPRISE",
};

export const DEFAULT_API_PLAN = API_PLANS.FREE;

export const API_PLAN_LABELS = {
  [API_PLANS.FREE]: "Free Developer Sandbox",
  [API_PLANS.STARTER]: "Starter API",
  [API_PLANS.CREATOR_API]: "Creator API",
  [API_PLANS.BUSINESS_API]: "Business API",
  [API_PLANS.ENTERPRISE]: "Enterprise API",
};

export const BILLING_MODE = {
  FREE: "free",
  SUBSCRIPTION: "subscription",
  USAGE: "usage",
  HYBRID: "subscription_plus_usage",
  CUSTOM: "custom",
};

export const USAGE_EVENT_TYPES = {
  STORYBOARD_CREATE: "storyboard.create",
  IMAGE_GENERATE: "image.generate",
  VIDEO_GENERATE: "video.generate",
  VIDEO_RENDER_FULL: "video.render.full",
  VOICEOVER_GENERATE: "voiceover.generate",
  SOUNDTRACK_GENERATE: "soundtrack.generate",
  SUBTITLE_BURN: "subtitle.burn",
  SOCIAL_PACKAGE: "social.package",
  SOCIAL_PUBLISH: "social.publish",
  RESEARCH_RUN: "research.run",
  FINANCE_SIGNAL: "finance.signal",
  CONTENT_CREATE: "content.create",
  FILE_EXPORT: "file.export",
  API_REQUEST: "api.request",
};

export const PROVIDERS = {
  ASTRAMIND_NATIVE: "astramind-native",
  OPENAI: "openai",
  RUNWAY: "runway",
  VEO: "veo",
  LUMA: "luma",
  ELEVENLABS: "elevenlabs",
  STRIPE: "stripe",
  FALLBACK_MOTION: "fallback-motion",
};

export const WATERMARK_MODES = {
  REQUIRED: "required",
  OPTIONAL: "optional",
  NONE: "none",
};

export const PLAN_LIMITS = {
  [API_PLANS.FREE]: {
    billingMode: BILLING_MODE.FREE,
    monthlyBasePriceUsd: 0,
    includedCredits: 100,
    maxMonthlyCredits: 100,
    maxRequestsPerMinute: 10,
    maxRequestsPerDay: 100,
    maxProjectsStored: 3,
    maxConcurrentJobs: 1,
    maxRenderDurationSeconds: 30,
    maxScenesPerVideo: 5,
    maxVideoResolution: "720x1280",
    watermarkMode: WATERMARK_MODES.REQUIRED,
    priorityQueue: false,
    commercialUse: false,
    supportLevel: "community",
  },

  [API_PLANS.STARTER]: {
    billingMode: BILLING_MODE.HYBRID,
    monthlyBasePriceUsd: 19,
    includedCredits: 750,
    maxMonthlyCredits: 2500,
    maxRequestsPerMinute: 30,
    maxRequestsPerDay: 1000,
    maxProjectsStored: 25,
    maxConcurrentJobs: 2,
    maxRenderDurationSeconds: 45,
    maxScenesPerVideo: 7,
    maxVideoResolution: "720x1280",
    watermarkMode: WATERMARK_MODES.OPTIONAL,
    priorityQueue: false,
    commercialUse: true,
    supportLevel: "email",
  },

  [API_PLANS.CREATOR_API]: {
    billingMode: BILLING_MODE.HYBRID,
    monthlyBasePriceUsd: 49,
    includedCredits: 2500,
    maxMonthlyCredits: 10000,
    maxRequestsPerMinute: 60,
    maxRequestsPerDay: 5000,
    maxProjectsStored: 100,
    maxConcurrentJobs: 4,
    maxRenderDurationSeconds: 90,
    maxScenesPerVideo: 12,
    maxVideoResolution: "1080x1920",
    watermarkMode: WATERMARK_MODES.NONE,
    priorityQueue: true,
    commercialUse: true,
    supportLevel: "priority-email",
  },

  [API_PLANS.BUSINESS_API]: {
    billingMode: BILLING_MODE.HYBRID,
    monthlyBasePriceUsd: 149,
    includedCredits: 10000,
    maxMonthlyCredits: 50000,
    maxRequestsPerMinute: 180,
    maxRequestsPerDay: 25000,
    maxProjectsStored: 1000,
    maxConcurrentJobs: 10,
    maxRenderDurationSeconds: 180,
    maxScenesPerVideo: 30,
    maxVideoResolution: "1080x1920",
    watermarkMode: WATERMARK_MODES.NONE,
    priorityQueue: true,
    commercialUse: true,
    supportLevel: "priority-support",
  },

  [API_PLANS.ENTERPRISE]: {
    billingMode: BILLING_MODE.CUSTOM,
    monthlyBasePriceUsd: null,
    includedCredits: null,
    maxMonthlyCredits: null,
    maxRequestsPerMinute: 1000,
    maxRequestsPerDay: null,
    maxProjectsStored: null,
    maxConcurrentJobs: 50,
    maxRenderDurationSeconds: 600,
    maxScenesPerVideo: 100,
    maxVideoResolution: "custom",
    watermarkMode: WATERMARK_MODES.NONE,
    priorityQueue: true,
    commercialUse: true,
    supportLevel: "dedicated",
  },
};

export const FEATURE_FLAGS_BY_PLAN = {
  [API_PLANS.FREE]: {
    canUseStoryboardApi: true,
    canUseImageApi: true,
    canUseVideoApi: false,
    canUseFullRenderApi: false,
    canUseVoiceoverApi: false,
    canUseSoundtrackApi: true,
    canUseSubtitleApi: true,
    canUseSocialPackageApi: false,
    canUsePublishingApi: false,
    canUseRunwayProvider: false,
    canUseVeoProvider: false,
    canUseLumaProvider: false,
    canUseFallbackMotion: true,
    canRemoveWatermark: false,
    canUseCommercially: false,
    canUseBatchJobs: false,
    canUseWebhooks: false,
    canUseWhiteLabel: false,
    canUseCustomBrandKit: false,
    canUsePersistentCharacters: false,
    canUseDirectorBrain: true,
  },

  [API_PLANS.STARTER]: {
    canUseStoryboardApi: true,
    canUseImageApi: true,
    canUseVideoApi: true,
    canUseFullRenderApi: true,
    canUseVoiceoverApi: true,
    canUseSoundtrackApi: true,
    canUseSubtitleApi: true,
    canUseSocialPackageApi: true,
    canUsePublishingApi: false,
    canUseRunwayProvider: true,
    canUseVeoProvider: true,
    canUseLumaProvider: false,
    canUseFallbackMotion: true,
    canRemoveWatermark: false,
    canUseCommercially: true,
    canUseBatchJobs: false,
    canUseWebhooks: true,
    canUseWhiteLabel: false,
    canUseCustomBrandKit: false,
    canUsePersistentCharacters: false,
    canUseDirectorBrain: true,
  },

  [API_PLANS.CREATOR_API]: {
    canUseStoryboardApi: true,
    canUseImageApi: true,
    canUseVideoApi: true,
    canUseFullRenderApi: true,
    canUseVoiceoverApi: true,
    canUseSoundtrackApi: true,
    canUseSubtitleApi: true,
    canUseSocialPackageApi: true,
    canUsePublishingApi: true,
    canUseRunwayProvider: true,
    canUseVeoProvider: true,
    canUseLumaProvider: true,
    canUseFallbackMotion: true,
    canRemoveWatermark: true,
    canUseCommercially: true,
    canUseBatchJobs: true,
    canUseWebhooks: true,
    canUseWhiteLabel: false,
    canUseCustomBrandKit: true,
    canUsePersistentCharacters: true,
    canUseDirectorBrain: true,
  },

  [API_PLANS.BUSINESS_API]: {
    canUseStoryboardApi: true,
    canUseImageApi: true,
    canUseVideoApi: true,
    canUseFullRenderApi: true,
    canUseVoiceoverApi: true,
    canUseSoundtrackApi: true,
    canUseSubtitleApi: true,
    canUseSocialPackageApi: true,
    canUsePublishingApi: true,
    canUseRunwayProvider: true,
    canUseVeoProvider: true,
    canUseLumaProvider: true,
    canUseFallbackMotion: true,
    canRemoveWatermark: true,
    canUseCommercially: true,
    canUseBatchJobs: true,
    canUseWebhooks: true,
    canUseWhiteLabel: true,
    canUseCustomBrandKit: true,
    canUsePersistentCharacters: true,
    canUseDirectorBrain: true,
  },

  [API_PLANS.ENTERPRISE]: {
    canUseStoryboardApi: true,
    canUseImageApi: true,
    canUseVideoApi: true,
    canUseFullRenderApi: true,
    canUseVoiceoverApi: true,
    canUseSoundtrackApi: true,
    canUseSubtitleApi: true,
    canUseSocialPackageApi: true,
    canUsePublishingApi: true,
    canUseRunwayProvider: true,
    canUseVeoProvider: true,
    canUseLumaProvider: true,
    canUseFallbackMotion: true,
    canRemoveWatermark: true,
    canUseCommercially: true,
    canUseBatchJobs: true,
    canUseWebhooks: true,
    canUseWhiteLabel: true,
    canUseCustomBrandKit: true,
    canUsePersistentCharacters: true,
    canUseDirectorBrain: true,
  },
};

export const CREDIT_COSTS = {
  [USAGE_EVENT_TYPES.API_REQUEST]: 0.01,
  [USAGE_EVENT_TYPES.STORYBOARD_CREATE]: 1,
  [USAGE_EVENT_TYPES.IMAGE_GENERATE]: 3,
  [USAGE_EVENT_TYPES.VIDEO_GENERATE]: 40,
  [USAGE_EVENT_TYPES.VIDEO_RENDER_FULL]: 75,
  [USAGE_EVENT_TYPES.VOICEOVER_GENERATE]: 5,
  [USAGE_EVENT_TYPES.SOUNDTRACK_GENERATE]: 3,
  [USAGE_EVENT_TYPES.SUBTITLE_BURN]: 2,
  [USAGE_EVENT_TYPES.SOCIAL_PACKAGE]: 2,
  [USAGE_EVENT_TYPES.SOCIAL_PUBLISH]: 5,
  [USAGE_EVENT_TYPES.RESEARCH_RUN]: 3,
  [USAGE_EVENT_TYPES.FINANCE_SIGNAL]: 4,
  [USAGE_EVENT_TYPES.CONTENT_CREATE]: 2,
  [USAGE_EVENT_TYPES.FILE_EXPORT]: 2,
};

export const PROVIDER_COST_MULTIPLIERS = {
  [PROVIDERS.ASTRAMIND_NATIVE]: 1,
  [PROVIDERS.OPENAI]: 1.2,
  [PROVIDERS.RUNWAY]: 2.5,
  [PROVIDERS.VEO]: 2.2,
  [PROVIDERS.LUMA]: 2.3,
  [PROVIDERS.ELEVENLABS]: 1.5,
  [PROVIDERS.FALLBACK_MOTION]: 0.5,
};

export const OVERAGE_PRICING = {
  creditUsd: 0.015,
  minimumChargeUsd: 1,
};

export function normalizeApiPlan(plan) {
  const value = String(plan || DEFAULT_API_PLAN).toUpperCase();
  return API_PLANS[value] || DEFAULT_API_PLAN;
}

export function getDeveloperPlan(plan) {
  const normalized = normalizeApiPlan(plan);

  return {
    id: normalized,
    label: API_PLAN_LABELS[normalized],
    limits: PLAN_LIMITS[normalized],
    features: FEATURE_FLAGS_BY_PLAN[normalized],
  };
}

export function getPlanLimits(plan) {
  return getDeveloperPlan(plan).limits;
}

export function getPlanFeatures(plan) {
  return getDeveloperPlan(plan).features;
}

export function getCreditCost(eventType, provider = PROVIDERS.ASTRAMIND_NATIVE) {
  const base = CREDIT_COSTS[eventType] ?? CREDIT_COSTS[USAGE_EVENT_TYPES.API_REQUEST];
  const multiplier = PROVIDER_COST_MULTIPLIERS[provider] ?? 1;

  return Number((base * multiplier).toFixed(3));
}

export function canUseFeature(plan, featureName) {
  const features = getPlanFeatures(plan);
  return Boolean(features[featureName]);
}

export function isWithinPlanLimit(plan, key, value) {
  const limits = getPlanLimits(plan);
  const limit = limits[key];

  if (limit === null || limit === undefined) return true;
  return Number(value) <= Number(limit);
}

export function calculateOverageUsd(extraCredits = 0) {
  const amount = Number(extraCredits || 0) * OVERAGE_PRICING.creditUsd;

  if (amount <= 0) return 0;
  return Number(Math.max(amount, OVERAGE_PRICING.minimumChargeUsd).toFixed(2));
}

export function getPublicPlanCatalog() {
  return Object.values(API_PLANS).map((planId) => {
    const plan = getDeveloperPlan(planId);

    return {
      id: plan.id,
      label: plan.label,
      monthlyBasePriceUsd: plan.limits.monthlyBasePriceUsd,
      includedCredits: plan.limits.includedCredits,
      maxRequestsPerMinute: plan.limits.maxRequestsPerMinute,
      maxConcurrentJobs: plan.limits.maxConcurrentJobs,
      maxRenderDurationSeconds: plan.limits.maxRenderDurationSeconds,
      watermarkMode: plan.limits.watermarkMode,
      commercialUse: plan.limits.commercialUse,
      priorityQueue: plan.limits.priorityQueue,
      supportLevel: plan.limits.supportLevel,
      features: plan.features,
    };
  });
}

export default {
  API_PLANS,
  DEFAULT_API_PLAN,
  API_PLAN_LABELS,
  BILLING_MODE,
  USAGE_EVENT_TYPES,
  PROVIDERS,
  WATERMARK_MODES,
  PLAN_LIMITS,
  FEATURE_FLAGS_BY_PLAN,
  CREDIT_COSTS,
  PROVIDER_COST_MULTIPLIERS,
  OVERAGE_PRICING,
  normalizeApiPlan,
  getDeveloperPlan,
  getPlanLimits,
  getPlanFeatures,
  getCreditCost,
  canUseFeature,
  isWithinPlanLimit,
  calculateOverageUsd,
  getPublicPlanCatalog,
};