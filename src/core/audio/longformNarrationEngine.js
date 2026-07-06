// src/core/audio/longformNarrationEngine.js

const ENGINE_VERSION = "AstraMind Longform Narration Engine v1";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function wordCount(text = "") {
  return clean(text).split(/\s+/).filter(Boolean).length;
}

function estimateSecondsFromWords(words = 0, wpm = 145) {
  return Math.round((Number(words || 0) / wpm) * 60);
}

function targetWordCount(durationTarget = 30, wpm = 145) {
  const duration = clamp(durationTarget, 15, 180, 30);
  return Math.round((duration / 60) * wpm);
}

function detectNarrationMode(topic = "", productionPlan = {}) {
  const t = clean(topic).toLowerCase();

  if (/trump|maga|biden|democrat|liberal|leftist|administration|election/.test(t)) {
    return {
      mode: "political_commentary",
      tone: "authoritative, factual, contrast-driven, intense but controlled",
      wpm: 152,
    };
  }

  if (/astramind|ai|automation|technology|creator|app|platform|robot/.test(t)) {
    return {
      mode: "ai_product_cinematic",
      tone: "futuristic, premium, visionary, confident",
      wpm: 145,
    };
  }

  if (/documentary|history|timeline|evidence|investigation|truth/.test(t)) {
    return {
      mode: "documentary",
      tone: "measured, investigative, grounded, suspenseful",
      wpm: 135,
    };
  }

  return {
    mode: "general_cinematic",
    tone: productionPlan?.captionStyle === "bold-kinetic"
      ? "fast, punchy, high-energy"
      : "clear, cinematic, emotionally focused",
    wpm: 145,
  };
}

function sceneWeight(scene = {}, index = 0, total = 5) {
  const title = clean(scene.title).toLowerCase();

  if (index === 0 || title.includes("hook")) return 1.1;
  if (title.includes("problem")) return 1.2;
  if (title.includes("pattern")) return 1.25;
  if (title.includes("evidence")) return 1.2;
  if (title.includes("cta")) return 0.9;

  return 1;
}

function distributeWordsAcrossScenes({ scenes = [], totalWords = 120 }) {
  const weights = scenes.map((scene, index) =>
    sceneWeight(scene, index, scenes.length)
  );

  const weightTotal = weights.reduce((sum, w) => sum + w, 0) || 1;

  let allocations = scenes.map((scene, index) =>
    Math.max(12, Math.round((weights[index] / weightTotal) * totalWords))
  );

  const diff = totalWords - allocations.reduce((sum, n) => sum + n, 0);
  allocations[allocations.length - 1] += diff;

  return allocations;
}

function expandSceneNarration({
  scene = {},
  topic = "",
  targetWords = 30,
  mode = "general_cinematic",
}) {
  const title = clean(scene.title || "Scene");
  const base =
    clean(scene.voiceover) ||
    clean(scene.narration) ||
    clean(scene.caption) ||
    clean(scene.purpose) ||
    `This moment reveals something important about ${topic}.`;

  const visual = clean(scene.visual || "");
  const caption = clean(scene.caption || "");
  const purpose = clean(scene.purpose || "");

  const templates = {
    political_commentary: [
      base,
      `The important part is not just what people say on the surface. It is the pattern behind the decision, the consequence, and who benefits from the narrative.`,
      `When you compare the claims, the results, and the public reaction, the contrast becomes harder to ignore.`,
      `That is why this moment deserves more than a headline. It deserves context, evidence, and a clear look at what actually changed.`,
    ],
    ai_product_cinematic: [
      base,
      `This is where AstraMind stops being just another tool and starts acting like a living intelligence system.`,
      `Instead of forcing the user to jump between platforms, it reads the mission, organizes the workflow, and helps turn raw ideas into real output.`,
      `The subscriber stays in control, but the system becomes smarter with every decision, every project, and every creative direction.`,
    ],
    documentary: [
      base,
      `The first layer is what everyone sees. The deeper layer is the timeline, the evidence, and the details that keep repeating.`,
      `When those details line up, the story becomes less random and more structured.`,
      `That is where the real question begins: what does the pattern reveal, and why was it missed for so long?`,
    ],
    general_cinematic: [
      base,
      `The surface only shows part of the story. The real meaning appears when the details begin to connect.`,
      `Every frame adds another clue, another consequence, and another reason to pay attention.`,
      `By the end, the question is no longer whether something changed. The question is whether people are ready to see it clearly.`,
    ],
  };

  const pool = templates[mode] || templates.general_cinematic;

  let output = "";

  for (const line of pool) {
    if (wordCount(output) >= targetWords) break;
    output += `${line} `;
  }

  while (wordCount(output) < targetWords) {
    output += `This scene pushes the story forward with ${purpose || "clear purpose"}, showing ${visual || "the core idea"} while reinforcing the message: ${caption || topic}. `;
  }

  return clean(output)
    .split(/\s+/)
    .slice(0, Math.max(12, targetWords + 8))
    .join(" ");
}

