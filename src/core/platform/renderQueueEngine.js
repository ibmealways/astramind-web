// src/core/platform/renderQueueEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve("server-data");
const QUEUE_DIR = path.join(DATA_DIR, "render-queue");
const JOBS_FILE = path.join(QUEUE_DIR, "render-jobs.json");

export const JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  RETRYING: "retrying",
};

export const JOB_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "render_job") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function readJson(filePath, fallback) {
  try {
    ensureDir(path.dirname(filePath));

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function loadQueueDb() {
  return readJson(JOBS_FILE, {
    engine: "AstraMind Render Queue Engine",
    version: 1,
    jobs: {},
    updatedAt: nowIso(),
  });
}

function saveQueueDb(db) {
  writeJson(JOBS_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function sanitizePayload(payload = {}) {
  return {
    topic: payload.topic || payload.prompt || "AstraMind render",
    platform: payload.platform || "TikTok",
    style: payload.style || "cinematic futuristic high-energy",
    durationTarget: payload.durationTarget || 30,
    voiceover: payload.voiceover !== false,
    soundtrack: payload.soundtrack !== false,
    subtitles: payload.subtitles !== false,
    aiVideoProvider: payload.aiVideoProvider || payload.provider || "fallback-motion",
    quality: payload.quality || "balanced",
    motionEffect: payload.motionEffect || "cinematic",
    useTransitions: payload.useTransitions !== false,
    transitionStyle: payload.transitionStyle || "cinematic",
    createSocialPackage: payload.createSocialPackage !== false,
    userTier: payload.userTier || "CREATOR",
    metadata: payload.metadata || {},
  };
}

export function enqueueRenderJob({
  payload = {},
  developerId = "local",
  apiKeyId = null,
  plan = "FREE",
  priority = JOB_PRIORITY.NORMAL,
  maxAttempts = 2,
  webhookUrl = "",
  metadata = {},
} = {}) {
  const db = loadQueueDb();
  const jobId = makeId();

  const job = {
    jobId,
    type: "video.render",
    status: JOB_STATUS.QUEUED,
    priority: Number(priority || JOB_PRIORITY.NORMAL),
    developerId,
    apiKeyId,
    plan,
    payload: sanitizePayload(payload),
    webhookUrl,
    metadata,
    attempts: 0,
    maxAttempts: Number(maxAttempts || 2),
    progress: {
      percent: 0,
      stage: "Queued",
      message: "Render job is waiting for an available worker.",
    },
    result: null,
    error: null,
    timestamps: {
      createdAt: nowIso(),
      queuedAt: nowIso(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      updatedAt: nowIso(),
    },
    logs: [
      {
        at: nowIso(),
        level: "info",
        message: "Render job queued.",
      },
    ],
  };

  db.jobs[jobId] = job;
  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function getRenderJob(jobId) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) {
    return {
      ok: false,
      reason: "job_not_found",
      jobId,
    };
  }

  return {
    ok: true,
    job,
  };
}

export function listRenderJobs({
  status = null,
  developerId = null,
  limit = 100,
} = {}) {
  const db = loadQueueDb();

  let jobs = Object.values(db.jobs || {});

  if (status) {
    jobs = jobs.filter((job) => job.status === status);
  }

  if (developerId) {
    jobs = jobs.filter((job) => job.developerId === developerId);
  }

  jobs = jobs
    .sort((a, b) => {
      if (a.status === JOB_STATUS.QUEUED && b.status !== JOB_STATUS.QUEUED) return -1;
      if (a.status !== JOB_STATUS.QUEUED && b.status === JOB_STATUS.QUEUED) return 1;

      if (Number(b.priority) !== Number(a.priority)) {
        return Number(b.priority) - Number(a.priority);
      }

      return (
        new Date(a.timestamps.createdAt).getTime() -
        new Date(b.timestamps.createdAt).getTime()
      );
    })
    .slice(0, Number(limit || 100));

  return {
    ok: true,
    count: jobs.length,
    jobs,
  };
}

export function getNextQueuedJob() {
  const result = listRenderJobs({
    status: JOB_STATUS.QUEUED,
    limit: 1,
  });

  if (!result.jobs.length) {
    return {
      ok: false,
      reason: "no_queued_jobs",
    };
  }

  return {
    ok: true,
    job: result.jobs[0],
  };
}

export function updateRenderJob(jobId, updates = {}) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) {
    return {
      ok: false,
      reason: "job_not_found",
      jobId,
    };
  }

  db.jobs[jobId] = {
    ...job,
    ...updates,
    timestamps: {
      ...job.timestamps,
      ...(updates.timestamps || {}),
      updatedAt: nowIso(),
    },
  };

  saveQueueDb(db);

  return {
    ok: true,
    job: db.jobs[jobId],
  };
}

export function addRenderJobLog(jobId, message, level = "info", extra = {}) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) {
    return {
      ok: false,
      reason: "job_not_found",
      jobId,
    };
  }

  job.logs = [
    {
      at: nowIso(),
      level,
      message,
      ...extra,
    },
    ...(job.logs || []),
  ].slice(0, 100);

  job.timestamps.updatedAt = nowIso();

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function markJobRunning(jobId) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) return { ok: false, reason: "job_not_found", jobId };

  job.status = JOB_STATUS.RUNNING;
  job.attempts = Number(job.attempts || 0) + 1;
  job.progress = {
    percent: 5,
    stage: "Worker Started",
    message: "AstraMind worker has started rendering this job.",
  };
  job.timestamps.startedAt = job.timestamps.startedAt || nowIso();
  job.timestamps.updatedAt = nowIso();
  job.logs = [
    {
      at: nowIso(),
      level: "info",
      message: `Job started. Attempt ${job.attempts}/${job.maxAttempts}.`,
    },
    ...(job.logs || []),
  ];

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function markJobProgress(jobId, progress = {}) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) return { ok: false, reason: "job_not_found", jobId };

  job.progress = {
    ...job.progress,
    ...progress,
    percent: Math.max(0, Math.min(Number(progress.percent ?? job.progress.percent ?? 0), 100)),
  };

  job.timestamps.updatedAt = nowIso();

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function markJobCompleted(jobId, result = {}) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) return { ok: false, reason: "job_not_found", jobId };

  job.status = JOB_STATUS.COMPLETED;
  job.progress = {
    percent: 100,
    stage: "Completed",
    message: "Render job completed successfully.",
  };
  job.result = result;
  job.error = null;
  job.timestamps.completedAt = nowIso();
  job.timestamps.updatedAt = nowIso();
  job.logs = [
    {
      at: nowIso(),
      level: "success",
      message: "Render job completed.",
      videoUrl: result.videoUrl || result.downloadUrl || null,
    },
    ...(job.logs || []),
  ];

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function markJobFailed(jobId, error) {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) return { ok: false, reason: "job_not_found", jobId };

  const message = error?.message || String(error || "Unknown render error");
  const canRetry = Number(job.attempts || 0) < Number(job.maxAttempts || 1);

  job.status = canRetry ? JOB_STATUS.RETRYING : JOB_STATUS.FAILED;
  job.error = {
    message,
    stack: error?.stack || null,
    failedAt: nowIso(),
  };
  job.progress = {
    percent: job.progress?.percent || 0,
    stage: canRetry ? "Retrying" : "Failed",
    message: canRetry
      ? "Render failed, but the job will be retried."
      : "Render failed after all retry attempts.",
  };
  job.timestamps.failedAt = nowIso();
  job.timestamps.updatedAt = nowIso();
  job.logs = [
    {
      at: nowIso(),
      level: "error",
      message,
      retrying: canRetry,
    },
    ...(job.logs || []),
  ];

  if (canRetry) {
    job.status = JOB_STATUS.QUEUED;
    job.progress.stage = "Re-queued";
    job.progress.message = "Render job re-queued for another attempt.";
  }

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function cancelRenderJob(jobId, reason = "cancelled_by_user") {
  const db = loadQueueDb();
  const job = db.jobs[jobId];

  if (!job) return { ok: false, reason: "job_not_found", jobId };

  if ([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED].includes(job.status)) {
    return {
      ok: false,
      reason: "job_already_final",
      job,
    };
  }

  job.status = JOB_STATUS.CANCELLED;
  job.error = { message: reason, cancelledAt: nowIso() };
  job.progress = {
    percent: job.progress?.percent || 0,
    stage: "Cancelled",
    message: reason,
  };
  job.timestamps.updatedAt = nowIso();
  job.logs = [
    {
      at: nowIso(),
      level: "warn",
      message: `Job cancelled: ${reason}`,
    },
    ...(job.logs || []),
  ];

  saveQueueDb(db);

  return {
    ok: true,
    job,
  };
}

export function getQueueStats() {
  const db = loadQueueDb();
  const jobs = Object.values(db.jobs || {});

  const stats = {
    total: jobs.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    retrying: 0,
  };

  jobs.forEach((job) => {
    if (stats[job.status] !== undefined) stats[job.status] += 1;
  });

  return {
    ok: true,
    stats,
    updatedAt: db.updatedAt,
  };
}

export default {
  JOB_STATUS,
  JOB_PRIORITY,
  enqueueRenderJob,
  getRenderJob,
  listRenderJobs,
  getNextQueuedJob,
  updateRenderJob,
  addRenderJobLog,
  markJobRunning,
  markJobProgress,
  markJobCompleted,
  markJobFailed,
  cancelRenderJob,
  getQueueStats,
};