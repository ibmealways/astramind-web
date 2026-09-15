// src/server/routes/aiImageRoutes.js
import express from "express";
import { generateSceneVisuals } from "../../core/content/aiVisualEngine.js";

const router = express.Router();

router.post("/scene-visuals", async (req, res) => {
  try {
    const {
      topic = "Aigenikz Video",
      platform = "TikTok",
      style = "cinematic futuristic high-energy",
      scenes = [],
      projectId = `visual_${Date.now()}`,
    } = req.body || {};

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Missing scenes array.",
      });
    }

    const visuals = await generateSceneVisuals({
      scenes,
      topic,
      platform,
      style,
      projectId,
    });

    return res.json({
      ok: true,
      topic,
      platform,
      style,
      projectId,
      visuals,
    });
  } catch (error) {
    console.error("🔥 AI IMAGE ROUTE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "AI visual generation failed.",
    });
  }
});

export default router;