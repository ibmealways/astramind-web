// src/core/video/cinematicShotAssembler.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

import { renderKineticScene } from "./kineticSceneEngine.js";

const ROOT = process.cwd();
const SHOT_ASSEMBLY_DIR = path.join(ROOT, "server-renders", "shot-assemblies");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function assertFile(filePath, label = "file") {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath}`);
  }
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value = "shot-assembly") {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 90) || "shot-assembly"
  );
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path missing."));
      return;
    }

    console.log("🎬 Shot Assembler FFmpeg command:");
    console.log(ffmpegPath, args.join(" "));

    const ff = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    ff.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ff.on("error", reject);

    ff.on("close", (code) => {
      if (stderr) {
        console.log("🎬 Shot Assembler FFmpeg log:");
        console.log(stderr);
      }

      if (code === 0) resolve({ ok: true });
      else reject(new Error(stderr || `Shot Assembler FFmpeg failed with code ${code}`));
    });
  });
}

function getInputPath(item = {}) {
  return (
    item.outputPath ||
    item.videoPath ||
    item.filePath ||
    item.path ||
    item.imagePath ||
    item.visualPath ||
    null
  );
}

function getTransitionStyle(style = "cinematic") {
  const cleanStyle = String(style || "").toLowerCase();

  if (cleanStyle.includes("impact")) return "fadeblack";
  if (cleanStyle.includes("flash")) return "fadeblack";
  if (cleanStyle.includes("wipe")) return "wipeleft";
  if (cleanStyle.includes("future") || cleanStyle.includes("tech")) return "smoothleft";
  if (cleanStyle.includes("documentary")) return "fade";

  return "fade";
}

function makeConcatList(clips = [], outputDir, name = "concat") {
  const listPath = path.join(outputDir, `${safeSlug(name)}_concat.txt`);

  const content = clips
    .map((clip) => `file '${clip.outputPath.replace(/\\/g, "/")}'`)
    .join("\n");

  fs.writeFileSync(listPath, content, "utf8");
  return listPath;
}

async function concatSimple({ clips = [], outputPath }) {
  const listPath = makeConcatList(clips, path.dirname(outputPath), path.basename(outputPath, ".mp4"));

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
    "veryfast",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

async function concatWithTransitions({
  clips = [],
  outputPath,
  transitionStyle = "cinematic",
  transitionDuration = 0.35,
}) {
  if (!clips.length) throw new Error("No clips supplied to cinematic shot assembler.");

  if (clips.length === 1) {
    fs.copyFileSync(clips[0].outputPath, outputPath);
    return outputPath;
  }

  const inputs = [];

  clips.forEach((clip) => {
    inputs.push("-i", clip.outputPath);
  });

  const transition = getTransitionStyle(transitionStyle);

  let filter = "";
  let offset = 0;

  for (let i = 0; i < clips.length - 1; i += 1) {
    const currentDuration = Math.max(0.8, Number(clips[i].duration || 2));
    offset += currentDuration - transitionDuration;

    if (i === 0) {
      filter += `[0:v][1:v]xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset.toFixed(
        2
      )}[v1];`;
    } else {
      filter += `[v${i}][${i + 1}:v]xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset.toFixed(
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
    "veryfast",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

export function buildShotAssemblyPlan({
  shots = [],
  scene = {},
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
} = {}) {
  const transitionStyle =
    productionPlan?.transitionStyle ||
    productionPlan?.cameraMovement ||
    style ||
    "cinematic";

  const transitionDuration =
    shots.length > 4 ? 0.25 : shots.length > 2 ? 0.35 : 0.45;

  return {
    ok: true,
    engine: "AstraMind Cinematic Shot Assembler v1",
    sceneId: scene.id || shots[0]?.sceneId || "scene",
    shotCount: shots.length,
    platform,
    style,
    transitionStyle,
    transitionDuration,
    useTransitions: shots.length > 1,
    targetDuration: shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0),
  };
}

export async function renderShotToClip({
  shot = {},
  visual,
  visualPath,
  outputDir,
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
} = {}) {
  ensureDir(outputDir);

  console.log(
  "🎬 SHOT VISUAL DIAGNOSTICS",
  {
    shotId: shot?.id,
    visual,
    visualPath,
    shotImagePath: shot?.imagePath,
    visualImagePath: visual?.imagePath,
    visualPublicUrl: visual?.publicUrl,
  }
);

  const inputPath =
    visualPath ||
    getInputPath(visual || {}) ||
    getInputPath(shot || {});

  if (!inputPath) {
    throw new Error(`No visual input found for shot ${shot.id || "unknown"}`);
  }

  assertFile(inputPath, `Shot input for ${shot.id || "shot"}`);

  const outputPath = path.join(
    outputDir,
    `${safeSlug(shot.id || shot.shotType || "shot")}.mp4`
  );

  const result = await renderKineticScene({
    inputPath,
    outputPath,
    scene: {
      id: shot.id,
      title: shot.shotType || shot.sceneTitle || "Shot",
      duration: shot.duration || 2,
      caption: shot.caption,
      voiceover: shot.voiceover,
      visual: shot.visual,
      cinematicDirection:
        visual?.cinematicDirection ||
        visual?.director ||
        shot?.cinematicDirection ||
        null,
      director:
        visual?.director ||
        null,
      category:
        visual?.category ||
        shot?.category ||
        null,
    },
    platform,
    style,
    duration: shot.duration || 2,
    intensity: shot.intensity || productionPlan?.motionIntensity || 78,
    productionPlan: {
      ...productionPlan,
      directorMotion:
        visual?.cinematicDirection?.cameraMotion ||
        visual?.director?.cameraMotion ||
        null,
      colorGrade:
        visual?.cinematicDirection?.colorGrade ||
        visual?.director?.colorGrade ||
        null,
      transitionStyle:
        visual?.cinematicDirection?.transitionSuggestion ||
        visual?.director?.transitionSuggestion ||
        productionPlan?.transitionStyle ||
        null,
      motionEffect:
        shot.motionEffect ||
        visual?.cinematicDirection?.cameraMotion ||
        visual?.director?.cameraMotion ||
        productionPlan?.motionEffect ||
        "cinematic",
    },
  });

  return {
    ok: true,
    shotId: shot.id,
    outputPath: result.outputPath,
    videoPath: result.videoPath || result.outputPath,
    duration: Number(shot.duration || 2),
    source: "kinetic-shot",
    kinetic: result,
  };
}

