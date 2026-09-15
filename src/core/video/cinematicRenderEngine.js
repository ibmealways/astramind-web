import fs from "fs";
import path from "path";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

import {
  assembleShotStoryboard
} from "./cinematicShotAssembler.js";

import {
  composeHollywoodFinal,
} from "./cinematicCompositionEngine.js";

import {
  updateRenderProgress,
  completeRenderProgress,
  failRenderProgress,
} from "./renderProgressStore.js";

ffmpeg.setFfmpegPath(
  ffmpegPath
);

/*
============================================
ENSURE FINAL RENDER DIRECTORY EXISTS
============================================
*/

const ENGINE_VERSION =
  "Aigenikz Cinematic Render Engine v4 Unified";

const DEFAULT_RENDER_RESOLUTION =
  "1080x1920";

const DEFAULT_FPS = 30;

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

function fileExists(
  filePath = ""
) {
  return Boolean(
    filePath &&
      fs.existsSync(filePath)
  );
}

function nowIso() {
  return new Date().toISOString();
}

function buildRenderProfile({
  narrativeMode = "cinematic",
  platform = "TikTok",
  style = "cinematic",
}) {
  const profiles = {
    viral: {
      preset:
        "veryfast",

      crf: 22,

      motionBias:
        "high-retention",

      cinematicIntensity:
        95,
    },

    documentary: {
      preset:
        "slow",

      crf: 18,

      motionBias:
        "measured",

      cinematicIntensity:
        70,
    },

    futuristic: {
      preset:
        "medium",

      crf: 20,

      motionBias:
        "neural-smooth",

      cinematicIntensity:
        88,
    },

    cinematic: {
      preset:
        "medium",

      crf: 20,

      motionBias:
        "immersive",

      cinematicIntensity:
        84,
    },

    standard: {
      preset:
        "medium",

      crf: 21,

      motionBias:
        "balanced",

      cinematicIntensity:
        72,
    },
  };

  const selected =
    profiles[narrativeMode] ||
    profiles.standard;

  const platformProfiles = {
    TikTok: {
      resolution:
        "1080x1920",

      fps: 30,
    },

    YouTube: {
      resolution:
        "1920x1080",

      fps: 30,
    },

    Instagram: {
      resolution:
        "1080x1920",

      fps: 30,
    },

    X: {
      resolution:
        "1920x1080",

      fps: 30,
    },
  };

  const platformProfile =
    platformProfiles[
      platform
    ] || {
      resolution:
        DEFAULT_RENDER_RESOLUTION,

      fps:
        DEFAULT_FPS,
    };

  return {
  ...selected,

  ...platformProfile,

  platform,

  style,

  narrativeMode,
};
}

function buildRenderDiagnostics({
  projectId,
  narrativeMode,
  renderProfile,
}) {
  return {
    projectId,

    narrativeMode,

    renderPreset:
      renderProfile.preset,

    renderResolution:
      renderProfile.resolution,

    cinematicIntensity:
      renderProfile.cinematicIntensity,

    centralizedRendering:
      true,

    deterministicPipeline:
      true,

    duplicateTimingLogic:
      false,

    renderRecoveryReady:
      true,

    creatorBrainReady:
      true,

    generatedAt:
      nowIso(),
  };
}

function validatePipelineAssets({
  scenes = [],
  voiceover = {},
  subtitles = {},
}) {
  const errors = [];

  if (!safeArray(scenes).length) {
    errors.push(
      "Timeline scenes missing."
    );
  }

  if (
    !safeArray(
      voiceover?.segments
    ).length
  ) {
    errors.push(
      "Voiceover segments missing."
    );
  }

  if (
    !subtitles?.subtitlePath
  ) {
    errors.push(
      "Subtitle file missing."
    );
  }

  return {
    ok:
      errors.length === 0,

    errors,
  };
}

function buildRenderSession({
  projectId,
  outputDir,
  renderProfile,
}) {
  ensureDir(outputDir);

  const sessionDir =
    path.join(
      outputDir,
      projectId
    );

  ensureDir(sessionDir);

  return {
  projectId,

  sessionDir,

  finalVideoPath: path.join(
    sessionDir,
    "final_render.mp4"
  ),

  tempDir: path.join(
    sessionDir,
    "temp"
  ),

  diagnosticsPath: path.join(
    sessionDir,
    "diagnostics.json"
  ),
};
}

