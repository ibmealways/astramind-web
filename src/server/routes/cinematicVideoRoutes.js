// src/server/routes/cinematicVideoRoutes.js

import express from "express";

import {
  orchestrateCinematicPipeline,
  getPipelineDiagnostics,
  getPipelineOrchestratorHealth,
} from "../../core/video/pipelineOrchestrator.js";

import {
  buildCinematicStoryboard,
} from "../../core/video/cinematicStoryboardEngine.js";

import {
  getRenderQueueDiagnostics,
  getRenderJobStatus,
  getRenderById,
  retryRenderJob,
} from "../../core/video/renderQueue.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  return res.json({
    ok: true,
    route: "GET /api/cinematic-video/health",
    version: "Aigenikz Cinematic Video Routes v7 Existing Structure",
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

router.post("/storyboard", async (req, res) => {
  try {
    const {
      topic,
      platform = "TikTok",
      style = "cinematic futuristic high-energy",
      durationTarget = 30,
    } = req.body || {};

    if (!String(topic || "").trim()) {
      return res.status(400).json({
        ok: false,
        route: "POST /api/cinematic-video/storyboard",
        error: "Topic is required.",
      });
    }

    const storyboard = buildCinematicStoryboard({
      topic,
      platform,
      style,
      durationTarget,
    });

    return res.json({
      ok: true,
      route: "POST /api/cinematic-video/storyboard",
      storyboard,
    });
  } catch (error) {
    console.error("Storyboard route failed:", error);

    return res.status(500).json({
      ok: false,
      route: "POST /api/cinematic-video/storyboard",
      error: error?.message || "Storyboard generation failed.",
    });
  }
});

router.post("/render", async (req, res) => {
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

    const result = await orchestrateCinematicPipeline({
      topic,
      style,
      platform,
      durationTarget,
      force,
      options,
    });

    return res.status(result?.ok ? 200 : 500).json({
      ok: Boolean(result?.ok),
      route: "POST /api/cinematic-video/render",
      version: "Aigenikz Cinematic Video Routes v7 Existing Structure",
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
      productionOS: true,
      existingStructureOnly: true,
    });
  } catch (error) {
    console.error("🔥 Cinematic render route failed:", error);

    return res.status(500).json({
      ok: false,
      route: "POST /api/cinematic-video/render",
      version: "Aigenikz Cinematic Video Routes v7 Existing Structure",
      error: error?.message || "Cinematic render failed.",
    });
  }
});

router.get("/status/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

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
      version: "Aigenikz Cinematic Video Routes v7 Existing Structure",
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
});

router.get("/render-queue", async (req, res) => {
  try {
    const diagnostics = getRenderQueueDiagnostics();

    return res.json({
      ok: true,
      route: "GET /api/cinematic-video/render-queue",
      version: "Aigenikz Cinematic Video Routes v7 Existing Structure",
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

router.post("/retry/:renderId", async (req, res) => {
  try {
    const { renderId } = req.params;

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
