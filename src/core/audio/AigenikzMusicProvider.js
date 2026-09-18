import fs from "node:fs";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;
const DEFAULT_POLL_MS = 3000;

const clean = (value) => String(value || "").trim();
const safeName = (value) => clean(value || "aigenikz-song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "aigenikz-song";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function workerConfig(env = process.env) {
  return {
    baseUrl: clean(env.AIGENIKZ_MUSIC_WORKER_URL).replace(/\/$/, ""),
    token: clean(env.AIGENIKZ_MUSIC_WORKER_TOKEN),
    model: clean(env.AIGENIKZ_MUSIC_MODEL) || "ace-step",
  };
}

function headers(token, json = true) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function providerError(status, detail) {
  const message = typeof detail === "string" ? detail : detail?.error || detail?.message || JSON.stringify(detail);
  if (status === 401 || status === 403) return "The Aigenikz Music worker rejected its service token.";
  if (status === 429) return "The Aigenikz Music worker is at capacity. Try again after the current jobs finish.";
  return `Aigenikz Music worker failed (${status}): ${String(message || "unknown error").slice(0, 500)}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const detail = contentType.includes("json") ? await response.json().catch(() => ({})) : await response.text();
    throw new Error(providerError(response.status, detail));
  }
  if (contentType.startsWith("audio/")) return { status: "completed", audio: Buffer.from(await response.arrayBuffer()), contentType };
  return response.json();
}

function generationPayload(session, vocalStyle) {
  return {
    request_id: `${session.id}-${Date.now()}`,
    model: workerConfig().model,
    title: session.title,
    prompt: session.prompt,
    lyrics: session.lyrics?.text || "",
    genre: session.genre,
    mood: session.mood,
    bpm: session.bpm,
    key: session.key,
    time_signature: session.timeSignature,
    duration_seconds: Math.min(Math.max(Number(session.durationSeconds) || 150, 10), 600),
    vocal_style: vocalStyle || "warm expressive lead vocalist",
    instruments: (session.tracks || []).filter((track) => track.type !== "vocal").map((track) => track.name),
    sections: (session.sections || []).map((section) => ({ name: section.name, start_seconds: section.startSeconds, end_seconds: section.endSeconds, energy: section.energy })),
    output_format: "mp3",
  };
}

async function waitForJob(initial, config, fetchImpl, timeoutMs, pollMs) {
  let job = initial;
  const jobId = clean(job.job_id || job.id);
  if (!jobId) throw new Error("Aigenikz Music worker returned a queued response without a job ID.");
  const statusUrl = clean(job.status_url) || `${config.baseUrl}/v1/music/generations/${encodeURIComponent(jobId)}`;
  const deadline = Date.now() + timeoutMs;
  while (!["completed", "succeeded", "failed", "cancelled"].includes(clean(job.status).toLowerCase())) {
    if (Date.now() >= deadline) throw new Error(`Aigenikz Music generation ${jobId} timed out.`);
    await sleep(pollMs);
    job = await parseResponse(await fetchImpl(statusUrl, { headers: headers(config.token, false), signal: AbortSignal.timeout(30000) }));
  }
  if (["failed", "cancelled"].includes(clean(job.status).toLowerCase())) throw new Error(clean(job.error || job.message) || `Aigenikz Music generation ${jobId} failed.`);
  return job;
}

async function resolveAudio(result, config, fetchImpl) {
  if (result.audio) return { audio: result.audio, contentType: result.contentType || "audio/mpeg" };
  const encoded = clean(result.audio_base64 || result.audioBase64);
  if (encoded) return { audio: Buffer.from(encoded, "base64"), contentType: result.content_type || "audio/mpeg" };
  const audioUrl = clean(result.audio_url || result.output_url || result.download_url);
  if (!audioUrl) throw new Error("Aigenikz Music worker completed without an audio result.");
  const response = await fetchImpl(new URL(audioUrl, `${config.baseUrl}/`).toString(), { headers: headers(config.token, false), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(providerError(response.status, await response.text()));
  return { audio: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || result.content_type || "audio/mpeg" };
}

export async function renderAigenikzMusic(session, {
  vocalStyle,
  outputDir = path.resolve("public", "renders", "audio"),
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollMs = DEFAULT_POLL_MS,
} = {}) {
  const config = workerConfig();
  if (!config.baseUrl) throw new Error("AIGENIKZ_MUSIC_WORKER_URL is not configured.");
  if (typeof fetchImpl !== "function") throw new Error("Music worker transport is unavailable.");
  const submitted = await parseResponse(await fetchImpl(`${config.baseUrl}/v1/music/generations`, {
    method: "POST",
    headers: headers(config.token),
    body: JSON.stringify(generationPayload(session, vocalStyle)),
    signal: AbortSignal.timeout(120000),
  }));
  const result = ["completed", "succeeded"].includes(clean(submitted.status).toLowerCase()) || submitted.audio || submitted.audio_url || submitted.audio_base64
    ? submitted
    : await waitForJob(submitted, config, fetchImpl, timeoutMs, pollMs);
  const { audio, contentType } = await resolveAudio(result, config, fetchImpl);
  if (!audio.length) throw new Error("Aigenikz Music worker returned an empty audio file.");
  const extension = contentType.includes("wav") ? "wav" : "mp3";
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `${safeName(session.title)}-${session.id.slice(0, 8)}-master.${extension}`;
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, audio);
  return {
    provider: "aigenikz-music",
    providerLabel: "Aigenikz Music Engine",
    model: clean(result.model) || config.model,
    jobId: clean(result.job_id || result.id) || null,
    format: extension,
    durationSeconds: Number(result.duration_seconds) || session.durationSeconds,
    vocalStyle: vocalStyle || "warm expressive lead vocalist",
    publicUrl: `/renders/audio/${fileName}`,
    outputPath,
    bytes: audio.length,
    createdAt: new Date().toISOString(),
  };
}

export function getAigenikzMusicStatus(env = process.env) {
  const config = workerConfig(env);
  return {
    provider: "aigenikz-music",
    label: "Aigenikz Music Engine",
    model: config.model,
    configured: Boolean(config.baseUrl),
    authenticated: Boolean(config.token),
    selfHosted: true,
  };
}

export default renderAigenikzMusic;
