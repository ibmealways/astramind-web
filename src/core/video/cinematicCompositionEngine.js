// src/core/video/cinematicCompositionEngine.js

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ENGINE_VERSION =
  "AstraMind Hollywood Composition Engine v1";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(filePath = "") {
  return Boolean(filePath && fs.existsSync(filePath));
}

function safeSlug(value = "asset") {
  return (
    String(value || "asset")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 90) || "asset"
  );
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path missing."));
      return;
    }

    console.log("🎛️ Composition FFmpeg command:");
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
        console.log("🎛️ Composition FFmpeg log:");
        console.log(stderr);
      }

      if (code === 0) resolve({ ok: true, stderr });
      else reject(new Error(stderr || `Composition FFmpeg failed with code ${code}`));
    });
  });
}

function escapeSubtitlePath(filePath = "") {
  return String(filePath)
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, "$1\\:")
    .replace(/'/g, "\\'");
}

function normalizeToAbsolutePath(filePath = "") {
  if (!filePath) return null;

  const raw = String(filePath).trim();

  if (!raw) return null;

  const cleaned = raw.replace(/\\/g, "/");

  const projectRoot = process.cwd();

  const candidates = [];

  // Browser-served render URL:
  // /renders/audio/file.mp3
  if (cleaned.startsWith("/renders/")) {
    candidates.push(
      path.join(projectRoot, "public", cleaned)
    );

    candidates.push(
      path.join(projectRoot, cleaned.replace(/^\//, ""))
    );
  }

  // Relative render path:
  // renders/audio/file.mp3
  if (cleaned.startsWith("renders/")) {
    candidates.push(
      path.join(projectRoot, cleaned)
    );

    candidates.push(
      path.join(projectRoot, "public", cleaned)
    );
  }

  // Server render path:
  // /server-renders/...
  if (cleaned.startsWith("/server-renders/")) {
    candidates.push(
      path.join(projectRoot, cleaned.replace(/^\//, ""))
    );
  }

  // Already absolute
  if (path.isAbsolute(raw)) {
    candidates.push(path.normalize(raw));
  }

  // Normal relative path
  candidates.push(
    path.resolve(projectRoot, raw)
  );

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return path.normalize(candidate);
    }
  }

  return path.normalize(candidates[0]);
}

function ffmpegConcatPath(filePath = "") {
  return String(filePath)
    .replace(/\\/g, "/")
    .replace(/'/g, "'\\''");
}

function resolveAudioTrackPath(track) {
  if (!track) return null;

  if (typeof track === "string") {
    return normalizeToAbsolutePath(track);
  }

  const candidates = [
  track.outputPath,
  track.audioPath,
  track.path,
  track.filePath,
  track.url,
  track.publicUrl,
  track.downloadUrl,
  track.src,
  track?.synthesis?.outputPath,
  track?.synthesis?.audioPath,
  track?.synthesis?.path,
  track?.synthesis?.url,
  track?.synthesis?.publicUrl,
];

  for (const candidate of candidates) {
    const resolved = normalizeToAbsolutePath(candidate);

    if (resolved && fileExists(resolved)) {
      return resolved;
    }
  }

  return null;
}

function normalizeAudioTracks(tracks = []) {
  const sourceTracks = Array.isArray(tracks) ? tracks : [];

  const normalized = sourceTracks
    .map(resolveAudioTrackPath)
    .filter(Boolean)
    .filter(fileExists);

  return Array.from(new Set(normalized));
}

async function buildNarrationTrack({ tracks = [], outputDir, projectId = "render" }) {
  const audioTracks = normalizeAudioTracks(tracks);

  ensureDir(outputDir);

  console.log("🎙️ Normalized narration tracks:", audioTracks);

  if (!audioTracks.length) {
    console.warn("⚠️ No valid narration tracks found. Final video will render without voiceover audio.");

    return {
      ok: false,
      audioPath: null,
      totalTracks: 0,
      skipped: true,
    };
  }

  if (audioTracks.length === 1) {
    return {
      ok: true,
      audioPath: audioTracks[0],
      totalTracks: 1,
      passthrough: true,
    };
  }

  const listPath = path.join(outputDir, `${safeSlug(projectId)}_narration_concat.txt`);
  const outputPath = path.join(outputDir, `${safeSlug(projectId)}_narration.mp3`);

  const content = audioTracks
    .map((audioPath) => `file '${ffmpegConcatPath(audioPath)}'`)
    .join("\n");

  fs.writeFileSync(listPath, content, "utf8");

  console.log("🎙️ Narration concat list:", listPath);
  console.log(content);

  await runFFmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:a",
    "libmp3lame",
    "-q:a",
    "4",
    outputPath,
  ]);

  if (!fileExists(outputPath)) {
    throw new Error(`Narration concat failed to create output: ${outputPath}`);
  }

  return {
    ok: true,
    audioPath: outputPath,
    totalTracks: audioTracks.length,
    concatListPath: listPath,
  };
}

async function burnSubtitles({ inputVideoPath, subtitlePath, outputPath, style = "cinematic" }) {
  if (!fileExists(subtitlePath)) {
    fs.copyFileSync(inputVideoPath, outputPath);
    return {
      ok: true,
      outputPath,
      burned: false,
    };
  }

  const subtitleFilterPath = escapeSubtitlePath(subtitlePath);

  const forceStyle =
    "FontName=Arial," +
    "FontSize=14," +
    "PrimaryColour=&H00FFFFFF," +
    "OutlineColour=&H00000000," +
    "BackColour=&H90000000," +
    "BorderStyle=3," +
    "Outline=2," +
    "Shadow=1," +
    "Alignment=2," +
    "MarginV=135";

  await runFFmpeg([
    "-y",
    "-i",
    inputVideoPath,
    "-vf",
    `subtitles='${subtitleFilterPath}':force_style='${forceStyle}'`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return {
    ok: true,
    outputPath,
    burned: true,
  };
}

async function attachNarration({ inputVideoPath, audioPath, outputPath }) {
  const finalAudioPath = normalizeToAbsolutePath(audioPath);

  if (!fileExists(finalAudioPath)) {
    fs.copyFileSync(inputVideoPath, outputPath);
    return {
      ok: true,
      outputPath,
      audioAttached: false,
    };
  }

  await runFFmpeg([
    "-y",
    "-i",
    inputVideoPath,
    "-i",
    finalAudioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return {
    ok: true,
    outputPath,
    audioAttached: true,
  };
}

export async function composeHollywoodFinal({
  inputVideoPath,
  subtitlePath = null,
  voiceoverTracks = [],
  outputPath,
  workDir,
  projectId = "render",
  style = "cinematic",
} = {}) {
  if (!fileExists(inputVideoPath)) {
    throw new Error(`Composition input video missing: ${inputVideoPath}`);
  }

  ensureDir(path.dirname(outputPath));
  ensureDir(workDir || path.dirname(outputPath));

  const compositionDir = workDir || path.dirname(outputPath);
  const captionedPath = path.join(compositionDir, `${safeSlug(projectId)}_captioned.mp4`);
  const narrationDir = path.join(compositionDir, "audio");
  const narration = await buildNarrationTrack({
    tracks: voiceoverTracks,
    outputDir: narrationDir,
    projectId,
  });

  const captionResult = await burnSubtitles({
    inputVideoPath,
    subtitlePath,
    outputPath: captionedPath,
    style,
  });

  const audioResult = await attachNarration({
    inputVideoPath: captionResult.outputPath,
    audioPath: narration.audioPath,
    outputPath,
  });

  return {
    ok: true,
    engine: ENGINE_VERSION,
    outputPath,
    videoPath: outputPath,
    subtitlePath,
    narrationPath: narration.audioPath,
    captionsBurned: captionResult.burned,
    audioAttached: audioResult.audioAttached,
    voiceTracks: narration.totalTracks,
    diagnostics: {
      hollywoodComposition: true,
      subtitlesAsOverlayLayer: true,
      voiceoverAsAudioLayer: true,
    },
  };
}

export function getCinematicCompositionHealth() {
  return {
    ok: true,
    engine: ENGINE_VERSION,
    supports: {
      subtitleBurnIn: true,
      voiceoverMuxing: true,
      narrationConcatenation: true,
      finalCompositionPass: true,
    },
  };
}

export default {
  composeHollywoodFinal,
  getCinematicCompositionHealth,
};
