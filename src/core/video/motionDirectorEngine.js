// src/core/video/motionDirectorEngine.js

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "Aigenikz Motion Director Engine v3 Unified";

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

function buildMotionProfile({
  narrativeMode = "cinematic",
}) {
  const profiles = {
    viral: {
      cameraStyle:
        "kinetic-handheld",

      motionCurve:
        "aggressive",

      cameraIntensity:
        96,

      movementBias:
        "retention-heavy",
    },

    documentary: {
      cameraStyle:
        "investigative-cinematic",

      motionCurve:
        "slow-drift",

      cameraIntensity:
        52,

      movementBias:
        "measured",
    },

    futuristic: {
      cameraStyle:
        "floating-neural",

      motionCurve:
        "smooth-evolving",

      cameraIntensity:
        86,

      movementBias:
        "immersive",
    },

    cinematic: {
      cameraStyle:
        "immersive-cinematic",

      motionCurve:
        "cinematic-flow",

      cameraIntensity:
        82,

      movementBias:
        "emotional",
    },

    standard: {
      cameraStyle:
        "balanced",

      motionCurve:
        "balanced",

      cameraIntensity:
        70,

      movementBias:
        "neutral",
    },
  };

  return (
    profiles[narrativeMode] ||
    profiles.standard
  );
}

function buildRoleMotion({
  role = "build",
  motionProfile = {},
}) {
  let zoomIntensity =
    motionProfile.cameraIntensity;

  let motionSpeed =
    "medium";

  let framing =
    "balanced";

  let stabilization =
    "cinematic";

  if (role === "hook") {
    zoomIntensity += 10;

    motionSpeed =
      "fast";

    framing =
      "retention-focused";
  }

  if (role === "reveal") {
    zoomIntensity += 6;

    motionSpeed =
      "controlled-impact";

    framing =
      "cinematic-climax";
  }

  if (role === "resolution") {
    zoomIntensity -= 8;

    motionSpeed =
      "slow";

    framing =
      "emotional-release";
  }

  if (role === "cta") {
    motionSpeed =
      "confident-forward";

    framing =
      "hero-centered";
  }

  return {
    zoomIntensity:
      clamp(
        zoomIntensity,
        0,
        100,
        70
      ),

    motionSpeed,

    framing,

    stabilization,
  };
}

function buildCameraPath({
  role = "build",
  narrativeMode = "cinematic",
}) {
  if (
    narrativeMode ===
    "viral"
  ) {
    return {
      xMotion:
        "rapid-horizontal",

      yMotion:
        "dynamic-vertical",

      depth:
        "punch-in",
    };
  }

  if (
    narrativeMode ===
    "documentary"
  ) {
    return {
      xMotion:
        "slow-pan",

      yMotion:
        "measured-tilt",

      depth:
        "gradual-push",
    };
  }

  if (
    narrativeMode ===
    "futuristic"
  ) {
    return {
      xMotion:
        "floating-orbit",

      yMotion:
        "smooth-elevation",

      depth:
        "neural-depth",
    };
  }

  if (role === "reveal") {
    return {
      xMotion:
        "cinematic-lock",

      yMotion:
        "controlled-rise",

      depth:
        "dramatic-push",
    };
  }

  return {
    xMotion:
      "cinematic-pan",

    yMotion:
      "cinematic-float",

    depth:
      "subtle-push",
  };
}

/*
  IMPORTANT CONSOLIDATION UPDATE

  OLD PROBLEMS:
  ❌ motion engine owning pacing
  ❌ duplicate emotional orchestration
  ❌ fragmented cinematic identity
  ❌ motion mutating timeline flow
  ❌ inconsistent camera behavior

  NEW SYSTEM:
  ✅ timeline owns timing
  ✅ classifier owns cinematic identity
  ✅ motion engine generates motion ONLY
  ✅ deterministic camera orchestration
  ✅ unified motion contracts
*/

