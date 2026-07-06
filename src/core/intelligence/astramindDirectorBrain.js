// src/core/intelligence/astramindDirectorBrain.js

import {
  generateViralStrategy,
  learnFromRenderResult,
} from "./viralIntelligenceEngine.js";

import {
  analyzeCreatorIntent,
  updateCreatorIdentity,
  getCreatorProductionProfile,
} from "./creatorIdentityEngine.js";

const DIRECTOR_VERSION =
  "AstraMind Autonomous Director Brain v1";

export const CACHE_TYPES = {
  FINAL_RENDER: "final_render",
  VISUAL: "visual",
  AI_VIDEO_CLIP: "ai_video_clip",
  VOICEOVER: "voiceover",
  SOUNDTRACK: "soundtrack",
  SUBTITLES: "subtitles",
  WATERMARK: "watermark",
};

export const RENDER_STAGES = {
  STORYBOARD: "storyboard",
  VISUALS: "visuals",
  AI_VIDEO_CLIPS: "ai_video_clips",
  SILENT_VIDEO: "silent_video",
  CAPTIONS: "captions",
  VOICEOVER: "voiceover",
  SOUNDTRACK: "soundtrack",
  SUBTITLES: "subtitles",
  AVATAR: "avatar",
  WATERMARK: "watermark",
  SOCIAL_EXPORT: "social_export",
};

const renderMemory = new Map();

function makeCacheKey(payload = {}) {
  return JSON.stringify(payload);
}

export async function initializeDirectorSession({
  creatorId = "default_creator",
  projectId,
  topic,
  platform = "TikTok",
  style = "cinematic",
  provider = "fallback-motion",
  renderOptions = {},
} = {}) {
  const creatorIntent =
    analyzeCreatorIntent({
      creatorId,
      topic,
      platform,
      style,
    });

  const viralStrategy =
    generateViralStrategy({
      creatorId,
      topic,
      platform,
      durationTarget:
        renderOptions.durationTarget || 30,
    });

  const creatorProfile =
    getCreatorProductionProfile(
      creatorId
    );

  renderMemory.set(projectId, {
    projectId,
    creatorId,
    topic,
    platform,
    style,
    provider,
    renderOptions,
    startedAt: Date.now(),
    checkpoints: [],
  });

  return {
    ok: true,

    engine: DIRECTOR_VERSION,

    projectId,

    creatorIntent,

    viralStrategy,

    creatorProfile,

    productionPlan: {
      pacing:
        viralStrategy.strategy.pacing,

      soundtrackMood:
        viralStrategy.strategy
          .soundtrackMood,

      captionStyle:
        viralStrategy.strategy
          .captionStyle,

      motionIntensity:
        viralStrategy.strategy
          .motionIntensity,

      transitionIntensity:
        viralStrategy.strategy
          .transitionIntensity,

      cameraMovement:
        viralStrategy.strategy
          .cameraMovement,

      hookStyle:
        viralStrategy.strategy
          .hookStyle,

      editorialDirection:
        creatorIntent.detected
          .editorialDirection,

      visualDNA:
        creatorProfile.visualDNA,

      voiceDNA:
        creatorProfile.voiceDNA,
    },
  };
}

export async function directorCheckpoint({
  projectId,
  stage,
  data = {},
  files = [],
  message = "",
} = {}) {
  const memory =
    renderMemory.get(projectId);

  if (!memory) {
    return {
      ok: false,
      error: "Project memory missing",
    };
  }

  memory.checkpoints.push({
    stage,
    data,
    files,
    message,
    createdAt: new Date().toISOString(),
  });

  return {
    ok: true,
  };
}

const cacheStore = new Map();

export async function directorCacheLookup({
  type,
  topic,
  platform,
  style,
  provider,
  options = {},
} = {}) {
  const cacheKey =
    makeCacheKey({
      type,
      topic,
      platform,
      style,
      provider,
      options,
    });

  return {
    ok: true,
    cacheKey,
    cached:
      cacheStore.get(cacheKey) || null,
  };
}

export async function directorCacheStore({
  cacheKey,
  type,
  projectId,
  topic,
  platform,
  style,
  provider,
  filePath,
  publicUrl,
  files = [],
  data = {},
} = {}) {
  cacheStore.set(cacheKey, {
    ok: true,
    entry: {
      type,
      projectId,
      topic,
      platform,
      style,
      provider,
      filePath,
      publicUrl,
      files,
      data,
      createdAt:
        new Date().toISOString(),
    },
  });

  return {
    ok: true,
  };
}

export async function directorCompleteRender({
  creatorId = "default_creator",
  projectId,
  topic,
  platform,
  style,
  provider,
  finalVideoPath,
  publicUrl,
  storyboard,
  directorPlan,
  timeline,
  captions,
  visuals,
  watermark,
  socialExport,
  analytics = {},
} = {}) {
  updateCreatorIdentity({
    creatorId,
    topic,
    platform,
    style,
    projectId,
    analytics,
  });

  learnFromRenderResult({
    creatorId,
    topic,
    renderResult: {
      projectId,
      platform,
      style,
      provider,
    },
    analytics,
  });

  return {
    ok: true,
    memory: {
      projectId,
      topic,
      platform,
      style,
      provider,
      finalVideoPath,
      publicUrl,
      storyboard,
      timeline,
      captions,
      visuals,
      watermark,
      socialExport,
      analytics,
    },
  };
}

