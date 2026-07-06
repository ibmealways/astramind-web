import express from "express";
import { runContentPipeline } from "../modules/content/contentEngine.js";

const router = express.Router();

router.post("/run", async (req, res) => {
  const { idea } = req.body;

  const result = await runContentPipeline({ idea });

  res.json(result);
});

export default router;