// src/server/routes/aiImageRoutes.js
import express from "express";
import { generateSceneVisuals } from "../../core/content/aiVisualEngine.js";
import { generateLocalImage } from "../../core/content/localImageGeneration.js";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (prompt.length < 3 || prompt.length > 3000) {
      return res.status(400).json({ ok: false, error: "Prompt must contain 3-3000 characters." });
    }
    const aspect = ["portrait", "landscape", "square"].includes(req.body?.aspect)
      ? req.body.aspect
      : "landscape";
    const referenceImage = req.body?.referenceImage || null;
    if (referenceImage && (!/^data:image\/(png|jpeg);base64,/i.test(referenceImage) || referenceImage.length > 11 * 1024 * 1024)) {
      return res.status(400).json({ ok: false, error: "Reference image must be a PNG or JPEG under 8 MB." });
    }
    const requestedStrength = Number(req.body?.referenceStrength);
    const referenceStrength = Number.isFinite(requestedStrength)
      ? Math.max(0.35, Math.min(requestedStrength, 0.9))
      : 0.45;
    const result = await generateLocalImage({
      prompt,
      style: req.body?.style,
      aspect,
      seed: Number.isInteger(req.body?.seed) ? req.body.seed : -1,
      referenceImage,
      referenceStrength,
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Local AI image generation error:", error);
    return res.status(502).json({ ok: false, error: error.message || "Local image generation failed." });
  }
});

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
