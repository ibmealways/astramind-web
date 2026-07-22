import crypto from "crypto";

const VERSION = "AstraMind Full Video Generation OS v1";
const DEFAULT_SHOT_SECONDS = 8;

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || minimum));

function platformProfile(platform = "YouTube") {
  const key = clean(platform).toLowerCase();
  if (key.includes("tiktok") || key.includes("reel") || key.includes("short")) {
    return { aspectRatio: "9:16", width: 720, height: 1280, pacing: "fast" };
  }
  if (key.includes("instagram")) {
    return { aspectRatio: "1:1", width: 960, height: 960, pacing: "fast" };
  }
  return { aspectRatio: "16:9", width: 1280, height: 720, pacing: "cinematic" };
}

function providerCatalog() {
  return [
    {
      id: "astramind-native",
      configured: Boolean(process.env.ASTRAMIND_NATIVE_VIDEO_URL || "http://127.0.0.1:8189"),
      modes: ["text-to-video", "image-to-video", "continuity-conditioned-generation"],
      role: "primary-self-hosted-motion-provider",
    },
    {
      id: "runway",
      configured: process.env.ASTRAMIND_ALLOW_PAID_VIDEO_PROVIDERS === "true" && Boolean(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET),
      modes: ["text-to-video", "image-to-video", "video-to-video", "character-performance"],
      role: "primary-motion-provider",
    },
    {
      id: "veo",
      configured: Boolean(process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_LOCATION),
      modes: ["text-to-video", "image-to-video", "first-last-frame", "native-audio"],
      role: "optional-motion-provider",
    },
    {
      id: "luma",
      configured: Boolean(process.env.LUMA_API_KEY),
      modes: ["text-to-video", "image-to-video", "keyframes", "extend"],
      role: "optional-motion-provider",
    },
  ];
}

function buildShotGraph({ durationSeconds, topic, style, profile }) {
  const shotCount = Math.max(1, Math.ceil(durationSeconds / DEFAULT_SHOT_SECONDS));
  return Array.from({ length: shotCount }, (_, index) => {
    const start = index * DEFAULT_SHOT_SECONDS;
    const duration = Math.min(DEFAULT_SHOT_SECONDS, durationSeconds - start);
    const id = `shot-${String(index + 1).padStart(2, "0")}`;
    return {
      id,
      sceneIndex: index,
      startSeconds: start,
      durationSeconds: duration,
      dependsOn: index === 0 ? ["continuity-lock"] : [`shot-${String(index).padStart(2, "0")}`],
      promptContract: {
        subject: topic,
        visualStyle: style,
        aspectRatio: profile.aspectRatio,
        continuityReferences: ["character-bible", "world-bible", "palette-lock", "previous-end-frame"],
        negativeConstraints: ["identity drift", "wardrobe drift", "unreadable typography", "duplicate limbs", "abrupt camera teleport"],
      },
      stages: ["visual-keyframe", "motion-generation", "shot-qc", "audio-sync"],
      retryPolicy: { maxAttempts: 3, reuseApprovedKeyframe: true, chargeOnlySubmittedProviderTasks: true },
    };
  });
}

export function createFullVideoGenerationPlan({
  projectId = crypto.randomUUID(),
  topic,
  style = "cinematic",
  platform = "YouTube",
  durationTarget = 60,
  options = {},
} = {}) {
  const mission = clean(topic);
  if (!mission) throw new Error("A full-video mission requires a topic.");

  const durationSeconds = clamp(durationTarget, 5, 600);
  const profile = platformProfile(platform);
  const providers = providerCatalog();
  const shots = buildShotGraph({ durationSeconds, topic: mission, style: clean(style) || "cinematic", profile });

  return {
    id: projectId,
    version: VERSION,
    algorithm: "Continuity Render Graph",
    mission,
    durationSeconds,
    platform: clean(platform) || "YouTube",
    profile,
    providers,
    providerPolicy: {
      preferred: clean(options.provider || "astramind-native"),
      fallbackOrder: process.env.ASTRAMIND_ALLOW_PAID_VIDEO_PROVIDERS === "true"
        ? ["astramind-native", "runway", "veo", "luma", "fallback-motion"]
        : ["astramind-native", "fallback-motion"],
      neverChargeFallbackPreview: true,
      preserveCompletedShots: true,
    },
    contracts: [
      "Mission Runtime",
      "Research OS",
      "Storyboard Kernel",
      "Character Continuity Contract",
      "Image Studio",
      "Motion Director",
      "Audio & Music Studio",
      "Voiceover Engine",
      "Subtitle & Transition Engines",
      "Cinematic Composer",
      "Subscription Meter",
      "Artifact Repository",
    ],
    continuityBible: {
      characterIdentity: "locked across approved reference images and prior end frames",
      world: clean(options.world || mission),
      palette: clean(options.palette || style),
      cameraLanguage: clean(options.cameraLanguage || "motivated cinematic movement; preserve screen direction"),
      audioIdentity: clean(options.audioIdentity || "consistent narrator, score motif, loudness and ambience"),
    },
    graph: {
      entry: ["mission-validate", "provider-preflight", "research", "storyboard", "continuity-lock"],
      shots,
      finish: ["voice-and-score", "caption-burn", "transition-pass", "final-assembly", "quality-control", "artifact-persist"],
    },
    recovery: {
      durableBeforeProviderCall: true,
      resumeFromLastCompletedStage: true,
      idempotencyKey: projectId,
      preserveProviderTaskIds: true,
    },
    createdAt: new Date().toISOString(),
  };
}

export function summarizeFullVideoResult(result = {}) {
  const render = result?.outputs?.render || result?.renderOutput || result?.render || result;
  const videoUrl = render?.videoUrl || render?.downloadUrl || render?.renderUrl || render?.url || null;
  const outputPath = render?.outputPath || render?.videoPath || result?.renderPath || null;
  return {
    ok: Boolean(result?.ok),
    stage: result?.stage || null,
    executionId: result?.executionId || result?.pipelineContext?.executionId || null,
    videoUrl,
    outputPath,
    render,
    diagnostics: result?.diagnostics || null,
    error: result?.error || null,
  };
}

export default { createFullVideoGenerationPlan, summarizeFullVideoResult };
