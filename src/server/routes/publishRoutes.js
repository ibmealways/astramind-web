import express from "express";
import { publishContent } from "../../core/content/publisherEngine.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { videoUrl, caption, platforms } = req.body;

    const result = await publishContent({
      videoUrl,
      caption,
      platforms,
    });

    res.json({ success: true, result });

  } catch (err) {
    console.error("🔥 Publish Error:", err);
    res.status(500).json({ error: "Publish failed" });
  }
});

export default router;