import express from "express";
import { runWorkflow } from "../../core/workflows/workflowEngine.js";

const router = express.Router();

router.post("/run", async (req, res) => {
  try {
    const { workflowType, input } = req.body;

    if (!workflowType) {
      return res.status(400).json({
        error: "workflowType required",
      });
    }

    const result = await runWorkflow(workflowType, input);

    return res.json({
      ok: true,
      result,
    });

  } catch (err) {
    console.error("🔥 Workflow error:", err);

    res.status(500).json({
      error: "Workflow failed",
    });
  }
});

export default router;