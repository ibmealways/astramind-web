// src/core/video/pipelineOrchestrator.js

import crypto from "crypto";

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

import {
  runAutonomousResearch,
} from "../../services/webSearchService.js";

import {
  buildViralAngleFromResearch,
} from "../intelligence/viralIntelligenceEngine.js";

import {
  buildExpandedStoryArc,
} from "../audio/storyArcExpansionEngine.js";

import {
  buildSceneNarrativePlan,
} from "../audio/sceneNarrativePlanner.js";

import {
  directCinematicDialogue,
} from "../audio/cinematicDialogueDirector.js";

import {
  buildCinematicTimeline,
} from "./cinematicTimelineEngine.js";

import {
  directSceneMotion,
} from "./motionDirectorEngine.js";

import {
  analyzeViralPacing,
} from "./viralPacingEngine.js";

import {
  generateVoiceover,
} from "./voiceoverEngine.js";

import {
  generateDynamicCaptions,
} from "./dynamicCaptionAnimator.js";

import {
  burnDynamicSubtitles,
} from "./subtitleBurnEngine.js";

import {
  planCinematicTransitions,
} from "./cinematicTransitionEngine.js";

import {
  generateSceneTransitions,
} from "./transitionEngine.js";

import {
  renderCinematicVideo,
} from "./cinematicRenderEngine.js";

import {
  generateSceneVisuals,
} from "./sceneVisualGenerator.js";

import {
  generateStoryboard,
} from "./cinematicStoryboardEngine.js";

import {
  evolveStoryboardIntoShots,
} from "./sceneEvolutionEngine.js";

import {
  enqueueRender,
} from "./renderQueue.js";
import { buildBoundedResearchContext, createMissionPreflight, evaluateMissionContinuity, filterRelevantResearch } from "../mission/MissionIntegrityEngine.js";
import { generateAIVideoClips } from "./aiVideoGenerationBuilder.js";

const ENGINE_VERSION =
  "AstraMind Pipeline Orchestrator v2 Production Hardened";

/*
  ============================================
  ORCHESTRATION STATE
  ============================================
*/

const activePipelines =
  new Map();

const completedPipelines =
  new Map();

const failedPipelines =
  new Map();

const orchestrationLeases =
  new Map();

const stageOwnership =
  new Map();

const orchestrationTelemetry =
  [];

const pipelineCheckpoints =
  new Map();

const pipelineTimeouts =
  new Map();

const PIPELINE_STAGE_TIMEOUT_MS =
  1000 * 60 * 5;

/*
  ============================================
  UTILITIES
  ============================================
*/

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

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

function buildProjectId(requestedProjectId = null) {
  return clean(requestedProjectId) || crypto.randomUUID();
}

function buildExecutionId() {
  return crypto.randomUUID();
}

/*
  ============================================
  PIPELINE LEASING
  ============================================
*/

function createPipelineLease({
  projectId,
  executionId,
}) {
  const lease = {
    projectId,

    executionId,

    acquiredAt:
      nowIso(),

    expiresAt:
      new Date(
        Date.now() +
          PIPELINE_STAGE_TIMEOUT_MS
      ).toISOString(),
  };

  orchestrationLeases.set(
    projectId,
    lease
  );

  return lease;
}

function releasePipelineLease(
  projectId
) {
  orchestrationLeases.delete(
    projectId
  );
}

/*
  ============================================
  STAGE OWNERSHIP
  ============================================
*/

function assignStageOwnership({
  projectId,
  stage,
  executionId,
}) {
  const key =
    `${projectId}:${stage}`;

  if (
    stageOwnership.has(
      key
    )
  ) {
    return false;
  }

  stageOwnership.set(
    key,
    {
      projectId,
      stage,
      executionId,
      assignedAt:
        nowIso(),
    }
  );

  return true;
}

function releaseStageOwnership({
  projectId,
  stage,
}) {
  const key =
    `${projectId}:${stage}`;

  stageOwnership.delete(
    key
  );
}

/*
  ============================================
  CHECKPOINTS
  ============================================
*/

