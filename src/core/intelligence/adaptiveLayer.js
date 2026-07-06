import { getCreatorProfile } from "../memory/creatorProfile.js";
import { getBestPlatform } from "../memory/feedbackEngine.js";

export function enhancePrompt({ idea, type }) {
  const profile = getCreatorProfile();

  const bestPlatform = getBestPlatform(type) || profile.platforms[0];

  return {
    idea,
    type,
    platform: bestPlatform,
    tone: profile.tone,
    niche: profile.niche,
  };
}