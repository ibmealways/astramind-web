// src/core/intelligence/adaptiveCore.js

const STORAGE_KEY = "astramind_adaptive_profile_v1";

const DEFAULT_PROFILE = {
  behaviorScore: 0,
  preferredPlatform: "TikTok",
  dominantStyle: "Futuristic OS",
  dominantTone: "Educational",
  contentBias: "High Impact",
  lastActiveSection: "content",
  generationHistory: [],
  chatDepth: 0
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getAdaptiveProfile() {
  return loadProfile();
}

export function recordGeneration({ type, platform, style }) {
  const profile = loadProfile();

  profile.behaviorScore += 1;
  profile.preferredPlatform = platform || profile.preferredPlatform;
  profile.dominantStyle = style || profile.dominantStyle;
  profile.generationHistory.push({
    type,
    platform,
    style,
    ts: Date.now()
  });

  saveProfile(profile);
}

export function recordChatInteraction() {
  const profile = loadProfile();
  profile.chatDepth += 1;
  saveProfile(profile);
}

export function setLastSection(section) {
  const profile = loadProfile();
  profile.lastActiveSection = section;
  saveProfile(profile);
}
