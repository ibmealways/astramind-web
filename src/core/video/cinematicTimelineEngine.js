// src/core/video/cinematicTimelineEngine.js

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Cinematic Timeline Engine v5 Nervous System Authority";

/*
  ============================================
  UTILITIES
  ============================================
*/

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

/*
  ============================================
  ROLE INTELLIGENCE
  ============================================
*/

function buildTimelineRole(
  index = 0,
  total = 5
) {
  if (index === 0) {
    return "hook";
  }

  if (index === total - 1) {
    return "cta";
  }

  const midpoint =
    Math.floor(total / 2);

  if (index === midpoint) {
    return "reveal";
  }

  if (index < midpoint) {
    return "build";
  }

  return "resolution";
}

function buildRoleTimingWeight(
  role = "build"
) {
  switch (role) {
    case "hook":
      return 1.35;

    case "reveal":
      return 1.5;

    case "cta":
      return 0.85;

    case "resolution":
      return 0.95;

    default:
      return 1;
  }
}

/*
  ============================================
  MOTION PROFILE
  ============================================
*/

function buildMotionProfile({
  role = "build",
  narrativeMode = "cinematic",
  visualProfile = {},
}) {
  const motionStyle =
    visualProfile.motionStyle ||
    "cinematic";

  const transitionStyle =
    visualProfile.transitionStyle ||
    "cinematic";

  const cameraStyle =
    visualProfile.cameraStyle ||
    "cinematic";

  let transitionEnergy = 70;
  let zoomIntensity = 60;
  let cameraMotion =
    motionStyle;

  if (narrativeMode === "viral") {
    transitionEnergy = 96;
    zoomIntensity = 92;
    cameraMotion =
      "fast-kinetic";
  }

  if (
    narrativeMode ===
    "documentary"
  ) {
    transitionEnergy = 52;
    zoomIntensity = 38;
    cameraMotion =
      "slow-investigative";
  }

  if (
    narrativeMode ===
    "futuristic"
  ) {
    transitionEnergy = 78;
    zoomIntensity = 70;
    cameraMotion =
      "floating-neural";
  }

  if (role === "hook") {
    transitionEnergy += 10;
    zoomIntensity += 12;
  }

  if (role === "reveal") {
    transitionEnergy += 8;
    zoomIntensity += 6;
  }

  return {
    cameraMotion,

    transitionStyle,

    cameraStyle,

    transitionEnergy:
      clamp(
        transitionEnergy,
        0,
        100,
        70
      ),

    zoomIntensity:
      clamp(
        zoomIntensity,
        0,
        100,
        60
      ),
  };
}

/*
  ============================================
  PACING
  ============================================
*/

function buildScenePacing({
  role = "build",
  narrativeMode = "cinematic",
}) {
  const pacingMap = {
    viral: {
      hook: 98,
      build: 82,
      reveal: 96,
      resolution: 70,
      cta: 76,
    },

    documentary: {
      hook: 72,
      build: 66,
      reveal: 82,
      resolution: 60,
      cta: 62,
    },

    futuristic: {
      hook: 84,
      build: 74,
      reveal: 90,
      resolution: 72,
      cta: 78,
    },

    cinematic: {
      hook: 86,
      build: 72,
      reveal: 92,
      resolution: 70,
      cta: 75,
    },

    standard: {
      hook: 80,
      build: 68,
      reveal: 85,
      resolution: 66,
      cta: 70,
    },
  };

  const mode =
    pacingMap[narrativeMode] ||
    pacingMap.standard;

  return (
    mode[role] || 70
  );
}

function buildTimelineEnergyCurve(
  role = "build"
) {
  switch (role) {
    case "hook":
      return "high-retention-entry";

    case "build":
      return "progressive-escalation";

    case "reveal":
      return "cinematic-climax";

    case "resolution":
      return "controlled-release";

    case "cta":
      return "forward-momentum";

    default:
      return "balanced";
  }
}

