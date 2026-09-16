export const VIDEO_MODES = Object.freeze({
  RUNWAY: "runway",
  VEO: "veo",
  LOCAL_TEST: "local-test",
  DISABLED: "disabled",
});

export const LOCAL_TEST_LABEL = "Animated Still Test Render";
export const SUPPORTED_VIDEO_MODES = Object.freeze(Object.values(VIDEO_MODES));
export const SUPPORTED_ASPECT_RATIOS = Object.freeze(["9:16", "16:9", "1:1"]);
export const SUPPORTED_RESOLUTIONS = Object.freeze(["540x960", "720x1280", "1080x1920", "1280x720", "1920x1080", "1080x1080"]);
export const SUPPORTED_FRAME_RATES = Object.freeze([24, 25, 30]);
export const SUPPORTED_QUALITIES = Object.freeze(["fast", "balanced", "high"]);

function clean(value = "") {
  return String(value || "").trim();
}

export function normalizeVideoMode(value, { nodeEnv = process.env.NODE_ENV } = {}) {
  const raw = clean(value).toLowerCase();
  const aliases = {
    local: VIDEO_MODES.LOCAL_TEST,
    "fallback-motion": VIDEO_MODES.LOCAL_TEST,
    fallback: VIDEO_MODES.LOCAL_TEST,
    off: VIDEO_MODES.DISABLED,
    none: VIDEO_MODES.DISABLED,
  };
  const normalized = aliases[raw] || raw;

  if (!normalized) {
    return nodeEnv === "production" ? VIDEO_MODES.DISABLED : VIDEO_MODES.LOCAL_TEST;
  }
  if (!SUPPORTED_VIDEO_MODES.includes(normalized)) {
    throw new Error(`Unsupported video mode: ${value}. Use runway, veo, local-test, or disabled.`);
  }
  return normalized;
}

export function getConfiguredVideoMode(env = process.env) {
  return normalizeVideoMode(env.AIGENIKZ_VIDEO_MODE || env.AI_VIDEO_PROVIDER || "", {
    nodeEnv: env.NODE_ENV,
  });
}

export function getProviderConfiguration(mode, env = process.env) {
  const normalizedMode = normalizeVideoMode(mode, { nodeEnv: env.NODE_ENV });
  const runwayConfigured = Boolean(clean(env.RUNWAY_API_KEY || env.RUNWAYML_API_SECRET || env.RUNWAY_API_SECRET));
  const veoConfigured = Boolean(clean(env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_GENAI_API_KEY));

  return {
    mode: normalizedMode,
    label: normalizedMode === VIDEO_MODES.LOCAL_TEST ? LOCAL_TEST_LABEL : normalizedMode,
    provider: [VIDEO_MODES.RUNWAY, VIDEO_MODES.VEO].includes(normalizedMode) ? normalizedMode : null,
    configured:
      normalizedMode === VIDEO_MODES.LOCAL_TEST ||
      (normalizedMode === VIDEO_MODES.RUNWAY && runwayConfigured) ||
      (normalizedMode === VIDEO_MODES.VEO && veoConfigured),
    fallbackAllowed: normalizedMode === VIDEO_MODES.LOCAL_TEST,
    runwayConfigured,
    veoConfigured,
  };
}

