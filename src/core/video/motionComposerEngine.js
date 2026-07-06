// src/core/video/motionComposerEngine.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

import { renderKineticScene } from "./kineticSceneEngine.js";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value = "clip") {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "clip"
  );
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, stderr });
      else reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

function getSceneDuration(scene = {}, fallback = 5) {
  const n = Number(scene.duration);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(3, Math.min(n, 12));
}

function getVisualPath(visual = {}) {
  return (
    visual?.imagePath ||
    visual?.outputPath ||
    visual?.path ||
    visual?.filePath ||
    null
  );
}

function getClipPath(clip = {}) {
  return (
    clip?.outputPath ||
    clip?.videoPath ||
    clip?.filePath ||
    clip?.path ||
    null
  );
}

function getMotionForScene({ scene = {}, index = 0, motionInterpolationPlan }) {
  const plan = motionInterpolationPlan?.cameraPaths?.[index];

  if (plan?.keyframes?.length >= 2) {
    const start = plan.keyframes[0];
    const end = plan.keyframes[plan.keyframes.length - 1];

    return {
      zoomStart: Number(start.zoom || 1.02),
      zoomEnd: Number(end.zoom || 1.1),
      xDrift: Number(end.x || 0),
      yDrift: Number(end.y || 0),
      shake: Number(end.rotation || 0),
      movement: plan.movement || "premium_slow_push",
    };
  }

  const text = `${scene.title || ""} ${scene.visual || ""} ${
    scene.voiceover || ""
  }`.toLowerCase();

  if (text.includes("war") || text.includes("danger") || text.includes("risk")) {
    return {
      zoomStart: 1.04,
      zoomEnd: 1.17,
      xDrift: index % 2 === 0 ? -0.06 : 0.06,
      yDrift: -0.04,
      shake: 0.012,
      movement: "tension_push",
    };
  }

  if (text.includes("love") || text.includes("soulmate")) {
    return {
      zoomStart: 1.02,
      zoomEnd: 1.1,
      xDrift: 0,
      yDrift: -0.03,
      shake: 0.002,
      movement: "soft_dolly",
    };
  }

  return {
    zoomStart: 1.02,
    zoomEnd: 1.11,
    xDrift: index % 2 === 0 ? 0.04 : -0.04,
    yDrift: -0.035,
    shake: 0.003,
    movement: "cinematic_push",
  };
}