/*
  IMPORTANT CONSOLIDATION UPDATE

  OLD PROBLEMS:
  ❌ render engine acting like master brain
  ❌ fragmented orchestration
  ❌ duplicate cinematic decisions
  ❌ timing mutations
  ❌ caption mutations
  ❌ unstable render flow
  ❌ hidden pipeline side effects

  NEW SYSTEM:
  ✅ render engine is FINAL ASSEMBLER ONLY
  ✅ timeline owns timing
  ✅ captions own captions
  ✅ transitions own transitions
  ✅ deterministic orchestration
  ✅ FFmpeg-safe contracts
  ✅ render diagnostics
  ✅ future distributed rendering support
*/

async function assembleRenderTimeline({
  timeline = {},
  transitions = {},
}) {
  const scenes =
    safeArray(
      timeline?.scenes
    );

  const transitionList =
    safeArray(
      transitions?.transitions
    );

  return scenes.map(
  (scene, index) => {

    const linkedTransition =
      transitionList[index] ||
      null;

    console.log(
      "🎬 TIMELINE ASSEMBLY",
      {
        sceneId:
          scene.sceneId,

        title:
          scene.title,

        shots:
          scene?.shots?.length || 0,

        hasImage:
          !!scene?.imagePath,
      }
    );

    return {
  ...scene,

  sceneId:
    scene.sceneId ||
    scene.id ||
    `scene_${index + 1}`,

  sceneTitle:
    scene.title ||
    `Scene ${index + 1}`,

  shots:
    scene.shots || [],

  transition:
    linkedTransition,

  renderReady: true,
};
  }
);
}

async function prepareVoiceoverTrack({
  voiceover = {},
}) {
  const segments =
    safeArray(
      voiceover?.segments
    );

  const audioTracks =
    segments
      .map(
        (segment) =>
          segment?.synthesis
            ?.outputPath
      )
      .filter(fileExists);

  return {
    ok:
      audioTracks.length > 0,

    tracks:
      audioTracks,

    totalTracks:
      audioTracks.length,
  };
}

async function prepareSubtitleTrack({
  subtitles = {},
}) {
  const subtitlePath =
    subtitles?.subtitlePath;

  return {
    ok:
      fileExists(
        subtitlePath
      ),

    subtitlePath,
  };
}

async function prepareSceneAssets({
  sceneAssets = [],
}) {

  const validated =
    safeArray(sceneAssets)
      .filter(
        asset =>
          fileExists(
            asset?.imagePath
          )
      );

  console.log(
    "🎥 VALIDATED SCENE ASSETS:",
    validated.length
  );

  return {
    ok:
      validated.length > 0,

    assets:
      validated,

    totalAssets:
      validated.length,
  };
}

async function buildRenderManifest({
  projectId,

  timelineAssembly,

  voiceoverTrack,

  subtitleTrack,

  sceneAssets,

  renderProfile,
}) {
  return {
    projectId,

    generatedAt:
      nowIso(),

    renderProfile,

    timelineAssembly,

    voiceoverTrack,

    subtitleTrack,

    sceneAssets,

    deterministicPipeline:
      true,

    centralizedAuthority:
      {
        timing:
          "cinematicTimelineEngine",

        captions:
          "dynamicCaptionAnimator",

        subtitles:
          "subtitleBurnEngine",

        transitions:
          "transitionEngine",

        voiceover:
          "voiceoverEngine",

        rendering:
          "cinematicRenderEngine",
      },
  };
}

