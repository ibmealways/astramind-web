// src/core/audio/adaptiveVoiceCadenceEngine.js

const ENGINE_VERSION = "AstraMind Adaptive Voice Cadence Engine v1";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function detectVoiceMode({ topic = "", emotionalBeat = {}, productionPlan = {} } = {}) {
  const t = clean(topic).toLowerCase();
  const tension = emotionalBeat?.synchronizedEmotion?.tension || 50;
  const inspiration = emotionalBeat?.synchronizedEmotion?.inspiration || 50;
  const curiosity = emotionalBeat?.synchronizedEmotion?.curiosity || 50;

  if (/trump|maga|biden|democrat|liberal|election|administration/.test(t)) {
    return "authoritative_commentary";
  }

  if (tension >= 80) return "high_tension";
  if (curiosity >= 80) return "investigative";
  if (inspiration >= 80) return "inspirational";
  if (/astramind|ai|future|technology|platform/.test(t)) return "visionary_tech";

  return productionPlan?.captionStyle === "bold-kinetic"
    ? "kinetic_creator"
    : "cinematic_clear";
}

function getCadenceProfile(mode = "cinematic_clear") {
  const profiles = {
    authoritative_commentary: {
      wpm: 152,
      energy: 78,
      pauseDensity: "medium",
      emphasis: "strong",
      delivery: "firm, factual, contrast-driven",
    },

    high_tension: {
      wpm: 158,
      energy: 86,
      pauseDensity: "short",
      emphasis: "very strong",
      delivery: "urgent, controlled, dramatic",
    },

    investigative: {
      wpm: 132,
      energy: 62,
      pauseDensity: "high",
      emphasis: "measured",
      delivery: "curious, suspenseful, analytical",
    },

    inspirational: {
      wpm: 142,
      energy: 74,
      pauseDensity: "medium",
      emphasis: "emotional",
      delivery: "uplifting, cinematic, confident",
    },

    visionary_tech: {
      wpm: 145,
      energy: 76,
      pauseDensity: "medium",
      emphasis: "premium",
      delivery: "futuristic, polished, visionary",
    },

    kinetic_creator: {
      wpm: 160,
      energy: 82,
      pauseDensity: "short",
      emphasis: "punchy",
      delivery: "fast, sharp, creator-style",
    },

    cinematic_clear: {
      wpm: 145,
      energy: 68,
      pauseDensity: "medium",
      emphasis: "balanced",
      delivery: "clear, cinematic, steady",
    },
  };

  return profiles[mode] || profiles.cinematic_clear;
}

function insertCadenceMarkers(text = "", profile = {}) {
  const sentences = clean(text)
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter(Boolean);

  if (!sentences.length) return clean(text);

  return sentences
    .map((sentence, index) => {
      if (profile.pauseDensity === "high" && index % 2 === 0) {
        return `${sentence} ...`;
      }

      if (profile.pauseDensity === "short" && index % 2 === 1) {
        return `${sentence}`;
      }

      if (profile.emphasis === "very strong" && index === 0) {
        return `${sentence}`;
      }

      return sentence;
    })
    .join(" ");
}

export function buildAdaptiveVoiceCadence({
  topic = "",
  narrationPlan = {},
  emotionalBeatPlan = {},
  productionPlan = {},
  creatorVoice = {},
} = {}) {
  const synchronizedScenes =
    emotionalBeatPlan?.synchronizedScenes || [];

  const sceneCadence = synchronizedScenes.map((beat, index) => {
    const mode = detectVoiceMode({
      topic,
      emotionalBeat: beat,
      productionPlan,
    });

    const profile = getCadenceProfile(mode);

    return {
      sceneId: beat.id || `scene_${index + 1}`,
      sceneIndex: index,
      mode,
      profile,
      voiceInstruction:
        `Deliver this scene in a ${profile.delivery} style at approximately ${profile.wpm} words per minute.`,
      emphasis:
        profile.emphasis,
      energy:
        profile.energy,
      pauseDensity:
        profile.pauseDensity,
    };
  });

  const globalMode =
    sceneCadence[0]?.mode ||
    detectVoiceMode({
      topic,
      productionPlan,
    });

  const globalProfile =
    getCadenceProfile(globalMode);

  return {
    ok: true,
    engine:
      ENGINE_VERSION,

    topic,

    globalMode,
    globalProfile,

    sceneCadence,

    narrationPlan,

    creatorVoice,

    voiceMixDirectives: {
      normalizeVolume: true,
      preferredSampleRate: 24000,
      voiceVolume: 1.0,
      backgroundMusicVolume:
        globalProfile.energy > 80
          ? 0.12
          : 0.14,
      compressor:
        "light cinematic vocal compression",
    },
  };
}

export function applyCadenceToNarration({
  longformNarration = {},
  voiceCadencePlan = {},
} = {}) {
  const sceneNarrations =
    longformNarration?.sceneNarrations || [];

  const cadenceScenes =
    voiceCadencePlan?.sceneCadence || [];

  const enhancedScenes =
    sceneNarrations.map((scene, index) => {
      const cadence =
        cadenceScenes[index] ||
        voiceCadencePlan?.globalProfile ||
        {};

      const profile =
        cadence.profile ||
        voiceCadencePlan.globalProfile ||
        getCadenceProfile();

      return {
        ...scene,
        cadence,
        cadenceText:
          insertCadenceMarkers(scene.text, profile),
        voiceInstruction:
          cadence.voiceInstruction ||
          `Deliver this in a ${profile.delivery} style.`,
        estimatedWPM:
          profile.wpm || 145,
      };
    });

  return {
    ...longformNarration,
    sceneNarrations:
      enhancedScenes,
    fullText:
      clean(
        enhancedScenes
          .map((scene) => scene.cadenceText || scene.text)
          .join(" ")
      ),
    cadenceApplied: true,
    voiceCadencePlan,
  };
}

export function getAdaptiveVoiceCadenceHealth() {
  return {
    ok: true,
    engine:
      ENGINE_VERSION,
    supports: {
      perSceneCadence: true,
      emotionalVoiceControl: true,
      politicalCommentaryVoice: true,
      investigativeCadence: true,
      inspirationalCadence: true,
      aiTechVoice: true,
      narrationMarkerInsertion: true,
      musicVoiceMixDirectives: true,
    },
  };
}

export default {
  buildAdaptiveVoiceCadence,
  applyCadenceToNarration,
  getAdaptiveVoiceCadenceHealth,
};