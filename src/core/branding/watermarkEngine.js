// src/core/branding/watermarkEngine.js

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const WATERMARK_OUTPUT_DIR = path.resolve(
  "server-renders/watermarked"
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(filePath = "") {
  return Boolean(
    filePath && fs.existsSync(filePath)
  );
}

function sanitizeText(text = "") {
  return String(text || "")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(
      ffmpegPath,
      args,
      {
        windowsHide: true,
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      }
    );

    let stderr = "";

    process.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    process.on("close", (code) => {
      if (code === 0) {
        resolve({
          ok: true,
        });
      } else {
        reject(
          new Error(
            stderr ||
              `FFmpeg exited with code ${code}`
          )
        );
      }
    });
  });
}

function buildTextPosition(
  position = "bottom-right"
) {
  switch (position) {
    case "top-left":
      return "x=40:y=40";

    case "top-right":
      return "x=w-tw-40:y=40";

    case "bottom-left":
      return "x=40:y=h-th-40";

    case "center":
      return "(w-text_w)/2:(h-text_h)/2";

    default:
      return "x=w-tw-40:y=h-th-40";
  }
}

function buildLogoOverlayPosition(
  position = "bottom-right",
  logoWidth = 90
) {
  switch (position) {
    case "top-left":
      return `40:40`;

    case "top-right":
      return `W-w-40:40`;

    case "bottom-left":
      return `40:H-h-40`;

    case "center":
      return `(W-w)/2:(H-h)/2`;

    default:
      return `W-w-40:H-h-40`;
  }
}

export async function applyAstraMindWatermark({
  videoPath,
  outputPath,

  brandText =
    "Aigenikz Technologies LLC",

  logoPath = null,

  position = "bottom-right",

  opacity = 0.72,

  logoOpacity = 0.8,

  logoWidth = 90,

  fontSize = 28,

  fontColor = "white",

  useText = true,

  useLogo = true,

  watermarkMode = "standard",
} = {}) {
  if (
    !videoPath ||
    !fileExists(videoPath)
  ) {
    throw new Error(
      `Watermark input video missing: ${videoPath}`
    );
  }

  ensureDir(WATERMARK_OUTPUT_DIR);

  if (!outputPath) {
    outputPath = path.join(
      WATERMARK_OUTPUT_DIR,
      `watermarked_${Date.now()}.mp4`
    );
  }

  const escapedText =
    sanitizeText(brandText);

  const textPosition =
    buildTextPosition(position);

  const logoPosition =
    buildLogoOverlayPosition(
      position,
      logoWidth
    );

  const filterParts = [];

  let inputArgs = ["-y", "-i", videoPath];

  let filterGraph = "";

  let videoMap = "[vout]";

  if (
    useLogo &&
    logoPath &&
    fileExists(logoPath)
  ) {
    inputArgs.push("-i", logoPath);

    filterParts.push(
      `[1:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${logoOpacity}[logo]`
    );

    filterParts.push(
      `[0:v][logo]overlay=${logoPosition}[logoout]`
    );

    videoMap = "[logoout]";
  }

  if (useText) {
    const source =
      videoMap === "[logoout]"
        ? "[logoout]"
        : "[0:v]";

    const drawTextFilter =
      `${source}drawtext=` +
      `text='${escapedText}':` +
      `fontsize=${fontSize}:` +
      `fontcolor=${fontColor}@${opacity}:` +
      `${textPosition}:` +
      `shadowcolor=black@0.7:` +
      `shadowx=2:` +
      `shadowy=2:` +
      `borderw=1:` +
      `bordercolor=black@0.35` +
      `[vout]`;

    filterParts.push(drawTextFilter);
  } else {
    filterParts.push(
      `${videoMap}copy[vout]`
    );
  }

  filterGraph =
    filterParts.join(";");

  const args = [
    ...inputArgs,

    "-filter_complex",
    filterGraph,

    "-map",
    "[vout]",

    "-map",
    "0:a?",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-pix_fmt",
    "yuv420p",

    "-c:a",
    "aac",

    "-movflags",
    "+faststart",

    outputPath,
  ];

  console.log(
    "🛡️ Aigenikz Watermark Engine:",
    watermarkMode
  );

  await runFFmpeg(args);

  return {
    ok: true,

    engine:
      "Aigenikz Watermark Engine v1",

    watermarkMode,

    brandText,

    logoPath,

    position,

    outputPath,

    publicUrl:
      `/renders/watermarked/${path.basename(
        outputPath
      )}`,
  };
}

export function getWatermarkHealth() {
  return {
    ok: true,

    engine:
      "Aigenikz Watermark Engine v1",

    outputDir:
      WATERMARK_OUTPUT_DIR,

    supports: {
      textWatermarks: true,
      logoWatermarks: true,
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