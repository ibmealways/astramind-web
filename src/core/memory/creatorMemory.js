const CREATOR_KEY = "astramind_creator_memory";

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadCreatorMemory() {
  if (!storageAvailable()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(CREATOR_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveCreatorMemory(profile) {
  if (!storageAvailable()) return profile || null;
  const current = loadCreatorMemory() || {};
  const next = { ...current, ...profile, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(CREATOR_KEY, JSON.stringify(next));
  return next;
}