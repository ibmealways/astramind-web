const DEFAULT_MAX_CLIP_SECONDS = 10;
const DEFAULT_MIN_CLIP_SECONDS = 5;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function allocateDurations(total, maxClip, minClip) {
  const duration = Math.max(1, Number(total) || minClip);
  const count = Math.max(1, Math.ceil(duration / maxClip));
  const base = duration / count;
  const durations = Array.from({ length: count }, () => base);

  return durations.map((value, index) => {
    if (index === durations.length - 1) {
      const used = durations.slice(0, -1).reduce((sum, item) => sum + item, 0);
      return Number((duration - used).toFixed(3));
    }
    return Number(value.toFixed(3));
  });
}

function splitWords(value, count) {
  const words = clean(value).split(" ").filter(Boolean);
  if (count <= 1 || words.length < 2) return [clean(value)];
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * words.length) / count);
    const end = Math.floor(((index + 1) * words.length) / count);
    return words.slice(start, end).join(" ");
  });
}

export function splitScenesIntoProductionShots({
  scenes = [],
  maxClipSeconds = DEFAULT_MAX_CLIP_SECONDS,
  minClipSeconds = DEFAULT_MIN_CLIP_SECONDS,
} = {}) {
  const maxClip = Math.max(5, Math.min(10, Number(maxClipSeconds) || DEFAULT_MAX_CLIP_SECONDS));
  const minClip = Math.max(1, Math.min(maxClip, Number(minClipSeconds) || DEFAULT_MIN_CLIP_SECONDS));

  return scenes.flatMap((scene, sceneIndex) => {
    const sourceDuration = Math.max(1, Number(scene?.duration) || minClip);
    const durations = allocateDurations(sourceDuration, maxClip, minClip);
    const voiceoverParts = splitWords(scene?.voiceover || scene?.narration || "", durations.length);
    let elapsed = Number(scene?.startTime || 0);

    return durations.map((duration, shotIndex) => {
      const sourceId = scene?.id || scene?.sceneId || `scene_${sceneIndex + 1}`;
      const suffix = durations.length > 1 ? `, continuation shot ${shotIndex + 1} of ${durations.length}` : "";
      const shot = {
        ...scene,
        id: `${sourceId}_shot_${shotIndex + 1}`,
        sceneId: `${sourceId}_shot_${shotIndex + 1}`,
        sourceSceneId: sourceId,
        sourceSceneIndex: sceneIndex,
        shotIndex,
        shotCount: durations.length,
        duration,
        startTime: Number(elapsed.toFixed(3)),
        endTime: Number((elapsed + duration).toFixed(3)),
        visual: `${clean(scene?.visual)}${suffix}`.trim(),
        imagePrompt: `${clean(scene?.imagePrompt || scene?.visual)}${suffix}`.trim(),
        voiceover: voiceoverParts[shotIndex] || "",
        narration: voiceoverParts[shotIndex] || "",
        productionClip: true,
      };
      elapsed += duration;
      return shot;
    });
  });
}

export function buildMediaSourcePlan({ scenes = [], mode = "local-test", stockEnabled = false } = {}) {
  return scenes.map((scene, index) => {
    const stockMatch = stockEnabled && /people|nature|food|movement|city|office|fitness|wellness|smoothie|tai chi|meal/i.test(`${scene?.visual || ""} ${scene?.caption || ""}`);
    const preferredSource = stockMatch
      ? "licensed-stock"
      : mode === "runway" || mode === "veo" || mode === "aigenikz-local"
      ? "short-video-model"
      : "image-reference";

    return {
      sceneId: scene?.id || `scene_${index + 1}`,
      sourceSceneId: scene?.sourceSceneId || scene?.id || `scene_${index + 1}`,
      duration: Number(scene?.duration || 5),
      preferredSource,
      fallbackSource: "image-reference",
      requiresPaidProvider: preferredSource === "short-video-model" && mode !== "aigenikz-local",
    };
  });
}

export default { splitScenesIntoProductionShots, buildMediaSourcePlan };
