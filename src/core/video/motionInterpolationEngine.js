// src/core/video/motionInterpolationEngine.js

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
}

function detectSceneEmotion(scene = {}) {
  const text = `${scene.title || ""} ${scene.visual || ""} ${scene.voiceover || ""} ${scene.caption || ""}`.toLowerCase();

  if (text.includes("war") || text.includes("risk") || text.includes("danger")) return "tension";
  if (text.includes("love") || text.includes("soulmate") || text.includes("heart")) return "emotional";
  if (text.includes("proof") || text.includes("evidence") || text.includes("explained")) return "investigative";
  if (text.includes("clean") || text.includes("restore") || text.includes("before")) return "transformation";
  if (text.includes("ai") || text.includes("technology") || text.includes("system")) return "futuristic";

  return "cinematic";
}

function buildCameraPath({ scene = {}, index = 0, duration = 5 }) {
  const emotion = detectSceneEmotion(scene);
  const d = clamp(duration, 5, 3, 14);

  const presets = {
    tension: {
      movement: "slow_push_with_micro_shake",
      zoomStart: 1.04,
      zoomEnd: 1.18,
      xDrift: index % 2 === 0 ? -0.06 : 0.06,
      yDrift: -0.04,
      shake: 0.012,
    },
    emotional: {
      movement: "soft_dolly_in",
      zoomStart: 1.02,
      zoomEnd: 1.11,
      xDrift: 0,
      yDrift: -0.035,
      shake: 0.002,
    },
    investigative: {
      movement: "evidence_scan",
      zoomStart: 1.05,
      zoomEnd: 1.14,
      xDrift: index % 2 === 0 ? 0.12 : -0.12,
      yDrift: 0,
      shake: 0.006,
    },
    transformation: {
      movement: "reveal_slide",
      zoomStart: 1.02,
      zoomEnd: 1.1,
      xDrift: 0.18,
      yDrift: 0,
      shake: 0,
    },
    futuristic: {
      movement: "neural_orbit_push",
      zoomStart: 1.03,
      zoomEnd: 1.16,
      xDrift: -0.08,
      yDrift: -0.06,
      shake: 0.004,
    },
    cinematic: {
      movement: "premium_slow_push",
      zoomStart: 1.02,
      zoomEnd: 1.1,
      xDrift: 0,
      yDrift: -0.04,
      shake: 0.003,
    },
  };

  const preset = presets[emotion] || presets.cinematic;

  return {
    emotion,
    duration: d,
    movement: preset.movement,
    keyframes: [
      {
        time: 0,
        zoom: preset.zoomStart,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
      },
      {
        time: Number((d * 0.5).toFixed(2)),
        zoom: Number(((preset.zoomStart + preset.zoomEnd) / 2).toFixed(4)),
        x: Number((preset.xDrift * 0.5).toFixed(4)),
        y: Number((preset.yDrift * 0.5).toFixed(4)),
        rotation: Number((preset.shake * 0.5).toFixed(4)),
        opacity: 1,
      },
      {
        time: d,
        zoom: preset.zoomEnd,
        x: preset.xDrift,
        y: preset.yDrift,
        rotation: preset.shake,
        opacity: 1,
      },
    ],
  };
}

function buildFacialMicroAnimation({ scene = {}, index = 0 }) {
  const emotion = detectSceneEmotion(scene);

  const map = {
    emotional: {
      enabled: true,
      mode: "subtle_expression_shift",
      eyeMovement: "soft_blink_and_focus",
      mouthMovement: "minimal_breathing_motion",
      intensity: 0.42,
    },
    tension: {
      enabled: true,
      mode: "concerned_micro_expression",
      eyeMovement: "slight_scan_and_blink",
      mouthMovement: "tense_breath",
      intensity: 0.38,
    },
    investigative: {
      enabled: true,
      mode: "focused_observation",
      eyeMovement: "document_scan",
      mouthMovement: "minimal",
      intensity: 0.3,
    },
    cinematic: {
      enabled: true,
      mode: "natural_breathing",
      eyeMovement: "soft_blink",
      mouthMovement: "minimal",
      intensity: 0.25,
    },
  };

  return {
    sceneIndex: index,
    ...(map[emotion] || map.cinematic),
  };
}

function buildSoundReactiveCuts({ scenes = [], soundtrackMood = "cinematic" }) {
  let cursor = 0;

  return scenes.map((scene, index) => {
    const duration = clamp(scene.duration, 5, 3, 14);
    const emotion = detectSceneEmotion(scene);

    const beatDensity =
      emotion === "tension"
        ? "high"
        : emotion === "emotional"
        ? "low"
        : emotion === "investigative"
        ? "medium"
        : "medium";

    const cutPoints = [
      Number((cursor + duration * 0.33).toFixed(2)),
      Number((cursor + duration * 0.66).toFixed(2)),
    ];

    const result = {
      sceneId: scene.id || `scene_${index + 1}`,
      sceneIndex: index,
      start: cursor,
      end: Number((cursor + duration).toFixed(2)),
      duration,
      soundtrackMood,
      emotion,
      beatDensity,
      cutPoints,
      suggestedTransition:
        emotion === "tension"
          ? "hard_flash_cut"
          : emotion === "emotional"
          ? "soft_crossfade"
          : emotion === "investigative"
          ? "scanline_wipe"
          : "cinematic_crossfade",
    };

    cursor += duration;
    return result;
  });
}

export function buildMotionInterpolationPlan({
  storyboard = null,
  scenes = [],
  visuals = [],
  soundtrackMood = "cinematic",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
} = {}) {
  const finalScenes =
    Array.isArray(scenes) && scenes.length
      ? scenes
      : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : [];

  if (!finalScenes.length) {
    throw new Error("No scenes supplied to buildMotionInterpolationPlan.");
  }

  const cameraPaths = finalScenes.map((scene, index) =>
    buildCameraPath({
      scene,
      index,
      duration: scene.duration || 5,
    })
  );

  const facialMicroAnimations = finalScenes.map((scene, index) =>
    buildFacialMicroAnimation({
      scene,
      index,
    })
  );

  const soundReactiveCuts = buildSoundReactiveCuts({
    scenes: finalScenes,
    soundtrackMood,
  });

  return {
    ok: true,
    engine: "Aigenikz Motion Interpolation Engine v1",
    platform,
    style,
    sceneCount: finalScenes.length,
    cameraPaths,
    facialMicroAnimations,
    soundReactiveCuts,
    renderHints: {
      interpolationMode: "keyframe-driven-ffmpeg",
      futureMode: "ai-video-frame-interpolation",
      supportsFacialMicroAnimation: true,
      supportsSoundReactiveCuts: true,
      supportsMultiCamera: true,
    },
  };
}

export default {
  buildMotionInterpolationPlan,
};