export async function directorFailRender({
  projectId,
  stage,
  error,
  recoverable = true,
} = {}) {
  console.error(
    "🔥 Director Brain Failure:",
    {
      projectId,
      stage,
      recoverable,
      error:
        error?.message || error,
    }
  );

  return {
    ok: true,
  };
}



/*
  ============================================
  GLOBAL HOLLYWOOD DIRECTOR STATE
  Existing-structure upgrade: this is the single creative decision object
  consumed by the existing video engines.
  ============================================
*/

function cleanDirectorText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function detectDirectorCategory({ topic = "", style = "" } = {}) {
  const text = `${topic} ${style}`.toLowerCase();

  if (text.includes("finance") || text.includes("stock") || text.includes("market") || text.includes("trading")) return "finance";
  if (text.includes("government") || text.includes("contract") || text.includes("defense") || text.includes("intelligence")) return "govtech";
  if (text.includes("nature") || text.includes("smoothie") || text.includes("health") || text.includes("wellness")) return "wellness";
  if (text.includes("luxury") || text.includes("premium") || text.includes("apple commercial")) return "luxury_technology";
  if (text.includes("astramind") || text.includes("ai") || text.includes("automation") || text.includes("operating system")) return "ai_technology";
  if (text.includes("restaurant") || text.includes("hood") || text.includes("grease") || text.includes("fire")) return "service_documentary";

  return "cinematic_general";
}

function buildDirectorPalette(category = "cinematic_general") {
  const palettes = {
    ai_technology: {
      palette: "electric blue, violet, cyan, black glass, neural glow",
      grade: "premium blue-violet technology grade with cold white highlights",
      atmosphere: "futuristic AI command center, holographic dashboards, living neural operating system, cinematic creator studio",
    },
    luxury_technology: {
      palette: "blue, violet, silver, black glass, soft gold highlights",
      grade: "premium Apple commercial grade with clean contrast and polished highlights",
      atmosphere: "minimal luxury technology environment, cinematic architecture, refined reflections, volumetric light",
    },
    finance: {
      palette: "emerald, black glass, white charts, deep blue shadows",
      grade: "institutional finance grade with precise contrast and intelligent glow",
      atmosphere: "financial command center, market intelligence dashboards, institutional analytics room",
    },
    govtech: {
      palette: "navy, steel, amber, classified-room shadows, cold white monitors",
      grade: "serious intelligence documentary grade with high-contrast tactical lighting",
      atmosphere: "defense intelligence operations center, secure analytics room, geospatial command environment",
    },
    wellness: {
      palette: "emerald, sunlight gold, clean white, natural green shadows",
      grade: "bright wellness commercial grade with natural warmth and clean highlights",
      atmosphere: "sunrise wellness environment, clean natural textures, vitality-focused cinematic clarity",
    },
    service_documentary: {
      palette: "steel gray, orange warning light, smoke shadow, clean white highlights",
      grade: "gritty commercial documentary grade with realistic worksite contrast",
      atmosphere: "real commercial worksite, practical lights, documentary realism, safety-focused cinematic tension",
    },
    cinematic_general: {
      palette: "teal, orange, deep shadow, realistic skin tones, cinematic highlights",
      grade: "Hollywood teal-orange grade with controlled contrast and soft film grain",
      atmosphere: "specific real-world cinematic environment with strong emotional clarity",
    },
  };

  return palettes[category] || palettes.cinematic_general;
}

