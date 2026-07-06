// src/core/video/sceneEvolutionEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const EVOLUTION_DIR = path.join(ROOT, "server-renders", "scene-evolution");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value = "scene") {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "scene"
  );
}

function uid() {
  return crypto.randomBytes(6).toString("hex");
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function detectSceneMood(scene = {}, productionPlan = {}) {
  const text = `${scene.title || ""} ${scene.purpose || ""} ${scene.visual || ""} ${
    scene.voiceover || ""
  } ${scene.caption || ""}`.toLowerCase();

  if (/danger|risk|warning|truth|exposed|fire|threat|urgent/.test(text)) {
    return "tension";
  }

  if (/proof|evidence|result|data|pattern|research/.test(text)) {
    return "evidence";
  }

  if (/future|ai|system|automation|technology|astramind|launch/.test(text)) {
    return "futuristic";
  }

  if (/choose|cta|mission|subscribe|schedule|start/.test(text)) {
    return "cta";
  }

  if (productionPlan?.cameraMovement?.includes("documentary")) {
    return "documentary";
  }

  return "cinematic";
}

function getShotCount(duration = 6, mood = "cinematic") {
  const d = clamp(duration, 3, 30, 6);

  if (d <= 5) return 2;
  if (d <= 8) return mood === "tension" ? 4 : 3;
  if (d <= 14) return mood === "evidence" ? 5 : 4;
  return 6;
}

function splitDurations(totalDuration = 6, count = 3) {
  const total = clamp(totalDuration, 3, 30, 6);
  const shotCount = clamp(count, 1, 8, 3);

  const base = Math.floor(total / shotCount);
  let remaining = total - base * shotCount;

  return Array.from({ length: shotCount }, (_, index) => {
    const extra = remaining > 0 ? 1 : 0;
    remaining -= extra;
    return Math.max(1.5, base + extra);
  });
}

function buildShotLanguage({ mood, index, total }) {
  const first = index === 0;
  const last = index === total - 1;

  if (mood === "tension") {
    return first
      ? {
          shotType: "hard_open",
          camera: "fast push-in",
          motionEffect: "impact",
          intensity: 86,
          overlay: "subtle warning pulse",
        }
      : last
      ? {
          shotType: "proof_hit",
          camera: "tight zoom with micro shake",
          motionEffect: "impact",
          intensity: 90,
          overlay: "high contrast vignette",
        }
      : {
          shotType: "pattern_cut",
          camera: "angled pan and punch-in",
          motionEffect: "impact",
          intensity: 82,
          overlay: "data flicker",
        };
  }

  if (mood === "evidence") {
    return first
      ? {
          shotType: "context_reveal",
          camera: "slow investigative push",
          motionEffect: "documentary",
          intensity: 62,
          overlay: "clean evidence frame",
        }
      : last
      ? {
          shotType: "conclusion_frame",
          camera: "locked proof zoom",
          motionEffect: "documentary",
          intensity: 68,
          overlay: "subtle document scan",
        }
      : {
          shotType: "detail_scan",
          camera: "left-to-right evidence drift",
          motionEffect: "documentary",
          intensity: 64,
          overlay: "timeline scan",
        };
  }

  if (mood === "futuristic") {
    return first
      ? {
          shotType: "neural_reveal",
          camera: "smooth orbital push",
          motionEffect: "futuristic",
          intensity: 76,
          overlay: "holographic grid",
        }
      : last
      ? {
          shotType: "system_lock",
          camera: "centered energy pulse",
          motionEffect: "futuristic",
          intensity: 82,
          overlay: "AI interface pulse",
        }
      : {
          shotType: "module_activation",
          camera: "digital hover drift",
          motionEffect: "futuristic",
          intensity: 78,
          overlay: "cyan module lines",
        };
  }

  if (mood === "cta") {
    return first
      ? {
          shotType: "decision_moment",
          camera: "slow forward push",
          motionEffect: "cinematic",
          intensity: 68,
          overlay: "clean focus glow",
        }
      : {
          shotType: "final_action",
          camera: "steady centered push",
          motionEffect: "cinematic",
          intensity: 72,
          overlay: "brand glow",
        };
  }

  return first
    ? {
        shotType: "establishing",
        camera: "premium cinematic push",
        motionEffect: "cinematic",
        intensity: 68,
        overlay: "soft vignette",
      }
    : last
    ? {
        shotType: "emotional_resolution",
        camera: "slow center push",
        motionEffect: "drift",
        intensity: 70,
        overlay: "soft glow",
      }
    : {
        shotType: "detail_motion",
        camera: "parallax drift",
        motionEffect: "drift",
        intensity: 72,
        overlay: "depth movement",
      };
}

function buildShotPrompt({
  scene = {},
  shot = {},
  mood = "cinematic",
  topic = "",
  style = "cinematic",
}) {
  const baseVisual = scene.visual || scene.imagePrompt || scene.title || topic;

  return `
Vertical 9:16 cinematic shot.
Topic: ${topic}
Scene title: ${scene.title || "Scene"}
Scene purpose: ${scene.purpose || "advance the story"}
Mood: ${mood}
Shot type: ${shot.shotType}
Camera direction: ${shot.camera}
Visual basis: ${baseVisual}
Caption idea: ${scene.caption || ""}
Style: ${style}
Create a distinct variation of the same scene, not a duplicate.
No large text baked into the image unless it is part of a dashboard or interface.
Premium lighting, depth, cinematic composition, high visual clarity.
  `.trim();
}

export function evolveSceneIntoShots({
  scene = {},
  topic = "",
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
  maxShots = 6,
} = {}) {
  const duration = clamp(scene.duration, 3, 30, 6);
  const mood = detectSceneMood(scene, productionPlan);
  const shotCount = Math.min(getShotCount(duration, mood), clamp(maxShots, 1, 8, 6));
  const durations = splitDurations(duration, shotCount);

  let cursor = Number(scene.start || 0);

  const shots = durations.map((shotDuration, index) => {
    const language = buildShotLanguage({
      mood,
      index,
      total: durations.length,
    });

    const shot = {
      id: `${scene.id || "scene"}_shot_${String(index + 1).padStart(2, "0")}`,
      sceneId: scene.id || `scene_${uid()}`,
      sceneTitle: scene.title || "Scene",
      index,
      duration: shotDuration,
      start: cursor,
      end: cursor + shotDuration,
      mood,
      platform,
      style,
      caption:
        index === durations.length - 1
          ? scene.caption
          : scene.caption
          ? `${scene.caption}`
          : scene.title || "",
      voiceover: scene.voiceover || "",
      visual: scene.visual || "",
      imagePrompt: "",
      ...language,
    };

    shot.imagePrompt = buildShotPrompt({
      scene,
      shot,
      mood,
      topic,
      style,
    });

    cursor += shotDuration;

    return shot;
  });

  return {
    ok: true,
    engine: "AstraMind Scene Evolution Engine v1",
    sceneId: scene.id,
    sceneTitle: scene.title,
    mood,
    duration,
    shotCount,
    shots,
  };
}

export function evolveStoryboardIntoShots({
  storyboard = {},
  topic = "",
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
  maxShotsPerScene = 2,
} = {}) {
  const scenes = Array.isArray(storyboard.scenes) ? storyboard.scenes : [];

  const evolvedScenes = scenes.map((scene) =>
    evolveSceneIntoShots({
      scene,
      topic: topic || storyboard.topic,
      platform: platform || storyboard.platform,
      style: style || storyboard.style,
      productionPlan,
      maxShots: maxShotsPerScene,
    })
  );

  const shots = evolvedScenes.flatMap((entry) => entry.shots || []);

  ensureDir(EVOLUTION_DIR);

  const packagePath = path.join(
  EVOLUTION_DIR,
  "latest-shot-plan.json"
);

  const payload = {
    ok: true,
    engine: "AstraMind Scene Evolution Engine v1",
    topic: topic || storyboard.topic,
    platform: platform || storyboard.platform,
    style: style || storyboard.style,
    sceneCount: scenes.length,
    shotCount: shots.length,
    evolvedScenes,
    shots,
    packagePath,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(packagePath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

export function rebuildScenesFromShots(shots = []) {
  const grouped = new Map();

  for (const shot of shots) {
    const key = shot.sceneId || "scene";
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        title: shot.sceneTitle || key,
        duration: 0,
        shots: [],
      });
    }

    const group = grouped.get(key);
    group.shots.push(shot);
    group.duration += Number(shot.duration || 0);
  }

  return Array.from(grouped.values());
}

export function getSceneEvolutionHealth() {
  return {
    ok: true,
    engine: "AstraMind Scene Evolution Engine v1",
    outputDir: EVOLUTION_DIR,
    supports: {
      multiShotScenes: true,
      moodDetection: true,
      durationSplitting: true,
      shotPromptGeneration: true,
      cameraLanguage: true,
      visualVariation: true,
      storyboardEvolution: true,
    },
  };
}

export default {
  evolveSceneIntoShots,
  evolveStoryboardIntoShots,
  rebuildScenesFromShots,
  getSceneEvolutionHealth,
};