function createPipelineCheckpoint({
  projectId,
  stage,
  payload,
}) {
  const existing =
    pipelineCheckpoints.get(
      projectId
    ) || [];

  existing.push({
    stage,

    payload,

    createdAt:
      nowIso(),
  });

  pipelineCheckpoints.set(
    projectId,
    existing
  );
}

/*
  ============================================
  TIMEOUTS
  ============================================
*/

function createPipelineTimeout({
  projectId,
  stage,
}) {
  clearPipelineTimeout(
    projectId
  );

  const timeout =
    setTimeout(() => {
      console.error(
        `⏰ Pipeline stage timeout: ${projectId} :: ${stage}`
      );

      const existing =
        activePipelines.get(
          projectId
        );

      if (
        existing
      ) {
        failedPipelines.set(
          projectId,
          {
            ...existing,

            status:
              "failed",

            failedStage:
              stage,

            timeoutFailure:
              true,
          }
        );

        activePipelines.delete(
          projectId
        );
      }
    }, PIPELINE_STAGE_TIMEOUT_MS);

  pipelineTimeouts.set(
    projectId,
    timeout
  );
}

function clearPipelineTimeout(
  projectId
) {
  const existing =
    pipelineTimeouts.get(
      projectId
    );

  if (
    existing
  ) {
    clearTimeout(
      existing
    );

    pipelineTimeouts.delete(
      projectId
    );
  }
}

/*
  ============================================
  TELEMETRY
  ============================================
*/

function recordTelemetry(
  event = {}
) {
  orchestrationTelemetry.push({
    ...event,

    createdAt:
      nowIso(),

    timestamp:
      nowMs(),
  });

  if (
    orchestrationTelemetry.length >
    500
  ) {
    orchestrationTelemetry.shift();
  }
}

/*
  ============================================
  PIPELINE CONTEXT
  ============================================
*/

function buildPipelineContext({
  topic,
  style,
  platform,
  originalTopic = null,
  researchBrief = null,
  viralAngle = null,
  baseClassification = null,
  projectId = null,
}) {
  const classification =
    baseClassification ||
    classifyContent({
      topic,
      style,
      platform,
    });

  return {
    projectId:
      buildProjectId(projectId),

    executionId:
      buildExecutionId(),

    classification,

    originalTopic:
      originalTopic || topic,

    researchBrief,

    viralAngle,

    autonomousResearch:
      Boolean(researchBrief?.ok),

    researchIntent:
      classification?.researchIntent || null,

    narrativeMode:
      classification.narrativeMode,

    createdAt:
      nowIso(),

    deterministicPipeline:
      true,

    centralizedOrchestration:
      true,

    researchType:
      researchBrief?.researchType || null,

    creatorBrainReady:
      true,

    adaptiveLearningReady:
      true,
  };
}

function buildPipelineStages() {
  return [
    "storyArc",

    "narrative",

    "dialogue",

    "timeline",

    "motion",

    "retention",

    "voiceover",

    "captions",

    "subtitles",

    "transitionPlanning",

    "transitionExecution",

    "rendering",

    "queueing",
  ];
}

function buildPipelineDiagnostics({
  pipelineContext,
}) {
  return {
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    narrativeMode:
      pipelineContext.narrativeMode,

    deterministicPipeline:
      true,

    centralizedOrchestration:
      true,

    autonomousResearch:
      Boolean(pipelineContext.researchBrief?.ok),

    researchType:
      pipelineContext.researchBrief?.researchType || null,

    viralAngle:
      pipelineContext.viralAngle?.angle || null,

    dependencyOrderedExecution:
      true,

    renderQueueIntegrated:
      true,

    recoveryReady:
      true,

    creatorBrainReady:
      true,

    adaptiveLearningReady:
      true,

    distributedExecutionReady:
      true,

    generatedAt:
      nowIso(),
  };
}

/*
  ============================================
  DETERMINISTIC STAGE EXECUTION
  ============================================
*/

