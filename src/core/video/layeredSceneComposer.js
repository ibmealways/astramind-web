// src/core/video/layeredSceneComposer.js

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
}

function buildLayerId(sceneIndex, name) {
  return `scene_${String(sceneIndex + 1).padStart(2, "0")}_${name}`;
}

function getLayerBlendMode(type = "") {
  if (type.includes("light") || type.includes("particles")) return "screen";
  if (type.includes("scan") || type.includes("hud")) return "overlay";
  if (type.includes("risk") || type.includes("badge")) return "normal";
  return "normal";
}

function getLayerOpacity(type = "") {
  if (type.includes("particles")) return 0.28;
  if (type.includes("hud")) return 0.35;
  if (type.includes("scan")) return 0.22;
  if (type.includes("light")) return 0.3;
  if (type.includes("risk")) return 0.7;
  if (type.includes("badge")) return 0.65;
  return 0.45;
}

function buildSceneLayers({ scene = {}, motionScene = {}, visual = {}, index = 0 }) {
  const overlays = motionScene?.motion?.overlays || [];
  const parallax = motionScene?.motion?.parallax || { enabled: true, layers: 3 };

  const baseImagePath =
    visual?.imagePath || motionScene?.source?.imagePath || scene.imagePath || null;

  const layers = [
    {
      id: buildLayerId(index, "background"),
      type: "background_image",
      source: baseImagePath,
      zIndex: 0,
      opacity: 1,
      blendMode: "normal",
      parallaxDepth: parallax.enabled ? 0.25 : 0,
      transform: {
        scale: 1.08,
        xDrift: motionScene?.motion?.parallax?.backgroundDrift || 0,
        yDrift: motionScene?.motion?.parallax?.verticalDepth || 0,
      },
    },
    {
      id: buildLayerId(index, "midground"),
      type: "midground_focus",
      source: baseImagePath,
      zIndex: 10,
      opacity: 0.72,
      blendMode: "normal",
      parallaxDepth: parallax.enabled ? 0.65 : 0,
      transform: {
        scale: 1.035,
        xDrift: motionScene?.motion?.parallax?.midgroundDrift || 0,
        yDrift: (motionScene?.motion?.parallax?.verticalDepth || 0) * 0.65,
      },
    },
    {
      id: buildLayerId(index, "foreground"),
      type: "foreground_energy",
      source: baseImagePath,
      zIndex: 20,
      opacity: 0.18,
      blendMode: "screen",
      parallaxDepth: parallax.enabled ? 1 : 0,
      transform: {
        scale: 1.012,
        xDrift: motionScene?.motion?.parallax?.foregroundDrift || 0,
        yDrift: (motionScene?.motion?.parallax?.verticalDepth || 0) * 1.1,
      },
    },
  ];

  overlays.forEach((overlay, overlayIndex) => {
    layers.push({
      id: buildLayerId(index, `overlay_${overlayIndex + 1}`),
      type: overlay,
      source: null,
      zIndex: 40 + overlayIndex,
      opacity: getLayerOpacity(overlay),
      blendMode: getLayerBlendMode(overlay),
      parallaxDepth: 0,
      timing: {
        startOffset: overlayIndex === 0 ? 0 : 0.25,
        duration: overlay.includes("flash") ? 0.65 : "scene",
      },
      transform: {
        scale: 1,
        xDrift: 0,
        yDrift: 0,
      },
    });
  });

  layers.push({
    id: buildLayerId(index, "caption_safe_zone"),
    type: "caption_safe_zone",
    source: null,
    zIndex: 90,
    opacity: 1,
    blendMode: "normal",
    safeArea: {
      x: 70,
      y: 1220,
      width: 940,
      height: 430,
    },
  });

  return layers;
}

export function composeLayeredScene({
  scene = {},
  motionScene = {},
  visual = {},
  index = 0,
  width = 1080,
  height = 1920,
  fps = 30,
} = {}) {
  const duration = clamp(scene.duration || motionScene.duration, 5, 3, 14);
  const layers = buildSceneLayers({ scene, motionScene, visual, index });

  return {
    ok: true,
    engine: "AstraMind Layered Scene Composer v1",
    sceneId: scene.id || motionScene.id || `scene_${index + 1}`,
    sceneIndex: index,
    title: clean(scene.title || motionScene.title || `Scene ${index + 1}`),
    duration,
    width,
    height,
    fps,
    layers,
    renderPlan: {
      mode: "layered-parallax",
      camera: motionScene?.motion?.camera || null,
      microMotion: motionScene?.motion?.microMotion || null,
      captionAnimation: motionScene?.motion?.captionAnimation || "cinematic_lower_third",
      transition: motionScene?.motion?.transition || "cinematic_crossfade",
    },
  };
}

export function composeLayeredScenes({
  scenes = [],
  motionDirection = null,
  visuals = [],
  width = 1080,
  height = 1920,
  fps = 30,
} = {}) {
  const motionScenes = motionDirection?.scenes || [];

  if (!Array.isArray(scenes) || !scenes.length) {
    throw new Error("No scenes supplied to composeLayeredScenes.");
  }

  return {
    ok: true,
    engine: "AstraMind Layered Scene Composer v1",
    sceneCount: scenes.length,
    width,
    height,
    fps,
    scenes: scenes.map((scene, index) =>
      composeLayeredScene({
        scene,
        motionScene: motionScenes[index] || {},
        visual: visuals[index] || {},
        index,
        width,
        height,
        fps,
      })
    ),
  };
}

export default {
  composeLayeredScene,
  composeLayeredScenes,
};