import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  buildPrelaunchReadiness,
  buildPromotionalVideoPreflight,
} from "../../services/prelaunchReadinessService.js";

const router = express.Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    return res.json(await buildPrelaunchReadiness());
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Readiness audit failed." });
  }
});

router.get("/promotional-video", requireAuth, async (req, res) => {
  try {
    return res.json(await buildPromotionalVideoPreflight({
      userId: req.user.id,
      durationTarget: req.query.durationTarget,
      voiceover: req.query.voiceover !== "false",
    }));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Video preflight failed." });
  }
});

export default router;
