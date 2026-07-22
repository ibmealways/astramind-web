// src/server/routes/cinematicVideoRoutes.js

import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { subscriptionStore } from "../../services/subscriptionService.js";
import { estimateVideoCredits } from "../../core/subscription/UsageMeter.js";
import { meterOperation, requireEntitlement } from "../middleware/subscriptionAccess.js";
import { generateAIStoryboard } from "../../core/video/aiStoryboardBrain.js";
import db from "../db/sqlite.js";
import { createFullVideoGenerationPlan, summarizeFullVideoResult } from "../../core/video/FullVideoGenerationOS.js";
import {
  createFullVideoJob,
  getFullVideoJob,
  listFullVideoJobs,
  markFullVideoJobRunning,
  updateFullVideoJob,
} from "../services/fullVideoJobStore.js";
import { cancelNativeVideoJob } from "../../core/video/AstraMindNativeVideoProvider.js";

import {
  orchestrateCinematicPipeline,
  getPipelineDiagnostics,
  getPipelineOrchestratorHealth,
} from "../../core/video/pipelineOrchestrator.js";

import {
  getRenderQueueDiagnostics,
  getRenderJobStatus,
  getRenderById,
  retryRenderJob,
} from "../../core/video/renderQueue.js";

const router = express.Router();
db.exec("CREATE TABLE IF NOT EXISTS video_render_ownership (project_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,created_at TEXT NOT NULL)");
const ownsRender=(userId,projectId)=>Boolean(db.prepare("SELECT 1 FROM video_render_ownership WHERE project_id=? AND user_id=?").get(projectId,userId));
const activeFullVideoJobs = new Set();
const activeFullVideoControllers = new Map();

function registerOwnership(projectId, userId) {
  db.prepare("INSERT OR REPLACE INTO video_render_ownership (project_id,user_id,created_at) VALUES (?,?,?)")
    .run(projectId, userId, new Date().toISOString());
}

function runFullVideoJob({ job, reservationId = null }) {
  if (!job?.id || activeFullVideoJobs.has(job.id)) return;
  activeFullVideoJobs.add(job.id);
  const controller = new AbortController();
  activeFullVideoControllers.set(job.id, controller);
  setImmediate(async () => {
    let successful = false;
    try {
      markFullVideoJobRunning(job.id);
      const result = await orchestrateCinematicPipeline({
        ...job.request,
        projectId: job.id,
        preflightOnly: false,
        preflightApproved: true,
        signal: controller.signal,
        onNativeTaskCreated: (taskId) => updateFullVideoJob(job.id, { nativeTaskId:taskId, stage:"native-video-generation", progress:Math.max(10, getFullVideoJob(job.id, job.userId)?.progress || 0) }),
      });
      const summary = summarizeFullVideoResult(result);
      successful = Boolean(result?.ok);
      const completedAt = new Date().toISOString();
      const current = getFullVideoJob(job.id, job.userId);
      if (current?.cancelRequestedAt) successful = false;
      updateFullVideoJob(job.id, current?.cancelRequestedAt ? {
        status:"cancelled", stage:"cancelled", progress:current.progress, result:{ ...summary, plan:job.plan }, error:"Cancelled by user.", completedAt,
      } : {
        status: summary.videoUrl || summary.outputPath ? "completed" : successful ? "degraded" : "failed",
        stage: summary.videoUrl || summary.outputPath ? "artifact-ready" : successful ? "production-package-ready" : "failed",
        progress: successful ? 100 : 0,
        result: { ...summary, plan: job.plan },
        error: summary.error,
        completedAt,
      });
    } catch (error) {
      updateFullVideoJob(job.id, {
        status: "failed",
        stage: "failed",
        progress: 0,
        error: error?.message || "Full video generation failed.",
        completedAt: new Date().toISOString(),
      });
    } finally {
      activeFullVideoJobs.delete(job.id);
      activeFullVideoControllers.delete(job.id);
      if (reservationId) subscriptionStore.settle(reservationId, { success: successful, metadata: { projectId: job.id, completed: successful } });
    }
  });
}