export function validateVideoOptions(raw = {}, { env = process.env, maxDuration = 90, maxResolution = "1080x1920" } = {}) {
  const allowedKeys = new Set([
    "mode", "provider", "model", "duration", "durationTarget", "aspectRatio", "resolution",
    "frameRate", "quality", "motionStrength", "cameraMovement", "transitions", "transitionStyle",
    "voiceover", "voiceId", "soundtrack", "soundtrackMood", "avatar", "avatarPresenter",
    "subtitles", "exportFormat", "preferGPU", "allowFallback", "sceneCount", "idempotencyKey",
  ]);
  const unknown = Object.keys(raw || {}).filter((key) => !allowedKeys.has(key));
  if (unknown.length) throw new Error(`Unsupported video options: ${unknown.join(", ")}.`);

  const configuredMode = getConfiguredVideoMode(env);
  const mode = normalizeVideoMode(raw.mode || raw.provider || configuredMode, { nodeEnv: env.NODE_ENV });
  const duration = Number(raw.durationTarget ?? raw.duration ?? 30);
  const frameRate = Number(raw.frameRate ?? (env.VIDEO_RENDER_PROFILE === "staging-low-memory" ? 24 : 30));
  const aspectRatio = clean(raw.aspectRatio || "9:16");
  const resolution = clean(raw.resolution || (env.VIDEO_RENDER_PROFILE === "staging-low-memory" ? "540x960" : "1080x1920"));
  const quality = clean(raw.quality || "balanced").toLowerCase();
  const exportFormat = clean(raw.exportFormat || "mp4").toLowerCase();
  const allowFallback = raw.allowFallback === true;

  if (!Number.isFinite(duration) || duration < 5 || duration > maxDuration) throw new Error(`Duration must be between 5 and ${maxDuration} seconds.`);
  if (!SUPPORTED_ASPECT_RATIOS.includes(aspectRatio)) throw new Error(`Unsupported aspect ratio: ${aspectRatio}.`);
  if (!SUPPORTED_RESOLUTIONS.includes(resolution)) throw new Error(`Unsupported resolution: ${resolution}.`);
  if (maxResolution !== "custom") {
    const [width, height] = resolution.split("x").map(Number);
    const [maxWidth, maxHeight] = maxResolution.split("x").map(Number);
    if (Math.max(width, height) > Math.max(maxWidth, maxHeight) || Math.min(width, height) > Math.min(maxWidth, maxHeight)) {
      throw new Error(`Resolution ${resolution} exceeds the plan limit ${maxResolution}.`);
    }
  }
  if (!SUPPORTED_FRAME_RATES.includes(frameRate)) throw new Error(`Unsupported frame rate: ${frameRate}.`);
  if (!SUPPORTED_QUALITIES.includes(quality)) throw new Error(`Unsupported quality: ${quality}.`);
  if (exportFormat !== "mp4") throw new Error("Only MP4 export is currently supported.");
  if (mode === VIDEO_MODES.DISABLED) throw new Error("Video generation is disabled. Configure runway, veo, or explicitly select local-test.");
  if (mode === VIDEO_MODES.LOCAL_TEST && !allowFallback) throw new Error(`${LOCAL_TEST_LABEL} requires allowFallback: true.`);
  if (mode !== VIDEO_MODES.LOCAL_TEST && allowFallback) throw new Error("Fallback is prohibited for real-provider video modes.");
  if (raw.voiceover === true) throw new Error("Voiceover is unavailable until a validated TTS provider is configured.");
  if (raw.soundtrack === true) throw new Error("Soundtrack is unavailable in the repaired pipeline until audio composition is fully validated.");
  if (raw.avatar === true || raw.avatarPresenter === true) throw new Error("Avatar rendering is unavailable; server filesystem paths are not accepted.");
  if (raw.preferGPU === true) throw new Error("GPU encoding is unavailable on this service.");

  const provider = getProviderConfiguration(mode, env);
  if (mode === VIDEO_MODES.RUNWAY && !provider.runwayConfigured) throw new Error("Runway mode requires RUNWAY_API_KEY (aliases: RUNWAYML_API_SECRET, RUNWAY_API_SECRET).");
  if (mode === VIDEO_MODES.VEO) {
    if (!provider.veoConfigured) throw new Error("Veo mode requires GOOGLE_API_KEY (aliases: GEMINI_API_KEY, GOOGLE_GENAI_API_KEY).");
    throw new Error("Veo mode is unavailable because the provider request implementation has not been verified.");
  }

  return {
    mode,
    provider: mode === VIDEO_MODES.LOCAL_TEST ? null : mode,
    model: clean(raw.model || (mode === VIDEO_MODES.RUNWAY ? env.RUNWAY_MODEL || env.AI_VIDEO_MODEL || "gen4.5" : "local-test")),
    durationTarget: duration,
    aspectRatio,
    resolution,
    frameRate,
    quality,
    motionStrength: Math.max(0, Math.min(100, Number(raw.motionStrength ?? 70))),
    cameraMovement: clean(raw.cameraMovement || "cinematic"),
    transitions: raw.transitions !== false,
    transitionStyle: clean(raw.transitionStyle || "cinematic"),
    voiceover: false,
    soundtrack: false,
    avatar: false,
    subtitles: raw.subtitles !== false,
    exportFormat,
    preferGPU: false,
    allowFallback,
    idempotencyKey: clean(raw.idempotencyKey || ""),
    diagnostics: {
      label: mode === VIDEO_MODES.LOCAL_TEST ? LOCAL_TEST_LABEL : `${mode} provider video`,
      realProvider: mode === VIDEO_MODES.RUNWAY || mode === VIDEO_MODES.VEO,
      fallbackAllowed: mode === VIDEO_MODES.LOCAL_TEST,
      providerConfigured: provider.configured,
    },
  };
}