// src/core/video/renderProgressStore.js

const progressMap = new Map();

function nowIso() {
  return new Date().toISOString();
}

export function createRenderProgress(projectId, initial = {}) {
  const progress = {
    projectId,
    status: "queued",
    percent: 0,
    stage: "Queued",
    message: "Render queued.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    logs: [],
    ...initial,
  };

  progressMap.set(projectId, progress);
  return progress;
}

export function updateRenderProgress(projectId, patch = {}) {
  const existing =
    progressMap.get(projectId) ||
    createRenderProgress(projectId, {
      status: "active",
      percent: 1,
      stage: "Starting",
    });

  const next = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
    logs: [
      ...(existing.logs || []),
      ...(patch.message
        ? [
            {
              at: nowIso(),
              stage: patch.stage || existing.stage,
              message: patch.message,
              percent:
                typeof patch.percent === "number"
                  ? patch.percent
                  : existing.percent,
            },
          ]
        : []),
    ].slice(-80),
  };

  progressMap.set(projectId, next);
  return next;
}

export function completeRenderProgress(projectId, patch = {}) {
  return updateRenderProgress(projectId, {
    status: "complete",
    percent: 100,
    stage: "Complete",
    message: "Render complete.",
    ...patch,
  });
}

export function failRenderProgress(projectId, error) {
  return updateRenderProgress(projectId, {
    status: "failed",
    stage: "Failed",
    message: error?.message || String(error || "Render failed."),
    error: error?.message || String(error || "Render failed."),
  });
}

export function getRenderProgress(projectId) {
  return (
    progressMap.get(projectId) || {
      projectId,
      status: "missing",
      percent: 0,
      stage: "Not Found",
      message: "No render progress found for this project.",
      logs: [],
    }
  );
}

export function listRecentRenderProgress(limit = 20) {
  return Array.from(progressMap.values())
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}

export default {
  createRenderProgress,
  updateRenderProgress,
  completeRenderProgress,
  failRenderProgress,
  getRenderProgress,
  listRecentRenderProgress,
};