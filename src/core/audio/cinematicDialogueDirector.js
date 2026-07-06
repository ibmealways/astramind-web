import {
  classifyContent,
} from "../intelligence/contentClassifier.js";

const ENGINE_VERSION =
  "AstraMind Cinematic Dialogue Director v2 Unified";

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

function buildDialogueVoice({
  narrativeMode = "cinematic",
  cinematicProfile = {},
}) {
  const voices = {
    documentary: {
      narrator:
        "investigative cinematic narrator",

      tone:
        "measured, atmospheric, evidence-driven",

      rhythm:
        "slow tension-building cadence",

      cinematicEnergy:
        74,
    },

    futuristic: {
      narrator:
        "premium futuristic intelligence narrator",

      tone:
        "visionary, intelligent, emotionally cinematic",

      rhythm:
        "smooth evolving cadence",

      cinematicEnergy:
        90,
    },

    viral: {
      narrator:
        "high-retention internet storyteller",

      tone:
        "fast, emotionally punchy, engaging",

      rhythm:
        "high-impact short-form pacing",

      cinematicEnergy:
        94,
    },

    cinematic: {
      narrator:
        "immersive cinematic storyteller",

      tone:
        "emotionally immersive and premium cinematic",

      rhythm:
        "balanced cinematic pacing",

      cinematicEnergy:
        82,
    },

    standard: {
      narrator:
        "cinematic narrator",

      tone:
        "balanced cinematic delivery",

      rhythm:
        "moderate pacing",

      cinematicEnergy:
        72,
    },
  };

  return (
    voices[narrativeMode] ||
    voices.standard
  );
}

function buildSceneDialogueDirection({
  role = "build",
  emotionalProfile = {},
  cinematicEnergy = 75,
}) {
  let pacing = "balanced";
  let emphasis = "medium";
  let pauseStyle = "natural";

  const tension =
    emotionalProfile?.tension || 50;

  const inspiration =
    emotionalProfile?.inspiration || 50;

  if (tension >= 85) {
    pacing = "high-impact";
    emphasis = "strong";
    pauseStyle = "dramatic";
  }

  if (inspiration >= 88) {
    pacing = "cinematic-emotional";
    emphasis = "elevated";
    pauseStyle = "floating";
  }

  if (role === "hook") {
    pacing = "aggressive-retention";
    emphasis = "very-strong";
  }

  if (role === "cta") {
    pacing = "confident-direct";
    emphasis = "strong";
  }

  return {
    pacing,
    emphasis,
    pauseStyle,
    cinematicEnergy,
  };
}

function cinematicSentenceBreaks(
  text = ""
) {
  return clean(text)
    .replace(/,\s/g, ", ... ")
    .replace(/\?\s/g, "? ... ")
    .replace(/\!\s/g, "! ")
    .replace(/\.\s/g, ". ");
}

function enhanceDialogueEmotion({
  text = "",
  role = "build",
  emotionalProfile = {},
}) {
  let enhanced =
    clean(text);

  const tension =
    emotionalProfile?.tension || 50;

  const inspiration =
    emotionalProfile?.inspiration || 50;

  if (tension >= 90) {
    enhanced =
      enhanced.replace(
        /\./g,
        "... "
      );
  }

  if (inspiration >= 90) {
    enhanced =
      `${enhanced} This changes everything.`;
  }

  if (role === "hook") {
    enhanced =
      `What if the story was far bigger than anyone realized? ${enhanced}`;
  }

  if (role === "cta") {
    enhanced =
      `${enhanced} The next move is yours.`;
  }

  return cinematicSentenceBreaks(
    enhanced
  );
}

function buildDeliveryInstructions({
  voice = {},
  direction = {},
}) {
  return clean(`
Narrator Style: ${voice.narrator}

Tone: ${voice.tone}

Rhythm: ${voice.rhythm}

Pacing: ${direction.pacing}

Emphasis: ${direction.emphasis}

Pause Style: ${direction.pauseStyle}

Cinematic Energy: ${direction.cinematicEnergy}
  `);
}

