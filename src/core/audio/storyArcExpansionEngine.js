import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Story Arc Expansion Engine v2 Unified";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, n));
}

function buildSceneRole(
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

function buildNarrativeExpansion({
  narrativeMode = "cinematic",
  scene = {},
  role = "build",
}) {
  const source =
    clean(scene.text) ||
    clean(scene.description) ||
    clean(scene.summary) ||
    "";

  const banks = {
    documentary: clean(`
${source}

Evidence begins connecting in ways few people expected.

The deeper the investigation goes,
the more difficult the truth becomes to ignore.
    `),

    viral: clean(`
${source}

The internet immediately exploded with reactions.

Nobody expected what happened next.
    `),

    futuristic: clean(`
${source}

The system was already evolving beyond traditional limitations.

What came next felt less like technology,
and more like the beginning of something alive.
    `),

    cinematic: clean(`
${source}

Every moment carried emotional weight.

The atmosphere shifted as the story unfolded.
    `),

    standard: source,
  };

  let expanded =
    banks[narrativeMode] ||
    banks.standard;

  if (role === "hook") {
    expanded =
      clean(`
What if everything people believed
was only the surface?

${expanded}
      `);
  }

  if (role === "reveal") {
    expanded =
      clean(`
${expanded}

That was the moment everything changed.
      `);
  }

  if (role === "cta") {
    expanded =
      clean(`
${expanded}

The next chapter is still being written.
      `);
  }

  return expanded;
}

function buildEmotionalProfile(
  role = "build"
) {
  switch (role) {
    case "hook":
      return {
        tension: 92,
        curiosity: 96,
        inspiration: 65,
      };

    case "build":
      return {
        tension: 72,
        curiosity: 78,
        inspiration: 70,
      };

    case "reveal":
      return {
        tension: 98,
        curiosity: 88,
        inspiration: 90,
      };

    case "resolution":
      return {
        tension: 55,
        curiosity: 62,
        inspiration: 92,
      };

    case "cta":
      return {
        tension: 40,
        curiosity: 58,
        inspiration: 96,
      };

    default:
      return {
        tension: 60,
        curiosity: 60,
        inspiration: 60,
      };
  }
}

function buildContinuityBridge({
  previousSummary = "",
  currentExpansion = "",
}) {
  if (!previousSummary) {
    return currentExpansion;
  }

  return clean(`
Previously:
${previousSummary}

Now:
${currentExpansion}
  `);
}

function buildSceneEscalation({
  role = "build",
}) {
  switch (role) {
    case "hook":
      return {
        escalationLevel: 90,
        cinematicPressure: 88,
      };

    case "build":
      return {
        escalationLevel: 72,
        cinematicPressure: 70,
      };

    case "reveal":
      return {
        escalationLevel: 98,
        cinematicPressure: 95,
      };

    case "resolution":
      return {
        escalationLevel: 60,
        cinematicPressure: 68,
      };

    case "cta":
      return {
        escalationLevel: 50,
        cinematicPressure: 82,
      };

    default:
      return {
        escalationLevel: 60,
        cinematicPressure: 60,
      };
  }
}

function buildSceneEnergyCurve({
  role = "build",
}) {
  switch (role) {
    case "hook":
      return "high-retention-opening";

    case "build":
      return "progressive-escalation";

    case "reveal":
      return "cinematic-climax";

    case "resolution":
      return "emotional-release";

    case "cta":
      return "forward-momentum";

    default:
      return "balanced";
  }
}

export function buildExpandedStoryArc({
  storyboard = {},

  topic = "",

  style = "cinematic",

  platform = "TikTok",

  creativeContext = {},

  productionPlan = {},
} = {}) {
  const scenes =
    Array.isArray(
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

  let continuityMemory = "";

  const expandedScenes =
    scenes.map(
      (scene, index) => {
        const role =
          buildSceneRole(
            index,
            scenes.length
          );

        const expandedText =
          buildNarrativeExpansion({
            narrativeMode,
            scene,
            role,
          });

        const emotionalProfile =
          buildEmotionalProfile(
            role
          );

        const escalation =
          buildSceneEscalation({
            role,
          });

        const continuityBridge =
          buildContinuityBridge({
            previousSummary:
              continuityMemory,

            currentExpansion:
              expandedText,
          });

        continuityMemory =
          expandedText.slice(
            -240
          );

        return {
          ...scene,

          role,

          narrativeMode,

          expandedText,

          continuityBridge,

          emotionalProfile,

          escalation,

          energyCurve:
            buildSceneEnergyCurve({
              role,
            }),

          cinematicWeight:
            role === "hook"
              ? 1.25
              : role ===
                "reveal"
              ? 1.4
              : role === "cta"
              ? 0.9
              : 1,
        };
      }
    );

  const totalWeight =
    expandedScenes.reduce(
      (sum, scene) =>
        sum +
        scene.cinematicWeight,
      0
    ) || 1;

  let timelineCursor = 0;

  const timelineScenes =
    expandedScenes.map(
      (scene) => {
        const proportional =
          scene.cinematicWeight /
          totalWeight;

        const duration =
          clamp(
            Math.round(
              proportional * 30
            ),
            3,
            12,
            5
          );

        const output = {
          ...scene,

          start:
            timelineCursor,

          duration,

          end:
            timelineCursor +
            duration,
        };

        timelineCursor +=
          duration;

        return output;
      }
    );

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "story-arc-expansion",

    topic,

    style,

    platform,

    narrativeMode,

    totalScenes:
      timelineScenes.length,

    totalTimelineDuration:
      timelineCursor,

    expandedScenes:
      timelineScenes,

    cinematicFlow: {
      opening:
        "Immediate emotional retention pressure.",

      escalation:
        "Progressively intensify narrative stakes.",

      climax:
        "Deliver revelation or emotional transformation.",

      resolution:
        "Conclude with emotional momentum.",
    },

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      centralizedNarrativeAuthority:
        true,

      duplicateModeDetection:
        false,

      continuityMemoryEnabled:
        true,
    },

    productionPlan,
  };
}

export function buildStoryArcTimeline({
  expandedStoryArc = {},
} = {}) {
  const scenes =
    expandedStoryArc
      ?.expandedScenes || [];

  return scenes.map(
    (scene, index) => ({
      index,

      role:
        scene.role,

      narrativeMode:
        scene.narrativeMode,

      start:
        scene.start,

      end:
        scene.end,

      duration:
        scene.duration,

      energyCurve:
        scene.energyCurve,

      escalation:
        scene.escalation,

      emotionalProfile:
        scene.emotionalProfile,
    })
  );
}

export function getStoryArcExpansionEngineHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      continuityMemory:
        true,

      cinematicEscalation:
        true,

      deterministicNarrativeFlow:
        true,

      emotionalProgression:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  buildExpandedStoryArc,
  buildStoryArcTimeline,
  getStoryArcExpansionEngineHealth,
};