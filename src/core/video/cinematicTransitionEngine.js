// src/core/video/cinematicTransitionEngine.js

const ENGINE_VERSION =
  "Aigenikz Cinematic Transition Engine v5 Nervous System Synchronized";

/*
  ============================================
  UTILITIES
  ============================================
*/

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
  TRANSITION TYPE
  ============================================
*/

function buildTransitionType({
  narrativeMode = "cinematic",
  role = "build",
  transitionPressure = 70,
}) {
  /*
    viral
  */

  if (
    narrativeMode ===
    "viral"
  ) {
    if (
      transitionPressure >=
      90
    ) {
      return "impact-smash";
    }

    return "kinetic-swipe";
  }

  /*
    documentary
  */

  if (
    narrativeMode ===
    "documentary"
  ) {
    return "slow-cinematic-fade";
  }

  /*
    futuristic
  */

  if (
    narrativeMode ===
    "futuristic"
  ) {
    return "neural-glitch-morph";
  }

  /*
    cinematic climax
  */

  if (
    role === "reveal"
  ) {
    return "cinematic-energy-pulse";
  }

  /*
    hook
  */

  if (
    role === "hook"
  ) {
    return "rapid-impact-cut";
  }

  return "cinematic-flow";
}

/*
  ============================================
  TRANSITION DURATION
  ============================================
*/

function buildTransitionDuration({
  transitionPressure = 70,
  replayTrigger = false,
}) {
  let duration = 0.55;

  /*
    high pressure
  */

  if (
    transitionPressure >=
    90
  ) {
    duration = 0.22;
  }

  /*
    replay optimization
  */

  if (replayTrigger) {
    duration -= 0.08;
  }

  return clamp(
    Number(
      duration.toFixed(2)
    ),
    0.12,
    2,
    0.5
  );
}

/*
  ============================================
  EMOTIONAL CARRYOVER
  ============================================
*/

function buildEmotionalCarryover({
  currentScene = {},
  nextScene = {},
}) {
  const currentEmotion =
    currentScene
      ?.emotionalArc
      ?.emotionalState ||
    "neutral";

  const nextEmotion =
    nextScene
      ?.emotionalArc
      ?.emotionalState ||
    "neutral";

  const intensity =
    nextScene
      ?.emotionalArc
      ?.emotionalIntensity ||
    70;

  return {
    currentEmotion,

    nextEmotion,

    emotionalBridge:
      `${currentEmotion}-to-${nextEmotion}`,

    carryoverIntensity:
      intensity,

    cinematicContinuity:
      intensity >= 80,
  };
}

/*
  ============================================
  REPLAY MOMENTUM
  ============================================
*/

function buildReplayMomentum({
  currentScene = {},
  nextScene = {},
}) {
  const replay =
    currentScene
      ?.replayPropagation
      ?.replayTrigger ||
    nextScene
      ?.replayPropagation
      ?.replayTrigger ||
    false;

  return {
    replayOptimized:
      replay,

    replayMomentum:
      replay ? 95 : 65,

    replayPressure:
      replay ? "high" : "standard",
  };
}

/*
  ============================================
  MOTION CONTINUITY
  ============================================
*/

function buildMotionContinuity({
  currentScene = {},
  nextScene = {},
}) {
  return {
    currentMotion:
      currentScene
        ?.cameraMotion ||
      "cinematic",

    nextMotion:
      nextScene
        ?.cameraMotion ||
      "cinematic",

    currentVelocity:
      currentScene
        ?.cinematicVelocity ||
      70,

    nextVelocity:
      nextScene
        ?.cinematicVelocity ||
      70,

    synchronized:
      true,
  };
}

/*
  ============================================
  TRANSITION ENERGY
  ============================================
*/

function buildTransitionEnergy({
  transitionPressure = 70,
  emotionalCarryover = {},
}) {
  let energy =
    transitionPressure;

  if (
    emotionalCarryover
      ?.cinematicContinuity
  ) {
    energy += 10;
  }

  return clamp(
    energy,
    0,
    100,
    70
  );
}

