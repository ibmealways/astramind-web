import express from "express";
import fs from "fs";
import path from "path";
import requireAuth from "../middleware/requireAuth.js";
import { platformRateLimitMiddleware } from "../../core/platform/rateLimiter.js";
import { getPlanLimits } from "../../core/platform/developerPlans.js";
import { orchestrateCinematicPipeline, getPipelineDiagnostics, getPipelineOrchestratorHealth } from "../../core/video/pipelineOrchestrator.js";
import { buildCinematicStoryboard } from "../../core/video/cinematicStoryboardEngine.js";
import { getRenderQueueDiagnostics, getRenderJobStatus, getRenderById, retryRenderJob } from "../../core/video/renderQueue.js";
import { getConfiguredVideoMode, getProviderConfiguration, validateVideoOptions } from "../../core/video/videoGenerationConfig.js";
import { validateVideoArtifact } from "../../core/video/videoArtifactValidator.js";
import { deliverVideoArtifact } from "../../core/video/artifactDelivery.js";
import { generateAIVideoClip } from "../../core/video/aiVideoGenerationBuilder.js";
import { listCharacterReferences, resolveCharacterReference } from "../../core/video/characterLibrary.js";

const router = express.Router();
const activeRendersByUser = new Map();
const completedIdempotentRenders = new Map();
const GENERATED_IMAGES_DIR = path.resolve("public", "renders", "generated-images");
const SELF_HOSTED_VIDEO_MODES = new Set(["local-test", "aigenikz-local"]);
const renderRateLimit = platformRateLimitMiddleware({
  route: "cinematic-video-render",
  identityResolver: (req) => req.user?.id || req.ip,
  planResolver: (req) => req.user?.plan,
  customMinuteLimit: 3,
  customDayLimit: 20,
});

function normalizeRenderUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;
  for (const publicRoot of ["/server-renders/", "/renders/"]) {
    const rootIndex = normalized.indexOf(publicRoot);
    if (rootIndex >= 0) return normalized.slice(rootIndex);
  }
  const relative = normalized.replace(/^\.\//, "").replace(/^\/+/, "");
  return relative.startsWith("server-renders/") || relative.startsWith("renders/") ? `/${relative}` : null;
}

function getRenderResult(result) {
  return result?.outputs?.render || result?.renderOutput || result?.render || null;
}

function getRenderPath(result) {
  const render = getRenderResult(result);
  const candidates = [result?.videoUrl, result?.outputPath, result?.videoPath, render?.videoUrl, render?.outputPath, render?.videoPath, render?.output?.outputPath, render?.output?.videoPath];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim()) || null;
}

function resolveGeneratedImageUrl(value) {
  const match = String(value || "").match(/^\/renders\/generated-images\/([a-z0-9-]+\.png)$/i);
  if (!match) return null;
  const resolved = path.resolve(GENERATED_IMAGES_DIR, match[1]);
  if (!resolved.startsWith(`${GENERATED_IMAGES_DIR}${path.sep}`) || !fs.existsSync(resolved)) return null;
  return resolved;
}

router.get("/health", (req, res) => {
  const configuredMode = getConfiguredVideoMode();
  return res.json({
    ok: true,
    route: "GET /api/cinematic-video/health",
    version: "Aigenikz Cinematic Video Routes v11 Local Render Ready",
    selfHostedMaxDurationSeconds: 60,
    selfHostedRequiresPexels: false,
    storyboardProfiles: ["hollow-bloom-episode-one"],
    video: getProviderConfiguration(configuredMode),
    orchestratorHealth: getPipelineOrchestratorHealth(),
    generatedAt: new Date().toISOString(),
  });
});