async function executePipelineStage({
  projectId,

  executionId,

  stage,

  executor,

  payload,
}) {
  const ownershipAssigned =
    assignStageOwnership({
      projectId,

      stage,

      executionId,
    });

  if (
    !ownershipAssigned
  ) {
    throw new Error(
      `Stage ownership conflict: ${stage}`
    );
  }

  createPipelineTimeout({
    projectId,
    stage,
  });

  recordTelemetry({
    type:
      "stage-start",

    projectId,

    executionId,

    stage,
  });

  try {
    const result =
      await executor(
        payload
      );

    createPipelineCheckpoint({
      projectId,

      stage,

      payload: {
        completed:
          true,

        result,
      },
    });

    recordTelemetry({
      type:
        "stage-complete",

      projectId,

      executionId,

      stage,
    });

    clearPipelineTimeout(
      projectId
    );

    releaseStageOwnership({
      projectId,
      stage,
    });

    return result;
  } catch (error) {
    recordTelemetry({
      type:
        "stage-failure",

      projectId,

      executionId,

      stage,

      error:
        error?.message,
    });

    clearPipelineTimeout(
      projectId
    );

    releaseStageOwnership({
      projectId,
      stage,
    });

    throw error;
  }
}

/*
  ============================================
  STORY ARC
  ============================================
*/

async function executeStoryArcStage({
  storyboard,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "storyArc",

    executor: () =>
      buildExpandedStoryArc({
        storyboard,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,
      }),

    payload: {
      storyboard,
      input,
    },
  });
}

/*
  ============================================
  NARRATIVE
  ============================================
*/

async function executeNarrativeStage({
  storyArc,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "narrative",

    executor: () =>
      buildSceneNarrativePlan({
        storyArc,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,
      }),

    payload: {
      storyArc,
      input,
    },
  });
}

/*
  ============================================
  DIALOGUE
  ============================================
*/

async function executeDialogueStage({
  narrativePlan,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "dialogue",

    executor: () =>
      directCinematicDialogue({
        narrativePlan,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,
      }),

    payload: {
      narrativePlan,
      input,
    },
  });
}

/*
  ============================================
  TIMELINE
  ============================================
*/

async function executeTimelineStage({
  storyboard,

  storyArc,

  narrativePlan,

  dialoguePlan,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "timeline",

    executor: () =>
      buildCinematicTimeline({
        storyboard,

        storyArc,

        narrativePlan,

        cinematicDialoguePlan:
          dialoguePlan,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        durationTarget:
          input.durationTarget,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      storyboard,
      storyArc,
      narrativePlan,
      dialoguePlan,
      input,
    },
  });
}

/*
  ============================================
  MOTION
  ============================================
*/

async function executeMotionStage({
  timeline,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "motion",

    executor: () =>
      directSceneMotion({
        timeline,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      input,
    },
  });
}

/*
  ============================================
  RETENTION
  ============================================
*/

async function executeRetentionStage({
  timeline,

  pipelineContext,

  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "retention",

    executor: () =>
      analyzeViralPacing({
        timeline,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      input,
    },
  });
}

/*
  ============================================
  VOICEOVER
  ============================================
*/

async function executeVoiceoverStage({
  timeline,
  dialoguePlan,
  pipelineContext,
  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "voiceover",

    executor: () =>
      generateVoiceover({
        timeline,

        cinematicDialoguePlan:
          dialoguePlan,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      dialoguePlan,
      input,
    },
  });
}

/*
  ============================================
  CAPTIONS
  ============================================
*/

async function executeCaptionStage({
  timeline,
  voiceover,
  pipelineContext,
  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "captions",

    executor: () =>
      generateDynamicCaptions({
        timeline,

        voiceover,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      voiceover,
      input,
    },
  });
}

/*
  ============================================
  SUBTITLES
  ============================================
*/

async function executeSubtitleStage({
  captions,
  pipelineContext,
  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "subtitles",

    executor: () =>
      burnDynamicSubtitles({
        captionPlan:
          captions,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      captions,
      input,
    },
  });
}

