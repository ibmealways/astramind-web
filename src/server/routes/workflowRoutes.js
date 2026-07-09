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

// Future Kernel (enable when available)
// import AstraMindKernel from "../../core/kernel/AstraMindKernel.js";

const router = express.Router();

/**
 * ============================================================================
 * POST /api/workflows/run
 * ============================================================================
 */

router.post("/run", async (req, res) => {

    const started = Date.now();

    try {

        const {

            // Legacy API
            workflowType,
            input,

            // AstraMind OS
            mission,
            user = {},
            context = {},
            preferences = {},
            constraints = {},
            metadata = {}

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

        const missionInput =
            input ??
            {};

        /**
         * ----------------------------------------------------
         * Future Kernel Execution
         * ----------------------------------------------------
         */

        let result;

        /*
        result = await AstraMindKernel.executeMission({

            mission: requestedMission,

            input: missionInput,

            user,

            context,

            preferences,

            constraints,

            metadata

        });
        */

        /**
         * ----------------------------------------------------
         * Temporary Compatibility Layer
         * ----------------------------------------------------
         */

        result = await runWorkflow(

            requestedMission,

            missionInput

        );

        return res.status(200).json({

            ok: true,

            architecture: "AstraMind OS 3.0",

            compatibilityMode: true,

            executionId:

                crypto.randomUUID(),

            mission:

                requestedMission,

            durationMs:

                Date.now() - started,

            timestamp:

                new Date().toISOString(),

            result

        });

    }

    catch (error) {

        console.error(

            "[Workflow]",

            error

        );

        return res.status(500).json({

            ok: false,

            architecture:

                "AstraMind OS 3.0",

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

router.get("/health", (req, res) => {

    return res.json({

        ok: true,

        service: "Workflow API",

        version: "3.0.0-alpha.1",

        kernelIntegrated: false,

        compatibilityMode: true,

        timestamp:

            new Date().toISOString()

    });

});

/**
 * ============================================================================
 * GET /api/workflows/version
 * ============================================================================
 */

router.get("/version", (req, res) => {

    return res.json({

        product: "AstraMind OS",

        version: "3.0.0-alpha.1",

        api: "Workflow",

        compatibility: "Legacy + Mission",

        architecture: {

            missionPlanner: false,
            workflowPlanner: false,
            kernel: false,
            capabilityResolver: true,
            executionStrategyResolver: true

        }

    });

});

export default router;