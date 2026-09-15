// src/server/routes/videorenderRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { generateSceneVisuals } from "../../core/content/aiVisualEngine.js";

const router = express.Router();

const OUTPUT_DIR = path.resolve("public", "renders");
const MAX_SCENES = 12;
const DEFAULT_DURATION = 4;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeSlug(value = "astramind-video") {
  return (
    String(value || "astramind-video")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "astramind-video"
  );
}

function normalizeDuration(value, fallback = DEFAULT_DURATION) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.max(2, Math.min(num, 12));
}

function normalizeScenes(scenes = []) {
  return scenes.slice(0, MAX_SCENES).map((scene, index) => ({
    id: scene?.id || `scene_${index + 1}`,
    title: scene?.title || `Scene ${index + 1}`,
    duration: normalizeDuration(scene?.duration),
    visual:
      scene?.visual ||
      scene?.caption ||
      scene?.voiceover ||
      `Cinematic Aigenikz scene ${index + 1}`,
    voiceover: scene?.voiceover || "",
    caption: scene?.caption || scene?.title || `Scene ${index + 1}`,
  }));
}

function assertFileExists(filePath, label = "file") {
  if (!filePath || typeof filePath !== "string") {
    throw new Error(`${label} path is missing.`);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not return a valid FFmpeg path."));
      return;
    }

    console.log("🎬 FFmpeg starting...");
    console.log("🎬 FFmpeg path:", ffmpegPath);

    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg timed out after 120 seconds."));
    }, 120000);

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (stderr) console.log("🎬 FFmpeg log:", stderr);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `FFmpeg exited with code ${code}`));
      }
    });
  });
}

async function renderSceneClip({ imagePath, outputPath, duration }) {
  assertFileExists(imagePath, "Scene image");

  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-t",
    String(duration),
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.08)':d=125:s=1080x1920:fps=30,format=yuv420p",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);

  assertFileExists(outputPath, "Scene clip");
  return outputPath;
}

async function concatClips({ clipPaths, outputPath }) {
  const concatPath = outputPath.replace(/\.mp4$/i, "_concat.txt");

  const concatContent = clipPaths
    .map((clipPath) => `file '${clipPath.replace(/\\/g, "/")}'`)
    .join("\n");

  fs.writeFileSync(concatPath, concatContent, "utf8");

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  assertFileExists(outputPath, "Final MP4");
  return outputPath;
}

router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    service: "Aigenikz Video Renderer",
    ffmpeg: Boolean(ffmpegPath),
    outputDir: OUTPUT_DIR,
  });
});

router.post("/render", async (req, res) => {
  console.log("🎬 VIDEO RENDER ROUTE HIT");

  try {
    ensureDir(OUTPUT_DIR);

    const {
      topic = "Aigenikz Video",
      scenes = [],
      platform = "TikTok",
      style = "cinematic futuristic high-energy",
    } = req.body || {};

    const normalizedScenes = normalizeScenes(scenes);

    if (!normalizedScenes.length) {
      return res.status(400).json({
        ok: false,
        error: "scenes array is required.",
      });
    }

    const projectId = `${safeSlug(topic)}_${Date.now()}`;
    const sceneClipDir = path.join(OUTPUT_DIR, `${projectId}_clips`);
    ensureDir(sceneClipDir);

    console.log("🧠 Topic:", topic);
    console.log("🎞️ Scenes:", normalizedScenes.length);
    console.log("🎨 Style:", style);

    const visuals = await generateSceneVisuals({
      scenes: normalizedScenes,
      topic,
      platform,
      style,
      projectId,
    });

    if (!Array.isArray(visuals) || !visuals.length) {
      throw new Error("No visuals were generated.");
    }

    const clipPaths = [];

    for (let i = 0; i < normalizedScenes.length; i += 1) {
      const scene = normalizedScenes[i];
      const visual = visuals[i];

      if (!visual?.imagePath) {
        throw new Error(`Missing visual image for scene ${i + 1}.`);
      }

      assertFileExists(visual.imagePath, `Scene ${i + 1} image`);

      const clipPath = path.join(
        sceneClipDir,
        `scene_${String(i + 1).padStart(2, "0")}.mp4`
      );

      console.log(`🎬 Rendering scene ${i + 1}: ${scene.title}`);

      await renderSceneClip({
        imagePath: visual.imagePath,
        outputPath: clipPath,
        duration: scene.duration,
      });

      clipPaths.push(clipPath);
    }

    const mp4Path = path.join(OUTPUT_DIR, `${projectId}.mp4`);

    await concatClips({
      clipPaths,
      outputPath: mp4Path,
    });

    const stats = fs.statSync(mp4Path);

    if (!stats.size || stats.size < 1000) {
      throw new Error("MP4 was created but appears too small or corrupt.");
    }

    const videoUrl = `/renders/${path.basename(mp4Path)}`;

    console.log("✅ MP4 rendered successfully:", mp4Path);

    return res.status(200).json({
      ok: true,
      message: "MP4 rendered successfully.",
      projectId,
      topic,
      platform,
      style,
      videoUrl,
      downloadUrl: videoUrl,
      sizeBytes: stats.size,
      scenes: normalizedScenes,
      visuals: visuals.map((visual) => ({
        sceneId: visual.sceneId,
        sceneIndex: visual.sceneIndex,
        publicUrl: visual.publicUrl,
        source: visual.source,
        prompt: visual.prompt,
      })),
    });
  } catch (error) {
    console.error("🔥 VIDEO RENDER ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Video render failed.",
    });
  }
});

export default router;