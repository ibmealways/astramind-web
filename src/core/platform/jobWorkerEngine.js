// src/core/platform/jobWorkerEngine.js
import {
  JOB_STATUS,
  getNextQueuedJob,
  getRenderJob,
  listRenderJobs,
  markJobRunning,
  markJobProgress,
  markJobCompleted,
  markJobFailed,
  addRenderJobLog,
  getQueueStats,
} from "./renderQueueEngine.js";

import { renderCinematicVideo } from "../video/cinematicRenderEngine.js";

const DEFAULT_WORKER_CONFIG = {
  enabled: true,
  pollIntervalMs: 5000,
  maxConcurrentJobs: 1,
  idleLogEveryMs: 60000,
  stopOnFatalError: false,
};

let workerState = {
  running: false,
  startedAt: null,
  stoppedAt: null,
  activeJobs: new Map(),
  timer: null,
  lastIdleLogAt: 0,
  config: { ...DEFAULT_WORKER_CONFIG },
  stats: {
    loops: 0,
    jobsStarted: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    lastLoopAt: null,
    lastJobId: null,
    lastError: null,
  },
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeConfig(config = {}) {
  return {
    ...DEFAULT_WORKER_CONFIG,
    ...config,
    pollIntervalMs: Math.max(
      1000,
      Number(config.pollIntervalMs || DEFAULT_WORKER_CONFIG.pollIntervalMs)
    ),
    maxConcurrentJobs: Math.max(
      1,
      Number(config.maxConcurrentJobs || DEFAULT_WORKER_CONFIG.maxConcurrentJobs)
    ),
  };
}

function getPayload(job = {}) {
  return job.payload || {};
}

function buildRenderPayload(job = {}) {
  const payload = getPayload(job);

  return {
    topic: payload.topic || payload.prompt || "AstraMind queued render",
    platform: payload.platform || "TikTok",
    style: payload.style || "cinematic futuristic high-energy",
    durationTarget: payload.durationTarget || 30,

    voiceover: payload.voiceover !== false,
    voiceId: payload.voiceId,

    soundtrack: payload.soundtrack !== false,
    soundtrackMood: payload.soundtrackMood || "cinematic",

    subtitles: payload.subtitles !== false,
    avatarPresenter: Boolean(payload.avatarPresenter),
    avatarImagePath: payload.avatarImagePath || "",

    useTransitions: payload.useTransitions !== false,
    transitionStyle: payload.transitionStyle || "cinematic",

    preferGPU: Boolean(payload.preferGPU),
    quality: payload.quality || "balanced",
    motionEffect: payload.motionEffect || "cinematic",

    createSocialPackage: payload.createSocialPackage !== false,
    userTier: payload.userTier || "CREATOR",

    aiVideoProvider: payload.aiVideoProvider || payload.provider || "fallback-motion",
  };
}

function isFinalStatus(status) {
  return [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED].includes(
    status
  );
}

function canStartAnotherJob() {
  return workerState.activeJobs.size < workerState.config.maxConcurrentJobs;
}

async function runSingleJob(job) {
  const jobId = job.jobId;

  if (!jobId) return;

  workerState.activeJobs.set(jobId, {
    jobId,
    startedAt: nowIso(),
  });

  workerState.stats.jobsStarted += 1;
  workerState.stats.lastJobId = jobId;

  try {
    markJobRunning(jobId);

    addRenderJobLog(jobId, "Worker accepted job.", "info", {
      worker: "AstraMind Local Worker",
    });

    markJobProgress(jobId, {
      percent: 8,
      stage: "Preparing Render",
      message: "Worker is preparing the cinematic render payload.",
    });

    const fresh = getRenderJob(jobId);

    if (!fresh.ok) {
      throw new Error(`Job disappeared before render: ${jobId}`);
    }

    if (fresh.job.status === JOB_STATUS.CANCELLED) {
      addRenderJobLog(jobId, "Job was cancelled before execution.", "warn");
      return;
    }

    const renderPayload = buildRenderPayload(fresh.job);

    addRenderJobLog(jobId, "Cinematic renderer starting.", "info", {
      topic: renderPayload.topic,
      provider: renderPayload.aiVideoProvider,
      platform: renderPayload.platform,
    });

    markJobProgress(jobId, {
      percent: 12,
      stage: "Rendering",
      message: "AstraMind cinematic renderer is generating video.",
    });

    const result = await renderCinematicVideo(renderPayload);

    markJobProgress(jobId, {
      percent: 98,
      stage: "Finalizing",
      message: "Render completed; saving final job result.",
    });

    markJobCompleted(jobId, {
      ...result,
      worker: {
        engine: "AstraMind Job Worker Engine",
        completedAt: nowIso(),
      },
    });

    workerState.stats.jobsCompleted += 1;

    addRenderJobLog(jobId, "Worker completed job successfully.", "success", {
      videoUrl: result.videoUrl,
      projectId: result.projectId,
    });
  } catch (error) {
    workerState.stats.jobsFailed += 1;
    workerState.stats.lastError = {
      message: error.message,
      at: nowIso(),
      jobId,
    };

    markJobFailed(jobId, error);

    addRenderJobLog(jobId, "Worker failed job.", "error", {
      message: error.message,
      stack: error.stack,
    });

    if (workerState.config.stopOnFatalError) {
      await stopJobWorker("fatal_error");
    }
  } finally {
    workerState.activeJobs.delete(jobId);
  }
}

async function processQueueOnce() {
  workerState.stats.loops += 1;
  workerState.stats.lastLoopAt = nowIso();

  if (!workerState.running || !workerState.config.enabled) {
    return {
      ok: false,
      reason: "worker_not_running",
    };
  }

  const started = [];

  while (canStartAnotherJob()) {
    const next = getNextQueuedJob();

    if (!next.ok || !next.job) {
      const now = Date.now();

      if (now - workerState.lastIdleLogAt > workerState.config.idleLogEveryMs) {
        workerState.lastIdleLogAt = now;
        console.log("🟢 AstraMind Job Worker idle. No queued render jobs.");
      }

      break;
    }

    if (isFinalStatus(next.job.status)) break;

    started.push(next.job.jobId);

    runSingleJob(next.job).catch((error) => {
      console.error("🔥 Worker detached job error:", error);
    });

    await sleep(150);
  }

  return {
    ok: true,
    started,
    activeJobs: Array.from(workerState.activeJobs.keys()),
  };
}

function scheduleNextLoop() {
  if (!workerState.running) return;

  clearTimeout(workerState.timer);

  workerState.timer = setTimeout(async () => {
    try {
      await processQueueOnce();
    } catch (error) {
      workerState.stats.lastError = {
        message: error.message,
        at: nowIso(),
      };

      console.error("🔥 AstraMind Job Worker loop error:", error);
    } finally {
      scheduleNextLoop();
    }
  }, workerState.config.pollIntervalMs);
}

export function startJobWorker(config = {}) {
  if (workerState.running) {
    return {
      ok: true,
      alreadyRunning: true,
      state: getJobWorkerState(),
    };
  }

  workerState.config = normalizeConfig(config);
  workerState.running = true;
  workerState.startedAt = nowIso();
  workerState.stoppedAt = null;

  console.log("🚀 AstraMind Job Worker started:", workerState.config);

  processQueueOnce().catch((error) => {
    console.error("🔥 Initial worker queue process failed:", error);
  });

  scheduleNextLoop();

  return {
    ok: true,
    started: true,
    state: getJobWorkerState(),
  };
}

export async function stopJobWorker(reason = "manual_stop") {
  workerState.running = false;
  workerState.stoppedAt = nowIso();

  if (workerState.timer) {
    clearTimeout(workerState.timer);
    workerState.timer = null;
  }

  console.log("🛑 AstraMind Job Worker stopped:", reason);

  return {
    ok: true,
    stopped: true,
    reason,
    activeJobs: Array.from(workerState.activeJobs.keys()),
    state: getJobWorkerState(),
  };
}

export async function runWorkerOnce(config = {}) {
  const previousRunning = workerState.running;

  workerState.config = normalizeConfig({
    ...workerState.config,
    ...config,
  });

  workerState.running = true;

  const result = await processQueueOnce();

  if (!previousRunning) {
    workerState.running = false;
  }

  return {
    ok: true,
    result,
    state: getJobWorkerState(),
  };
}

export function getJobWorkerState() {
  return {
    running: workerState.running,
    startedAt: workerState.startedAt,
    stoppedAt: workerState.stoppedAt,
    activeJobs: Array.from(workerState.activeJobs.values()),
    config: workerState.config,
    stats: workerState.stats,
    queue: getQueueStats(),
  };
}

export function getActiveJobIds() {
  return Array.from(workerState.activeJobs.keys());
}

export function isJobWorkerRunning() {
  return workerState.running;
}

export function recoverStuckJobs({
  maxRunningMinutes = 60,
  markFailed = true,
} = {}) {
  const running = listRenderJobs({
    status: JOB_STATUS.RUNNING,
    limit: 500,
  });

  const now = Date.now();
  const recovered = [];

  for (const job of running.jobs || []) {
    const startedAt = job.timestamps?.startedAt
      ? new Date(job.timestamps.startedAt).getTime()
      : null;

    if (!startedAt) continue;

    const ageMinutes = (now - startedAt) / 1000 / 60;

    if (ageMinutes >= maxRunningMinutes) {
      if (markFailed) {
        markJobFailed(
          job.jobId,
          new Error(
            `Recovered stuck job after ${ageMinutes.toFixed(1)} minutes running.`
          )
        );
      }

      recovered.push({
        jobId: job.jobId,
        ageMinutes: Number(ageMinutes.toFixed(2)),
      });
    }
  }

  return {
    ok: true,
    recoveredCount: recovered.length,
    recovered,
  };
}

export default {
  startJobWorker,
  stopJobWorker,
  runWorkerOnce,
  getJobWorkerState,
  getActiveJobIds,
  isJobWorkerRunning,
  recoverStuckJobs,
};