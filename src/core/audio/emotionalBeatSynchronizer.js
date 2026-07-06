// src/core/audio/emotionalBeatSynchronizer.js

const ENGINE_VERSION =
  "AstraMind Emotional Beat Synchronizer v1";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, n));
}

function normalizeEmotionProfile(profile = {}) {
  return {
    tension: clamp(profile.tension, 0, 100, 50),
    curiosity: clamp(profile.curiosity, 0, 100, 50),
    inspiration: clamp(profile.inspiration, 0, 100, 50),
    urgency: clamp(profile.urgency, 0, 100, 50),
  };
}

function buildAudioDirective(profile = {}) {
  const emotion = normalizeEmotionProfile(profile);

  let soundtrackEnergy = "medium";
  let soundtrackStyle = "cinematic";
  let transitionStyle = "smooth";
  let voiceIntensity = "balanced";

  if (emotion.tension >= 80) {
    soundtrackEnergy = "high";
    soundtrackStyle = "dark cinematic pulse";
    transitionStyle = "impact";
    voiceIntensity = "intense";
  } else if (emotion.inspiration >= 80) {
    soundtrackEnergy = "uplifting";
    soundtrackStyle = "inspirational cinematic";
    transitionStyle = "cinematic-rise";
    voiceIntensity = "uplifting";
  } else if (emotion.curiosity >= 75) {
    soundtrackEnergy = "mysterious";
    soundtrackStyle = "investigative pulse";
    transitionStyle = "slow reveal";
    voiceIntensity = "measured";
  }

  return {
    soundtrackEnergy,
    soundtrackStyle,
    transitionStyle,
    voiceIntensity,
  };
}

function buildVisualDirective(profile = {}) {
  const emotion = normalizeEmotionProfile(profile);

  let motionIntensity = 60;
  let zoomStyle = "cinematic drift";
  let captionStyle = "cinematic-clean";

  if (emotion.tension >= 80) {
    motionIntensity = 88;
    zoomStyle = "aggressive push";
    captionStyle = "bold-kinetic";
  } else if (emotion.curiosity >= 75) {
    motionIntensity = 72;
    zoomStyle = "investigative slow push";
  } else if (emotion.inspiration >= 80) {
    motionIntensity = 76;
    zoomStyle = "floating cinematic rise";
  }

  return {
    motionIntensity,
    zoomStyle,
    captionStyle,
  };
}

function buildBeatLabel(scene = {}) {
  const role =
    clean(scene.role).toLowerCase();

  if (role === "hook") {
    return "HOOK IMPACT";
  }

  if (role === "reveal") {
    return "CORE REVEAL";
  }

  if (role === "cta") {
    return "FINAL PUSH";
  }

  if (role === "resolution") {
    return "EMOTIONAL RESOLUTION";
  }

  return "NARRATIVE BUILD";
}

function buildNarrationCadence(profile = {}) {
  const emotion = normalizeEmotionProfile(profile);

  if (emotion.tension >= 80) {
    return {
      pacing: "fast controlled cadence",
      pauses: "short dramatic pauses",
      emphasis: "high",
      cadenceStyle:
        "impact narration",
    };
  }

  if (emotion.curiosity >= 75) {
    return {
      pacing: "measured investigative cadence",
      pauses: "longer suspense pauses",
      emphasis: "medium",
      cadenceStyle:
        "documentary suspense",
    };
  }

  if (emotion.inspiration >= 80) {
    return {
      pacing: "uplifting cinematic rhythm",
      pauses: "emotion-driven pauses",
      emphasis: "high",
      cadenceStyle:
        "inspirational cinematic",
    };
  }

  return {
    pacing: "balanced cinematic cadence",
    pauses: "natural pacing pauses",
    emphasis: "medium",
    cadenceStyle:
      "cinematic narration",
  };
}

export function synchronizeEmotionalBeats({
  narrativePlan = {},
  scenes = [],
  productionPlan = {},
  soundtrackProfile = {},
} = {}) {
  const narrativeScenes =
    Array.isArray(narrativePlan?.scenes)
      ? narrativePlan.scenes
      : Array.isArray(scenes)
      ? scenes
      : [];

  const synchronizedScenes =
    narrativeScenes.map((scene, index) => {
      const profile =
        normalizeEmotionProfile(
          scene?.emotionalProfile || {}
        );

      const audioDirective =
        buildAudioDirective(profile);

      const visualDirective =
        buildVisualDirective(profile);

      const narrationCadence =
        buildNarrationCadence(profile);

      return {
        ...scene,

        beatLabel:
          buildBeatLabel(scene),

        synchronizedEmotion:
          profile,

        soundtrackDirective:
          {
            ...audioDirective,
            soundtrackProfile,
          },

        cinematicVisualDirective:
          visualDirective,

        narrationCadence,

        synchronization: {
          sceneIndex: index,
          start:
            scene.start || 0,
          end:
            scene.end || 0,
          duration:
            scene.duration || 5,

          emotionalPeak:
            Math.max(
              profile.tension,
              profile.curiosity,
              profile.inspiration
            ),

          visualPeak:
            visualDirective.motionIntensity,

          voicePeak:
            narrationCadence.emphasis,
        },
      };
    });

  return {
    ok: true,
    engine:
      ENGINE_VERSION,

    totalScenes:
      synchronizedScenes.length,

    synchronizedScenes,

    globalDirectives: {
      soundtrackFlow:
        "Emotionally adaptive cinematic progression.",

      transitionFlow:
        "Transitions should align with emotional peaks.",

      narrationFlow:
        "Voice cadence adapts to scene emotion.",

      visualFlow:
        "Motion intensity rises and falls with narrative tension.",
    },

    productionPlan,
  };
}

export function buildBeatTimeline({
  synchronizedScenes = [],
} = {}) {
  return synchronizedScenes.map(
    (scene, index) => ({
      index,
      id: scene.id,
      role: scene.role,

      beatLabel:
        scene.beatLabel,

      start:
        scene.start || 0,

      end:
        scene.end || 0,

      duration:
        scene.duration || 5,

      motionIntensity:
        scene
          ?.cinematicVisualDirective
          ?.motionIntensity || 60,

      soundtrackEnergy:
        scene
          ?.soundtrackDirective
          ?.soundtrackEnergy || "medium",

      narrationCadence:
        scene
          ?.narrationCadence
          ?.cadenceStyle || "cinematic narration",
    })
  );
}

export function getEmotionalBeatSynchronizerHealth() {
  return {
    ok: true,
    engine:
      ENGINE_VERSION,

    supports: {
      emotionalSynchronization: true,
      soundtrackEmotionSync: true,
      narrationEmotionSync: true,
      motionEmotionSync: true,
      adaptiveBeatMapping: true,
      cinematicTransitionPlanning: true,
      visualPeakDetection: true,
    },
  };
}

export default {
  synchronizeEmotionalBeats,
  buildBeatTimeline,
  getEmotionalBeatSynchronizerHealth,
};