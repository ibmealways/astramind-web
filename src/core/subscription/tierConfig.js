// src/core/subscription/tierConfig.js

export const TIERS = {
  FREE: "FREE",
  CREATOR: "CREATOR",
  PRO: "PRO",
  ELITE: "ELITE",
};

export const TIER_LABELS = {
  FREE: "Free",
  CREATOR: "Creator",
  PRO: "Pro",
  ELITE: "Elite",
};

export const DEFAULT_TIER = TIERS.FREE;

/**
 * AstraMind Subscription Capability Matrix
 * ----------------------------------------
 * FREE:
 *  - Can explore platform
 *  - Can generate preview scripts/storyboards
 *  - Cannot export premium media
 *
 * CREATOR:
 *  - Full creator access
 *  - Standard rendering/export
 *
 * PRO:
 *  - Premium AI stack
 *  - Faster rendering
 *  - ElevenLabs premium voices
 *
 * ELITE:
 *  - Full AstraMind ecosystem
 *  - Automation + connectors + publishing
 */

export const TIER_CAPS = {
  [TIERS.FREE]: {
    // CORE ACCESS
    canUseChat: true,
    canUseResearch: true,
    canUseFinance: true,

    // VIDEO + MEDIA
    canGenerateScripts: true,
    canGenerateStoryboards: true,
    canPreviewVideo: true,

    canGenerateImages: false,
    canGenerateVideo: false,
    canRenderFinalVideo: false,
    canExport: false,
    canExportBundles: false,
    canBatchExport: false,

    // VOICE
    canUseVoiceover: true,
    canUsePremiumVoices: false,
    preferredVoiceEngine: "fallback",

    // UPLOADS
    canUploadAssets: false,
    canUploadAvatar: false,

    // SOCIAL
    canAutoPost: false,
    canUseSocialPublisher: false,

    // ADVANCED
    canUseBrandKit: false,
    canUseConnectors: false,
    canUseGPUAcceleration: false,
    canUseVisionPipeline: false,

    // STORAGE
    maxProjectsStored: 10,
    maxRemixesPerProject: 3,
    maxRenderMinutes: 5,
  },

  [TIERS.CREATOR]: {
    // CORE ACCESS
    canUseChat: true,
    canUseResearch: true,
    canUseFinance: true,

    // VIDEO + MEDIA
    canGenerateScripts: true,
    canGenerateStoryboards: true,
    canPreviewVideo: true,

    canGenerateImages: true,
    canGenerateVideo: true,
    canRenderFinalVideo: true,
    canExport: true,
    canExportBundles: true,
    canBatchExport: false,

    // VOICE
    canUseVoiceover: true,
    canUsePremiumVoices: false,
    preferredVoiceEngine: "openai",

    // UPLOADS
    canUploadAssets: true,
    canUploadAvatar: false,

    // SOCIAL
    canAutoPost: false,
    canUseSocialPublisher: true,

    // ADVANCED
    canUseBrandKit: false,
    canUseConnectors: false,
    canUseGPUAcceleration: false,
    canUseVisionPipeline: true,

    // STORAGE
    maxProjectsStored: 50,
    maxRemixesPerProject: 15,
    maxRenderMinutes: 60,
  },

  [TIERS.PRO]: {
    // CORE ACCESS
    canUseChat: true,
    canUseResearch: true,
    canUseFinance: true,

    // VIDEO + MEDIA
    canGenerateScripts: true,
    canGenerateStoryboards: true,
    canPreviewVideo: true,

    canGenerateImages: true,
    canGenerateVideo: true,
    canRenderFinalVideo: true,
    canExport: true,
    canExportBundles: true,
    canBatchExport: true,

    // VOICE
    canUseVoiceover: true,
    canUsePremiumVoices: true,
    preferredVoiceEngine: "elevenlabs",

    // UPLOADS
    canUploadAssets: true,
    canUploadAvatar: true,

    // SOCIAL
    canAutoPost: true,
    canUseSocialPublisher: true,

    // ADVANCED
    canUseBrandKit: true,
    canUseConnectors: false,
    canUseGPUAcceleration: true,
    canUseVisionPipeline: true,

    // STORAGE
    maxProjectsStored: 200,
    maxRemixesPerProject: 50,
    maxRenderMinutes: 300,
  },

  [TIERS.ELITE]: {
    // CORE ACCESS
    canUseChat: true,
    canUseResearch: true,
    canUseFinance: true,

    // VIDEO + MEDIA
    canGenerateScripts: true,
    canGenerateStoryboards: true,
    canPreviewVideo: true,

    canGenerateImages: true,
    canGenerateVideo: true,
    canRenderFinalVideo: true,
    canExport: true,
    canExportBundles: true,
    canBatchExport: true,

    // VOICE
    canUseVoiceover: true,
    canUsePremiumVoices: true,
    preferredVoiceEngine: "elevenlabs",

    // UPLOADS
    canUploadAssets: true,
    canUploadAvatar: true,

    // SOCIAL
    canAutoPost: true,
    canUseSocialPublisher: true,

    // ADVANCED
    canUseBrandKit: true,
    canUseConnectors: true,
    canUseGPUAcceleration: true,
    canUseVisionPipeline: true,

    // STORAGE
    maxProjectsStored: 1000,
    maxRemixesPerProject: 200,
    maxRenderMinutes: 9999,
  },
};

export function getCapsForTier(tier) {
  return TIER_CAPS[tier] || TIER_CAPS[DEFAULT_TIER];
}

export function tierRank(tier) {
  if (tier === TIERS.ELITE) return 4;
  if (tier === TIERS.PRO) return 3;
  if (tier === TIERS.CREATOR) return 2;
  return 1;
}

/**
 * Capability Helper
 */
export function hasCapability(tier, capability) {
  const caps = getCapsForTier(tier);
  return Boolean(caps?.[capability]);
}

/**
 * Preferred Voice Engine Helper
 */
export function getPreferredVoiceEngine(tier) {
  const caps = getCapsForTier(tier);

  if (caps.canUsePremiumVoices) {
    return "elevenlabs";
  }

  if (caps.preferredVoiceEngine) {
    return caps.preferredVoiceEngine;
  }

  return "fallback";
}