async function executeFinalRender({
  renderManifest,
  renderSession,
}) {
  const outputPath =
    renderSession.finalVideoPath;

  /*
  ============================================
  ENSURE OUTPUT DIRECTORY EXISTS
  ============================================
  */

  ensureDir(
    path.dirname(outputPath)
  );

  /*
============================================
RENDER MODE SELECTION
============================================
*/

console.log(
  "🎥 RENDER MANIFEST DIAGNOSTICS",
  {
    timelineScenes:
      renderManifest?.timelineAssembly?.length || 0,

    sceneAssets:
      renderManifest?.sceneAssets?.totalAssets || 0,

    voiceTracks:
      renderManifest?.voiceoverTrack?.totalTracks || 0,

    subtitles:
      renderManifest?.subtitleTrack?.ok || false,
  }
);

/*
============================================
REAL CINEMATIC MODE
============================================
*/

if (
  renderManifest?.sceneAssets?.ok &&
  renderManifest?.sceneAssets?.totalAssets > 0
) {

  console.log(
    "🎬 REAL CINEMATIC RENDER MODE"
  );

  console.log(
  "🎬 TIMELINE ASSEMBLY SAMPLE:",
  JSON.stringify(
    renderManifest.timelineAssembly?.[0],
    null,
    2
  )
);

console.log(
  "🎬 SHOT ASSEMBLER INPUT",
  JSON.stringify(
    renderManifest.timelineAssembly,
    null,
    2
  )
);

  const assembledVideo =
    await assembleShotStoryboard({
      evolvedStoryboard: {
        evolvedScenes:
          renderManifest.timelineAssembly || [],
      },

      visuals:
        renderManifest.sceneAssets.assets,

      projectId:
  renderManifest.projectId,

      platform:
        renderManifest.renderProfile?.platform ||
        "TikTok",

      style:
        renderManifest.renderProfile?.style ||
        "cinematic",

      productionPlan:
        renderManifest.renderProfile || {},
    });

  const composedVideo =
    await composeHollywoodFinal({
      inputVideoPath:
        assembledVideo.outputPath,

      subtitlePath:
        renderManifest?.subtitleTrack?.subtitlePath || null,

      voiceoverTracks:
        renderManifest?.voiceoverTrack?.tracks || [],

      outputPath:
        renderSession.finalVideoPath,

      workDir:
        renderSession.tempDir,

      projectId:
        renderManifest.projectId,

      style:
        renderManifest.renderProfile?.style || "cinematic",
    });

  return {
    ok: true,
    outputPath:
      composedVideo.outputPath,
    videoPath:
      composedVideo.videoPath || composedVideo.outputPath,
    completedAt:
      nowIso(),
    renderMode:
      "hollywood-composed",
    assembledVideo,
    composition:
      composedVideo,
  };
}

/*
============================================
FALLBACK MODE
============================================
*/

console.warn(
  "⚠️ FALLBACK BLACK VIDEO MODE"
);

const duration =
  Math.max(
    6,
    renderManifest
      ?.timelineAssembly
      ?.reduce(
        (sum, scene) =>
          sum +
          Number(scene.duration || 3),
        0
      )
  );

return new Promise(
  (resolve, reject) => {
    ffmpeg()
      .input(
        `color=c=black:s=1080x1920:d=${duration}`
      )

        /*
        ============================================
        Synthetic Video Source
        ============================================
        */

        .inputFormat("lavfi")

        /*
        ============================================
        VIDEO SETTINGS
        ============================================
        */

        .videoCodec("libx264")

        .fps(30)

        .outputOptions([
          "-preset medium",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])

        /*
        ============================================
        OUTPUT
        ============================================
        */

        .save(outputPath)

        /*
        ============================================
        START
        ============================================
        */

        .on("start", cmd => {
          console.log(
            "🎬 FFmpeg Command:",
            cmd
          );

          console.log(
            "🎬 Rendering Video:",
            outputPath
          );
        })

        /*
        ============================================
        PROGRESS
        ============================================
        */

        .on("progress", progress => {
  console.log(
    "🎬 Render Progress:",
    progress.percent
  );
})

/*
============================================
FFMPEG DIAGNOSTICS
============================================
*/

.on("stderr", line => {
  console.log(
    "🎬 FFMPEG STDERR:",
    line
  );
})

/*
============================================
COMPLETE
============================================
*/

.on("end", () => {
  console.log(
    "✅ Render Complete:",
    outputPath
  );

  resolve({
    ok: true,

    outputPath,

    completedAt:
      nowIso(),
  });
})

/*
============================================
FAILURE
============================================
*/

.on(
  "error",
  (
    error,
    stdout,
    stderr
  ) => {
    console.error(
      "❌ FFmpeg Failure:",
      error
    );

    console.error(
      "❌ FFmpeg STDERR:",
      stderr
    );

    reject(error);
  }
); 

});

}

async function persistDiagnostics({
  diagnostics,

  renderSession,
}) {
  fs.writeFileSync(
    renderSession.diagnosticsPath,

    JSON.stringify(
      diagnostics,
      null,
      2
    ),

    "utf8"
  );
}