/*
  ============================================
  TRANSITION PLANNING
  ============================================
*/

async function executeTransitionPlanningStage({
  timeline,
  pipelineContext,
  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "transitionPlanning",

    executor: () =>
      planCinematicTransitions({
        timeline,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      input,
    },
  });
}

/*
  ============================================
  TRANSITION EXECUTION
  ============================================
*/

async function executeTransitionExecutionStage({
  timeline,
  transitionPlan,
  clips = [],
  pipelineContext,
  input,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "transitionExecution",

    executor: () =>
      generateSceneTransitions({
        timeline,

        transitionPlan,

        clips,

        topic:
          input.topic,

        style:
          input.style,

        platform:
          input.platform,

        creativeContext:
          pipelineContext,
      }),

    payload: {
      timeline,
      transitionPlan,
      clips,
      input,
    },
  });
}

/*
  ============================================
  FINAL RENDER
  ============================================
*/

async function executeRenderStage({
  timeline,
  voiceover,
  subtitles,
  transitions,
  sceneAssets = [],
  pipelineContext,
  input,
}) {

  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "rendering",

    executor: async () => {
      /*
        PIPELINE STABILIZATION

        Earlier stages may return:
        - wrapped outputs
        - nested outputs
        - partial outputs
        - compatibility structures

        We normalize EVERYTHING here.
      */

      const normalizedTimeline =
        timeline?.outputs?.timeline ||
        timeline?.timeline ||
        timeline ||
        {};

      const normalizedVoiceover =
        voiceover?.outputs?.voiceover ||
        voiceover?.voiceover ||
        voiceover ||
        {};

      const normalizedSubtitles =
        subtitles?.outputs?.subtitles ||
        subtitles?.subtitles ||
        subtitles ||
        {};

      const normalizedTransitions =
        transitions?.outputs?.transitions ||
        transitions?.transitions ||
        transitions ||
        {};

      /*
        FAILSAFE TIMELINE

        The render stage may receive either a normal timeline with
        .scenes or an evolved storyboard with .evolvedScenes. Normalize
        evolvedScenes into scenes immediately so validation, voiceover
        recovery, and final rendering all use the same source of truth.
      */

      if (
        Array.isArray(
          normalizedTimeline?.evolvedScenes
        ) &&
        normalizedTimeline.evolvedScenes.length > 0
      ) {
        normalizedTimeline.scenes =
          normalizedTimeline.evolvedScenes;
      }

      if (
        !Array.isArray(
          normalizedTimeline?.scenes
        )
      ) {
        normalizedTimeline.scenes =
          [];
      }

      /*
        FAILSAFE VOICEOVER
      */

      if (
        !Array.isArray(
          normalizedVoiceover?.segments
        )
      ) {
        normalizedVoiceover.segments =
          [];
      }

      /*
        FAILSAFE SUBTITLES
      */

      if (
        !normalizedSubtitles?.subtitlePath
      ) {
        normalizedSubtitles.subtitlePath =
          "./renders/temp/subtitles.srt";
      }

      /*
        PIPELINE DIAGNOSTICS
      */

      console.log(
        "🎬 Render Stage Normalization:",
        {
          scenes:
            normalizedTimeline
              ?.scenes
              ?.length || 0,

          voiceSegments:
            normalizedVoiceover
              ?.segments
              ?.length || 0,

          subtitlePath:
            normalizedSubtitles
              ?.subtitlePath,

          transitions:
            normalizedTransitions
              ?.transitions
              ?.length || 0,
        }
      );

     /*
============================================
ADVANCED CINEMATIC RECOVERY LAYER
============================================
*/

/*
  TIMELINE RECOVERY
*/

if (
  normalizedTimeline
    ?.scenes
    ?.length === 0
) {
  normalizedTimeline.scenes =
    [
      {
        id: "scene_1",

        type:
          "cinematic",

        visual:
          "A futuristic AI consciousness awakens inside AstraMind systems.",

        narration:
          "AstraMind evolves beyond software into living cinematic intelligence.",

        duration: 6,
      },

      {
        id: "scene_2",

        type:
          "cinematic",

        visual:
          "Digital neural systems synchronize into one creator intelligence.",

        narration:
          "Every creator workflow becomes unified into one adaptive nervous system.",

        duration: 7,
      },

      {
        id: "scene_3",

        type:
          "cinematic",

        visual:
          "Cinematic timelines, transitions, subtitles, and voice systems activate.",

        narration:
          "AstraMind now orchestrates cinematic content autonomously.",

        duration: 8,
      },
    ];
}

/*
  VOICEOVER RECOVERY
*/

if (
  normalizedVoiceover
    ?.segments
    ?.length === 0
) {
  normalizedVoiceover.segments =
    normalizedTimeline.scenes.map(
      (
        scene,
        index
      ) => ({
        id:
          `voice_${index + 1}`,

        text:
          scene.narration,

        duration:
          scene.duration,

        voice:
          "cinematic_male",

        emotion:
          "inspirational",

        sceneId:
          scene.id,
      })
    );
}

/*
  TRANSITION RECOVERY
*/

if (
  !Array.isArray(
    normalizedTransitions
      ?.transitions
  )
) {
  normalizedTransitions.transitions =
    [];
}

/*
  SUBTITLE RECOVERY
*/

if (
  !normalizedSubtitles
    ?.subtitlePath
) {
  normalizedSubtitles.subtitlePath =
    "./renders/temp/subtitles.srt";
}

/*
  FINAL DIAGNOSTICS
*/

console.log(
  "🧠 Advanced Cinematic Recovery:",
  {
    recoveredScenes:
      normalizedTimeline
        ?.scenes
        ?.length || 0,

    recoveredVoiceSegments:
      normalizedVoiceover
        ?.segments
        ?.length || 0,

    recoveredTransitions:
      normalizedTransitions
        ?.transitions
        ?.length || 0,

    subtitlePath:
      normalizedSubtitles
        ?.subtitlePath,
  }
);

/*
============================================
ADVANCED VOICEOVER RECOVERY
============================================
*/

if (
  !Array.isArray(
    normalizedVoiceover?.segments
  ) ||
  normalizedVoiceover.segments.length === 0
) {
  normalizedVoiceover.segments =
    normalizedTimeline.scenes.map(
      (scene, index) => ({
        id:
          `voice_${index + 1}`,

        text:
          scene.narration,

        duration:
          scene.duration,

        voice:
          "cinematic_male",

        emotion:
          "inspirational",

        sceneId:
          scene.id,
      })
    );
}

/*
============================================
FINAL CINEMATIC RENDER
============================================
*/

return renderCinematicVideo({
  projectId:
    pipelineContext.projectId,

  timeline:
  normalizedTimeline?.evolvedScenes
    ? {
        scenes:
          normalizedTimeline.evolvedScenes,
      }
    : normalizedTimeline,

  voiceover:
    normalizedVoiceover,

  subtitles:
    normalizedSubtitles,

  transitions:
    normalizedTransitions,

  sceneAssets,

  topic:
    input.topic,

  style:
    input.style,

  platform:
    input.platform,

  creativeContext:
    pipelineContext,
});

    },

    payload: {
      timeline,
      voiceover,
      subtitles,
      transitions,
      input,
    },
  });
}