/*
  ============================================
  EMOTIONAL CONTINUITY
  ============================================
*/

function buildEmotionalContinuity({
  previousScene = null,
  currentScene = {},
}) {
  const previousEmotion =
    previousScene
      ?.emotionalArc
      ?.emotionalState ||
    "neutral";

  const currentEmotion =
    currentScene
      ?.emotionalArc
      ?.emotionalState ||
    "neutral";

  let continuityPressure =
    65;

  if (
    previousEmotion !==
    currentEmotion
  ) {
    continuityPressure =
      82;
  }

  if (
    currentEmotion ===
    "payoff"
  ) {
    continuityPressure =
      96;
  }

  return {
    previousEmotion,

    currentEmotion,

    continuityPressure,

    emotionalBridge:
      `${previousEmotion}-to-${currentEmotion}`,

    cinematicContinuity:
      continuityPressure >=
      80,
  };
}

/*
  ============================================
  TRANSITION PRESSURE
  ============================================
*/

function buildTimelineTransitionPressure({
  scene = {},
  narrativeMode = "cinematic",
}) {
  let pressure = 70;

  if (
    narrativeMode ===
    "viral"
  ) {
    pressure = 94;
  }

  if (
    narrativeMode ===
    "documentary"
  ) {
    pressure = 48;
  }

  if (
    narrativeMode ===
    "futuristic"
  ) {
    pressure = 80;
  }

  const emotionalIntensity =
    scene
      ?.emotionalArc
      ?.emotionalIntensity ||
    70;

  pressure += Math.round(
    emotionalIntensity *
      0.1
  );

  if (
    scene
      ?.retentionPattern
      ?.replayTrigger
  ) {
    pressure += 12;
  }

  return clamp(
    pressure,
    0,
    100,
    70
  );
}

/*
  ============================================
  REPLAY PROPAGATION
  ============================================
*/

function buildReplayPropagation({
  scene = {},
}) {
  const replayTrigger =
    scene
      ?.retentionPattern
      ?.replayTrigger ||
    false;

  return {
    replayTrigger,

    replayMomentum:
      replayTrigger
        ? 95
        : 65,

    replayBias:
      replayTrigger
        ? "high"
        : "standard",

    replayContinuity:
      replayTrigger,
  };
}

/*
  ============================================
  CINEMATIC VELOCITY
  ============================================
*/

function buildCinematicVelocity({
  scene = {},
  pacingWeight = 70,
  transitionPressure = 70,
}) {
  const emotionalIntensity =
    scene
      ?.emotionalArc
      ?.emotionalIntensity ||
    70;

  const replayBoost =
    scene
      ?.retentionPattern
      ?.replayTrigger
      ? 12
      : 0;

  return clamp(
    Math.round(
      (
        emotionalIntensity +
        pacingWeight +
        transitionPressure +
        replayBoost
      ) / 4
    ),
    0,
    100,
    72
  );
}

/*
  ============================================
  MOTION SYNCHRONIZATION
  ============================================
*/

function buildMotionSynchronization({
  motionProfile = {},
  scene = {},
}) {
  return {
    synchronizedMotion:
      true,

    cameraMotion:
      motionProfile.cameraMotion,

    transitionStyle:
      motionProfile.transitionStyle,

    cameraStyle:
      motionProfile.cameraStyle,

    cinematicVelocity:
      scene.cinematicVelocity,

    replayOptimized:
      scene
        ?.retentionPattern
        ?.replayTrigger ||
      false,

    emotionalSynchronization:
      true,
  };
}

/*
  ============================================
  TIMELINE DURATION
  ============================================
*/

