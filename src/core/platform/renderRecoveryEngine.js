// src/core/platform/renderRecoveryEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const RECOVERY_DIR = path.resolve("server-renders/astramind-recovery");
const RECOVERY_FILE = path.join(RECOVERY_DIR, "render-recovery.json");

export const RENDER_STAGES = {
  STARTED: "started",
  STORYBOARD: "storyboard",
  DIRECTOR_PLAN: "director_plan",
  VISUALS: "visuals",
  TIMELINE: "timeline",
  MOTION_DIRECTION: "motion_direction",
  LAYERED_SCENES: "layered_scenes",
  CAPTIONS: "captions",
  MOTION_INTERPOLATION: "motion_interpolation",
  AI_VIDEO_CLIPS: "ai_video_clips",
  SILENT_VIDEO: "silent_video",
  VOICEOVER: "voiceover",
  SOUNDTRACK: "soundtrack",
  AUDIO_MIX: "audio_mix",
  SUBTITLES: "subtitles",
  AVATAR: "avatar",
  WATERMARK: "watermark",
  SOCIAL_EXPORT: "social_export",
  PROJECT_MEMORY: "project_memory",
  COMPLETED: "completed",
  FAILED: "failed",
};

export const RECOVERY_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RECOVERABLE: "recoverable",
  ABANDONED: "abandoned",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function makeEventId() {
  return crypto.randomBytes(8).toString("hex");
}