router.get("/health", async (req, res) => {
  return res.json({
    ok: true,
    route: "GET /api/cinematic-video/health",
    version: "AstraMind Cinematic Video Routes v7 Existing Structure",
    systems: {
      orchestration: true,
      renderQueue: true,
      productionOS: true,
      existingStructureOnly: true,
    },
    orchestratorHealth: getPipelineOrchestratorHealth(),
    generatedAt: new Date().toISOString(),
  });
});

router.post("/render", requireAuth, async (req, res) => {
  let reservation = null;
  let completed = false;
  try {
    const {
      topic,
      style = "cinematic",
      platform = "TikTok",
      durationTarget = 60,
      force = false,
      options = {},
    } = req.body || {};

    if (!topic) {
      return res.status(400).json({
        ok: false,
        route: "POST /api/cinematic-video/render",
        error: "Topic is required.",
      });
    }

    const preflightOnly = Boolean(options.preflightOnly);
    if (!preflightOnly) {
      const subscription = subscriptionStore.ensure(req.user.id);
      if (!subscription.plan.entitlements.video) return res.status(403).json({ ok:false, code:"PLAN_UPGRADE_REQUIRED", error:"Final video rendering requires a Pro or Elite plan." });
      const estimatedCredits = estimateVideoCredits(durationTarget);
      reservation = subscriptionStore.reserve({ userId:req.user.id, operation:"video.render", amount:estimatedCredits, metadata:{ durationTarget, platform } });
    }

    const result = await orchestrateCinematicPipeline({
      topic,
      style,
      platform,
      durationTarget,
      force,
      options,
      preflightOnly: Boolean(options.preflightOnly),
      preflightApproved: Boolean(options.preflightApproved),
    });

    completed = Boolean(result?.ok);
    if (result?.projectId) db.prepare("INSERT OR REPLACE INTO video_render_ownership (project_id,user_id,created_at) VALUES (?,?,?)").run(result.projectId,req.user.id,new Date().toISOString());
    return res.status(result?.ok ? 200 : 500).json({
      ok: Boolean(result?.ok),
      route: "POST /api/cinematic-video/render",
      version: "AstraMind Cinematic Video Routes v7 Existing Structure",
      projectId: result?.projectId || null,
      executionId: result?.executionId || null,
      videoUrl:
        result?.videoUrl ||
        result?.renderOutput?.videoUrl ||
        result?.renderOutput?.downloadUrl ||
        null,
      renderPath:
        result?.renderPath ||
        result?.videoPath ||
        result?.renderOutput?.outputPath ||
        null,
      renderOutput: result?.renderOutput || result,
      directorState: result?.directorState || null,
      diagnostics: result?.diagnostics || null,
      error: result?.error || null,
      stage: result?.stage || null,
      requiresApproval: Boolean(result?.requiresApproval),
      preflight: result?.preflight || null,
      partialArtifacts: result?.partialArtifacts || null,
      productionOS: true,
      existingStructureOnly: true,
      creditUsage: reservation ? { reservationId:reservation.id, charged:reservation.amount, balance:reservation.balance } : null,
    });
  } catch (error) {
    console.error("🔥 Cinematic render route failed:", error);

    return res.status(error.code === "INSUFFICIENT_CREDITS" ? 402 : 500).json({
      ok: false,
      code: error.code || "CINEMATIC_RENDER_FAILED",
      route: "POST /api/cinematic-video/render",
      version: "AstraMind Cinematic Video Routes v7 Existing Structure",
      error: error?.message || "Cinematic render failed.",
    });
  } finally {
    if (reservation) subscriptionStore.settle(reservation.id, { success:completed, metadata:{ completed } });
  }
});

