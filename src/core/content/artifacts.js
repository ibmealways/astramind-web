// src/core/content/artifacts.js

const STORAGE_KEY = "astramind_content_artifacts_v1";

export function createArtifact({
  type,              // "music" | "writing" | "video" | "design" | "code"
  subtype,           // "beat" | "hook" | "script" | etc
  title,
  description = "",
  content = "",
  metadata = {},
  source = "LOCAL_ENGINE",
  // versioning
  parentId = null,
  rootId = null,
  version = 1,
  tags = [],
}) {
  const id = `art_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const computedRootId = rootId || id;

  return {
    id,
    type,
    subtype,
    title,
    description,
    content,
    metadata,
    source,
    tags,
    parentId,
    rootId: computedRootId,
    version,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
}

export function loadArtifacts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArtifacts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addArtifact(artifact) {
  const list = loadArtifacts();
  const next = [artifact, ...list];
  saveArtifacts(next);
  return next;
}

export function clearArtifacts() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getArtifactById(id) {
  return loadArtifacts().find((a) => a.id === id) || null;
}

export function getLatestInChain(rootId) {
  const chain = loadArtifacts().filter((a) => a.rootId === rootId);
  if (!chain.length) return null;
  return chain.reduce((best, cur) => (cur.version > best.version ? cur : best), chain[0]);
}

export function getChain(rootId) {
  const chain = loadArtifacts()
    .filter((a) => a.rootId === rootId)
    .sort((a, b) => a.version - b.version);
  return chain;
}

export function bumpVersion(baseArtifact, patch = {}) {
  const nextVersion = (baseArtifact.version || 1) + 1;

  return createArtifact({
    type: baseArtifact.type,
    subtype: baseArtifact.subtype,
    title: patch.title ?? baseArtifact.title,
    description: patch.description ?? baseArtifact.description,
    content: patch.content ?? baseArtifact.content,
    metadata: { ...(baseArtifact.metadata || {}), ...(patch.metadata || {}) },
    source: patch.source ?? baseArtifact.source,
    tags: patch.tags ?? baseArtifact.tags ?? [],
    parentId: baseArtifact.id,
    rootId: baseArtifact.rootId || baseArtifact.id,
    version: nextVersion,
  });
}