export function buildLongformNarration({
  topic = "",
  storyboard = {},
  scenes = null,
  durationTarget = 30,
  platform = "TikTok",
  productionPlan = {},
  creatorVoice = {},
} = {}) {
  const finalScenes =
    Array.isArray(scenes) && scenes.length
      ? scenes
      : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : [];

  if (!finalScenes.length) {
    throw new Error("buildLongformNarration requires storyboard scenes.");
  }

  const modeProfile = detectNarrationMode(topic, productionPlan);
  const desiredWords = targetWordCount(durationTarget, modeProfile.wpm);
  const allocations = distributeWordsAcrossScenes({
    scenes: finalScenes,
    totalWords: desiredWords,
  });

  let cursor = 0;

  const sceneNarrations = finalScenes.map((scene, index) => {
    const targetWords = allocations[index];

    const text = expandSceneNarration({
      scene,
      topic,
      targetWords,
      mode: modeProfile.mode,
    });

    const words = wordCount(text);
    const estimatedDuration = Math.max(
      3,
      estimateSecondsFromWords(words, modeProfile.wpm)
    );

    const item = {
      sceneId: scene.id || `scene_${index + 1}`,
      sceneTitle: scene.title || `Scene ${index + 1}`,
      index,
      text,
      words,
      targetWords,
      start: cursor,
      end: cursor + estimatedDuration,
      estimatedDuration,
      tone: modeProfile.tone,
      mode: modeProfile.mode,
    };

    cursor += estimatedDuration;

    return item;
  });

  const fullText = clean(sceneNarrations.map((n) => n.text).join(" "));

  return {
    ok: true,
    engine: ENGINE_VERSION,
    topic,
    platform,
    durationTarget,
    mode: modeProfile.mode,
    tone: modeProfile.tone,
    wordsPerMinute: modeProfile.wpm,
    targetWords: desiredWords,
    actualWords: wordCount(fullText),
    estimatedDuration: cursor,
    fullText,
    sceneNarrations,
    creatorVoice,
    productionPlan,
  };
}

export function buildNarrationCaptions({
  sceneNarrations = [],
  maxWordsPerCaption = 7,
} = {}) {
  const captions = [];

  for (const narration of sceneNarrations) {
    const words = clean(narration.text).split(/\s+/).filter(Boolean);
    const duration = Math.max(2, narration.estimatedDuration || 5);
    const chunks = [];

    for (let i = 0; i < words.length; i += maxWordsPerCaption) {
      chunks.push(words.slice(i, i + maxWordsPerCaption).join(" "));
    }

    const chunkDuration = duration / Math.max(chunks.length, 1);

    chunks.forEach((text, index) => {
      captions.push({
        index: captions.length + 1,
        sceneId: narration.sceneId,
        start: narration.start + index * chunkDuration,
        end: narration.start + (index + 1) * chunkDuration,
        text,
      });
    });
  }

  return captions;
}

export function getLongformNarrationHealth() {
  return {
    ok: true,
    engine: ENGINE_VERSION,
    supports: {
      durationAwareNarration: true,
      sceneNarrationExpansion: true,
      platformToneDetection: true,
      politicalCommentaryTone: true,
      aiProductNarration: true,
      documentaryNarration: true,
      captionTimingGeneration: true,
      antiShortVoiceover: true,
    },
  };
}

export default {
  buildLongformNarration,
  buildNarrationCaptions,
  getLongformNarrationHealth,
};