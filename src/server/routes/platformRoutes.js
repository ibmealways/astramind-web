import express from "express";
import {
  getPersistentProjects,
  getPersistentProjectById,
  getProjectWorkflowRuns,
  getProjectChapters,
  getRecentWorkflowRuns,
  getRecentResearchSources,
} from "../../services/projectPersistenceService.js";
import {
  getPlatformSummary,
  getWorkflowCountsByAgent,
  getWorkflowCountsByKey,
  getFilteredWorkflowRuns,
  getFilteredResearchSources,
} from "../../services/platformAnalyticsService.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  return res.json({
    ok: true,
    service: "Aigenikz Platform Routes",
    timestamp: new Date().toISOString(),
  });
});

router.get("/summary", async (req, res) => {
  try {
    const [summary, workflowsByAgent, workflowsByKey] = await Promise.all([
      getPlatformSummary(),
      getWorkflowCountsByAgent(),
      getWorkflowCountsByKey(),
    ]);

    return res.json({
      ok: true,
      summary,
      workflowsByAgent,
      workflowsByKey,
    });
  } catch (error) {
    console.error("🔥 PLATFORM SUMMARY ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch platform summary.",
    });
  }
});

router.get("/projects", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const projects = await getPersistentProjects(limit);

    return res.json({
      ok: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("🔥 PLATFORM PROJECTS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch platform projects.",
    });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await getPersistentProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        ok: false,
        error: "Platform project not found.",
      });
    }

    const [chapters, workflowRuns] = await Promise.all([
      getProjectChapters(req.params.id),
      getProjectWorkflowRuns(req.params.id, 50),
    ]);

    return res.json({
      ok: true,
      project,
      chapters,
      workflowRuns,
    });
  } catch (error) {
    console.error("🔥 PLATFORM PROJECT DETAIL ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch platform project detail.",
    });
  }
});

router.get("/projects/:id/chapters", async (req, res) => {
  try {
    const chapters = await getProjectChapters(req.params.id);

    return res.json({
      ok: true,
      count: chapters.length,
      chapters,
    });
  } catch (error) {
    console.error("🔥 PLATFORM PROJECT CHAPTERS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch chapters.",
    });
  }
});

router.get("/projects/:id/workflows", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const workflowRuns = await getProjectWorkflowRuns(req.params.id, limit);

    return res.json({
      ok: true,
      count: workflowRuns.length,
      workflowRuns,
    });
  } catch (error) {
    console.error("🔥 PLATFORM PROJECT WORKFLOWS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch workflow runs.",
    });
  }
});

router.get("/workflows/recent", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const workflowRuns = await getRecentWorkflowRuns(limit);

    return res.json({
      ok: true,
      count: workflowRuns.length,
      workflowRuns,
    });
  } catch (error) {
    console.error("🔥 PLATFORM RECENT WORKFLOWS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch recent workflow runs.",
    });
  }
});

router.get("/workflows/filter", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const agent = String(req.query.agent || "").trim();
    const workflowKey = String(req.query.workflowKey || "").trim();

    const workflowRuns = await getFilteredWorkflowRuns({
      limit,
      agent,
      workflowKey,
    });

    return res.json({
      ok: true,
      count: workflowRuns.length,
      workflowRuns,
    });
  } catch (error) {
    console.error("🔥 PLATFORM FILTERED WORKFLOWS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch filtered workflow runs.",
    });
  }
});

router.get("/sources/recent", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const sources = await getRecentResearchSources(limit);

    return res.json({
      ok: true,
      count: sources.length,
      sources,
    });
  } catch (error) {
    console.error("🔥 PLATFORM RECENT SOURCES ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch recent research sources.",
    });
  }
});

router.get("/sources/filter", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const topic = String(req.query.topic || "").trim();

    const sources = await getFilteredResearchSources({
      limit,
      topic,
    });

    return res.json({
      ok: true,
      count: sources.length,
      sources,
    });
  } catch (error) {
    console.error("🔥 PLATFORM FILTERED SOURCES ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch filtered research sources.",
    });
  }
});

export default router;