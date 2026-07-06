// src/core/video/transitionEngine.js

import fs from "fs";
import path from "path";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

ffmpeg.setFfmpegPath(
  ffmpegPath
);

const ENGINE_VERSION =
  "AstraMind Transition Engine v3 Unified";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(
  value,
  min,
  max,
  fallback = min
) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.max(
    min,
    Math.min(max, n)
  );
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function fileExists(
  filePath = ""
) {
  return Boolean(
    filePath &&
      fs.existsSync(filePath)
  );
}

function buildTransitionProfile({
  narrativeMode = "cinematic",
}) {
  const profiles = {
    viral: {
      transition:
        "wipeleft",

      duration: 0.22,

      energy: 96,

      style:
        "high-impact",
    },

    documentary: {
      transition:
        "fade",

      duration: 0.7,

      energy: 52,

      style:
        "measured-cinematic",
    },

    futuristic: {
      transition:
        "smoothleft",

      duration: 0.45,

      energy: 82,

      style:
        "neural-flow",
    },

    cinematic: {
      transition:
        "fadeblack",

      duration: 0.5,

      energy: 78,

      style:
        "immersive-cinematic",
    },

    standard: {
      transition:
        "fade",

      duration: 0.45,

      energy: 70,

      style:
        "balanced",
    },
  };

  return (
    profiles[narrativeMode] ||
    profiles.standard
  );
}

function buildSceneTransition({
  currentScene = {},
  nextScene = {},
  transitionProfile = {},
}) {
  const currentRole =
    currentScene.role ||
    "build";

  let duration =
    transitionProfile.duration;

  if (
    currentRole === "hook"
  ) {
    duration *= 0.75;
  }

  if (
    currentRole ===
    "reveal"
  ) {
    duration *= 1.2;
  }

  return {
    transition:
      transitionProfile.transition,

    duration:
      clamp(
        Number(
          duration.toFixed(2)
        ),
        0.1,
        3,
        0.5
      ),

    style:
      transitionProfile.style,

    energy:
      transitionProfile.energy,
  };
}

async function executeTransitionRender({
  firstClip,
  secondClip,
  outputPath,
  transitionConfig,
  offset,
}) {
  return new Promise(
    (resolve, reject) => {
      ffmpeg()
        .input(firstClip)
        .input(secondClip)
        .complexFilter([
          {
            filter:
              "xfade",

            options: {
              transition:
                transitionConfig.transition,

              duration:
                transitionConfig.duration,

              offset:
                offset,
            },
          },
        ])
        .outputOptions([
          "-preset veryfast",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])
        .save(outputPath)
        .on(
          "end",
          () => {
            resolve({
              ok: true,

              outputPath,
            });
          }
        )
        .on(
          "error",
          reject
        );
    }
  );
}

/*
  IMPORTANT CONSOLIDATION UPDATE

  OLD PROBLEMS:
  ❌ transition engine deciding cinematic identity
  ❌ fragmented transition planning
  ❌ duplicate pacing logic
  ❌ independent emotional orchestration
  ❌ render synchronization risks

  NEW SYSTEM:
  ✅ centralized classification
  ✅ timeline-driven transitions
  ✅ deterministic transition planning
  ✅ execution-only rendering
  ✅ unified cinematic orchestration
*/

export async function generateSceneTransitions({
  topic = "",

  style = "cinematic",

  platform = "TikTok",

  clips = [],

  timeline = {},

  creativeContext = {},

  outputDir =
    "./renders/transitions",

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

  const transitionProfile =
    buildTransitionProfile({
      narrativeMode,
    });

  const timelineScenes =
    safeArray(
      timeline?.scenes
    );

  const validClips =
    safeArray(clips).filter(
      fileExists
    );

  if (
    validClips.length < 2
  ) {
    return {
      ok: false,

      engine:
        ENGINE_VERSION,

      error:
        "At least two valid clips are required.",

      diagnostics: {
        insufficientClips:
          true,
      },
    };
  }

  ensureDir(outputDir);

  const transitions = [];

  for (
    let i = 0;
    i <
    validClips.length - 1;
    i++
  ) {
    const firstClip =
      validClips[i];

    const secondClip =
      validClips[i + 1];

    const currentScene =
      timelineScenes[i] ||
      {};

    const nextScene =
      timelineScenes[
        i + 1
      ] || {};

    const transitionConfig =
      buildSceneTransition({
        currentScene,
        nextScene,
        transitionProfile,
      });

    const outputPath =
      path.join(
        outputDir,
        `transition_${i + 1}.mp4`
      );

    const offset =
      clamp(
        (
          currentScene.duration ||
          5
        ) -
          transitionConfig.duration,
        0.1,
        999,
        4
      );

    const renderResult =
      await executeTransitionRender({
        firstClip,

        secondClip,

        outputPath,

        transitionConfig,

        offset,
      });

    transitions.push({
      index: i,

      firstClip,

      secondClip,

      outputPath,

      role:
        currentScene.role ||
        "build",

      startTime:
        currentScene.endTime ||
        0,

      transitionConfig,

      renderResult,
    });
  }

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "transition-generation",

    topic,

    style,

    platform,

    narrativeMode,

    transitionProfile,

    transitions,

    totalTransitions:
      transitions.length,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      centralizedTransitionAuthority:
        true,

      deterministicTransitions:
        true,

      duplicateTransitionLogic:
        false,

      renderSynchronization:
        true,

      creatorBrainReady:
        true,
    },

    productionPlan,
  };
}

export async function applyCrossfadeTransition({
  firstClip,
  secondClip,
  outputPath,
  duration = 0.5,
  style = "fade",
  offset = 4,
} = {}) {
  if (
    !fileExists(firstClip)
  ) {
    throw new Error(
      `First clip missing: ${firstClip}`
    );
  }

  if (
    !fileExists(secondClip)
  ) {
    throw new Error(
      `Second clip missing: ${secondClip}`
    );
  }

  if (!outputPath) {
    throw new Error(
      "Transition outputPath required."
    );
  }

  ensureDir(
    path.dirname(
      outputPath
    )
  );

  return executeTransitionRender({
    firstClip,

    secondClip,

    outputPath,

    transitionConfig: {
      transition:
        style,

      duration:
        clamp(
          duration,
          0.1,
          3,
          0.5
        ),
    },

    offset:
      clamp(
        offset,
        0.1,
        999,
        4
      ),
  });
}

export function getTransitionEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      deterministicTransitions:
        true,

      ffmpegTransitions:
        true,

      timelineSynchronization:
        true,

      cinematicTransitionProfiles:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  generateSceneTransitions,
  applyCrossfadeTransition,
  getTransitionEngineHealth,
};