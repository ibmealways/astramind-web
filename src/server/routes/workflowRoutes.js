/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * workflowRoutes.js
 *
 * Description:
 * Enterprise Workflow API
 *
 * Backward compatible with the legacy Workflow Engine while preparing
 * for AstraMind Kernel integration.
 * ============================================================================
 */

import express from "express";
import { runWorkflow } from "../../core/workflows/workflowEngine.js";
import kernelBootstrap from "../../core/kernel/KernelBootstrap.js";
import SqliteMissionStore from "../../core/mission/SqliteMissionStore.js";
import db from "../db/sqlite.js";
import { runPromotionalCampaign } from "../../services/promotionalCampaignService.js";

// Future Kernel (enable when available)
// import AstraMindKernel from "../../core/kernel/AstraMindKernel.js";

const router = express.Router();

kernelBootstrap.configure({
    workflowHandler: ({ mission, input }, metadata = {}) => mission === "promotional_campaign"
        ? runPromotionalCampaign({ input, userId: metadata.userId, missionId: metadata.missionId })
        : runWorkflow(mission, input),
    missionStore: new SqliteMissionStore({ db })
});

/**
 * ============================================================================
 * POST /api/workflows/run
 * ============================================================================
 */

router.post("/run", async (req, res) => {

    const started = Date.now();

    try {

        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({ ok: false, code: "INVALID_REQUEST", error: "Request body must be a JSON object." });
        }

        const {

            // Legacy API
            workflowType,
            input,

            // AstraMind OS
            mission,
            plan,
            user = {},
            context = {},
            preferences = {},
            constraints = {},
            metadata = {}

            ,timeoutMs

        } = req.body;

        /**
         * ----------------------------------------------------
         * Determine execution request
         * ----------------------------------------------------
         */

        const requestedMission =
            mission ||
            workflowType ||
            "general";

        console.log(`[Workflow] accepted mission=${requestedMission} user=${req.user?.id || "anonymous"}`);

        if (typeof requestedMission !== "string" || !requestedMission.trim() || requestedMission.length > 128) {
            return res.status(400).json({ ok: false, code: "INVALID_MISSION", error: "mission must be a non-empty string of at most 128 characters." });
        }

        const missionInput =
            input ??
            {};

        /**
         * ----------------------------------------------------
         * Future Kernel Execution
         * ----------------------------------------------------
         */

        const kernel = await kernelBootstrap.boot();

        const execution = await kernel.executeMission({

            mission: requestedMission,

            input: missionInput,

            plan,

            user: req.user ? { ...user, id:req.user.id } : user,

            context,

            preferences,

            constraints,

            metadata: { ...metadata, ...(req.user?.id ? { userId:req.user.id } : {}) }

            ,timeoutMs

        });

        console.log(`[Workflow] completed mission=${requestedMission} missionId=${execution.mission.id} durationMs=${Date.now() - started}`);

        return res.status(200).json({

            ok: true,

            architecture: "AstraMind OS 3.0",

            compatibilityMode: false,

            executionId:

                execution.requestId,

            missionId:

                execution.mission.id,

            mission:

                requestedMission,

            durationMs:

                Date.now() - started,

            timestamp:

                new Date().toISOString(),

            result: execution.data

            ,plan: execution.mission.plan

            ,executions: execution.executions

        });

    }

    catch (error) {

        const status = Number.isInteger(error.status) ? error.status : 500;
        if (status >= 500) console.error("[Workflow]", error);

        return res.status(status).json({

            ok: false,

            architecture:

                "AstraMind OS 3.0",

            code: error.code || "WORKFLOW_EXECUTION_FAILED",

            error:

                error.message ||

                "Workflow execution failed.",

            timestamp:

                new Date().toISOString()

        });

    }

});

/**
 * ============================================================================
 * GET /api/workflows/health
 * ============================================================================
 */

router.get("/health", async (req, res, next) => {

    try {

        const kernel = await kernelBootstrap.boot();

        const health = await kernel.health();

    return res.status(health.healthy ? 200 : 503).json({

        ok: true,

        service: "Workflow API",

        version: "3.0.0-alpha.1",

        kernelIntegrated: true,

        compatibilityMode: false,

        kernel: kernel.info(),

        health,

        timestamp:

            new Date().toISOString()

    });

    } catch (error) {

        next(error);

    }

});

/**
 * ============================================================================
 * GET /api/workflows/version
 * ============================================================================
 */

router.get("/version", async (req, res, next) => {

    try {

    const kernel = await kernelBootstrap.boot();

    const info = kernel.info();

    return res.json({

        product: "AstraMind OS",

        version: info.osVersion,

        kernelVersion: info.kernelVersion,

        manifestVersion: info.manifestVersion,

        api: "Workflow",

        compatibility: "Legacy + Mission",

        architecture: {

            missionPlanner: false,
            workflowPlanner: false,
            kernel: true,
            capabilityResolver: true,
            executionStrategyResolver: true

        }

    });

    } catch (error) {

        next(error);

    }

});

router.get("/missions", async (req, res, next) => {
    try {
        const kernel = await kernelBootstrap.boot();
        const limit = Number.parseInt(req.query.limit, 10) || 50;
        const missions=kernel.listMissions({ limit:100, status:req.query.status }).filter((mission)=>!req.user?.id||mission.metadata?.userId===req.user.id).slice(0,limit);
        return res.json({ ok: true, missions });
    } catch (error) {
        next(error);
    }
});

router.get("/missions/:missionId", async (req, res, next) => {
    try {
        const kernel = await kernelBootstrap.boot();
        const mission = kernel.getMission(req.params.missionId);
        if (!mission || (req.user?.id && mission.metadata?.userId!==req.user.id)) return res.status(404).json({ ok: false, code: "MISSION_NOT_FOUND", error: "Mission not found." });
        return res.json({ ok: true, mission });
    } catch (error) {
        next(error);
    }
});

router.post("/missions/:missionId/cancel", async (req, res, next) => {
    try {
        const kernel = await kernelBootstrap.boot();
        const mission = kernel.getMission(req.params.missionId);
        if (!mission || (req.user?.id && mission.metadata?.userId!==req.user.id)) return res.status(404).json({ ok: false, code: "MISSION_NOT_FOUND", error: "Mission not found." });
        if (!kernel.cancelMission(req.params.missionId)) {
            return res.status(409).json({ ok: false, code: "MISSION_NOT_ACTIVE", error: `Mission is already ${mission.status}.` });
        }
        return res.status(202).json({ ok: true, missionId: req.params.missionId, status: "cancelling" });
    } catch (error) {
        next(error);
    }
});

router.get("/providers", async (req, res, next) => {
    try {
        const kernel = await kernelBootstrap.boot();
        return res.json({ ok: true, providers: kernel.listProviders() });
    } catch (error) {
        next(error);
    }
});

export default router;
