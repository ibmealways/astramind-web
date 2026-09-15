import { loadCreatorMemory, saveCreatorMemory } from "./creatorMemory.js";

const DEFAULT_PROFILE = {
  niche: "general",
  tone: "Educational",
  platform: "TikTok",
  platforms: ["TikTok"],
};

export function getCreatorProfile() {
  const stored = loadCreatorMemory() || {};
  const platforms = Array.isArray(stored.platforms) && stored.platforms.length
    ? stored.platforms
    : [stored.platform || DEFAULT_PROFILE.platform];
  return { ...DEFAULT_PROFILE, ...stored, platforms };
}

export function updateCreatorProfile(update = {}) {
  return saveCreatorMemory({ ...getCreatorProfile(), ...update });
}