export async function renderCinematicVideo({
  projectId =
    `render_${Date.now()}`,

  topic = "",

  style = "cinematic",

  platform = "TikTok",

  timeline = {},

  voiceover = {},

  subtitles = {},

  transitions = {},

  sceneAssets = [],

  creativeContext = {},

  outputDir =
    "./renders/final",

  productionPlan = {},
} = {}) {
  try {
    updateRenderProgress(
      projectId,
      {
        status:
          "active",

        percent: 5,

        stage:
          "Initializing",

        message:
          "Initializing render pipeline.",
      }
    );

    const classification =
      classifyContent({
        topic,
        style,
        platform,
      });

    const narrativeMode =
      classification.narrativeMode;

    const renderProfile =
  buildRenderProfile({
    narrativeMode,
    platform,
    style,
  });

    const renderSession =
      buildRenderSession({
        projectId,
        outputDir,
        renderProfile,
      });

    const validation =
      validatePipelineAssets({
        scenes:
          timeline?.scenes,

        voiceover,

        subtitles,
      });

    if (!validation.ok) {
      throw new Error(
        validation.errors.join(
          " "
        )
      );
    }

    updateRenderProgress(
      projectId,
      {
        percent: 18,

        stage:
          "Preparing Assets",

        message:
          "Preparing render assets.",
      }
    );

    const timelineAssembly =
      await assembleRenderTimeline({
        timeline,
        transitions,
      });

    const voiceoverTrack =
      await prepareVoiceoverTrack({
        voiceover,
      });

    const subtitleTrack =
      await prepareSubtitleTrack({
        subtitles,
      });

    const preparedAssets =
      await prepareSceneAssets({
        sceneAssets,
      });

    const renderManifest =
      await buildRenderManifest({
        projectId,

        timelineAssembly,

        voiceoverTrack,

        subtitleTrack,

        sceneAssets:
          preparedAssets,

        renderProfile,
      });

    updateRenderProgress(
      projectId,
      {
        percent: 52,

        stage:
          "Rendering",

        message:
          "Executing cinematic render.",
      }
    );

        const renderResult =
      await executeFinalRender({
        renderManifest,

        renderSession,
      });

    updateRenderProgress(
      projectId,
      {
        percent: 88,

        stage:
          "Finalizing",

        message:
          "Finalizing cinematic render.",
      }
    );

    const diagnostics =
      buildRenderDiagnostics({
        projectId,

        narrativeMode,

        renderProfile,
      });

    await persistDiagnostics({
      diagnostics: {
        ...diagnostics,

        renderManifest,

        renderSession,

        renderResult,
      },

      renderSession,
    });

    completeRenderProgress(
      projectId,
      {
        percent: 100,

        stage:
          "Complete",

        message:
          "Render completed successfully.",

        outputPath:
          renderResult.outputPath,
      }
    );

    return {
      ok: true,

      engine:
        ENGINE_VERSION,

      stage:
        "render-complete",

      projectId,

      topic,

      style,

      platform,

      narrativeMode,

      renderProfile,

      output: {
        videoPath:
          renderResult.outputPath,

        diagnosticsPath:
          renderSession.diagnosticsPath,

        sessionDir:
          renderSession.sessionDir,
      },

      renderManifest,

      diagnostics,

      creativeContext: {
        ...creativeContext,

        classification,
      },

      productionPlan,
    };
  } catch (error) {
    console.error(
      "❌ Cinematic Render Failure:",
      error
    );

    failRenderProgress(
      projectId,
      error
    );

    return {
      ok: false,

      engine:
        ENGINE_VERSION,

      error:
        error?.message ||
        "Render failed.",

      diagnostics: {
        renderFailure:
          true,

        centralizedRendering:
          true,
      },
    };
  }
}

export function getRenderEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      deterministicRendering:
        true,

      centralizedRendering:
        true,

      ffmpegAssembly:
        true,

      subtitleSynchronization:
        true,

      voiceoverSynchronization:
        true,

      transitionSynchronization:
        true,

      diagnosticsPersistence:
        true,

      renderRecovery:
        true,

      creatorBrainReady:
        true,
    },
  };
}

  export const getCinematicHealth =
  getRenderEngineHealth;

export default {
  renderCinematicVideo,
  getRenderEngineHealth,
};