function readJson(filePath, fallback) {
  try {
    ensureDir(path.dirname(filePath));

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadDb() {
  return readJson(RECOVERY_FILE, {
    version: 1,
    engine: "AstraMind Render Recovery Engine",
    renders: {},
    events: [],
    updatedAt: now(),
  });
}

function saveDb(db) {
  db.updatedAt = now();
  writeJson(RECOVERY_FILE, db);
}

function fileExists(filePath = "") {
  return Boolean(filePath && fs.existsSync(filePath));
}

function compactAsset(asset) {
  if (!asset || typeof asset !== "object") return asset;

  return {
    id: asset.id || asset.sceneId || asset.clipId || null,
    sceneId: asset.sceneId || asset.id || null,
    path: asset.path || asset.filePath || asset.outputPath || asset.videoPath || null,
    publicUrl: asset.publicUrl || null,
    type: asset.type || null,
    provider: asset.provider || null,
    status: asset.status || null,
  };
}

function trimLargePayload(value) {
  try {
    const text = JSON.stringify(value);
    if (text.length < 50000) return value;

    return {
      trimmed: true,
      reason: "payload_too_large_for_recovery_log",
      preview: text.slice(0, 5000),
    };
  } catch {
    return {
      trimmed: true,
      reason: "payload_not_serializable",
    };
  }
}

export function startRenderRecovery({
  projectId,
  topic = "",
  platform = "",
  provider = "",
  renderOptions = {},
  metadata = {},
} = {}) {
  if (!projectId) {
    throw new Error("projectId is required for render recovery.");
  }

  const db = loadDb();

  db.renders[projectId] = {
    projectId,
    topic,
    platform,
    provider,
    status: RECOVERY_STATUS.ACTIVE,
    currentStage: RENDER_STAGES.STARTED,
    stages: {},
    checkpoints: {},
    renderOptions: trimLargePayload(renderOptions),
    metadata,
    createdAt: db.renders[projectId]?.createdAt || now(),
    updatedAt: now(),
    completedAt: null,
    failedAt: null,
    error: null,
  };

  db.events.unshift({
    eventId: makeEventId(),
    projectId,
    type: "recovery.started",
    stage: RENDER_STAGES.STARTED,
    message: "Render recovery tracking started.",
    createdAt: now(),
  });

  saveDb(db);

  return {
    ok: true,
    recovery: db.renders[projectId],
  };
}

export function saveRenderCheckpoint({
  projectId,
  stage,
  data = {},
  files = [],
  status = "completed",
  message = "",
} = {}) {
  if (!projectId) {
    throw new Error("projectId is required for recovery checkpoint.");
  }

  if (!stage) {
    throw new Error("stage is required for recovery checkpoint.");
  }

  const db = loadDb();

  if (!db.renders[projectId]) {
    db.renders[projectId] = {
      projectId,
      status: RECOVERY_STATUS.ACTIVE,
      currentStage: stage,
      stages: {},
      checkpoints: {},
      createdAt: now(),
      updatedAt: now(),
    };
  }

  const normalizedFiles = Array.isArray(files)
    ? files.map(compactAsset)
    : [];

  const checkpoint = {
    projectId,
    stage,
    status,
    message,
    data: trimLargePayload(data),
    files: normalizedFiles,
    createdAt: db.renders[projectId].checkpoints?.[stage]?.createdAt || now(),
    updatedAt: now(),
  };

  db.renders[projectId].currentStage = stage;
  db.renders[projectId].stages[stage] = {
    status,
    updatedAt: now(),
    fileCount: normalizedFiles.length,
  };
  db.renders[projectId].checkpoints[stage] = checkpoint;
  db.renders[projectId].updatedAt = now();

  db.events.unshift({
    eventId: makeEventId(),
    projectId,
    type: "recovery.checkpoint",
    stage,
    message: message || `Checkpoint saved for ${stage}.`,
    createdAt: now(),
  });

  db.events = db.events.slice(0, 5000);

  saveDb(db);

  return {
    ok: true,
    checkpoint,
    recovery: db.renders[projectId],
  };
}

export function getRenderRecovery(projectId) {
  const db = loadDb();
  const recovery = db.renders[projectId];

  if (!recovery) {
    return {
      ok: false,
      reason: "recovery_not_found",
      projectId,
    };
  }

  return {
    ok: true,
    recovery,
  };
}

export function getCheckpoint(projectId, stage) {
  const recovery = getRenderRecovery(projectId);

  if (!recovery.ok) return recovery;

  const checkpoint = recovery.recovery.checkpoints?.[stage];

  if (!checkpoint) {
    return {
      ok: false,
      reason: "checkpoint_not_found",
      projectId,
      stage,
    };
  }

  return {
    ok: true,
    checkpoint,
  };
}

export function hasUsableCheckpoint(projectId, stage) {
  const result = getCheckpoint(projectId, stage);

  if (!result.ok) {
    return {
      ok: false,
      usable: false,
      reason: result.reason,
      projectId,
      stage,
    };
  }

  const files = result.checkpoint.files || [];

  const missingFiles = files
    .filter((file) => file?.path)
    .filter((file) => !fileExists(file.path));

  if (missingFiles.length) {
    return {
      ok: false,
      usable: false,
      reason: "checkpoint_files_missing",
      projectId,
      stage,
      missingFiles,
    };
  }

  return {
    ok: true,
    usable: true,
    checkpoint: result.checkpoint,
  };
}

export function markRenderCompleted({
  projectId,
  finalVideoPath = "",
  publicUrl = "",
  metadata = {},
} = {}) {
  const db = loadDb();

  if (!db.renders[projectId]) {
    db.renders[projectId] = {
      projectId,
      stages: {},
      checkpoints: {},
      createdAt: now(),
    };
  }

  db.renders[projectId].status = RECOVERY_STATUS.COMPLETED;
  db.renders[projectId].currentStage = RENDER_STAGES.COMPLETED;
  db.renders[projectId].completedAt = now();
  db.renders[projectId].updatedAt = now();
  db.renders[projectId].finalVideoPath = finalVideoPath;
  db.renders[projectId].publicUrl = publicUrl;
  db.renders[projectId].metadata = {
    ...(db.renders[projectId].metadata || {}),
    ...metadata,
  };

  db.renders[projectId].stages[RENDER_STAGES.COMPLETED] = {
    status: "completed",
    updatedAt: now(),
  };

  db.events.unshift({
    eventId: makeEventId(),
    projectId,
    type: "recovery.completed",
    stage: RENDER_STAGES.COMPLETED,
    message: "Render completed successfully.",
    metadata: {
      finalVideoPath,
      publicUrl,
    },
    createdAt: now(),
  });

  saveDb(db);

  return {
    ok: true,
    recovery: db.renders[projectId],
  };
}

export function markRenderFailed({
  projectId,
  stage = "",
  error,
  recoverable = true,
  metadata = {},
} = {}) {
  const db = loadDb();

  if (!db.renders[projectId]) {
    db.renders[projectId] = {
      projectId,
      stages: {},
      checkpoints: {},
      createdAt: now(),
    };
  }

  const message = error?.message || String(error || "Unknown render failure");

  db.renders[projectId].status = recoverable
    ? RECOVERY_STATUS.RECOVERABLE
    : RECOVERY_STATUS.FAILED;

  db.renders[projectId].currentStage = stage || db.renders[projectId].currentStage;
  db.renders[projectId].failedAt = now();
  db.renders[projectId].updatedAt = now();
  db.renders[projectId].error = {
    message,
    stack: error?.stack || null,
    stage,
    recoverable,
    metadata,
  };

  if (stage) {
    db.renders[projectId].stages[stage] = {
      status: "failed",
      updatedAt: now(),
    };
  }

  db.events.unshift({
    eventId: makeEventId(),
    projectId,
    type: "recovery.failed",
    stage,
    message,
    metadata: {
      recoverable,
      ...metadata,
    },
    createdAt: now(),
  });

  saveDb(db);

  return {
    ok: true,
    recovery: db.renders[projectId],
  };
}

export function getLastCompletedStage(projectId) {
  const recovery = getRenderRecovery(projectId);

  if (!recovery.ok) return recovery;

  const stages = recovery.recovery.stages || {};
  const completed = Object.entries(stages)
    .filter(([, value]) => value.status === "completed")
    .map(([stage, value]) => ({
      stage,
      updatedAt: value.updatedAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return {
    ok: true,
    projectId,
    lastCompletedStage: completed[0] || null,
    completedStages: completed,
  };
}

export function listRecoverableRenders({ limit = 50 } = {}) {
  const db = loadDb();

  const renders = Object.values(db.renders || {})
    .filter((render) => render.status === RECOVERY_STATUS.RECOVERABLE)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, Number(limit) || 50);

  return {
    ok: true,
    count: renders.length,
    renders,
  };
}

export function listRecoveryEvents({ projectId = null, limit = 100 } = {}) {
  const db = loadDb();

  let events = db.events || [];

  if (projectId) {
    events = events.filter((event) => event.projectId === projectId);
  }

  return {
    ok: true,
    count: events.slice(0, Number(limit) || 100).length,
    events: events.slice(0, Number(limit) || 100),
  };
}

export function abandonRecovery(projectId, reason = "manual_abandon") {
  const db = loadDb();

  if (!db.renders[projectId]) {
    return {
      ok: false,
      reason: "recovery_not_found",
      projectId,
    };
  }

  db.renders[projectId].status = RECOVERY_STATUS.ABANDONED;
  db.renders[projectId].updatedAt = now();
  db.renders[projectId].abandonedAt = now();
  db.renders[projectId].abandonedReason = reason;

  db.events.unshift({
    eventId: makeEventId(),
    projectId,
    type: "recovery.abandoned",
    message: reason,
    createdAt: now(),
  });

  saveDb(db);

  return {
    ok: true,
    recovery: db.renders[projectId],
  };
}

export function getRenderRecoveryHealth() {
  const db = loadDb();
  const renders = Object.values(db.renders || {});

  const byStatus = renders.reduce((acc, render) => {
    acc[render.status] = (acc[render.status] || 0) + 1;
    return acc;
  }, {});

  return {
    ok: true,
    engine: "AstraMind Render Recovery Engine v1",
    recoveryDir: RECOVERY_DIR,
    recoveryFile: RECOVERY_FILE,
    totalRenders: renders.length,
    byStatus,
    totalEvents: db.events.length,
    supports: {
      stageCheckpoints: true,
      crashRecovery: true,
      recoverableRenderListing: true,
      fileExistenceValidation: true,
      lastCompletedStageLookup: true,
      recoveryEvents: true,
      abandonRecovery: true,
    },
  };
}

export default {
  RENDER_STAGES,
  RECOVERY_STATUS,
  startRenderRecovery,
  saveRenderCheckpoint,
  getRenderRecovery,
  getCheckpoint,
  hasUsableCheckpoint,
  markRenderCompleted,
  markRenderFailed,
  getLastCompletedStage,
  listRecoverableRenders,
  listRecoveryEvents,
  abandonRecovery,
  getRenderRecoveryHealth,
};