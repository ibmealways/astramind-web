// src/core/video/viralPacingEngine.js

import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Viral Pacing Engine v3 Unified";

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

function buildRetentionProfile({
  narrativeMode = "cinematic",
}) {
  const profiles = {
    viral: {
      hookPressure:
        98,

      retentionSensitivity:
        95,

      emotionalVelocity:
        92,

      audienceFatigueThreshold:
        72,
    },

    documentary: {
      hookPressure:
        70,

      retentionSensitivity:
        64,

      emotionalVelocity:
        58,

      audienceFatigueThreshold:
        88,
    },

    futuristic: {
      hookPressure:
        84,

      retentionSensitivity:
        80,

      emotionalVelocity:
        82,

      audienceFatigueThreshold:
        78,
    },

    cinematic: {
      hookPressure:
        82,

      retentionSensitivity:
        76,

      emotionalVelocity:
        78,

      audienceFatigueThreshold:
        80,
    },

    standard: {
      hookPressure:
        72,

      retentionSensitivity:
        70,

      emotionalVelocity:
        68,

      audienceFatigueThreshold:
        82,
    },
  };

  return (
    profiles[narrativeMode] ||
    profiles.standard
  );
}

function analyzeSceneRetention({
  scene = {},

  retentionProfile = {},
}) {
  const role =
    scene.role ||
    "build";

  let retentionScore =
    retentionProfile.retentionSensitivity;

  let hookStrength =
    retentionProfile.hookPressure;

  let fatigueRisk = 20;

  let emotionalMomentum =
    retentionProfile.emotionalVelocity;

  if (role === "hook") {
    retentionScore += 10;

    hookStrength += 12;

    emotionalMomentum += 8;
  }

  if (role === "reveal") {
    retentionScore += 8;

    emotionalMomentum += 14;
  }

  if (role === "resolution") {
    fatigueRisk += 18;
  }

  if (role === "cta") {
    fatigueRisk += 8;
  }

  return {
    role,

    retentionScore:
      clamp(
        retentionScore,
        0,
        100,
        70
      ),

    hookStrength:
      clamp(
        hookStrength,
        0,
        100,
        70
      ),

    fatigueRisk:
      clamp(
        fatigueRisk,
        0,
        100,
        20
      ),

    emotionalMomentum:
      clamp(
        emotionalMomentum,
        0,
        100,
        70
      ),
  };
}

function buildEngagementCurve({
  role = "build",
}) {
  switch (role) {
    case "hook":
      return {
        audienceState:
          "attention-capture",

        energyCurve:
          "explosive-entry",

        retentionPriority:
          "maximum",
      };

    case "build":
      return {
        audienceState:
          "engaged-escalation",

        energyCurve:
          "progressive-build",

        retentionPriority:
          "high",
      };

    case "reveal":
      return {
        audienceState:
          "emotional-impact",

        energyCurve:
          "cinematic-climax",

        retentionPriority:
          "maximum",
      };

    case "resolution":
      return {
        audienceState:
          "emotional-processing",

        energyCurve:
          "controlled-release",

        retentionPriority:
          "medium",
      };

    case "cta":
      return {
        audienceState:
          "conversion-state",

        energyCurve:
          "forward-drive",

        retentionPriority:
          "high",
      };

    default:
      return {
        audienceState:
          "balanced",

        energyCurve:
          "standard",

        retentionPriority:
          "balanced",
      };
  }
}

/*
  IMPORTANT CONSOLIDATION UPDATE

  OLD PROBLEMS:
  ❌ pacing engine modifying timing
  ❌ fragmented timeline authority
  ❌ duplicate sequencing logic
  ❌ cinematic pacing conflicts
  ❌ render desynchronization risk

  NEW SYSTEM:
  ✅ timeline owns timing
  ✅ pacing engine performs retention analysis ONLY
  ✅ deterministic pacing diagnostics
  ✅ emotional momentum analysis
  ✅ audience retention intelligence
*/

function buildRetentionDiagnostics({
  narrativeMode,
  retentionProfile,
  totalScenes,
}) {
  return {
    narrativeMode,

    hookPressure:
      retentionProfile.hookPressure,

    retentionSensitivity:
      retentionProfile.retentionSensitivity,

    emotionalVelocity:
      retentionProfile.emotionalVelocity,

    audienceFatigueThreshold:
      retentionProfile.audienceFatigueThreshold,

    totalScenes,

    centralizedTimingAuthority:
      true,

    pacingAuthorityExternal:
      true,

    deterministicRetentionAnalysis:
      true,

    duplicateTimingLogic:
      false,

    cinematicRetentionIntelligence:
      true,

    creatorBrainReady:
      true,
  };
}

