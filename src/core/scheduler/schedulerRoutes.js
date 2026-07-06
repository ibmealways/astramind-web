import express from "express";
import { addJob, getJobs } from "./jobStore.js";

const router = express.Router();

router.post("/schedule", (req, res) => {
  const { videoUrl, caption, platforms, runAt } = req.body;

  const job = {
    id: "job_" + Date.now(),
    status: runAt ? "scheduled" : "queued",
    runAt: runAt || null,
    payload: {
      videoUrl,
      caption,
      platforms,
    },
    createdAt: new Date().toISOString(),
  };

  addJob(job);

  res.json({ success: true, job });
});

router.get("/jobs", (req, res) => {
  res.json(getJobs());
});

export default router;