router.post("/jobs", requireAuth, async (req, res) => {
  try {
    const topic = String(req.body?.topic || "").trim();
    if (!topic) return res.status(400).json({ ok:false, code:"TOPIC_REQUIRED", error:"Topic is required." });

    const durationTarget = Math.min(600, Math.max(5, Number(req.body?.durationTarget) || 60));
    const subscription = subscriptionStore.ensure(req.user.id);
    if (!subscription.plan.entitlements.video) {
      return res.status(403).json({ ok:false, code:"PLAN_UPGRADE_REQUIRED", error:"Full video generation requires a Pro or Elite plan." });
    }

    const request = {
      topic,
      style: req.body?.style || "cinematic",
      platform: req.body?.platform || "YouTube",
      durationTarget,
      options: req.body?.options || {},
    };
    const plan = createFullVideoGenerationPlan(request);
    const reservation = subscriptionStore.reserve({
      userId:req.user.id,
      operation:"video.render",
      amount:estimateVideoCredits(durationTarget),
      metadata:{ projectId:plan.id, durationTarget, platform:request.platform, runtime:"full-video-os" },
    });
    const job = createFullVideoJob({ userId:req.user.id, request, plan, reservationId:reservation.id });
    registerOwnership(job.id, req.user.id);
    runFullVideoJob({ job, reservationId:reservation.id });

    return res.status(202).json({
      ok:true,
      accepted:true,
      route:"POST /api/cinematic-video/jobs",
      version:"AstraMind Full Video Generation OS v1",
      projectId:job.id,
      job,
      statusUrl:`/api/cinematic-video/jobs/${job.id}`,
      creditUsage:{ reservationId:reservation.id, reserved:reservation.amount, balance:reservation.balance },
    });
  } catch (error) {
    return res.status(error.code === "INSUFFICIENT_CREDITS" ? 402 : 500).json({ ok:false, code:error.code || "FULL_VIDEO_JOB_FAILED", error:error.message });
  }
});

router.get("/jobs", requireAuth, (req, res) => {
  const jobs = listFullVideoJobs(req.user.id, req.query.limit);
  return res.json({ ok:true, version:"AstraMind Full Video Generation OS v1", jobs });
});

router.get("/jobs/:projectId", requireAuth, (req, res) => {
  const job = getFullVideoJob(req.params.projectId, req.user.id);
  if (!job) return res.status(404).json({ ok:false, error:"Full video job not found." });
  return res.json({ ok:true, job });
});

router.post("/jobs/:projectId/cancel", requireAuth, async (req, res) => {
  const job = getFullVideoJob(req.params.projectId, req.user.id);
  if (!job) return res.status(404).json({ ok:false, error:"Full video job not found." });
  if (!["queued","running"].includes(job.status)) return res.status(409).json({ ok:false, code:"JOB_NOT_CANCELLABLE", error:`A ${job.status} job cannot be cancelled.`, job });
  const cancelRequestedAt = new Date().toISOString();
  updateFullVideoJob(job.id, { status:"cancelling", stage:"cancel-requested", cancelRequestedAt, error:null });
  activeFullVideoControllers.get(job.id)?.abort(new Error("Full video job cancelled by user."));
  const native = job.nativeTaskId ? await cancelNativeVideoJob(job.nativeTaskId) : { ok:true, cancelled:false, status:"no-active-native-task" };
  if (!activeFullVideoJobs.has(job.id)) {
    updateFullVideoJob(job.id, { status:"cancelled", stage:"cancelled", completedAt:new Date().toISOString(), error:"Cancelled by user." });
  }
  return res.status(202).json({ ok:true, accepted:true, projectId:job.id, native, job:getFullVideoJob(job.id, req.user.id) });
});

router.post("/jobs/:projectId/resume", requireAuth, (req, res) => {
  const job = getFullVideoJob(req.params.projectId, req.user.id);
  if (!job) return res.status(404).json({ ok:false, error:"Full video job not found." });
  if (activeFullVideoJobs.has(job.id) || ["queued","running"].includes(job.status)) {
    return res.status(409).json({ ok:false, code:"JOB_ALREADY_RUNNING", error:"This video job is already running." });
  }
  if (job.status === "completed") return res.json({ ok:true, job, message:"The completed video is already available." });

  try {
    const subscription = subscriptionStore.ensure(req.user.id);
    if (!subscription.plan.entitlements.video) return res.status(403).json({ ok:false, code:"PLAN_UPGRADE_REQUIRED", error:"Full video generation requires a Pro or Elite plan." });
    const reservation = subscriptionStore.reserve({
      userId:req.user.id,
      operation:"video.render",
      amount:estimateVideoCredits(job.request.durationTarget),
      metadata:{ projectId:job.id, resumed:true, runtime:"full-video-os" },
    });
    updateFullVideoJob(job.id, { status:"queued", stage:"resume-queued", progress:Math.max(1, job.progress), error:null });
    runFullVideoJob({ job:getFullVideoJob(job.id, req.user.id), reservationId:reservation.id });
    return res.status(202).json({ ok:true, accepted:true, projectId:job.id, statusUrl:`/api/cinematic-video/jobs/${job.id}` });
  } catch (error) {
    return res.status(error.code === "INSUFFICIENT_CREDITS" ? 402 : 500).json({ ok:false, code:error.code || "RESUME_FAILED", error:error.message });
  }
});