function buildSceneDirectorState({ scene = {}, index = 0, category = "cinematic_general", platform = "TikTok", style = "cinematic" } = {}) {
  const role = cleanDirectorText(scene.role || scene.sceneRole || scene.title || `scene_${index + 1}`).toLowerCase();
  const palette = buildDirectorPalette(category);

  const rolePresets = {
    hook: {
      emotion: "curiosity, interruption, discovery",
      lens: "24mm cinematic wide lens",
      lighting: "neon volumetric key light with dramatic rim light",
      cameraAngle: "low angle hero composition with strong depth",
      cameraMotion: "slow push-in",
      cameraPath: "controlled dolly push toward the focal subject",
      transitionSuggestion: "match-cut curiosity snap",
      voiceDirection: "deep, controlled, curiosity-driven opening cadence",
      soundtrackDirection: "low cinematic boom with rising neural pulse",
    },
    problem: {
      emotion: "stress, friction, urgency, pressure",
      lens: "50mm handheld documentary lens",
      lighting: "darker practical light, shadows, selective highlights",
      cameraAngle: "close human angle with compressed background tension",
      cameraMotion: "subtle handheld drift",
      cameraPath: "slow lateral drift with slight instability",
      transitionSuggestion: "pressure match cut",
      voiceDirection: "slower, serious, heavier emphasis",
      soundtrackDirection: "dark drone with quiet ticking percussion",
    },
    build: {
      emotion: "momentum, discovery, intelligent escalation",
      lens: "35mm cinematic lens",
      lighting: "directional cinematic glow, dimensional side light",
      cameraAngle: "orbiting three-quarter angle with layered background action",
      cameraMotion: "smooth orbit drift",
      cameraPath: "curved orbit with slow push",
      transitionSuggestion: "kinetic flow cut",
      voiceDirection: "confident, building speed, precise emphasis",
      soundtrackDirection: "rising hybrid cinematic pulse",
    },
    evidence: {
      emotion: "credibility, evidence, undeniable confirmation",
      lens: "40mm documentary-commercial lens",
      lighting: "clean contrast with motivated practical light",
      cameraAngle: "stable investigative composition with visible evidence layers",
      cameraMotion: "slow investigative push",
      cameraPath: "precise documentary push-in toward evidence",
      transitionSuggestion: "documentary match cut",
      voiceDirection: "grounded, factual, authoritative",
      soundtrackDirection: "steady pulse with serious documentary bed",
    },
    payoff: {
      emotion: "resolve, mission, confidence, emotional landing",
      lens: "35mm hero commercial lens",
      lighting: "hero rim lighting, polished highlights, atmospheric depth",
      cameraAngle: "wide hero composition with dramatic scale and clean negative space",
      cameraMotion: "heroic pullback or slow rise",
      cameraPath: "slow crane rise and pullback",
      transitionSuggestion: "cinematic final resolve",
      voiceDirection: "confident closing cadence with final pause",
      soundtrackDirection: "heroic final rise and soft impact",
    },
  };

  const preset =
    rolePresets[role] ||
    rolePresets[scene.sceneRole] ||
    rolePresets.build;

  return {
    sceneId: scene.id || scene.sceneId || `scene_${index + 1}`,
    sceneIndex: index,
    role,
    category,
    platform,
    style,
    focalSubject: cleanDirectorText(scene.visual || scene.caption || scene.voiceover || scene.title || "cinematic focal subject"),
    action: cleanDirectorText(scene.voiceover || scene.caption || scene.purpose || scene.visual || "the story moment unfolds"),
    composition: "foreground, midground, and background depth with a clear hero focal point and clean lower-third negative space for captions",
    atmosphere: palette.atmosphere,
    colorPalette: palette.palette,
    colorGrade: palette.grade,
    particleFX: "subtle atmospheric particles, volumetric light rays, realistic reflections, no readable text",
    ...preset,
  };
}

export async function buildAstraMindDirectorState({
  projectId,
  executionId,
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  storyboard = {},
  timeline = {},
  creatorBrain = {},
  productionPlan = {},
} = {}) {
  const category = detectDirectorCategory({ topic, style });
  const palette = buildDirectorPalette(category);
  const scenes = Array.isArray(timeline?.scenes) && timeline.scenes.length
    ? timeline.scenes
    : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : [];

  const sceneDirections = scenes.map((scene, index) =>
    buildSceneDirectorState({ scene, index, category, platform, style })
  );

  const sceneDirectionMap = Object.fromEntries(
    sceneDirections.map((direction) => [direction.sceneId, direction])
  );

  return {
    ok: true,
    engine: "AstraMind Global Director State v1 Existing Structure",
    stage: "global-director-state",
    projectId,
    executionId,
    topic: cleanDirectorText(topic),
    style: cleanDirectorText(style),
    platform: cleanDirectorText(platform),
    category,
    globalLook: {
      palette: palette.palette,
      colorGrade: palette.grade,
      atmosphere: palette.atmosphere,
      quality: "photorealistic cinematic commercial, no placeholders, no embedded text, no template cards",
    },
    sceneDirections,
    sceneDirectionMap,
    camera: {
      depthMapReady: true,
      parallaxReady: true,
      rackFocusReady: true,
      motionBlurReady: true,
      directorControlled: true,
    },
    transitions: {
      storyAware: true,
      emotionalContinuity: true,
      directorControlled: true,
    },
    audio: {
      soundtrackMood: productionPlan?.soundtrackMood || sceneDirections[0]?.soundtrackDirection || "cinematic hybrid pulse",
      voiceStyle: productionPlan?.voiceDNA || creatorBrain?.voiceDNA || "deep cinematic narrator with emotional pacing",
      directorControlled: true,
    },
    diagnostics: {
      existingStructureOnly: true,
      pipelineOrchestratorAuthority: true,
      directorBrainAuthority: true,
      sharedDirectorState: true,
      noNewEngineFiles: true,
    },
  };
}

export default {
  initializeDirectorSession,
  buildAstraMindDirectorState,
  directorCheckpoint,
  directorCacheLookup,
  directorCacheStore,
  directorCompleteRender,
  directorFailRender,
};