function buildMotionEnergyCurve({
  role = "build",
}) {
  switch (role) {
    case "hook":
      return {
        acceleration:
          "high-impact",

        rhythm:
          "retention-heavy",

        momentum:
          96,
      };

    case "build":
      return {
        acceleration:
          "progressive",

        rhythm:
          "cinematic-build",

        momentum:
          76,
      };

    case "reveal":
      return {
        acceleration:
          "controlled-climax",

        rhythm:
          "cinematic-impact",

        momentum:
          92,
      };

    case "resolution":
      return {
        acceleration:
          "decompression",

        rhythm:
          "emotional-release",

        momentum:
          62,
      };

    case "cta":
      return {
        acceleration:
          "forward-drive",

        rhythm:
          "confident-finish",

        momentum:
          82,
      };

    default:
      return {
        acceleration:
          "balanced",

        rhythm:
          "standard",

        momentum:
          70,
      };
  }
}

function buildLensBehavior({
  narrativeMode = "cinematic",
  role = "build",
}) {
  let focalLength = 50;

  let depthCompression =
    "medium";

  let cinematicFocus =
    "balanced";

  if (
    narrativeMode ===
    "viral"
  ) {
    focalLength = 28;

    depthCompression =
      "low";

    cinematicFocus =
      "kinetic";
  }

  if (
    narrativeMode ===
    "documentary"
  ) {
    focalLength = 85;

    depthCompression =
      "high";

    cinematicFocus =
      "investigative";
  }

  if (
    narrativeMode ===
    "futuristic"
  ) {
    focalLength = 40;

    depthCompression =
      "neural-depth";

    cinematicFocus =
      "immersive";
  }

  if (role === "reveal") {
    focalLength += 15;

    cinematicFocus =
      "dramatic-isolation";
  }

  return {
    focalLength,

    depthCompression,

    cinematicFocus,
  };
}

/*
  ============================================
  EMOTIONAL CONTINUITY
  ============================================
*/