export async function assembleShotsForScene({
  scene = {},
  shots = [],
  visual,
  visualPath,
  outputPath,
  outputDir = SHOT_ASSEMBLY_DIR,
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
} = {}) {
  if (!Array.isArray(shots) || !shots.length) {
    throw new Error("assembleShotsForScene requires at least one shot.");
  }

  ensureDir(outputDir);

  const sceneId = scene.id || shots[0]?.sceneId || `scene_${Date.now()}`;
  const sceneDir = path.join(outputDir, safeSlug(sceneId));
  ensureDir(sceneDir);

  if (!outputPath) {
    outputPath = path.join(sceneDir, `${safeSlug(sceneId)}_assembled.mp4`);
  }

  const plan = buildShotAssemblyPlan({
    shots,
    scene,
    platform,
    style,
    productionPlan,
  });

  const renderedShots = [];

  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];

    const shotClip = await renderShotToClip({
      shot,
      visual,
      visualPath,
      outputDir: sceneDir,
      platform,
      style,
      productionPlan,
    });

    renderedShots.push(shotClip);
  }

  if (plan.useTransitions) {

  await concatWithTransitions({
    clips: renderedShots,
    outputPath,
    transitionStyle:
      plan.transitionStyle,
    transitionDuration:
      plan.transitionDuration,
  });

} else {

  await concatSimple({
    clips: renderedShots,
    outputPath,
  });

}

  assertFile(outputPath, "Assembled scene shot clip");

  const stats = fs.statSync(outputPath);

  return {
    ok: true,
    engine: "AstraMind Cinematic Shot Assembler v1",
    sceneId,
    outputPath,
    videoPath: outputPath,
    sizeBytes: stats.size,
    renderedShots,
    plan,
  };
}

export async function assembleShotStoryboard({
  evolvedStoryboard = {},
  visuals = [],
  outputDir = SHOT_ASSEMBLY_DIR,
  projectId = `shot_storyboard_${Date.now()}`,
  platform = "TikTok",
  style = "cinematic",
  productionPlan = {},
} = {}) {
  ensureDir(outputDir);

  const sceneOutputs = [];
  const evolvedScenes = evolvedStoryboard.evolvedScenes || [];

  for (let i = 0; i < evolvedScenes.length; i += 1) {
    const evolved = evolvedScenes[i];
    const visual =
  visuals.find(
    v =>
      v.sceneId ===
      evolved.sceneId
  ) ||
  visuals[i];

    console.log(
  "🎬 STORYBOARD SCENE DIAGNOSTICS",
  {
    sceneIndex: i,
    sceneId: evolved?.sceneId,
    sceneTitle: evolved?.sceneTitle,
    shotsCount: evolved?.shots?.length || 0,
    sceneData: evolved,
  }
);

    const sceneOutputPath = path.join(
      outputDir,
      `${safeSlug(projectId)}_${safeSlug(evolved.sceneId || `scene_${i + 1}`)}.mp4`
    );

    const assembled = await assembleShotsForScene({
      scene: {
        id: evolved.sceneId || `scene_${i + 1}`,
        title: evolved.sceneTitle || `Scene ${i + 1}`,
      },
      shots: evolved.shots || [],
      visual,
      outputPath: sceneOutputPath,
      outputDir,
      platform,
      style,
      productionPlan,
    });

    sceneOutputs.push({
      ...assembled,
      duration: evolved.duration,
      sceneIndex: i,
    });
  }

  const finalOutputPath = path.join(
    outputDir,
    `${safeSlug(projectId)}_shot_storyboard.mp4`
  );

  await concatSimple({
  clips: sceneOutputs,
  outputPath: finalOutputPath,
});

  assertFile(finalOutputPath, "Shot storyboard final output");

  const stats = fs.statSync(finalOutputPath);

  return {
    ok: true,
    engine: "AstraMind Cinematic Shot Assembler v1",
    projectId,
    outputPath: finalOutputPath,
    videoPath: finalOutputPath,
    sizeBytes: stats.size,
    sceneOutputs,
  };
}

export function getCinematicShotAssemblerHealth() {
  return {
    ok: true,
    engine: "AstraMind Cinematic Shot Assembler v1",
    outputDir: SHOT_ASSEMBLY_DIR,
    ffmpegLoaded: Boolean(ffmpegPath),
    supports: {
      shotRendering: true,
      sceneAssembly: true,
      shotTransitions: true,
      storyboardAssembly: true,
      kineticIntegration: true,
      multiShotScenes: true,
    },
  };
}

export default {
  buildShotAssemblyPlan,
  renderShotToClip,
  assembleShotsForScene,
  assembleShotStoryboard,
  getCinematicShotAssemblerHealth,
};