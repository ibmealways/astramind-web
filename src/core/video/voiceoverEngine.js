import fs from "fs";
import path from "path";

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Voiceover Engine v3 Unified";

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

function buildVoiceProfile({
  narrativeMode = "cinematic",
}) {
  const profiles = {
    documentary: {
      provider: "cinematic-doc",
      voice: "deep-investigative",
      cadence:
        "measured-atmospheric",
      emotionalIntensity: 72,
      speechRate: 0.92,
    },

    futuristic: {
      provider: "neural-premium",
      voice: "evolving-intelligence",
      cadence:
        "smooth-futuristic",
      emotionalIntensity: 88,
      speechRate: 1,
    },

    viral: {
      provider: "viral-expressive",
      voice: "high-retention",
      cadence:
        "fast-dynamic",
      emotionalIntensity: 96,
      speechRate: 1.12,
    },

    cinematic: {
      provider: "cinematic-premium",
      voice: "immersive-emotional",
      cadence:
        "cinematic-balanced",
      emotionalIntensity: 84,
      speechRate: 0.98,
    },

    standard: {
      provider: "standard",
      voice: "balanced",
      cadence:
        "natural",
      emotionalIntensity: 70,
      speechRate: 1,
    },
  };

  return (
    profiles[narrativeMode] ||
    profiles.standard
  );
}

function buildVoiceDirection({
  role = "build",
  emotionalProfile = {},
}) {
  const tension =
    emotionalProfile?.tension || 60;

  const inspiration =
    emotionalProfile?.inspiration ||
    60;

  let deliveryStyle =
    "balanced";

  let emphasis =
    "moderate";

  if (tension >= 90) {
    deliveryStyle =
      "dramatic";

    emphasis =
      "strong";
  }

  if (inspiration >= 90) {
    deliveryStyle =
      "uplifting";

    emphasis =
      "elevated";
  }

  if (role === "hook") {
    deliveryStyle =
      "retention-opening";

    emphasis =
      "very-strong";
  }

  if (role === "cta") {
    deliveryStyle =
      "confident-finale";

    emphasis =
      "strong";
  }

  return {
    deliveryStyle,
    emphasis,
  };
}

function buildVoiceSegments({
  timelineScenes = [],
  dialogueScenes = [],
  voiceProfile = {},
}) {
  return timelineScenes.map(
    (timelineScene, index) => {
      const dialogueScene =
        dialogueScenes[index] ||
        {};

      const dialogue =
        clean(
          dialogueScene
            ?.cinematicDialogue ||
            dialogueScene
              ?.expandedText ||
            dialogueScene?.text ||
            ""
        );

      const emotionalProfile =
        dialogueScene
          ?.emotionalProfile ||
        {};

      const direction =
        buildVoiceDirection({
          role:
            timelineScene.role,
          emotionalProfile,
        });

      return {
        id:
          timelineScene.id ||
          `voice_scene_${index + 1}`,

        role:
          timelineScene.role,

        startTime:
          timelineScene.startTime,

        endTime:
          timelineScene.endTime,

        duration:
          timelineScene.duration,

        text:
          dialogue,

        voice:
          voiceProfile.voice,

        cadence:
          voiceProfile.cadence,

        emotionalIntensity:
          voiceProfile.emotionalIntensity,

        speechRate:
          voiceProfile.speechRate,

        deliveryStyle:
          direction.deliveryStyle,

        emphasis:
          direction.emphasis,
      };
    }
  );
}

async function synthesizeVoiceSegment({
  segment,
  outputDir,
}) {
  /*
    PRODUCTION NOTE:

    Placeholder synthesis layer.

    Replace later with:
    - ElevenLabs
    - OpenAI TTS
    - Azure TTS
    - local neural synthesis
    - GPU voice rendering

    WITHOUT changing orchestration contracts.
  */

  const outputPath =
    path.join(
      outputDir,
      `${segment.id}.mp3`
    );

  return {
    ok: true,

    segmentId:
      segment.id,

    outputPath,

    duration:
      segment.duration,

    synthesized: true,
  };
}

export async function generateVoiceover({
  topic = "",

  style = "cinematic",

  platform = "TikTok",

  timeline = {},

  cinematicDialoguePlan = {},

  creativeContext = {},

  outputDir =
    "./renders/audio",

  productionPlan = {},

  directorState = null,
} = {}) {
  const classification =
    classifyContent({
      topic,
      style,
      platform,
    });

  const narrativeMode =
    classification.narrativeMode;

  const voiceProfile =
    {
      ...buildVoiceProfile({
        narrativeMode,
      }),
      directorVoiceStyle:
        directorState?.audio?.voiceStyle ||
        directorState?.sceneDirections?.[0]?.voiceDirection ||
        null,
      directorControlled:
        Boolean(directorState),
    };

  const timelineScenes =
    safeArray(
      timeline?.scenes
    );

  const dialogueScenes =
    safeArray(
      cinematicDialoguePlan?.directedScenes
    );

  if (!timelineScenes.length) {
    return {
      ok: false,

      engine:
        ENGINE_VERSION,

      error:
        "Timeline scenes missing.",

      diagnostics: {
        missingTimeline:
          true,
      },
    };
  }

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const voiceSegments =
    buildVoiceSegments({
      timelineScenes,
      dialogueScenes,
      voiceProfile,
    });

  const synthesizedSegments =
    [];

  for (const segment of voiceSegments) {
    const synthesized =
      await synthesizeVoiceSegment({
        segment,
        outputDir,
      });

    synthesizedSegments.push({
      ...segment,

      synthesis:
        synthesized,
    });
  }

  const totalRuntime =
    synthesizedSegments.reduce(
      (sum, segment) =>
        sum +
        segment.duration,
      0
    );

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "voiceover-generation",

    topic,

    style,

    platform,

    narrativeMode,

    voiceProfile,

    directorState,

    totalRuntime:
      Number(
        totalRuntime.toFixed(
          2
        )
      ),

    segments:
      synthesizedSegments,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      centralizedTimingAuthority:
        true,

      timelineDrivenVoiceover:
        true,

      duplicateTimingLogic:
        false,

      creatorBrainReady:
        true,
    },

    productionPlan,
  };
}

export function buildVoiceoverTimeline({
  voiceover = {},
} = {}) {
  const segments =
    safeArray(
      voiceover?.segments
    );

  return segments.map(
    (segment) => ({
      id:
        segment.id,

      role:
        segment.role,

      start:
        segment.startTime,

      end:
        segment.endTime,

      duration:
        segment.duration,

      voice:
        segment.voice,

      cadence:
        segment.cadence,

      deliveryStyle:
        segment.deliveryStyle,

      emphasis:
        segment.emphasis,
    })
  );
}

export function getVoiceoverEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      centralizedTimingAuthority:
        true,

      deterministicVoiceover:
        true,

      cinematicCadence:
        true,

      emotionalDelivery:
        true,

      timelineSynchronization:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  generateVoiceover,
  buildVoiceoverTimeline,
  getVoiceoverEngineHealth,
};