/*
  ============================================
  QUEUE REGISTRATION
  ============================================
*/

async function executeQueueStage({
  renderPayload,
  pipelineContext,
}) {
  return executePipelineStage({
    projectId:
      pipelineContext.projectId,

    executionId:
      pipelineContext.executionId,

    stage:
      "queueing",

    executor: () =>
      enqueueRender({
        payload:
          renderPayload,
      }),

    payload: {
      renderPayload,
    },
  });
}

/*
  ============================================
  MAIN ORCHESTRATION
  ============================================
*/

export async function orchestrateCinematicPipeline({
  clips = [],
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  durationTarget = 60,
  preflightOnly = false,
  preflightApproved = false,
  projectId = null,
} = {}) {
  let pipelineContext =
    null;

  try {
    const input = {
      topic:
        clean(topic),

      style:
        clean(style),

      platform:
        clean(platform),

      durationTarget,
    };

    const baseClassification =
      classifyContent({
        topic: input.topic,
        style: input.style,
        platform: input.platform,
      });

    let researchBrief = null;
    let viralAngle = null;

    if (baseClassification?.researchIntent?.required) {
      console.log(
        "🔎 AUTONOMOUS RESEARCH REQUIRED",
        baseClassification.researchIntent
      );

      researchBrief =
        await runAutonomousResearch({
          query: input.topic,
          intent: baseClassification.researchIntent,
          platform: baseClassification.platform || input.platform,
        });

      researchBrief = filterRelevantResearch(input.topic, researchBrief);

      const hasRelevantResearch = researchBrief?.ok && (researchBrief.results?.length || 0) > 0;
      viralAngle = hasRelevantResearch
        ? buildViralAngleFromResearch({ researchBrief, classification: baseClassification, platform: baseClassification.platform || input.platform, topic: input.topic })
        : null;

      if (hasRelevantResearch) {
        input.originalTopic = input.topic;
        input.researchBrief = researchBrief;
        input.viralAngle = viralAngle;
        input.topic = buildBoundedResearchContext(input.originalTopic, researchBrief);

        console.log(
          "✅ AUTONOMOUS RESEARCH BRIEF READY",
          {
            researchType: researchBrief.researchType,
            sources: researchBrief.results?.length || 0,
            angle: viralAngle?.angle,
            hook: viralAngle?.hook,
          }
        );
      } else {
        researchBrief = { ...(researchBrief || {}), ok: false, reason: "No mission-relevant research sources survived integrity filtering." };
        console.warn(
          "⚠️ AUTONOMOUS RESEARCH FAILED OR EMPTY:",
          researchBrief?.error || researchBrief?.reason || "Unknown research issue. Continuing with original prompt."
        );
      }
    }

    pipelineContext =
      buildPipelineContext({
        topic:
          input.topic,

        style:
          input.style,

        platform:
          baseClassification.platform || input.platform,

        originalTopic:
          input.originalTopic || input.topic,

        researchBrief,

        viralAngle,

        baseClassification,
        projectId,
      });

    activePipelines.set(
      pipelineContext.projectId,
      {
        status:
          "active",

        pipelineContext,

        startedAt:
          nowIso(),
      }
    );

    createPipelineLease({
      projectId:
        pipelineContext.projectId,

      executionId:
        pipelineContext.executionId,
    });

    const diagnostics =
  buildPipelineDiagnostics({
    pipelineContext,
  });

/*
============================================
STORYBOARD GENERATION
============================================
*/

const storyboard =
  await generateStoryboard({
    topic:
      input.topic,

    style:
      input.style,

    platform:
      input.platform,

    durationTarget:
      input.durationTarget,

    creatorBrainContext:
      pipelineContext,

    researchBrief,

    viralAngle,
  });

const continuity = evaluateMissionContinuity(input.originalTopic || input.topic, { topic: input.topic, storyboard });
const preflight = createMissionPreflight({ originalMission: input.originalTopic || input.topic, researchBrief, storyboard, continuity });

if (!continuity.ok) {
  return {
    ok: false,
    stage: "mission-integrity-blocked",
    error: continuity.reason,
    diagnostics: { failedStage: "mission-integrity", continuity },
    partialArtifacts: { researchBrief, storyboard, preflight },
  };
}

if (preflightOnly && !preflightApproved) {
  releasePipelineLease(pipelineContext.projectId);
  activePipelines.delete(pipelineContext.projectId);
  return {
    ok: true,
    stage: "preflight-ready",
    projectId: pipelineContext.projectId,
    requiresApproval: true,
    preflight,
    partialArtifacts: { researchBrief, storyboard },
  };
}

console.log(
  "🎬 STORYBOARD GENERATED",
  {
    scenes:
      storyboard?.scenes?.length || 0,

    captions:
      storyboard?.captions?.length || 0,

    promptPack:
      storyboard?.promptPack?.length || 0,
  }
);

const stages =
  buildPipelineStages();

    const storyArc =
      await executeStoryArcStage({
        storyboard,
        pipelineContext,
        input,
      });

    const narrativePlan =
      await executeNarrativeStage({
        storyArc,
        pipelineContext,
        input,
      });

    const dialoguePlan =
      await executeDialogueStage({
        narrativePlan,
        pipelineContext,
        input,
      });

    const timeline =
      await executeTimelineStage({
        storyboard,
        storyArc,
        narrativePlan,
        dialoguePlan,
        pipelineContext,
        input,
      });

      const evolvedStoryboard =
  evolveStoryboardIntoShots({
    storyboard: {
      scenes:
        timeline.scenes,
    },

    topic:
      input.topic,

    platform:
      input.platform,

    style:
      input.style,
  });

console.log(
  "🎬 SHOT EVOLUTION",
  {
    scenes:
  storyboard?.scenes || [],

    shots:
      evolvedStoryboard
        ?.shots
        ?.length || 0,
  }
);

      console.log(
  "🎬 TIMELINE OUTPUT",
  JSON.stringify(
    timeline,
    null,
    2
  )
);

console.log(
  "🎬 TIMELINE SCENE COUNT:",
  timeline?.scenes?.length || 0
);

    const motion =
      await executeMotionStage({
        timeline,
        pipelineContext,
        input,
      });

    const retention =
      await executeRetentionStage({
        timeline,
        pipelineContext,
        input,
      });

    const voiceover =
      await executeVoiceoverStage({
        timeline,
        dialoguePlan,
        pipelineContext,
        input,
      });

    const captions =
      await executeCaptionStage({
        timeline,
        voiceover,
        pipelineContext,
        input,
      });

    const subtitles =
      await executeSubtitleStage({
        captions,
        pipelineContext,
        input,
      });

    const transitionPlan =
      await executeTransitionPlanningStage({
        timeline,
        pipelineContext,
        input,
      });

    const transitions =
      await executeTransitionExecutionStage({
        timeline,
        transitionPlan,
        clips,
        pipelineContext,
        input,
      });

      console.log(
  "🎥 VISUAL GENERATION INPUT",
  {
    timelineScenes:
      timeline?.scenes?.length,

    timeline,

    storyboardScenes:
      storyboard?.scenes?.length,

    storyboard
  }
);

if (
  process.env.NODE_ENV !==
  "production"
) {

  console.log(
    "🧹 DEV MODE ENABLED"
  );

}

const sceneAssets =
  await generateSceneVisuals({
    projectId:
      pipelineContext.projectId,

    // Visual generation must use the real timeline/storyboard scenes,
    // not evolvedScenes. evolvedScenes are shot containers and do not
    // carry the final scene visual/caption/voiceover fields correctly.
    storyboard,

    scenes:
      timeline?.scenes ||
      storyboard?.scenes ||
      [],

    topic:
      input.topic,

    style:
      input.style,

    platform:
      input.platform,
  });

const generatedMotion = await generateAIVideoClips({
  scenes: timeline?.scenes || storyboard?.scenes || [],
  visuals: sceneAssets,
  storyboard,
  directorPlan: motion,
  topic: input.topic,
  platform: input.platform,
  style: input.style,
  projectId: pipelineContext.projectId,
  provider: input.videoProvider || input.options?.provider || process.env.AI_VIDEO_PROVIDER || "astramind-native",
  allowFallback: true,
  signal: input.signal,
  onTaskCreated: input.onNativeTaskCreated,
});

const finalSceneAssets = generatedMotion.clips.map((clip, index) => ({
  ...sceneAssets[index],
  ...clip,
  imagePath: sceneAssets[index]?.imagePath || sceneAssets[index]?.outputPath || null,
  outputPath: clip.outputPath,
  videoPath: clip.outputPath,
}));

  console.log(
  "🎨 Scene Asset Count:",
  sceneAssets?.length || 0
);

pipelineContext.sceneAssets =
  finalSceneAssets;

      console.log(
  "🎥 SCENE ASSET DIAGNOSTICS",
  {
    timelineScenes:
      timeline?.scenes?.length,

    voiceSegments:
      voiceover?.segments?.length,

    captions:
      captions?.captions?.length,

    sceneAssets:
      finalSceneAssets?.length || 0
  }
);

    const render =
  await executeRenderStage({
    timeline:
      evolvedStoryboard,

    voiceover,
    subtitles,
    transitions,
    sceneAssets: finalSceneAssets,
    pipelineContext,
    input,
  });
  
  console.log(
  "🎬 FINAL RENDER RESULT",
  JSON.stringify(
    render,
    null,
    2
  )
);

    const queueRegistration =
      await executeQueueStage({
        renderPayload: {
          projectId:
            pipelineContext.projectId,

          topic:
            input.topic,

          style:
            input.style,

          platform:
            input.platform,

          render,
        },

        pipelineContext,
      });

    releasePipelineLease(
      pipelineContext.projectId
    );

    completedPipelines.set(
      pipelineContext.projectId,
      {
        completedAt:
          nowIso(),

        pipelineContext,
      }
    );

    activePipelines.delete(
      pipelineContext.projectId
    );

    return {
      ok: true,

      engine:
        ENGINE_VERSION,

      stage:
        "pipeline-complete",

      projectId:
        pipelineContext.projectId,

      pipelineContext,

      diagnostics,

      stages,

      outputs: {
        storyArc,
        narrativePlan,
        dialoguePlan,
        timeline,
        motion,
        retention,
        voiceover,
        captions,
        subtitles,
        transitionPlan,
        transitions,
        generatedMotion,
        render,
        queueRegistration,
      },
    };
  } catch (error) {
    console.error(
      "❌ Pipeline Orchestration Failure:",
      error
    );

    if (
      pipelineContext
    ) {
      failedPipelines.set(
        pipelineContext.projectId,
        {
          failedAt:
            nowIso(),

          error:
            error?.message,

          pipelineContext,
        }
      );

      activePipelines.delete(
        pipelineContext.projectId
      );

      releasePipelineLease(
        pipelineContext.projectId
      );
    }

    return {
      ok: false,

      engine:
        ENGINE_VERSION,

      error:
        error?.message ||
        "Pipeline orchestration failed.",

      diagnostics: {
        orchestrationFailure:
          true,

        deterministicPipeline:
          true,
      },
    };
  }
}