export function directCinematicDialogue({
  topic = "",
  style = "cinematic",
  platform = "TikTok",

  expandedStoryArc = {},

  narrativePlan = {},

  productionPlan = {},

  creativeContext = {},
} = {}) {
  const classification =
    classifyContent({
      topic,
      style,
      platform,
    });

  const narrativeMode =
    classification.narrativeMode;

  const voice =
    buildDialogueVoice({
      narrativeMode,
      cinematicProfile:
        classification.visualProfile,
    });

  const expandedScenes =
    expandedStoryArc
      ?.expandedScenes || [];

  const narrativeScenes =
    narrativePlan?.scenes || [];

  const directedScenes =
    expandedScenes.map(
      (scene, index) => {
        const linkedNarrative =
          narrativeScenes[index] || {};

        const emotionalProfile =
          linkedNarrative
            ?.emotionalProfile ||
          {
            tension: 60,
            curiosity: 60,
            inspiration: 60,
          };

        const direction =
          buildSceneDialogueDirection({
            role:
              linkedNarrative.role ||
              scene.role ||
              "build",

            emotionalProfile,

            cinematicEnergy:
              voice.cinematicEnergy,
          });

        const cinematicDialogue =
          enhanceDialogueEmotion({
            text:
              scene.expandedText ||
              scene.text ||
              "",

            role:
              linkedNarrative.role ||
              scene.role ||
              "build",

            emotionalProfile,
          });

        return {
          ...scene,

          cinematicDialogue,

          dialogueDirection:
            {
              narrator:
                voice.narrator,

              tone:
                voice.tone,

              rhythm:
                voice.rhythm,

              pacing:
                direction.pacing,

              emphasis:
                direction.emphasis,

              pauseStyle:
                direction.pauseStyle,

              cinematicEnergy:
                direction.cinematicEnergy,
            },

          deliveryInstructions:
            buildDeliveryInstructions({
              voice,
              direction,
            }),
        };
      }
    );

  const masterDialogue =
    clean(
      directedScenes
        .map(
          (scene) =>
            scene.cinematicDialogue
        )
        .join(" ")
    );

  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    stage:
      "cinematic-dialogue-direction",

    topic,

    style,

    platform,

    narrativeMode,

    narrator:
      voice.narrator,

    tone:
      voice.tone,

    rhythm:
      voice.rhythm,

    cinematicEnergy:
      voice.cinematicEnergy,

    directedScenes,

    masterDialogue,

    estimatedWords:
      masterDialogue
        .split(/\s+/)
        .filter(Boolean).length,

    creativeContext: {
      ...creativeContext,

      classification,
    },

    diagnostics: {
      classificationEngine:
        classification.engine,

      duplicateDialogueDetection:
        false,

      centralizedNarrativeAuthority:
        true,
    },

    productionPlan,
  };
}

export function buildDialogueTimeline({
  cinematicDialoguePlan = {},
} = {}) {
  const scenes =
    cinematicDialoguePlan
      ?.directedScenes || [];

  return scenes.map(
    (scene, index) => ({
      index,

      sceneId:
        scene.sceneId ||
        scene.id,

      narrator:
        scene
          ?.dialogueDirection
          ?.narrator,

      pacing:
        scene
          ?.dialogueDirection
          ?.pacing,

      emphasis:
        scene
          ?.dialogueDirection
          ?.emphasis,

      cinematicEnergy:
        scene
          ?.dialogueDirection
          ?.cinematicEnergy,

      start:
        scene.start || 0,

      end:
        scene.end || 0,

      deliveryInstructions:
        scene.deliveryInstructions,
    })
  );
}

export function getCinematicDialogueDirectorHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      centralizedClassification:
        true,

      cinematicDialogueDirection:
        true,

      emotionalDialogueEnhancement:
        true,

      cadenceAwareDialogue:
        true,

      deterministicNarration:
        true,

      creatorBrainReady:
        true,
    },
  };
}

export default {
  directCinematicDialogue,
  buildDialogueTimeline,
  getCinematicDialogueDirectorHealth,
};