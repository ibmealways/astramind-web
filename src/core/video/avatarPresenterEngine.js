// src/core/video/avatarPresenterEngine.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ROOT = process.cwd();

const AVATAR_DIR = path.join(
  ROOT,
  "server-renders",
  "avatars"
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function assertFile(filePath, label = "file") {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath}`);
  }
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path missing."));
      return;
    }

    console.log("🧍 FFmpeg avatar command:");
    console.log(ffmpegPath, args.join(" "));

    const ff = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    let stderr = "";

    ff.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ff.on("error", reject);

    ff.on("close", (code) => {
      if (stderr) {
        console.log("🧍 Avatar FFmpeg log:");
        console.log(stderr);
      }

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            stderr || `Avatar FFmpeg failed with code ${code}`
          )
        );
      }
    });
  });
}

function safeSlug(value = "avatar") {
  return (
    String(value || "avatar")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100) || "avatar"
  );
}

export async function createAvatarOverlay({
  avatarImagePath,
  outputPath,
  width = 340,
  height = 340,
  fps = 30,
  duration = 30,
} = {}) {
  assertFile(avatarImagePath, "Avatar image");

  ensureDir(path.dirname(outputPath));

  console.log("🧍 CREATING ANIMATED AVATAR OVERLAY");

  await runFFmpeg([
    "-y",

    "-loop",
    "1",

    "-i",
    avatarImagePath,

    "-vf",

    [
      `scale=${width}:${height}`,
      `fps=${fps}`,
      `zoompan=z='min(zoom+0.0008,1.08)':d=${fps *
        duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
      "format=rgba",
    ].join(","),

    "-t",
    String(duration),

    "-c:v",
    "qtrle",

    outputPath,
  ]);

  assertFile(outputPath, "Avatar overlay");

  const stats = fs.statSync(outputPath);

  console.log("✅ Avatar overlay created:", outputPath);

  return {
    ok: true,
    overlayPath: outputPath,
    sizeBytes: stats.size,
  };
}

export async function attachAvatarPresenter({
  videoPath,
  avatarImagePath,
  outputPath,
  duration = 30,
  position = "bottom-right",
  scale = 0.22,
} = {}) {
  assertFile(videoPath, "Video input");
  assertFile(avatarImagePath, "Avatar image");

  ensureDir(path.dirname(outputPath));
  ensureDir(AVATAR_DIR);

  const overlayPath = path.join(
    AVATAR_DIR,
    `${safeSlug(path.basename(outputPath))}-overlay.mov`
  );

  await createAvatarOverlay({
    avatarImagePath,
    outputPath: overlayPath,
    duration,
  });

  let overlayPosition = "W-w-40:H-h-40";

  if (position === "bottom-left") {
    overlayPosition = "40:H-h-40";
  }

  if (position === "top-right") {
    overlayPosition = "W-w-40:40";
  }

  if (position === "top-left") {
    overlayPosition = "40:40";
  }

  console.log("🧍 ATTACHING AVATAR PRESENTER");

  await runFFmpeg([
    "-y",

    "-i",
    videoPath,

    "-i",
    overlayPath,

    "-filter_complex",

    [
      `[1:v]scale=iw*${scale}:ih*${scale}[avatar]`,
      `[0:v][avatar]overlay=${overlayPosition}`,
    ].join(";"),

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

  assertFile(outputPath, "Avatar presenter video");

  const stats = fs.statSync(outputPath);

  console.log("✅ Avatar presenter attached:", outputPath);

  return {
    ok: true,
    outputPath,
    sizeBytes: stats.size,
  };
}

export async function createTalkingAvatarVideo({
  videoPath,
  avatarImagePath,
  voiceoverPath,
  outputPath,
  duration = 30,
  position = "bottom-right",
} = {}) {
  assertFile(videoPath, "Video input");
  assertFile(avatarImagePath, "Avatar image");

  if (voiceoverPath) {
    assertFile(voiceoverPath, "Voiceover input");
  }

  ensureDir(path.dirname(outputPath));

  const tempAvatarVideo = outputPath.replace(
    ".mp4",
    "_avatar.mp4"
  );

  await attachAvatarPresenter({
    videoPath,
    avatarImagePath,
    outputPath: tempAvatarVideo,
    duration,
    position,
  });

  /*
    If no voiceover path,
    return avatar-only version.
  */
  if (!voiceoverPath) {
    return {
      ok: true,
      outputPath: tempAvatarVideo,
      sizeBytes: fs.statSync(tempAvatarVideo).size,
    };
  }

  console.log("🧍 ADDING VOICEOVER TO AVATAR VIDEO");

  await runFFmpeg([
    "-y",

    "-i",
    tempAvatarVideo,

    "-i",
    voiceoverPath,

    "-map",
    "0:v",

    "-map",
    "1:a",

    "-c:v",
    "copy",

    "-c:a",
    "aac",

    "-shortest",

    "-movflags",
    "+faststart",

    outputPath,
  ]);

  assertFile(outputPath, "Talking avatar video");

  const stats = fs.statSync(outputPath);

  console.log("✅ Talking avatar video created:", outputPath);

  return {
  ok: true,
  outputPath,
  sizeBytes: stats.size,
};
}

/*
====================================================
 CINEMATIC RENDER ENGINE COMPATIBILITY EXPORT
====================================================
*/

export async function generateAvatarPresenter({
  videoPath,
  avatarImagePath,
  voiceoverPath,
  outputPath,
  duration = 30,
  position = "bottom-right",
  platform = "TikTok",
  style = "cinematic",
} = {}) {
  if (!videoPath) {
    throw new Error("videoPath is required.");
  }

  if (!outputPath) {
    throw new Error("outputPath is required.");
  }

  /*
    If avatar image exists,
    create talking avatar version.
  */
  if (avatarImagePath) {
    return await createTalkingAvatarVideo({
      videoPath,
      avatarImagePath,
      voiceoverPath,
      outputPath,
      duration,
      position,
    });
  }

  /*
    Fallback passthrough.
  */
  fs.copyFileSync(videoPath, outputPath);

  return {
    ok: true,
    passthrough: true,
    platform,
    style,
    outputPath,
    sizeBytes: fs.statSync(outputPath).size,
  };
}

export default {
  createAvatarOverlay,
  attachAvatarPresenter,
  createTalkingAvatarVideo,
  generateAvatarPresenter,
};