/*
  ============================================
  TRANSITION CONTRACT
  ============================================
*/

function buildTransitionContract({
  currentScene = {},
  nextScene = {},
  narrativeMode = "cinematic",
}) {
  const role =
    currentScene.role ||
    "build";

  const transitionPressure =
    currentScene
      ?.transitionPressure ||
    70;

  const replayTrigger =
    currentScene
      ?.replayPropagation
      ?.replayTrigger ||
    false;

  const transitionType =
    buildTransitionType({
      narrativeMode,
      role,
      transitionPressure,
    });

  const duration =
    buildTransitionDuration({
      transitionPressure,
      replayTrigger,
    });

  const emotionalCarryover =
    buildEmotionalCarryover({
      currentScene,
      nextScene,
    });

  const replayMomentum =
    buildReplayMomentum({
      currentScene,
      nextScene,
    });

  const motionContinuity =
    buildMotionContinuity({
      currentScene,
      nextScene,
    });

  const transitionEnergy =
    buildTransitionEnergy({
      transitionPressure,
      emotionalCarryover,
    });

  return {
    fromScene:
      currentScene.id,

    toScene:
      nextScene.id,

    narrativeMode,

    transitionType,

    duration,

    transitionPressure,

    transitionEnergy,

    emotionalCarryover,

    replayMomentum,

    motionContinuity,

    cinematicContinuity:
      emotionalCarryover.cinematicContinuity,

    replayOptimized:
      replayMomentum.replayOptimized,

    /*
      synchronized nervous system
    */

    cinematicNervousSystem:
      {
        synchronized:
          true,

        emotionalAuthority:
          true,

        motionAuthority:
          true,

        replayAuthority:
          true,

        transitionAuthority:
          true,
      },

    diagnostics: {
      deterministicTransition:
        true,

      cinematicSynchronization:
        true,

      replayOptimized:
        replayMomentum.replayOptimized,

      creatorBrainReady:
        true,
    },
  };
}

/*
  ============================================
  MAIN ENGINE
  ============================================
*/

export function planCinematicTransitions({
  timeline = {},
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  creativeContext = {},
  directorState = null,
} = {}) {
  const scenes =
    Array.isArray(
      timeline?.scenes
    )
      ? timeline.scenes
      : [];

  const narrativeMode =
    timeline?.narrativeMode ||
    "cinematic";

  const transitions =
    [];

  for (
    let i = 0;
    i < scenes.length - 1;
    i++
  ) {
    const currentScene =
      scenes[i];

    const nextScene =
      scenes[i + 1];

    const baseTransition =
      buildTransitionContract({
        currentScene,
        nextScene,
        narrativeMode,
      });

    const currentDirection =
      directorState?.sceneDirectionMap?.[currentScene?.id || currentScene?.sceneId] ||
      directorState?.sceneDirections?.find?.(
        (direction) => direction.sceneIndex === i
      ) ||
      null;

    transitions.push({
      ...baseTransition,
      directorTransition: currentDirection?.transitionSuggestion || null,
      colorGrade: currentDirection?.colorGrade || directorState?.globalLook?.colorGrade || null,
      emotionalContinuity: true,
      storyAwareTransition: Boolean(currentDirection),
    });
  }

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "cinematic-transition-planning",

    topic,

    style,

    platform,

    narrativeMode,

    transitions,

    creativeContext: {
      ...creativeContext,
      directorState,
    },

    directorState,

    synchronizedTransitionAuthority:
      true,

    cinematicNervousSystem:
      true,

    diagnostics: {
      deterministicTransitions:
        true,

      synchronizedContracts:
        true,

      cinematicContinuity:
        true,

      replayOptimization:
        true,

      creatorBrainReady:
        true,
    },
  };
}

/*
  ============================================
  HEALTH
  ============================================
*/

export function getTransitionEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      emotionalContinuity:
        true,

      replayMomentum:
        true,

      motionContinuity:
        true,

      synchronizedTransitions:
        true,

      cinematicNervousSystem:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  planCinematicTransitions,
  getTransitionEngineHealth,
};