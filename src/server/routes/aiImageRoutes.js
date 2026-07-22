// src/server/routes/aiImageRoutes.js
import express from "express";
import { generateSceneVisuals } from "../../core/content/aiVisualEngine.js";
import requireAuth from "../middleware/requireAuth.js";
import { subscriptionStore } from "../../services/subscriptionService.js";

const router = express.Router();

router.post("/scene-visuals", requireAuth, async (req, res) => {
  let reservation = null;
  try {
    const {
      topic = "AstraMind Video",
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

    const subscription = subscriptionStore.ensure(req.user.id);
    if (!subscription.plan.entitlements.images) return res.status(403).json({ ok:false, code:"PLAN_UPGRADE_REQUIRED", error:"Image generation requires a Creator, Pro, or Elite plan." });
    reservation = subscriptionStore.reserve({ userId:req.user.id, operation:"image.generate", amount:scenes.length * 5, referenceId:projectId, metadata:{ scenes:scenes.length, platform } });

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
      creditUsage: { reservationId:reservation.id, charged:reservation.amount, balance:reservation.balance },
    });
  } catch (error) {
    console.error("🔥 AI IMAGE ROUTE ERROR:", error);

    if (reservation) subscriptionStore.settle(reservation.id, { success:false, metadata:{ error:error.message } });
    return res.status(error.code === "INSUFFICIENT_CREDITS" ? 402 : 500).json({
      ok: false,
      code: error.code || "IMAGE_GENERATION_FAILED",
      error: error.message || "AI visual generation failed.",
    });
  } finally {
    if (reservation) subscriptionStore.settle(reservation.id, { success:true });
  }
});

export default router;
