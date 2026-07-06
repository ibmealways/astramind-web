// src/core/video/soundtrackEngine.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ROOT = process.cwd();

const SOUNDTRACK_DIR = path.join(ROOT, "server-renders", "soundtracks");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

    console.log("🎼 FFmpeg soundtrack command:");
    console.log(ffmpegPath, args.join(" "));

    const ff = spawn(ffmpegPath, args, { windowsHide: true });

    let stderr = "";

    ff.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ff.on("error", reject);

    ff.on("close", (code) => {
      if (stderr) console.log("🎼 FFmpeg soundtrack log:", stderr);

      if (code === 0) resolve();
      else reject(new Error(stderr || `FFmpeg soundtrack failed with code ${code}`));
    });
  });
}

function safeSlug(value = "soundtrack") {
  return (
    String(value || "soundtrack")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100) || "soundtrack"
  );
}

function normalizeMood(mood = "cinematic") {
  const clean = String(mood || "").toLowerCase();

  if (clean.includes("aggressive") || clean.includes("intense")) return "intense";
  if (clean.includes("future") || clean.includes("tech")) return "futuristic";
  if (clean.includes("emotion")) return "emotional";
  if (clean.includes("document")) return "documentary";
  if (clean.includes("motivat") || clean.includes("inspir")) return "motivational";

  return "cinematic";
}

const SOUNDTRACK_PROFILES = {
  cinematic: {
    frequencies: [220, 330, 440],
    noise: "pink",
    volume: 0.2,
  },
  futuristic: {
    frequencies: [260, 390, 520],
    noise: "brown",
    volume: 0.19,
  },
  emotional: {
    frequencies: [180, 270, 360],
    noise: "pink",
    volume: 0.18,
  },
  intense: {
    frequencies: [320, 480, 640],
    noise: "white",
    volume: 0.16,
  },
  documentary: {
    frequencies: [200, 260, 320],
    noise: "brown",
    volume: 0.17,
  },
  motivational: {
    frequencies: [280, 420, 560],
    noise: "pink",
    volume: 0.2,
  },
};

function buildToneInputs({ frequencies = [], duration = 30 }) {
  return frequencies.map((freq) => ({
    freq,
    duration,
  }));
}

export async function generateProceduralSoundtrack({
  projectId = `soundtrack_${Date.now()}`,
  mood = "cinematic",
  duration = 30,
} = {}) {
  ensureDir(SOUNDTRACK_DIR);

  const normalizedMood = normalizeMood(mood);
  const profile = SOUNDTRACK_PROFILES[normalizedMood] || SOUNDTRACK_PROFILES.cinematic;

  const cleanDuration = Math.max(10, Math.min(Number(duration || 30), 300));
  const filename = `${safeSlug(projectId)}-${normalizedMood}.mp3`;
  const outputPath = path.join(SOUNDTRACK_DIR, filename);
  const publicUrl = `/renders/soundtracks/${filename}`;

  const tones = buildToneInputs({
    frequencies: profile.frequencies,
    duration: cleanDuration,
  });

  const args = ["-y"];

  tones.forEach((tone) => {
    args.push(
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${tone.freq}:duration=${tone.duration}:sample_rate=44100`
    );
  });

  args.push(
    "-f",
    "lavfi",
    "-i",
    `anoisesrc=color=${profile.noise}:duration=${cleanDuration}:sample_rate=44100:amplitude=0.025`
  );

  const mixInputs = tones.length + 1;

  args.push(
    "-filter_complex",
    `amix=inputs=${mixInputs}:duration=longest:dropout_transition=2,volume=${profile.volume}`,
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    outputPath
  );

  console.log("🎼 GENERATING PROCEDURAL SOUNDTRACK");
  console.log("🎼 Mood:", normalizedMood);
  console.log("🎼 Duration:", cleanDuration);

  await runFFmpeg(args);

  assertFile(outputPath, "Generated soundtrack");

  const stats = fs.statSync(outputPath);

  console.log("✅ Soundtrack generated:", outputPath);

  return {
    ok: true,
    soundtrackPath: outputPath,
    audioPath: outputPath,
    outputPath,
    path: outputPath,
    publicUrl,
    mood: normalizedMood,
    originalMood: mood,
    duration: cleanDuration,
    sizeBytes: stats.size,
  };
}

export async function mergeVoiceAndSoundtrack({
  videoPath,
  voicePath,
  soundtrackPath,
  outputPath,
  voiceVolume = 1.0,
  soundtrackVolume = 0.14,
} = {}) {
  assertFile(videoPath, "Video input");
  assertFile(voicePath, "Voice input");
  assertFile(soundtrackPath, "Soundtrack input");

  ensureDir(path.dirname(outputPath));

  console.log("🎼 MIXING VOICEOVER + SOUNDTRACK");

  await runFFmpeg([
    "-y",
    "-i",
    videoPath,
    "-i",
    voicePath,
    "-stream_loop",
    "-1",
    "-i",
    soundtrackPath,

    "-filter_complex",
    [
      `[1:a]volume=${voiceVolume}[voice]`,
      `[2:a]volume=${soundtrackVolume}[music]`,
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    ].join(";"),

    "-map",
    "0:v:0",

    "-map",
    "[aout]",

    "-c:v",
    "copy",

    "-c:a",
    "aac",

    "-b:a",
    "192k",

    "-movflags",
    "+faststart",

    outputPath,
  ]);

  assertFile(outputPath, "Voice + soundtrack merged video");

  const stats = fs.statSync(outputPath);

  return {
    ok: true,
    outputPath,
    videoPath: outputPath,
    sizeBytes: stats.size,
  };
}

export async function mergeSoundtrackWithVideo({
  videoPath,
  soundtrackPath,
  outputPath,
  soundtrackVolume = 0.14,
  existingAudioVolume = 1.0,
} = {}) {
  assertFile(videoPath, "Video input");
  assertFile(soundtrackPath, "Soundtrack input");

  ensureDir(path.dirname(outputPath));

  console.log("🎼 MERGING EXISTING VOICE AUDIO + SOUNDTRACK");

  await runFFmpeg([
    "-y",
    "-i",
    videoPath,
    "-stream_loop",
    "-1",
    "-i",
    soundtrackPath,
    "-filter_complex",
    [
      `[0:a]volume=${existingAudioVolume}[voice]`,
      `[1:a]volume=${soundtrackVolume}[music]`,
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    ].join(";"),
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  assertFile(outputPath, "Voice + soundtrack merged video");

  const stats = fs.statSync(outputPath);

  return {
    ok: true,
    outputPath,
    videoPath: outputPath,
    sizeBytes: stats.size,
  };
}

export async function generateDynamicSoundtrack({
  topic = "",
  mood = "modern-cinematic",
  duration = 30,
  projectId = `soundtrack_${Date.now()}`,
  productionPlan = {},
  directorState = null,
} = {}) {
  const selectedMood =
    directorState?.audio?.soundtrackMood ||
    productionPlan?.soundtrackMood ||
    mood ||
    "cinematic";

  const result = await generateProceduralSoundtrack({
    topic,
    mood: selectedMood,
    duration,
    projectId,
    productionPlan: {
      ...productionPlan,
      directorState,
    },
  });

  console.log("🎵 SOUNDTRACK RESULT:", result);

  return result;
}

export default {
  generateProceduralSoundtrack,
  mergeSoundtrackWithVideo,
  mergeVoiceAndSoundtrack,
  generateDynamicSoundtrack,
};