router.post("/storyboard", requireAuth, (req, res) => {
  try {
    const { topic, platform = "TikTok", style = "cinematic futuristic high-energy", durationTarget = 30, mode = "disabled" } = req.body || {};
    if (!String(topic || "").trim()) return res.status(400).json({ ok: false, error: "Topic is required." });
    const limits = getPlanLimits(req.user?.plan);
    const storyboardDurationLimit = SELF_HOSTED_VIDEO_MODES.has(mode)
      ? Math.max(60, limits.maxRenderDurationSeconds)
      : limits.maxRenderDurationSeconds;
    if (Number(durationTarget) > storyboardDurationLimit) return res.status(403).json({ ok: false, error: `This mode allows videos up to ${storyboardDurationLimit} seconds.` });
    const storyboard = buildCinematicStoryboard({ topic, platform, style, durationTarget });
    if ((storyboard?.scenes?.length || 0) > limits.maxScenesPerVideo) return res.status(403).json({ ok: false, error: `Your plan allows ${limits.maxScenesPerVideo} scenes per video.` });
    return res.json({ ok: true, route: "POST /api/cinematic-video/storyboard", storyboard });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "Storyboard generation failed." });
  }
});

router.get("/characters", requireAuth, (req, res) => {
  try {
    return res.json({ ok: true, characters: listCharacterReferences() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Character library is unavailable." });
  }
});

router.post("/local-clip", requireAuth, renderRateLimit, async (req, res) => {
  try {
    if (!getProviderConfiguration("aigenikz-local").configured) throw new Error("Connect the PC video worker in Render before generating a local AI clip.");
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt || prompt.length > 1200) throw new Error("Enter a video prompt of 1–1200 characters.");
    const referenceId = String(req.body?.referenceId || "").trim();
    const generatedImageUrl = String(req.body?.generatedImageUrl || "").trim();
    const generatedImagePath = generatedImageUrl ? resolveGeneratedImageUrl(generatedImageUrl) : null;
    if (generatedImageUrl && !generatedImagePath) throw new Error("Generated image reference is unavailable.");
    const referenceImagePath = referenceId ? resolveCharacterReference(referenceId).imagePath : generatedImagePath;
    const clip = await generateAIVideoClip({
      scene: { id: `local-${Date.now()}`, title: "Generated AI video", visual: prompt, duration: 6 },
      topic: prompt,
      style: String(req.body?.style || "cinematic").slice(0, 120),
      projectId: `local-${req.user.id}-${Date.now()}`,
      provider: "aigenikz-local",
      allowFallback: false,
      referenceImagePath,
    });
    return res.json({ ok: true, videoUrl: clip.publicUrl, mode: "aigenikz-local", model: clip.model, referenceId: referenceId || null, generatedImageUrl: generatedImageUrl || null, duration: clip.duration, label: "Aigenikz local AI video", artifactValidation: clip.artifactValidation });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message || "Local AI video generation failed." });
  }
});

