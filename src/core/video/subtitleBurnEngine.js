// src/core/video/subtitleBurnEngine.js

import fs from "fs";
import path from "path";

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "Aigenikz Subtitle Burn Engine v3 Unified";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function buildSubtitleProfile({
  narrativeMode = "cinematic",
}) {
  const profiles = {
    viral: {
      font:
        "Montserrat Bold",

      fontSize: 28,

      primaryColor:
        "#FFFFFF",

      outlineColor:
        "#000000",

      animation:
        "impact-pop",

      alignment:
        "center",
    },

    documentary: {
      font:
        "Bebas Neue",

      fontSize: 24,

      primaryColor:
        "#F5F5F5",

      outlineColor:
        "#000000",

      animation:
        "cinematic-fade",

      alignment:
        "bottom-center",
    },

    futuristic: {
      font:
        "Orbitron Bold",

      fontSize: 26,

      primaryColor:
        "#AEEBFF",

      outlineColor:
        "#001B2B",

      animation:
        "neural-glow",

      alignment:
        "center",
    },

    cinematic: {
      font:
        "Montserrat SemiBold",

      fontSize: 26,

      primaryColor:
        "#FFFFFF",

      outlineColor:
        "#111111",

      animation:
        "immersive-fade",

      alignment:
        "bottom-center",
    },

    standard: {
      font:
        "Arial",

      fontSize: 24,

      primaryColor:
        "#FFFFFF",

      outlineColor:
        "#000000",

      animation:
        "standard",

      alignment:
        "bottom-center",
    },
  };

  return (
    profiles[narrativeMode] ||
    profiles.standard
  );
}

function escapeSrtText(
  value = ""
) {
  return clean(value)
    .replace(/-->/g, "→")
    .replace(/\r/g, "");
}

function secondsToSrt(
  seconds = 0
) {
  const ms =
    Math.floor(
      (seconds % 1) * 1000
    );

  const totalSeconds =
    Math.floor(seconds);

  const hrs =
    Math.floor(
      totalSeconds / 3600
    );

  const mins =
    Math.floor(
      (totalSeconds % 3600) /
        60
    );

  const secs =
    totalSeconds % 60;

  return `${String(hrs).padStart(
    2,
    "0"
  )}:${String(mins).padStart(
    2,
    "0"
  )}:${String(secs).padStart(
    2,
    "0"
  )},${String(ms).padStart(
    3,
    "0"
  )}`;
}

function buildSrtContent({
  captions = [],
}) {
  let index = 1;

  const entries = [];

  for (const scene of captions) {
    const chunks =
      safeArray(scene.chunks);

    for (const chunk of chunks) {
      entries.push(
        `${index}

${secondsToSrt(
  chunk.start
)} --> ${secondsToSrt(
  chunk.end
)}

${escapeSrtText(
  chunk.text
)}
`
      );

      index += 1;
    }
  }

  return entries.join("\n");
}

function buildSubtitleOverlayConfig({
  subtitleProfile = {},
}) {
  return {
    font:
      subtitleProfile.font,

    fontSize:
      subtitleProfile.fontSize,

    primaryColor:
      subtitleProfile.primaryColor,

    outlineColor:
      subtitleProfile.outlineColor,

    animation:
      subtitleProfile.animation,

    alignment:
      subtitleProfile.alignment,
  };
}

/*
  IMPORTANT CONSOLIDATION UPDATE

  OLD PROBLEMS:
  ❌ subtitle engine chunking captions
  ❌ subtitle engine modifying timing
  ❌ subtitle engine owning pacing
  ❌ duplicate cinematic segmentation
  ❌ render synchronization drift

  NEW SYSTEM:
  ✅ captions come from caption engine ONLY
  ✅ timeline owns timing ONLY
  ✅ subtitle engine renders overlays ONLY
  ✅ deterministic subtitle synchronization
  ✅ FFmpeg-ready subtitle contracts
*/

export async function burnDynamicSubtitles({
  topic = "",

  style = "cinematic",

  platform = "TikTok",

  captionPlan = {},

  creativeContext = {},

  outputDir =
    "./renders/subtitles",

  productionPlan = {},
} = {}) {
  const classification =
    classifyContent({
      topic,
      style,
      platform,
    });

  const narrativeMode =
    classification.narrativeMode;

  const captions =
    safeArray(
      captionPlan?.captions
    );

  if (!captions.length) {
    return {
      ok: false,

      engine:
        ENGINE_VERSION,

      error:
        "Caption plan missing.",

      diagnostics: {
        missingCaptions:
          true,
      },
    };
  }

  ensureDir(outputDir);

  const subtitleProfile =
    buildSubtitleProfile({
      narrativeMode,
    });

  const srtContent =
    buildSrtContent({
      captions,
    });

  const subtitlePath =
    path.join(
      outputDir,
      "captions.srt"
    );

  fs.writeFileSync(
    subtitlePath,
    srtContent,
    "utf8"
  );

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "subtitle-burn",

    topic,

    style,

    platform,

    narrativeMode,

    subtitleProfile,

    subtitleOverlay:
      buildSubtitleOverlayConfig({
        subtitleProfile,
      }),

    subtitlePath,

    totalScenes:
      captions.length,

    totalSubtitleEntries:
      srtContent
        .split(/\n\n/)
        .filter(Boolean).length,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      centralizedTimingAuthority:
        true,

      captionAuthorityExternal:
        true,

      deterministicSubtitleFlow:
        true,

      duplicateCaptionLogic:
        false,

      ffmpegReady:
        true,

      creatorBrainReady:
        true,
    },

    productionPlan,
  };
}

export function getSubtitleBurnEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      deterministicSubtitleRendering:
        true,

      ffmpegSubtitleContracts:
        true,

      externalCaptionAuthority:
        true,

      timelineSynchronization:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  burnDynamicSubtitles,
  getSubtitleBurnEngineHealth,
};