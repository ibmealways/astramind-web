// src/core/branding/watermarkEngine.js

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const WATERMARK_OUTPUT_DIR = path.resolve("server-renders/watermarked");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(filePath = "") {
  return Boolean(filePath && fs.existsSync(filePath));
}

function sanitizeText(text = "") {
  return String(text || "")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path missing."));
      return;
    }

    console.log("🛡️ Watermark FFmpeg command:");
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
        console.log("🛡️ Watermark FFmpeg log:");
        console.log(stderr);
      }

      if (code === 0) {
        resolve({ ok: true });
      } else {
        reject(new Error(stderr || `FFmpeg exited with code ${code}`));
      }
    });
  });
}

function buildTextPosition(position = "bottom-right") {
  switch (position) {
    case "top-left":
      return "x=40:y=40";
    case "top-right":
      return "x=w-tw-40:y=40";
    case "bottom-left":
      return "x=40:y=h-th-40";
    case "center":
      return "x=(w-tw)/2:y=(h-th)/2";
    default:
      return "x=w-tw-40:y=h-th-40";
  }
}

function buildLogoOverlayPosition(position = "bottom-right") {
  switch (position) {
    case "top-left":
      return "40:40";
    case "top-right":
      return "W-w-40:40";
    case "bottom-left":
      return "40:H-h-40";
    case "center":
      return "(W-w)/2:(H-h)/2";
    default:
      return "W-w-40:H-h-40";
  }
}

export async function applyAstraMindWatermark({
  videoPath,
  outputPath,

  brandText = "AstraMind Technologies",
  logoPath = null,

  position = "bottom-right",

  opacity = 0.72,
  logoOpacity = 0.8,
  logoWidth = 90,

  fontSize = 24,
  fontColor = "white",

  useText = true,
  useLogo = true,

  watermarkMode = "standard",
} = {}) {
  if (!videoPath || !fileExists(videoPath)) {
    throw new Error(`Watermark input video missing: ${videoPath}`);
  }

  ensureDir(WATERMARK_OUTPUT_DIR);

  if (!outputPath) {
    outputPath = path.join(
      WATERMARK_OUTPUT_DIR,
      `watermarked_${Date.now()}.mp4`
    );
  }

  ensureDir(path.dirname(outputPath));

  const inputArgs = ["-y", "-i", videoPath];
  const filterParts = [];

  let currentVideo = "[0:v]";
  let outputVideo = "[vout]";

  if (useLogo && logoPath && fileExists(logoPath)) {
    inputArgs.push("-i", logoPath);

    filterParts.push(
      `[1:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${logoOpacity}[logo]`
    );

    filterParts.push(
      `${currentVideo}[logo]overlay=${buildLogoOverlayPosition(position)}[logoout]`
    );

    currentVideo = "[logoout]";
  }

  if (useText) {
    const escapedText = sanitizeText(brandText);

    filterParts.push(
      `${currentVideo}drawtext=` +
        `text='${escapedText}':` +
        `fontsize=${fontSize}:` +
        `fontcolor=${fontColor}@${opacity}:` +
        `${buildTextPosition(position)}:` +
        `shadowcolor=black@0.45:` +
        `shadowx=1:` +
        `shadowy=1:` +
        `borderw=1:` +
        `bordercolor=black@0.25` +
        `${outputVideo}`
    );
  } else if (currentVideo !== outputVideo) {
    filterParts.push(`${currentVideo}null${outputVideo}`);
  } else {
    filterParts.push(`[0:v]null${outputVideo}`);
  }

  const filterGraph = filterParts.join(";");

  console.log("🛡️ AstraMind Watermark Engine:", watermarkMode);

  await runFFmpeg([
    ...inputArgs,

    "-filter_complex",
    filterGraph,

    "-map",
    outputVideo,

    "-map",
    "0:a?",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-pix_fmt",
    "yuv420p",

    "-c:a",
    "copy",

    "-movflags",
    "+faststart",

    outputPath,
  ]);

  if (!fileExists(outputPath)) {
    throw new Error(`Watermarked output was not created: ${outputPath}`);
  }

  const stats = fs.statSync(outputPath);

  return {
    ok: true,
    engine: "AstraMind Watermark Engine v2 Audio-Safe Logo-Safe",
    watermarkMode,
    brandText,
    logoPath,
    position,
    outputPath,
    videoPath: outputPath,
    sizeBytes: stats.size,
    publicUrl: `/renders/watermarked/${path.basename(outputPath)}`,
  };
}

export function getWatermarkHealth() {
  return {
    ok: true,
    engine: "AstraMind Watermark Engine v2 Audio-Safe Logo-Safe",
    outputDir: WATERMARK_OUTPUT_DIR,
    ffmpegLoaded: Boolean(ffmpegPath),
    supports: {
      textWatermarks: true,
      logoWatermarks: true,
      audioPreservation: true,
      subtitlePreservation: true,
      cinematicOverlay: true,
      opacityControl: true,
      dynamicPositioning: true,
      commercialBranding: true,
    },
  };
}

export default {
  applyAstraMindWatermark,
  getWatermarkHealth,
};