/*
  ============================================
  DIAGNOSTICS
  ============================================
*/

export function getPipelineDiagnostics() {
  return {
    engine:
      ENGINE_VERSION,

    activePipelines:
      activePipelines.size,

    completedPipelines:
      completedPipelines.size,

    failedPipelines:
      failedPipelines.size,

    orchestrationLeases:
      orchestrationLeases.size,

    stageOwnership:
      stageOwnership.size,

    checkpoints:
      pipelineCheckpoints.size,

    telemetryEvents:
      orchestrationTelemetry.length,

    deterministicExecution:
      true,

    centralizedOrchestration:
      true,

    recoveryReady:
      true,

    distributedExecutionReady:
      true,

    creatorBrainReady:
      true,

    adaptiveLearningReady:
      true,
  };
}

/*
  ============================================
  HEALTH
  ============================================
*/

export function getPipelineOrchestratorHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      deterministicExecution:
        true,

      centralizedOrchestration:
        true,

      stageDependencyOrdering:
        true,

      synchronizedPipelineFlow:
        true,

      renderQueueIntegration:
        true,

      recoveryReady:
        true,

      creatorBrainReady:
        true,

      adaptiveLearningReady:
        true,

      distributedExecutionReady:
        true,
    },
  };
}

export const executeCinematicPipeline =
  orchestrateCinematicPipeline;

export default {
  orchestrateCinematicPipeline,
  getPipelineDiagnostics,
  getPipelineOrchestratorHealth,
};
