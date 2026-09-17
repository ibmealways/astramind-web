import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const SUPPORTED_CONTAINERS = new Set(["mp4", "mov", "m4v"]);
const SUPPORTED_VIDEO_CODECS = new Set(["h264", "hevc", "av1", "vp9"]);
const SUPPORTED_AUDIO_CODECS = new Set(["aac", "mp3", "opus", "vorbis"]);

function runFFmpeg(args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("Bundled FFmpeg is unavailable; artifact validation cannot run."));
    const child = spawn(ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Artifact validation timed out."));
    }, timeoutMs);
    child.stdout.on("data", (value) => { output += value.toString(); });
    child.stderr.on("data", (value) => { output += value.toString(); });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(output || `FFmpeg validation failed with code ${code}.`));
    });
  });
}

export function parseFfmpegProbe(output = "") {
  const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  const videoMatch = output.match(/Video:\s*([^,\s]+)[^\n]*?\b(\d{2,5})x(\d{2,5})\b[^\n]*?(\d+(?:\.\d+)?)\s*fps/i);
  const audioMatch = output.match(/Audio:\s*([^,\s]+)[^\n]*?(\d{4,6})\s*Hz[^\n]*?(mono|stereo|\d+ channels?)/i);
  const duration = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : 0;
  return {
    duration,
    video: videoMatch ? {
      codec: videoMatch[1].toLowerCase(),
      width: Number(videoMatch[2]),
      height: Number(videoMatch[3]),
      frameRate: Number(videoMatch[4]),
      estimatedFrameCount: Math.round(duration * Number(videoMatch[4])),
    } : null,
    audio: audioMatch ? {
      codec: audioMatch[1].toLowerCase(),
      sampleRate: Number(audioMatch[2]),
      channels: audioMatch[3].toLowerCase(),
    } : null,
  };
}

export function validateProbeDiagnostics(probe, expected = {}) {
  const errors = [];
  const durationToleranceSeconds = Number.isFinite(Number(expected.durationToleranceSeconds))
    ? Math.max(0, Number(expected.durationToleranceSeconds))
    : 1;
  if (!probe?.video) errors.push("Artifact has no video stream.");
  if (probe?.video && !SUPPORTED_VIDEO_CODECS.has(probe.video.codec)) errors.push(`Unsupported video codec: ${probe.video.codec}.`);
  if (!Number.isFinite(probe?.video?.width) || probe.video.width <= 0 || !Number.isFinite(probe?.video?.height) || probe.video.height <= 0) errors.push("Video dimensions are invalid.");
  if (!Number.isFinite(probe?.video?.frameRate) || probe.video.frameRate <= 0) errors.push("Video frame rate is invalid.");
  if (!Number.isFinite(probe?.duration) || probe.duration <= 0) errors.push("Video duration is invalid.");
  if (expected.maxDuration && probe.duration > Number(expected.maxDuration) + durationToleranceSeconds) {
    errors.push(`Video duration ${probe.duration.toFixed(2)}s exceeds the ${expected.maxDuration}s target plus ${durationToleranceSeconds}s encoding tolerance.`);
  }
  if (expected.minDuration && probe.duration < Number(expected.minDuration)) errors.push(`Video duration is shorter than ${expected.minDuration} seconds.`);
  if (expected.audioRequired && !probe.audio) errors.push("Audio was requested but the artifact has no audio stream.");
  if (probe.audio && !SUPPORTED_AUDIO_CODECS.has(probe.audio.codec)) errors.push(`Unsupported audio codec: ${probe.audio.codec}.`);
  if (probe.audio && (!probe.audio.sampleRate || probe.audio.sampleRate < 8000)) errors.push("Audio sample rate is invalid.");
  return { ok: errors.length === 0, errors };
}

export async function validateVideoArtifact({
  filePath,
  expected = {},
  source = "unknown",
  rejectStatic = false,
  runner = runFFmpeg,
} = {}) {
  const resolvedPath = path.resolve(String(filePath || ""));
  if (!filePath || !fs.existsSync(resolvedPath)) throw new Error("Video artifact does not exist.");
  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile() || stats.size < 1024) throw new Error("Video artifact is empty or unreadable.");
  if (expected.maxFileSizeBytes && stats.size > Number(expected.maxFileSizeBytes)) {
    throw new Error(`Video artifact exceeds the ${expected.maxFileSizeBytes}-byte limit.`);
  }

  const extension = path.extname(resolvedPath).slice(1).toLowerCase();
  const mimeType = extension === "mp4" || extension === "m4v" ? "video/mp4" : extension === "mov" ? "video/quicktime" : "application/octet-stream";
  if (!SUPPORTED_CONTAINERS.has(extension) || !mimeType.startsWith("video/")) {
    throw new Error(`Artifact is not a supported video container: ${mimeType}.`);
  }

  const metadataOutput = await runner(["-hide_banner", "-i", resolvedPath, "-map", "0:v:0", "-f", "null", "-"]);
  const probe = parseFfmpegProbe(metadataOutput);
  const diagnostics = validateProbeDiagnostics(probe, expected);
  if (!diagnostics.ok) throw new Error(`Video artifact validation failed: ${diagnostics.errors.join(" ")}`);

  const analysisOutput = await runner([
    "-hide_banner", "-i", resolvedPath, "-map", "0:v:0",
    "-vf", "blackdetect=d=1:pix_th=0.10,freezedetect=n=-50dB:d=2",
    "-an", "-f", "null", "-",
  ]);
  const blackMatches = [...analysisOutput.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)];
  const blackDuration = blackMatches.reduce((sum, match) => sum + Math.max(0, Number(match[2]) - Number(match[1])), 0);
  const frozen = /freeze_start:\s*0(?:\.0+)?/i.test(analysisOutput) && /freeze_end:/i.test(analysisOutput);
  const mostlyBlack = probe.duration > 0 && blackDuration / probe.duration >= 0.9;
  if (mostlyBlack) throw new Error("Video artifact was rejected as a black-video fallback.");
  if (rejectStatic && frozen) throw new Error("Provider video artifact was rejected because it contains only a frozen image.");

  return {
    ok: true,
    validated: true,
    source,
    fileName: path.basename(resolvedPath),
    mimeType,
    container: extension,
    sizeBytes: stats.size,
    ...probe,
    contentChecks: { mostlyBlack: false, frozen: Boolean(frozen), rejectStatic },
  };
}

export default { parseFfmpegProbe, validateProbeDiagnostics, validateVideoArtifact };
