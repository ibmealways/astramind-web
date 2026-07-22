import fs from "fs";
import path from "path";
import mime from "mime";

const DEFAULT_ENDPOINT = "http://127.0.0.1:8189";
const DEFAULT_TIMEOUT_MS = 1000 * 60 * 20;

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

function trimSlash(value) {
  return String(value || DEFAULT_ENDPOINT).replace(/\/+$/, "");
}

function config(overrides = {}) {
  return {
    endpoint: trimSlash(overrides.endpoint || process.env.ASTRAMIND_NATIVE_VIDEO_URL || DEFAULT_ENDPOINT),
    token: overrides.token ?? process.env.ASTRAMIND_NATIVE_VIDEO_TOKEN ?? "",
    model: clean(overrides.model || process.env.ASTRAMIND_NATIVE_VIDEO_MODEL || "Lightricks/LTX-Video"),
    backend: clean(overrides.backend || process.env.ASTRAMIND_NATIVE_VIDEO_BACKEND || "ltx").toLowerCase(),
    timeoutMs: Number(overrides.timeoutMs || process.env.ASTRAMIND_NATIVE_VIDEO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    pollIntervalMs: Number(overrides.pollIntervalMs || process.env.ASTRAMIND_NATIVE_VIDEO_POLL_MS || 3000),
  };
}

function headers(settings, json = true) {
  return {
    ...(json ? { "content-type": "application/json" } : {}),
    ...(settings.token ? { authorization: `Bearer ${settings.token}` } : {}),
  };
}

function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal && typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : (signal || timeout);
}

async function responseJson(response, label) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text }; }
  if (!response.ok) {
    const error = new Error(body.error || body.message || `${label} failed with HTTP ${response.status}.`);
    error.code = body.code || "ASTRAMIND_NATIVE_VIDEO_ERROR";
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

function imagePayload(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;
  const contentType = mime.getType(imagePath) || "image/png";
  return {
    contentType,
    base64: fs.readFileSync(imagePath).toString("base64"),
    filename: path.basename(imagePath),
  };
}

async function persistVideo(result, outputPath, settings, fetchImpl) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (result.videoBase64) {
    fs.writeFileSync(outputPath, Buffer.from(result.videoBase64, "base64"));
    return outputPath;
  }
  if (result.outputPath && fs.existsSync(result.outputPath)) {
    fs.copyFileSync(result.outputPath, outputPath);
    return outputPath;
  }
  const videoUrl = result.videoUrl || result.downloadUrl;
  if (!videoUrl) throw new Error("AstraMind native worker completed without a video artifact.");
  const resolved = /^https?:\/\//i.test(videoUrl) ? videoUrl : `${settings.endpoint}${videoUrl.startsWith("/") ? "" : "/"}${videoUrl}`;
  const response = await fetchImpl(resolved, { headers: headers(settings, false) });
  if (!response.ok) throw new Error(`AstraMind native video download failed with HTTP ${response.status}.`);
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
  return outputPath;
}

export function buildNativeVideoRequest({ prompt, negativePrompt, imagePath, duration = 5, width = 1280, height = 720, seed, continuity = {}, settings = {} } = {}) {
  const native = config(settings);
  return {
    backend: native.backend,
    model: native.model,
    prompt: clean(prompt),
    negativePrompt: clean(negativePrompt || "worst quality, inconsistent motion, blurry, jittery, distorted, text, watermark"),
    image: imagePayload(imagePath),
    durationSeconds: Math.max(1, Math.min(Number(duration) || 5, 10)),
    width: Number(width) || 1280,
    height: Number(height) || 720,
    fps: 24,
    seed: Number.isFinite(Number(seed)) ? Number(seed) : undefined,
    continuity,
  };
}

export async function getNativeVideoHealth({ fetchImpl = fetch, settings = {} } = {}) {
  const native = config(settings);
  try {
    const response = await fetchImpl(`${native.endpoint}/v1/health`, { headers: headers(native, false), signal: AbortSignal.timeout(5000) });
    const body = await responseJson(response, "AstraMind native video health check");
    return { ...body, ok: Boolean(body.ok && body.ready), configured: true, endpoint: native.endpoint, backend: body.backend || native.backend, model: body.model || native.model };
  } catch (error) {
    return { ok: false, ready: false, configured: true, endpoint: native.endpoint, backend: native.backend, model: native.model, code: error.code || "NATIVE_WORKER_UNAVAILABLE", error: error.message };
  }
}

export async function cancelNativeVideoJob(jobId, { fetchImpl = fetch, settings = {} } = {}) {
  if (!jobId) return { ok:false, cancelled:false, error:"A native video job id is required." };
  const native = config(settings);
  try {
    const response = await fetchImpl(`${native.endpoint}/v1/video/generations/${encodeURIComponent(jobId)}/cancel`, { method:"POST", headers:headers(native) });
    const body = await responseJson(response, "AstraMind native video cancellation");
    return { ok:true, cancelled:["cancel_requested","cancelled","canceled"].includes(String(body.status).toLowerCase()), ...body };
  } catch (error) {
    return { ok:false, cancelled:false, error:error.message, code:error.code || "NATIVE_CANCEL_FAILED" };
  }
}

export async function generateNativeVideoClip({ prompt, negativePrompt, imagePath, outputPath, duration, width, height, seed, continuity, fetchImpl = fetch, settings = {}, signal, onTaskCreated } = {}) {
  if (!clean(prompt)) throw new Error("AstraMind native video generation requires a prompt.");
  if (!outputPath) throw new Error("AstraMind native video generation requires an outputPath.");
  const native = config(settings);
  const request = buildNativeVideoRequest({ prompt, negativePrompt, imagePath, duration, width, height, seed, continuity, settings });
  let jobId = null;
  try {
    const createResponse = await fetchImpl(`${native.endpoint}/v1/video/generations`, {
      method: "POST",
      headers: headers(native),
      body: JSON.stringify(request),
      signal: requestSignal(signal, Math.min(native.timeoutMs, 30000)),
    });
    let result = await responseJson(createResponse, "AstraMind native video submission");
    jobId = result.id || result.jobId;
    if (jobId && onTaskCreated) await onTaskCreated(jobId);
    const deadline = Date.now() + native.timeoutMs;
    while (jobId && ["queued", "running"].includes(String(result.status).toLowerCase())) {
      if (signal?.aborted) throw signal.reason || new Error("Native video generation cancelled.");
      if (Date.now() >= deadline) throw new Error(`AstraMind native video job ${jobId} timed out.`);
      await new Promise((resolve) => setTimeout(resolve, native.pollIntervalMs));
      const pollResponse = await fetchImpl(`${native.endpoint}/v1/video/generations/${encodeURIComponent(jobId)}`, { headers: headers(native, false), signal: requestSignal(signal, 30000) });
      result = await responseJson(pollResponse, "AstraMind native video polling");
    }
    if (["failed", "cancelled", "canceled"].includes(String(result.status).toLowerCase())) {
      throw new Error(result.error || `AstraMind native video job ${jobId || "unknown"} failed.`);
    }
    await persistVideo(result, outputPath, native, fetchImpl);
    return { outputPath, taskId: jobId || null, model: result.model || native.model, backend: result.backend || native.backend, seed: result.seed, raw: result };
  } catch (error) {
    if (jobId && signal?.aborted) await cancelNativeVideoJob(jobId, { fetchImpl, settings });
    throw error;
  }
}

export default { buildNativeVideoRequest, getNativeVideoHealth, generateNativeVideoClip, cancelNativeVideoJob };