router.post("/render", requireAuth, renderRateLimit, async (req, res) => {
  const userId = req.user.id;
  let concurrencySlotAcquired = false;
  try {
    const { topic, style = "cinematic", platform = "TikTok", durationTarget = 30, force = false } = req.body || {};
    if (!String(topic || "").trim()) return res.status(400).json({ ok: false, error: "Topic is required." });
    const limits = getPlanLimits(req.user?.plan);
    const requestedMode = req.body?.options?.mode;
    const renderDurationLimit = SELF_HOSTED_VIDEO_MODES.has(requestedMode)
      ? Math.max(60, limits.maxRenderDurationSeconds)
      : limits.maxRenderDurationSeconds;
    const options = validateVideoOptions({ ...(req.body?.options || {}), durationTarget }, { maxDuration: renderDurationLimit, maxResolution: "1080x1920" });
    const estimatedProviderCostUsd = options.diagnostics.realProvider && options.mode !== "aigenikz-local"
      ? Number((options.durationTarget * Number(process.env.VIDEO_PROVIDER_COST_PER_SECOND_USD || 0.12)).toFixed(2))
      : 0;
    const maxProviderCostUsd = Number(process.env.VIDEO_MAX_PROVIDER_COST_USD || 5);
    if (estimatedProviderCostUsd > maxProviderCostUsd) {
      return res.status(403).json({ ok: false, error: `Estimated provider cost $${estimatedProviderCostUsd.toFixed(2)} exceeds the configured $${maxProviderCostUsd.toFixed(2)} limit.` });
    }
    const idempotencyKey = options.idempotencyKey || String(req.get("Idempotency-Key") || "").trim();
    const cacheKey = idempotencyKey ? `${userId}:${idempotencyKey}` : "";
    if (cacheKey && completedIdempotentRenders.has(cacheKey)) return res.json({ ...completedIdempotentRenders.get(cacheKey), idempotentReplay: true });
    const activeCount = activeRendersByUser.get(userId) || 0;
    if (activeCount >= limits.maxConcurrentJobs) return res.status(429).json({ ok: false, error: `Your plan allows ${limits.maxConcurrentJobs} concurrent render job(s).` });
    activeRendersByUser.set(userId, activeCount + 1);
    concurrencySlotAcquired = true;

    const result = await orchestrateCinematicPipeline({ topic, style, platform, durationTarget, force, options, maxScenes: limits.maxScenesPerVideo });
    if (!result?.ok) throw new Error(result?.error || "Cinematic pipeline failed.");
    const renderOutput = getRenderResult(result);
    const renderPath = getRenderPath(result);
    const videoUrl = normalizeRenderUrl(renderPath);
    if (!videoUrl || !renderPath || renderOutput?.ok === false) throw new Error("Render completed without a public video URL.");
    const artifactValidation = await validateVideoArtifact({
      filePath: renderPath,
      source: options.mode,
      rejectStatic: options.diagnostics.realProvider,
      expected: {
        minDuration: 1,
        maxDuration: options.durationTarget,
        durationToleranceSeconds: options.mode === "local-test" ? 5 : 1,
        maxFileSizeBytes: Number(process.env.VIDEO_MAX_FILE_SIZE_BYTES || 262144000),
        audioRequired: options.voiceover || options.soundtrack,
      },
    });
    const delivery = await deliverVideoArtifact({
      filePath: renderPath,
      projectId: result.projectId,
      localPublicUrl: videoUrl,
    });
    const response = {
      ok: true,
      route: "POST /api/cinematic-video/render",
      version: "Aigenikz Cinematic Video Routes v9 Verified Modes",
      projectId: result.projectId || null,
      executionId: result.executionId || null,
      videoUrl: delivery.videoUrl,
      mode: options.mode,
      label: options.diagnostics.label,
      artifactValidation,
      delivery,
      estimatedProviderCostUsd,
      diagnostics: result.diagnostics || null,
    };
    if (cacheKey) completedIdempotentRenders.set(cacheKey, response);
    return res.json(response);
  } catch (error) {
    console.error("Cinematic render route failed:", error);
    return res.status(400).json({ ok: false, route: "POST /api/cinematic-video/render", error: error?.message || "Cinematic render failed." });
  } finally {
    if (concurrencySlotAcquired) {
      const count = activeRendersByUser.get(userId) || 0;
      if (count <= 1) activeRendersByUser.delete(userId);
      else activeRendersByUser.set(userId, count - 1);
    }
  }
});

router.get("/status/:projectId", requireAuth, (req, res) => {
  const status = getRenderJobStatus(req.params.projectId) || getRenderById(req.params.projectId);
  if (!status) return res.status(404).json({ ok: false, error: "Render project not found.", projectId: req.params.projectId });
  return res.json({ ok: true, projectId: req.params.projectId, status: status.status, lifecycleStage: status.lifecycleStage, render: status });
});

router.get("/render-queue", requireAuth, (req, res) => res.json({ ok: true, diagnostics: getRenderQueueDiagnostics(), pipelineDiagnostics: getPipelineDiagnostics() }));

router.post("/retry/:renderId", requireAuth, renderRateLimit, async (req, res) => {
  try {
    const result = await retryRenderJob(req.params.renderId);
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

export default router;