async function normalizeLiveVideoClip({
  inputPath,
  outputPath,
  duration,
  quality = "balanced",
}) {
  const preset = quality === "high" ? "slow" : "veryfast";

  await runFFmpeg([
    "-y",
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-vf",
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},format=yuv420p`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    quality === "high" ? "18" : quality === "fast" ? "26" : "22",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

async function createImageMotionClip({
  imagePath,
  outputPath,
  scene,
  index,
  duration,
  quality = "balanced",
  motionInterpolationPlan,
}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Missing image for fallback motion scene ${index + 1}`);
  }

  const motion = getMotionForScene({
    scene,
    index,
    motionInterpolationPlan,
  });

  const frames = Math.round(duration * FPS);
  const zoomDelta = (motion.zoomEnd - motion.zoomStart) / Math.max(frames, 1);

  const shakeX =
    Math.abs(motion.shake) > 0
      ? `+sin(on*0.72)*${Math.round(motion.shake * 1100)}`
      : "";

  const shakeY =
    Math.abs(motion.shake) > 0
      ? `+cos(on*0.66)*${Math.round(motion.shake * 900)}`
      : "";

  const driftXPixels = Math.round(motion.xDrift * 220);
  const driftYPixels = Math.round(motion.yDrift * 220);

  const vf = [
    `scale=1400:2489:force_original_aspect_ratio=increase`,
    `crop=1200:2134`,
    `zoompan=z='min(${motion.zoomStart.toFixed(4)}+${zoomDelta.toFixed(
      8
    )}*on,${motion.zoomEnd.toFixed(4)})':x='iw/2-(iw/zoom/2)+(${driftXPixels}*on/${frames})${shakeX}':y='ih/2-(ih/zoom/2)+(${driftYPixels}*on/${frames})${shakeY}':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
    `format=yuv420p`,
  ].join(",");

  const preset = quality === "high" ? "slow" : "veryfast";

  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-t",
    String(duration),
    "-vf",
    vf,
    "-r",
    String(FPS),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    quality === "high" ? "18" : quality === "fast" ? "26" : "22",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

async function buildSceneClips({
  visuals = [],
  aiVideoClips = [],
  scenes = [],
  outputDir,
  projectId,
  quality,
  motionInterpolationPlan,
}) {
  const clipDir = path.join(outputDir, `${projectId}_clips`);
  ensureDir(clipDir);

  const clips = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index] || {};
    const duration = getSceneDuration(scene, 5);

    const aiClip = aiVideoClips[index];
    const aiClipPath = getClipPath(aiClip);

    const outputPath = path.join(
      clipDir,
      `${String(index + 1).padStart(2, "0")}-${safeSlug(
        scene.title || `scene-${index + 1}`
      )}.mp4`
    );

    if (aiClipPath && fs.existsSync(aiClipPath)) {
      await normalizeLiveVideoClip({
        inputPath: aiClipPath,
        outputPath,
        duration,
        quality,
      });

      clips.push({
        sceneId: scene.id || `scene_${index + 1}`,
        sceneIndex: index,
        title: scene.title || `Scene ${index + 1}`,
        outputPath,
        source: aiClip.liveAction ? aiClip.source || "ai-video" : "fallback-motion-video",
        liveAction: Boolean(aiClip.liveAction),
        fallbackUsed: Boolean(aiClip.fallbackUsed),
        duration,
      });

      continue;
    }

    const imagePath = getVisualPath(visuals[index]);

    await createImageMotionClip({
      imagePath,
      outputPath,
      scene,
      index,
      duration,
      quality,
      motionInterpolationPlan,
    });

    clips.push({
      sceneId: scene.id || `scene_${index + 1}`,
      sceneIndex: index,
      title: scene.title || `Scene ${index + 1}`,
      outputPath,
      source: "image-motion-fallback",
      liveAction: false,
      fallbackUsed: true,
      duration,
    });
  }

  return clips;
}

function makeConcatList(clips = [], outputDir, projectId) {
  const listPath = path.join(outputDir, `${projectId}_concat.txt`);

  const content = clips
    .map((clip) => `file '${clip.outputPath.replace(/\\/g, "/")}'`)
    .join("\n");

  fs.writeFileSync(listPath, content, "utf8");
  return listPath;
}

async function concatClips({ clips, outputPath, quality = "balanced" }) {
  const listPath = makeConcatList(
    clips,
    path.dirname(outputPath),
    path.basename(outputPath, ".mp4")
  );

  const preset = quality === "high" ? "slow" : "veryfast";

  await runFFmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    quality === "high" ? "18" : quality === "fast" ? "26" : "22",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(FPS),
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

async function concatClipsWithTransitions({
  clips,
  outputPath,
  transitionStyle = "cinematic",
  quality = "balanced",
}) {
  if (!clips.length) throw new Error("No clips supplied for transition concat.");
  if (clips.length === 1) {
    fs.copyFileSync(clips[0].outputPath, outputPath);
    return outputPath;
  }

  const preset = quality === "high" ? "slow" : "veryfast";

  const inputs = [];
  clips.forEach((clip) => {
    inputs.push("-i", clip.outputPath);
  });

  const transition =
    transitionStyle === "flash"
      ? "fadeblack"
      : transitionStyle === "wipe"
      ? "wipeleft"
      : "fade";

  let filter = "";
  let offset = 0;

  for (let i = 0; i < clips.length - 1; i += 1) {
    offset += Math.max(0.1, Number(clips[i].duration || 5) - 0.45);

    if (i === 0) {
      filter += `[0:v][1:v]xfade=transition=${transition}:duration=0.45:offset=${offset.toFixed(
        2
      )}[v1];`;
    } else {
      filter += `[v${i}][${i + 1}:v]xfade=transition=${transition}:duration=0.45:offset=${offset.toFixed(
        2
      )}[v${i + 1}];`;
    }
  }

  const finalLabel = `[v${clips.length - 1}]`;

  await runFFmpeg([
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    finalLabel,
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    quality === "high" ? "18" : quality === "fast" ? "26" : "22",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(FPS),
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

export async function composeMotionVideo({
  visuals = [],
  aiVideoClips = [],
  scenes = [],
  outputDir = "server-renders",
  projectId = `motion_${Date.now()}`,
  useTransitions = true,
  transitionStyle = "cinematic",
  transitionPlan = [],
  quality = "balanced",
  preferGPU = false,
  effect = "cinematic",
  timeline = null,
  motionDirection = null,
  layeredScenes = null,
  motionProfiles = [],
  animatedCaptionTrack = null,
  motionInterpolationPlan = null,
} = {}) {
  ensureDir(outputDir);

  const finalScenes =
    Array.isArray(scenes) && scenes.length
      ? scenes
      : visuals.map((visual, index) => ({
          id: visual.sceneId || `scene_${index + 1}`,
          title: visual.title || `Scene ${index + 1}`,
          duration: visual.duration || 5,
        }));

  if (!finalScenes.length) {
    throw new Error("composeMotionVideo requires scenes or visuals.");
  }

  const outputPath = path.join(outputDir, `${projectId}.mp4`);

  const clips = await buildSceneClips({
    visuals,
    aiVideoClips,
    scenes: finalScenes,
    outputDir,
    projectId,
    quality,
    motionInterpolationPlan,
  });

  const liveActionCount = clips.filter((clip) => clip.liveAction).length;

  if (useTransitions && clips.length > 1) {
    await concatClipsWithTransitions({
      clips,
      outputPath,
      transitionStyle,
      quality,
    });
  } else {
    await concatClips({
      clips,
      outputPath,
      quality,
    });
  }

  return {
    ok: true,
    engine: "AstraMind Motion Composer v9 Live Video Compatible",
    outputPath,
    publicUrl: `/renders/${path.basename(outputPath)}`,
    projectId,
    clips,
    aiVideoClips,
    liveActionCount,
    fallbackCount: clips.length - liveActionCount,
    usedTransitions: Boolean(useTransitions && clips.length > 1),
    transitionStyle,
    transitionPlan,
    quality,
    preferGPU,
    effect,
    timeline,
    motionDirection,
    layeredScenes,
    motionProfiles,
    animatedCaptionTrack,
    motionInterpolationPlan,
  };
}

export async function applyMotionToScene({
  scene,
  visual,
  visualPath,
  outputPath,
  duration = 5,
  platform = "TikTok",
  style = "cinematic",
  provider = "fallback-motion",
  productionPlan = {},
  motionEffect = "cinematic",
  intensity = 70,
} = {}) {
  const inputPath =
    visualPath ||
    visual?.filePath ||
    visual?.path ||
    visual?.imagePath ||
    visual?.outputPath;

  if (!inputPath) {
    throw new Error("applyMotionToScene missing visual/image input path.");
  }

  const kineticResult = await renderKineticScene({
    inputPath,
    outputPath,
    scene,
    platform,
    style,
    duration,
    intensity,
    productionPlan: {
      ...productionPlan,
      motionEffect:
        productionPlan?.motionEffect ||
        motionEffect ||
        "cinematic",
    },
  });

  return {
    ok: true,
    outputPath: kineticResult.outputPath,
    videoPath: kineticResult.videoPath || kineticResult.outputPath,
    source: "kineticSceneEngine",
    provider,
    platform,
    style,
    intensity,
    kinetic: kineticResult,
  };
}

export default {
  composeMotionVideo,
  applyMotionToScene,
};