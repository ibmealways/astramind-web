import crypto from "crypto";
import db from "../db/sqlite.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS full_video_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    request_json TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    result_json TEXT,
    error TEXT,
    reservation_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_full_video_jobs_user_updated
    ON full_video_jobs(user_id, updated_at DESC);
`);

const jobColumns = new Set(db.prepare("PRAGMA table_info(full_video_jobs)").all().map(({ name }) => name));
if (!jobColumns.has("native_task_id")) db.exec("ALTER TABLE full_video_jobs ADD COLUMN native_task_id TEXT");
if (!jobColumns.has("cancel_requested_at")) db.exec("ALTER TABLE full_video_jobs ADD COLUMN cancel_requested_at TEXT");

// A process exit cannot safely leave a job claiming it is still rendering.
db.prepare("UPDATE full_video_jobs SET status='interrupted', stage='resume-ready', updated_at=? WHERE status IN ('queued','running')")
  .run(new Date().toISOString());

const parse = (value, fallback = null) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

const serialize = (row) => row ? {
  id: row.id,
  projectId: row.id,
  userId: row.user_id,
  status: row.status,
  stage: row.stage,
  progress: row.progress,
  request: parse(row.request_json, {}),
  plan: parse(row.plan_json, {}),
  result: parse(row.result_json),
  error: row.error,
  reservationId: row.reservation_id,
  nativeTaskId: row.native_task_id || null,
  cancelRequestedAt: row.cancel_requested_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
} : null;

export function createFullVideoJob({ userId, request, plan, reservationId = null }) {
  const now = new Date().toISOString();
  const id = plan?.id || crypto.randomUUID();
  db.prepare(`INSERT INTO full_video_jobs
    (id,user_id,status,stage,progress,request_json,plan_json,reservation_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, userId, "queued", "mission-accepted", 1, JSON.stringify(request), JSON.stringify(plan), reservationId, now, now);
  return getFullVideoJob(id, userId);
}

export function updateFullVideoJob(id, patch = {}) {
  const current = db.prepare("SELECT * FROM full_video_jobs WHERE id=?").get(id);
  if (!current) return null;
  const next = {
    status: patch.status ?? current.status,
    stage: patch.stage ?? current.stage,
    progress: patch.progress ?? current.progress,
    result: patch.result === undefined ? current.result_json : JSON.stringify(patch.result),
    error: patch.error === undefined ? current.error : patch.error,
    completedAt: patch.completedAt === undefined ? current.completed_at : patch.completedAt,
    nativeTaskId: patch.nativeTaskId === undefined ? current.native_task_id : patch.nativeTaskId,
    cancelRequestedAt: patch.cancelRequestedAt === undefined ? current.cancel_requested_at : patch.cancelRequestedAt,
    updatedAt: new Date().toISOString(),
  };
  db.prepare(`UPDATE full_video_jobs SET status=?,stage=?,progress=?,result_json=?,error=?,completed_at=?,native_task_id=?,cancel_requested_at=?,updated_at=? WHERE id=?`)
    .run(next.status, next.stage, next.progress, next.result, next.error, next.completedAt, next.nativeTaskId, next.cancelRequestedAt, next.updatedAt, id);
  return serialize(db.prepare("SELECT * FROM full_video_jobs WHERE id=?").get(id));
}

export function getFullVideoJob(id, userId) {
  return serialize(db.prepare("SELECT * FROM full_video_jobs WHERE id=? AND user_id=?").get(id, userId));
}

export function listFullVideoJobs(userId, limit = 20) {
  return db.prepare("SELECT * FROM full_video_jobs WHERE user_id=? ORDER BY updated_at DESC LIMIT ?")
    .all(userId, Math.min(100, Math.max(1, Number(limit) || 20))).map(serialize);
}

export function markFullVideoJobRunning(id) {
  return updateFullVideoJob(id, { status: "running", stage: "continuity-render-graph", progress: 5, error: null });
}
