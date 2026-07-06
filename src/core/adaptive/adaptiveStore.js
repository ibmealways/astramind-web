// src/core/adaptive/adaptiveStore.js

const KEY = "astramind_adaptive_profile_v1";

const DEFAULT_PROFILE = {
  voice: "Chappy",
  tone: "concise, tactical, high-output",
  platforms: ["TikTok"],
  contentStyle: "FuturisticOS",
  musicDefaults: { genre: "hip-hop", mood: "dark", bpm: 140 },
  dislikes: [],
  likes: [],
  lastUpdated: Date.now(),
};

export function getAdaptiveProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...(parsed || {}) };
  } catch {
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
}

export function setAdaptiveProfile(next) {
  const payload = { ...next, lastUpdated: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function patchAdaptiveProfile(patch) {
  const current = getAdaptiveProfile();
  return setAdaptiveProfile({ ...current, ...patch });
}
