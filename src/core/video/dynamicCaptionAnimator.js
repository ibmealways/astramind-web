// src/core/video/dynamicCaptionAnimator.js

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "Aigenikz Dynamic Caption Animator v4 Hollywood Overlay";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getSceneStart(scene = {}, index = 0) {
  return Number(
    scene.startTime ??
      scene.start ??
      scene.startSeconds ??
      index * Number(scene.duration || 5) ??
      0
  );
}

function getSceneEnd(scene = {}, start = 0) {
  return Number(
    scene.endTime ??
      scene.end ??
      scene.endSeconds ??
      start + Number(scene.duration || 5)
  );
}

function splitCaptionChunks(text = "", maxWords = 6) {
  const words = clean(text)
    .split(/\s+/)
    .filter(Boolean);

  const chunks = [];

  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }

  return chunks.length ? chunks : [];
}

function buildCaptionProfile({ narrativeMode = "cinematic" }) {
  const profiles = {
    viral: {
      animation: "impact-pop",
      emphasis: "high-energy",
      fontScale: 1.18,
      chunkSize: 4,
      cinematicWeight: 95,
    },
    documentary: {
      animation: "cinematic-fade",
      emphasis: "measured",
      fontScale: 1,
      chunkSize: 7,
      cinematicWeight: 70,
    },
    futuristic: {
      animation: "neural-glow",
      emphasis: "evolving",
      fontScale: 1.1,
      chunkSize: 5,
      cinematicWeight: 86,
    },
    cinematic: {
      animation: "immersive-motion",
      emphasis: "cinematic",
      fontScale: 1.06,
      chunkSize: 6,
      cinematicWeight: 82,
    },
    standard: {
      animation: "standard-fade",
      emphasis: "balanced",
      fontScale: 1,
      chunkSize: 6,
      cinematicWeight: 70,
    },
  };

  return profiles[narrativeMode] || profiles.standard;
}

function buildCaptionStyle({ role = "build", profile = {} }) {
  let visualPriority = "balanced";
  let animationIntensity = 70;

  if (role === "hook") {
    visualPriority = "high-retention";
    animationIntensity = 95;
  }

  if (role === "reveal" || role === "transformation") {
    visualPriority = "cinematic-climax";
    animationIntensity = 90;
  }

  if (role === "cta" || role === "payoff") {
    visualPriority = "action-forward";
    animationIntensity = 82;
  }

  return {
    animation: profile.animation,
    emphasis: profile.emphasis,
    fontScale: profile.fontScale,
    visualPriority,
    animationIntensity,
  };
}

function buildCaptionTimeline({ chunks = [], startTime = 0, endTime = 5 }) {
  const safeStart = Number.isFinite(Number(startTime)) ? Number(startTime) : 0;
  const safeEnd = Number.isFinite(Number(endTime)) && Number(endTime) > safeStart
    ? Number(endTime)
    : safeStart + 5;

  const duration = Math.max(0.5, safeEnd - safeStart);
  const perChunk = duration / Math.max(chunks.length, 1);

  return chunks.map((chunk, index) => {
    const chunkStart = safeStart + perChunk * index;
    const chunkEnd = chunkStart + perChunk;

    return {
      text: chunk,
      start: Number(chunkStart.toFixed(2)),
      end: Number(chunkEnd.toFixed(2)),
      duration: Number(perChunk.toFixed(2)),
    };
  });
}

export function generateDynamicCaptions({
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  timeline = {},
  voiceover = {},
  creativeContext = {},
  productionPlan = {},
} = {}) {
  const classification = classifyContent({
    topic,
    style,
    platform,
  });

  const narrativeMode = classification.narrativeMode;
  const profile = buildCaptionProfile({ narrativeMode });
  const timelineScenes = safeArray(timeline?.scenes);
  const voiceSegments = safeArray(voiceover?.segments);

  if (!timelineScenes.length) {
    return {
      ok: false,
      engine: ENGINE_VERSION,
      error: "Timeline scenes missing.",
      diagnostics: {
        missingTimeline: true,
      },
    };
  }

  const captions = timelineScenes.map((scene, index) => {
    const voiceSegment = voiceSegments[index] || {};
    const role = scene.role || scene.sceneRole || "build";
    const startTime = getSceneStart(scene, index);
    const endTime = getSceneEnd(scene, startTime);

    const sourceText = clean(
      voiceSegment.text ||
        scene?.caption ||
        scene?.voiceover ||
        scene?.cinematicDialogue ||
        scene?.expandedText ||
        scene?.visual ||
        scene?.title ||
        ""
    );

    const chunks = splitCaptionChunks(sourceText, profile.chunkSize);

    const chunkTimeline = buildCaptionTimeline({
      chunks,
      startTime,
      endTime,
    });

    return {
      id: scene.id || `caption_scene_${index + 1}`,
      role,
      narrativeMode,
      startTime,
      endTime,
      duration: Number((endTime - startTime).toFixed(2)),
      fullText: sourceText,
      captionStyle: buildCaptionStyle({
        role,
        profile,
      }),
      chunks: chunkTimeline,
    };
  });

  const totalCaptionChunks = captions.reduce(
    (sum, scene) => sum + scene.chunks.length,
    0
  );

  return {
    ok: true,
    engine: ENGINE_VERSION,
    stage: "dynamic-caption-animation",
    topic,
    style,
    platform,
    narrativeMode,
    captionProfile: profile,
    totalScenes: captions.length,
    totalCaptionChunks,
    captions,
    creativeContext: {
      ...creativeContext,
      classification,
    },
    diagnostics: {
      classificationEngine: classification.engine,
      centralizedTimingAuthority: true,
      deterministicCaptionFlow: true,
      subtitleSyncReady: true,
      sceneCaptionFallbacks: true,
      creatorBrainReady: true,
    },
    productionPlan,
  };
}

export function buildCaptionTimelineMarkers({ captionPlan = {} } = {}) {
  const captions = safeArray(captionPlan?.captions);

  return captions.flatMap((scene) =>
    scene.chunks.map((chunk) => ({
      sceneId: scene.id,
      role: scene.role,
      text: chunk.text,
      start: chunk.start,
      end: chunk.end,
      duration: chunk.duration,
      style: scene.captionStyle,
    }))
  );
}

export function getDynamicCaptionAnimatorHealth() {
  return {
    ok: true,
    engine: ENGINE_VERSION,
    supports: {
      timelineDrivenCaptions: true,
      voiceoverSync: true,
      sceneCaptionFallbacks: true,
      subtitleReadyOutput: true,
      cinematicCaptionStyles: true,
      creatorBrainReady: true,
    },
  };
}

export default {
  generateDynamicCaptions,
  buildCaptionTimelineMarkers,
  getDynamicCaptionAnimatorHealth,
};