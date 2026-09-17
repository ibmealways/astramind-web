import { generateAIVideoClip } from "./aiVideoGenerationBuilder.js";
import { fetchLicensedStockClip } from "./licensedStockProvider.js";

export async function generateHybridMediaClips({ scenes = [], visuals = [], sourcePlan = [], mode, topic, platform, style, storyboard, projectId } = {}) {
  const clips = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const plan = sourcePlan[index] || {};
    if (plan.preferredSource === "licensed-stock") {
      clips.push(await fetchLicensedStockClip({ scene, index, projectId }));
      continue;
    }
    if (plan.preferredSource === "short-video-model") {
      clips.push(await generateAIVideoClip({ scene, visual: visuals[index], storyboard, topic, platform, style, projectId, index, provider: mode, allowFallback: false }));
      continue;
    }
    clips.push(null);
  }
  return {
    ok: true,
    provider: "hybrid",
    clips,
    liveActionCount: clips.filter((clip) => clip?.liveAction).length,
    stockCount: clips.filter((clip) => clip?.source === "licensed-stock-pexels").length,
    generatedClipCount: clips.filter((clip) => clip?.liveAction && clip?.source !== "licensed-stock-pexels").length,
    fallbackCount: clips.filter((clip) => !clip).length,
  };
}

export default { generateHybridMediaClips };