router.post("/storyboard", requireAuth, meterOperation({operation:"video.storyboard",amount:5}), async (req,res) => {
  try {
    const topic=String(req.body?.topic||"").trim();
    if(!topic)return res.status(400).json({ok:false,error:"Topic is required."});
    const storyboard=await generateAIStoryboard({topic,platform:req.body?.platform||"TikTok",style:req.body?.style||"cinematic",durationTarget:req.body?.durationTarget||30});
    return res.json({ok:true,storyboard,creditUsage:req.creditReservation||null});
  } catch(error){return res.status(500).json({ok:false,code:"STORYBOARD_FAILED",error:error.message});}
});

async function sendStatus(req, res) {
  try {
    const { projectId } = req.params;
    if (!ownsRender(req.user.id,projectId)) return res.status(404).json({ok:false,error:"Render project not found.",projectId});

    const status =
      getRenderJobStatus(projectId) ||
      getRenderById(projectId);

    if (!status) {
      return res.status(404).json({
        ok: false,
        route: "GET /api/cinematic-video/status/:projectId",
        error: "Render project not found.",
        projectId,
      });
    }

    return res.json({
      ok: true,
      route: "GET /api/cinematic-video/status/:projectId",
      version: "AstraMind Cinematic Video Routes v7 Existing Structure",
      projectId,
      status: status.status,
      lifecycleStage: status.lifecycleStage,
      render: status,
    });
  } catch (error) {
    console.error("🔥 Status route failed:", error);

    return res.status(500).json({
      ok: false,
      route: "GET /api/cinematic-video/status/:projectId",
      error: error.message,
    });
  }
}
router.get("/status/:projectId", requireAuth, sendStatus);
router.get("/progress/:projectId", requireAuth, sendStatus);

router.get("/diagnostics/:projectId", requireAuth, (req,res)=>ownsRender(req.user.id,req.params.projectId)?res.json({ok:true,projectId:req.params.projectId,diagnostics:getPipelineDiagnostics(),render:getRenderJobStatus(req.params.projectId)||getRenderById(req.params.projectId)||null}):res.status(404).json({ok:false,error:"Render project not found."}));
router.get("/pipeline-health", requireAuth, requireEntitlement("automation"), (_req,res)=>res.json({ok:true,health:getPipelineOrchestratorHealth(),diagnostics:getPipelineDiagnostics()}));

router.get("/render-queue", requireAuth, requireEntitlement("automation"), async (req, res) => {
  try {
    const diagnostics = getRenderQueueDiagnostics();

    return res.json({
      ok: true,
      route: "GET /api/cinematic-video/render-queue",
      version: "AstraMind Cinematic Video Routes v7 Existing Structure",
      diagnostics,
      pipelineDiagnostics: getPipelineDiagnostics(),
      productionOS: true,
      existingStructureOnly: true,
    });
  } catch (error) {
    console.error("🔥 Queue route failed:", error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

router.post("/retry/:renderId", requireAuth, async (req, res) => {
  try {
    const { renderId } = req.params;
    if (!ownsRender(req.user.id,renderId)) return res.status(404).json({ok:false,error:"Render project not found."});

    const result = await retryRenderJob(renderId);

    return res.json({
      ok: true,
      route: "POST /api/cinematic-video/retry/:renderId",
      result,
    });
  } catch (error) {
    console.error("🔥 Retry route failed:", error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