function buildRetentionRecommendations({
  retentionAnalysis = [],
}) {
  const recommendations =
    [];

  const avgRetention =
    retentionAnalysis.reduce(
      (sum, scene) =>
        sum +
        scene.retention
          .retentionScore,
      0
    ) /
      Math.max(
        retentionAnalysis.length,
        1
      );

  const avgFatigue =
    retentionAnalysis.reduce(
      (sum, scene) =>
        sum +
        scene.retention
          .fatigueRisk,
      0
    ) /
      Math.max(
        retentionAnalysis.length,
        1
      );

  if (avgRetention < 70) {
    recommendations.push(
      "Increase opening emotional pressure and visual momentum."
    );
  }

  if (avgFatigue > 65) {
    recommendations.push(
      "Reduce repetitive pacing patterns to avoid viewer fatigue."
    );
  }

  const weakHooks =
    retentionAnalysis.filter(
      (scene) =>
        scene.retention
          .hookStrength < 75
    );

  if (weakHooks.length) {
    recommendations.push(
      "Strengthen hook scenes with contradiction, mystery, or emotional escalation."
    );
  }

  return recommendations;
}

function buildSceneRetentionDirective({
  scene = {},

  retentionProfile = {},
}) {
  const role =
    scene.role ||
    "build";

  const retention =
    analyzeSceneRetention({
      scene,

      retentionProfile,
    });

  const engagementCurve =
    buildEngagementCurve({
      role,
    });

  return {
    sceneId:
      scene.id ||
      `scene_${scene.timelineIndex}`,

    role,

    startTime:
      scene.startTime,

    endTime:
      scene.endTime,

    duration:
      scene.duration,

    retention,

    engagementCurve,

    audienceRetentionPriority:
      engagementCurve.retentionPriority,

    optimizationFocus:
      role === "hook"
        ? "maximize-retention"

        : role === "reveal"
        ? "maximize-emotional-impact"

        : role === "cta"
        ? "maximize-conversion"

        : "maintain-engagement",
  };
}

function buildRetentionTimeline({
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

      retentionScore:
        directive.retention
          .retentionScore,

      emotionalMomentum:
        directive.retention
          .emotionalMomentum,

      fatigueRisk:
        directive.retention
          .fatigueRisk,

      audienceState:
        directive
          .engagementCurve
          .audienceState,
    })
  );
}

export function analyzeViralPacing({
  topic = "",

  style = "cinematic",

  platform = "TikTok",

  timeline = {},

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

  const retentionProfile =
    buildRetentionProfile({
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

  const retentionAnalysis =
    timelineScenes.map(
      (scene) =>
        buildSceneRetentionDirective({
          scene,

          retentionProfile,
        })
    );

  const retentionTimeline =
    buildRetentionTimeline({
      directives:
        retentionAnalysis,
    });

  const recommendations =
    buildRetentionRecommendations({
      retentionAnalysis,
    });

  const diagnostics =
    buildRetentionDiagnostics({
      narrativeMode,

      retentionProfile,

      totalScenes:
        retentionAnalysis.length,
    });

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "viral-retention-analysis",

    topic,

    style,

    platform,

    narrativeMode,

    retentionProfile,

    retentionAnalysis,

    retentionTimeline,

    recommendations,

    diagnostics,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    productionPlan,
  };
}

export function buildRetentionExecutionPlan({
  pacingAnalysis = {},
} = {}) {
  const directives =
    safeArray(
      pacingAnalysis
        ?.retentionAnalysis
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

      retentionScore:
        directive.retention
          .retentionScore,

      emotionalMomentum:
        directive.retention
          .emotionalMomentum,

      hookStrength:
        directive.retention
          .hookStrength,

      fatigueRisk:
        directive.retention
          .fatigueRisk,

      audienceState:
        directive
          .engagementCurve
          .audienceState,

      optimizationFocus:
        directive.optimizationFocus,
    })
  );
}

export function buildAudienceHeatmap({
  pacingAnalysis = {},
} = {}) {
  const directives =
    safeArray(
      pacingAnalysis
        ?.retentionAnalysis
    );

  return directives.map(
    (directive) => {
      const retention =
        directive.retention
          .retentionScore;

      let heatLevel =
        "medium";

      if (retention >= 90) {
        heatLevel =
          "extreme";
      } else if (
        retention >= 80
      ) {
        heatLevel =
          "high";
      } else if (
        retention <= 60
      ) {
        heatLevel =
          "low";
      }

      return {
        sceneId:
          directive.sceneId,

        role:
          directive.role,

        start:
          directive.startTime,

        end:
          directive.endTime,

        heatLevel,

        retentionScore:
          retention,

        emotionalMomentum:
          directive.retention
            .emotionalMomentum,

        fatigueRisk:
          directive.retention
            .fatigueRisk,
      };
    }
  );
}

export function getViralPacingEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      externalTimelineAuthority:
        true,

      deterministicRetentionAnalysis:
        true,

      cinematicRetentionIntelligence:
        true,

      audienceHeatmaps:
        true,

      emotionalMomentumTracking:
        true,

      fatigueDiagnostics:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export function applyViralPacingToStoryboard(
  storyboard = {}
) {
  return storyboard;
}

export default {
  analyzeViralPacing,
  buildRetentionExecutionPlan,
  buildAudienceHeatmap,
  getViralPacingEngineHealth,
  applyViralPacingToStoryboard
};

