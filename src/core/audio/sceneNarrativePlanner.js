import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Scene Narrative Planner v2 Unified";

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

function buildSceneRole(index = 0, total = 5) {
  if (index === 0) return "hook";
  if (index === total - 1) return "cta";

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

function roleInstructions({
  role = "build",
  narrativeMode = "cinematic",
}) {
  const bank = {
    hook: {
      objective:
        "Create immediate emotional curiosity and retention pressure.",
      narration:
        "Open with contradiction, mystery, transformation, or tension.",
      pacing:
        "Fast high-retention opening cadence.",
    },

    build: {
      objective:
        "Expand context while increasing narrative momentum.",
      narration:
        "Escalate emotional and informational progression.",
      pacing:
        "Controlled cinematic pacing progression.",
    },

    reveal: {
      objective:
        "Deliver the breakthrough realization or emotional turning point.",
      narration:
        "Expose the hidden pattern, truth, or transformation.",
      pacing:
        "Controlled slowdown followed by emotional acceleration.",
    },

    resolution: {
      objective:
        "Connect implications and reinforce emotional meaning.",
      narration:
        "Resolve narrative tension while maintaining cinematic immersion.",
      pacing:
        "Balanced emotional cinematic pacing.",
    },

    cta: {
      objective:
        "Leave lasting emotional direction and audience action.",
      narration:
        "Close with confidence, mission, or future implication.",
      pacing:
        "Confident and emotionally resonant cadence.",
    },
  };

  const base =
    bank[role] || bank.build;

  const toneMap = {
    documentary:
      "Investigative, atmospheric, evidence-driven cinematic narration.",

    futuristic:
      "Visionary, premium AI-driven cinematic energy.",

    viral:
      "Fast, emotionally punchy, high-retention internet pacing.",

    cinematic:
      "Immersive emotional cinematic storytelling.",

    standard:
      "Balanced cinematic presentation.",
  };

  return {
    ...base,

    tone:
      toneMap[narrativeMode] ||
      toneMap.standard,
  };
}

function buildEmotionalProfile(
  role = "build"
) {
  switch (role) {
    case "hook":
      return {
        tension: 90,
        curiosity: 95,
        inspiration: 60,
      };

    case "build":
      return {
        tension: 70,
        curiosity: 78,
        inspiration: 68,
      };

    case "reveal":
      return {
        tension: 96,
        curiosity: 88,
        inspiration: 86,
      };

    case "resolution":
      return {
        tension: 55,
        curiosity: 60,
        inspiration: 90,
      };

    case "cta":
      return {
        tension: 40,
        curiosity: 58,
        inspiration: 95,
      };

    default:
      return {
        tension: 60,
        curiosity: 60,
        inspiration: 60,
      };
  }
}

function buildNarrationWeight(
  role = "build"
) {
  switch (role) {
    case "hook":
      return 1.2;

    case "reveal":
      return 1.35;

    case "cta":
      return 0.82;

    default:
      return 1;
  }
}

function buildVisualDirective({
  role = "build",
  scene = {},
  classification = {},
}) {
  const visualReference =
    clean(scene.visual) ||
    clean(scene.imagePrompt) ||
    clean(scene.title);

  const motionStyle =
    classification?.visualProfile
      ?.motionStyle || "cinematic";

  const cameraStyle =
    classification?.visualProfile
      ?.cameraStyle || "cinematic";

  return {
    visualReference,

    motionStyle,

    cameraStyle,

    camera:
      role === "hook"
        ? "High-impact opening cinematic framing."
        : role === "reveal"
        ? "Focused cinematic reveal movement."
        : role === "cta"
        ? "Centered confident hero framing."
        : "Narrative-supportive cinematic movement.",

    motion:
      role === "hook"
        ? "Immediate retention-focused motion."
        : role === "reveal"
        ? "Controlled emotional emphasis."
        : "Progressive cinematic motion.",

    visualPriority:
      role === "hook"
        ? "Emotionally striking opening visual."
        : role === "reveal"
        ? "Core realization or transformation."
        : role === "cta"
        ? "Mission clarity and identity."
        : "Support cinematic progression.",
  };
}

export function buildSceneNarrativePlan({
  topic = "",
  style = "cinematic",
  platform = "TikTok",
  storyboard = {},
  scenes = [],
  durationTarget = 30,
  productionPlan = {},
  creativeContext = {},
} = {}) {
  const finalScenes =
    Array.isArray(scenes) &&
    scenes.length
      ? scenes
      : Array.isArray(
          storyboard?.scenes
        )
      ? storyboard.scenes
      : [];

  const classification =
    classifyContent({
      topic,
      style,
      platform,
    });

  const narrativeMode =
    classification.narrativeMode;

  const plannedScenes =
    finalScenes.map(
      (scene, index) => {
        const role =
          buildSceneRole(
            index,
            finalScenes.length
          );

        const instructions =
          roleInstructions({
            role,
            narrativeMode,
          });

        const emotionalProfile =
          buildEmotionalProfile(
            role
          );

        const narrationWeight =
          buildNarrationWeight(
            role
          );

        return {
          id:
            scene.id ||
            `scene_${index + 1}`,

          index,

          role,

          narrativeMode,

          title:
            scene.title ||
            `Scene ${index + 1}`,

          narrativeObjective:
            instructions.objective,

          narrationDirective:
            instructions.narration,

          pacingDirective:
            instructions.pacing,

          tone:
            instructions.tone,

          emotionalProfile,

          narrationWeight,

          visualDirective:
            buildVisualDirective({
              role,
              scene,
              classification,
            }),

          sourceScene:
            scene,
        };
      }
    );

  const totalWeight =
    plannedScenes.reduce(
      (sum, scene) =>
        sum + scene.narrationWeight,
      0
    ) || 1;

  let cursor = 0;

  const timedScenes =
    plannedScenes.map(
      (scene) => {
        const proportional =
          scene.narrationWeight /
          totalWeight;

        const duration =
          clamp(
            Math.round(
              durationTarget *
                proportional
            ),
            3,
            30,
            5
          );

        const output = {
          ...scene,

          start: cursor,

          duration,

          end:
            cursor + duration,
        };

        cursor += duration;

        return output;
      }
    );

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "scene-narrative-planning",

    topic,

    style,

    platform,

    narrativeMode,

    durationTarget,

    totalScenes:
      timedScenes.length,

    totalTimelineDuration:
      cursor,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    scenes:
      timedScenes,

    narrativeFlow: {
      opening:
        "Hook audience immediately.",

      middle:
        "Escalate narrative momentum.",

      climax:
        "Deliver transformation or revelation.",

      ending:
        "Resolve emotionally and direct audience.",
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      timingAuthority:
        "sceneNarrativePlanner",

      duplicateModeDetection:
        false,
    },

    productionPlan,
  };
}

export function buildNarrativeTimeline({
  narrativePlan = {},
} = {}) {
  const scenes =
    narrativePlan?.scenes || [];

  return scenes.map(
    (scene) => ({
      id: scene.id,

      role: scene.role,

      start: scene.start,

      end: scene.end,

      duration:
        scene.duration,

      tone: scene.tone,

      emotionalProfile:
        scene.emotionalProfile,
    })
  );
}

export function getSceneNarrativePlannerHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      unifiedClassification:
        true,

      centralizedNarrativeModes:
        true,

      cinematicStoryFlow:
        true,

      emotionalCurves:
        true,

      narrativeObjectives:
        true,

      visualDirectives:
        true,

      pacingDirectives:
        true,

      deterministicTimeline:
        true,
    },
  };
}

export default {
  buildSceneNarrativePlan,
  buildNarrativeTimeline,
  getSceneNarrativePlannerHealth,
};