function calculateTimelineDurations({
  scenes = [],
  durationTarget = 60,
}) {
  const totalWeight =
    scenes.reduce(
      (sum, scene) =>
        sum +
        scene.timelineWeight,
      0
    ) || 1;

  let currentTime = 0;

  return scenes.map(
    (scene) => {
      const ratio =
        scene.timelineWeight /
        totalWeight;

      const duration =
        clamp(
          Number(
            (
              durationTarget *
              ratio
            ).toFixed(2)
          ),
          2,
          45,
          5
        );

      const output = {
        ...scene,

        startTime:
          Number(
            currentTime.toFixed(
              2
            )
          ),

        duration,

        endTime:
          Number(
            (
              currentTime +
              duration
            ).toFixed(2)
          ),
      };

      currentTime += duration;

      return output;
    }
  );
}

/*
  ============================================
  MAIN ENGINE
  ============================================
*/

export function buildCinematicTimeline({
  storyboard = {},
  storyArc = {},
  narrativePlan = {},
  cinematicDialoguePlan = {},
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  durationTarget = 60,
  creativeContext = {},
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

  const visualProfile =
    classification.visualProfile ||
    {};

  const storyboardScenes =
    Array.isArray(
      storyboard?.scenes
    )
      ? storyboard.scenes
      : [];

  const sourceScenes =
    storyboardScenes;

  const normalizedDuration =
    clamp(
      durationTarget,
      15,
      600,
      60
    );

  const preparedScenes =
    sourceScenes.map(
      (
        scene,
        index
      ) => {
        const role =
          scene.role ||
          scene.sceneRole ||
          buildTimelineRole(
            index,
            sourceScenes.length
          );

        const emotionalArc =
          scene
            ?.emotionalArc || {
              emotionalState:
                "build",

              emotionalIntensity:
                70,
            };

        const retentionPattern =
          scene
            ?.retentionPattern || {
              retentionGoal:
                "balanced",

              replayTrigger:
                false,
            };

        const motionProfile =
          buildMotionProfile({
            role,
            narrativeMode,
            visualProfile,
          });

        const pacingWeight =
          buildScenePacing({
            role,
            narrativeMode,
          });

        const previousScene =
          index > 0
            ? sourceScenes[
                index - 1
              ]
            : null;

        const emotionalContinuity =
          buildEmotionalContinuity({
            previousScene,
            currentScene:
              scene,
          });

        const transitionPressure =
          buildTimelineTransitionPressure({
            scene,
            narrativeMode,
          });

        const replayPropagation =
          buildReplayPropagation({
            scene,
          });

        const cinematicVelocity =
          buildCinematicVelocity({
            scene,
            pacingWeight,
            transitionPressure,
          });

        const synchronizedScene =
          {
            ...scene,
            cinematicVelocity,
          };

        const motionSynchronization =
          buildMotionSynchronization({
            motionProfile,
            scene:
              synchronizedScene,
          });

        return {
          ...scene,

          timelineIndex:
            index,

          role,

          narrativeMode,

          emotionalArc,

          retentionPattern,

          timelineWeight:
            buildRoleTimingWeight(
              role
            ),

          pacingWeight,

          energyCurve:
            buildTimelineEnergyCurve(
              role
            ),

          motionProfile,

          motionSynchronization,

          cameraMotion:
            motionProfile.cameraMotion,

          transitionStyle:
            motionProfile.transitionStyle,

          transitionEnergy:
            motionProfile.transitionEnergy,

          zoomIntensity:
            motionProfile.zoomIntensity,

          cameraStyle:
            motionProfile.cameraStyle,

          emotionalContinuity,

          transitionPressure,

          replayPropagation,

          cinematicVelocity,
        };
      }
    );

  const timelineScenes =
    calculateTimelineDurations({
      scenes:
        preparedScenes,

      durationTarget:
        normalizedDuration,
    });

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "cinematic-timeline",

    topic,

    style,

    platform,

    narrativeMode,

    durationTarget:
      normalizedDuration,

    scenes:
      timelineScenes,

    creativeContext: {
      ...creativeContext,
      classification,
    },

    productionPlan,
  };
}

export function getTimelineEngineHealth() {
  return {
    ok: true,
    engine:
      ENGINE_VERSION,
  };
}

export default {
  buildCinematicTimeline,
  getTimelineEngineHealth,
};