function buildEmotionalContinuityMap({
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

  /*
    emotional transition pressure
  */

  let continuityPressure =
    60;

  if (
    previousEmotion !==
    currentEmotion
  ) {
    continuityPressure =
      82;
  }

  /*
    escalation continuity
  */

  if (
    currentEmotion ===
    "escalation"
  ) {
    continuityPressure =
      92;
  }

  /*
    payoff continuity
  */

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
  RETENTION MOTION PULSE
  ============================================
*/

function buildRetentionMotionPulse({
  retentionPattern = {},
}) {
  const goal =
    retentionPattern
      ?.retentionGoal ||
    "balanced";

  /*
    interruption spikes
  */

  if (
    goal ===
    "pattern-interrupt"
  ) {
    return {
      pulseType:
        "interruption-spike",

      pulseIntensity:
        98,

      motionJolt:
        "high",

      replayBias:
        true,
    };
  }

  /*
    escalation
  */

  if (
    goal ===
    "escalation"
  ) {
    return {
      pulseType:
        "cinematic-escalation",

      pulseIntensity:
        88,

      motionJolt:
        "medium-high",

      replayBias:
        false,
    };
  }

  /*
    payoff
  */

  if (
    goal ===
    "payoff"
  ) {
    return {
      pulseType:
        "payoff-impact",

      pulseIntensity:
        100,

      motionJolt:
        "controlled-climax",

      replayBias:
        true,
    };
  }

  return {
    pulseType:
      "balanced",

    pulseIntensity:
      72,

    motionJolt:
      "medium",

    replayBias:
      false,
  };
}

/*
  ============================================
  TRANSITION PRESSURE
  ============================================
*/

function buildTransitionPressureSync({
  scene = {},
  narrativeMode = "cinematic",
}) {
  let pressure = 60;

  /*
    viral transition pressure
  */

  if (
    narrativeMode ===
    "viral"
  ) {
    pressure = 92;
  }

  /*
    documentary pacing
  */

  if (
    narrativeMode ===
    "documentary"
  ) {
    pressure = 48;
  }

  /*
    futuristic pacing
  */

  if (
    narrativeMode ===
    "futuristic"
  ) {
    pressure = 76;
  }

  /*
    emotional escalation
  */

  const emotionalIntensity =
    scene
      ?.emotionalArc
      ?.emotionalIntensity ||
    70;

  pressure += Math.round(
    emotionalIntensity *
      0.12
  );

  /*
    retention amplification
  */

  if (
    scene
      ?.retentionPattern
      ?.replayTrigger
  ) {
    pressure += 12;
  }

  return {
    transitionPressure:
      clamp(
        pressure,
        0,
        100,
        70
      ),

    cinematicContinuity:
      pressure >= 75,

    emotionalCarryover:
      emotionalIntensity >=
      80,
  };
}

/*
  ============================================
  REPLAY TRIGGER MOTION
  ============================================
*/

function buildReplayTriggerMotion({
  retentionPattern = {},
}) {
  const replay =
    retentionPattern
      ?.replayTrigger;

  if (!replay) {
    return {
      replayOptimized:
        false,

      replayBehavior:
        "none",
    };
  }

  return {
    replayOptimized:
      true,

    replayBehavior:
      "micro-loop",

    replayCameraBehavior:
      "precision-reset",

    replayMomentum:
      94,

    replayRetentionBias:
      "high",
  };
}

/*
  ============================================
  PSYCHOLOGICAL MOTION
  ============================================
*/

function buildPsychologicalMotionPattern({
  emotionalArc = {},
  retentionPattern = {},
  narrativeMode = "cinematic",
}) {
  const emotionalState =
    emotionalArc
      ?.emotionalState ||
    "build";

  /*
    hook psychology
  */

  if (
    emotionalState ===
    "curiosity"
  ) {
    return {
      psychologicalMotion:
        "curiosity-tension",

      audienceEffect:
        "attention-capture",

      movementPsychology:
        "pattern-interrupt",
    };
  }

  /*
    escalation psychology
  */

  if (
    emotionalState ===
    "escalation"
  ) {
    return {
      psychologicalMotion:
        "pressure-build",

      audienceEffect:
        "dopamine-rise",

      movementPsychology:
        "cinematic-escalation",
    };
  }

  /*
    payoff psychology
  */

  if (
    emotionalState ===
    "payoff"
  ) {
    return {
      psychologicalMotion:
        "emotional-release",

      audienceEffect:
        "satisfaction-impact",

      movementPsychology:
        "payoff-resolution",
    };
  }

  /*
    futuristic cognition
  */

  if (
    narrativeMode ===
    "futuristic"
  ) {
    return {
      psychologicalMotion:
        "immersive-neural",

      audienceEffect:
        "future-immersion",

      movementPsychology:
        "adaptive-cinematic",
    };
  }

  return {
    psychologicalMotion:
      "balanced-cinematic",

    audienceEffect:
      "engagement",

    movementPsychology:
      "cinematic-flow",
  };
}

function buildSceneMotionDirective({
  scene = {},

  previousScene = null,

  motionProfile = {},

  narrativeMode = "cinematic",
}) {
  const role =
    scene.role ||
    scene.sceneRole ||
    "build";

  /*
    foundational motion
  */

  const roleMotion =
    buildRoleMotion({
      role,
      motionProfile,
    });

  const cameraPath =
    buildCameraPath({
      role,
      narrativeMode,
    });

  const energyCurve =
    buildMotionEnergyCurve({
      role,
    });

  const lensBehavior =
    buildLensBehavior({
      narrativeMode,
      role,
    });

  /*
    NEW:
    psychological cinematic intelligence
  */

  const emotionalContinuity =
    buildEmotionalContinuityMap({
      previousScene,

      currentScene:
        scene,
    });

  const retentionMotionPulse =
    buildRetentionMotionPulse({
      retentionPattern:
        scene
          ?.retentionPattern,
    });

  const transitionPressure =
    buildTransitionPressureSync({
      scene,

      narrativeMode,
    });

  const replayTriggerMotion =
    buildReplayTriggerMotion({
      retentionPattern:
        scene
          ?.retentionPattern,
    });

  const psychologicalMotion =
    buildPsychologicalMotionPattern({
      emotionalArc:
        scene
          ?.emotionalArc,

      retentionPattern:
        scene
          ?.retentionPattern,

      narrativeMode,
    });

  /*
    emotional intensity
  */

  const emotionalIntensity =
    scene
      ?.emotionalArc
      ?.emotionalIntensity ||
    70;

  /*
    adaptive cinematic velocity
  */

  const cinematicVelocity =
    clamp(
      Math.round(
        (
          emotionalIntensity +
          retentionMotionPulse.pulseIntensity +
          transitionPressure.transitionPressure
        ) / 3
      ),
      0,
      100,
      70
    );

  /*
    final render contract
  */

  return {
    sceneId:
      scene.id ||
      `scene_${scene.timelineIndex}`,

    role,

    narrativeMode,

    startTime:
      scene.startTime,

    endTime:
      scene.endTime,

    duration:
      scene.duration,

    /*
      inherited cinematic intelligence
    */

    emotionalArc:
      scene
        ?.emotionalArc,

    retentionPattern:
      scene
        ?.retentionPattern,

    cameraDirection:
      scene
        ?.cameraDirection,

    /*
      motion systems
    */

    motionProfile,

    roleMotion,

    cameraPath,

    energyCurve,

    lensBehavior,

    /*
      NEW:
      cinematic cognition systems
    */

    emotionalContinuity,

    retentionMotionPulse,

    transitionPressure,

    replayTriggerMotion,

    psychologicalMotion,

    /*
      cinematic energy
    */

    cinematicVelocity,

    emotionalIntensity,

    /*
      render-safe motion contract
    */

    renderMotion: {
      cameraStyle:
        motionProfile.cameraStyle,

      motionCurve:
        motionProfile.motionCurve,

      zoomIntensity:
        roleMotion.zoomIntensity,

      motionSpeed:
        roleMotion.motionSpeed,

      framing:
        roleMotion.framing,

      stabilization:
        roleMotion.stabilization,

      momentum:
        energyCurve.momentum,

      transitionPressure:
        transitionPressure.transitionPressure,

      cinematicVelocity,

      replayOptimized:
        replayTriggerMotion.replayOptimized,

      psychologicalMotion:
        psychologicalMotion
          .psychologicalMotion,
    },

    /*
      orchestration diagnostics
    */

    diagnostics: {
      emotionalSynchronization:
        true,

      retentionSynchronization:
        true,

      replayOptimization:
        replayTriggerMotion.replayOptimized,

      cinematicContinuity:
        emotionalContinuity.cinematicContinuity,

      deterministicMotion:
        true,

      creatorBrainReady:
        true,
    },
  };
}

function buildMotionTimeline({
  directives = [],
}) {
  return directives.map(
    (directive) => ({
      sceneId:
        directive.sceneId,

      role:
        directive.role,

      start:
        directive.startTime,

      end:
        directive.endTime,

      duration:
        directive.duration,

      motionCurve:
        directive.motionProfile
          .motionCurve,

      cameraStyle:
        directive.motionProfile
          .cameraStyle,

      momentum:
        directive.energyCurve
          .momentum,

      framing:
        directive.roleMotion
          .framing,
    })
  );
}

export function directSceneMotion({
  topic = "",

  style = "cinematic",

  platform = "TikTok",

  timeline = {},

  creativeContext = {},

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

  const motionProfile =
    buildMotionProfile({
      narrativeMode,
    });

  const timelineScenes =
    safeArray(
      timeline?.scenes
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

  const motionDirectives =
    timelineScenes.map(
      (scene, index) => {
        const baseDirective =
          buildSceneMotionDirective({
            scene,

            motionProfile,

            narrativeMode,
          });

        const directorDirection =
          directorState?.sceneDirectionMap?.[scene?.id || scene?.sceneId] ||
          directorState?.sceneDirections?.find?.(
            (direction) => direction.sceneIndex === index
          ) ||
          null;

        return {
          ...baseDirective,
          directorDirection,
          cameraDirector: directorDirection
            ? {
                lens: directorDirection.lens,
                cameraMotion: directorDirection.cameraMotion,
                cameraPath: directorDirection.cameraPath,
                cameraAngle: directorDirection.cameraAngle,
                depthMapReady: true,
                parallaxReady: true,
                rackFocusReady: true,
                motionBlurReady: true,
              }
            : null,
        };
      }
    );

  const motionTimeline =
    buildMotionTimeline({
      directives:
        motionDirectives,
    });

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "motion-direction",

    topic,

    style,

    platform,

    narrativeMode,

    motionProfile,

    motionDirectives,

    motionTimeline,

    totalScenes:
      motionDirectives.length,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      centralizedMotionAuthority:
        true,

      centralizedTimingAuthority:
        true,

      deterministicMotionFlow:
        true,

      duplicatePacingLogic:
        false,

      cinematicIdentityExternal:
        true,

      creatorBrainReady:
        true,
    },

    productionPlan,
  };
}

function buildMotionDiagnostics({
  narrativeMode,
  motionProfile,
  totalScenes,
}) {
  return {
    narrativeMode,

    cameraStyle:
      motionProfile.cameraStyle,

    motionCurve:
      motionProfile.motionCurve,

    cameraIntensity:
      motionProfile.cameraIntensity,

    movementBias:
      motionProfile.movementBias,

    totalScenes,

    deterministicMotion:
      true,

    centralizedMotionAuthority:
      true,

    centralizedTimingAuthority:
      true,

    duplicateEmotionLogic:
      false,

    duplicatePacingLogic:
      false,

    renderSafeMotionContracts:
      true,

    gpuMotionReady:
      true,

    creatorBrainReady:
      true,
  };
}

function buildRenderMotionManifest({
  motionDirectives = [],
}) {
  return motionDirectives.map(
    (directive) => ({
      sceneId:
        directive.sceneId,

      role:
        directive.role,

      startTime:
        directive.startTime,

      endTime:
        directive.endTime,

      duration:
        directive.duration,

      camera:
        {
          style:
            directive.motionProfile
              .cameraStyle,

          framing:
            directive.roleMotion
              .framing,

          stabilization:
            directive.roleMotion
              .stabilization,

          xMotion:
            directive.cameraPath
              .xMotion,

          yMotion:
            directive.cameraPath
              .yMotion,

          depth:
            directive.cameraPath
              .depth,
        },

      lens:
        directive.lensBehavior,

      motion:
        {
          curve:
            directive.motionProfile
              .motionCurve,

          speed:
            directive.roleMotion
              .motionSpeed,

          zoomIntensity:
            directive.roleMotion
              .zoomIntensity,

          momentum:
            directive.energyCurve
              .momentum,
        },
    })
  );
}

export function buildMotionExecutionPlan({
  motionDirection = {},
} = {}) {
  const directives =
    safeArray(
      motionDirection
        ?.motionDirectives
    );

  return directives.map(
    (directive) => ({
      sceneId:
        directive.sceneId,

      role:
        directive.role,

      start:
        directive.startTime,

      end:
        directive.endTime,

      duration:
        directive.duration,

      cameraStyle:
        directive.motionProfile
          .cameraStyle,

      motionCurve:
        directive.motionProfile
          .motionCurve,

      framing:
        directive.roleMotion
          .framing,

      zoomIntensity:
        directive.roleMotion
          .zoomIntensity,

      momentum:
        directive.energyCurve
          .momentum,
    })
  );
}

export function getMotionDirectorEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      centralizedTimingAuthority:
        true,

      deterministicMotion:
        true,

      cinematicCameraOrchestration:
        true,

      gpuMotionPreparation:
        true,

      renderSafeMotionContracts:
        true,

      interpolationReady:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  directSceneMotion,
  buildMotionExecutionPlan,
  getMotionDirectorEngineHealth,
};