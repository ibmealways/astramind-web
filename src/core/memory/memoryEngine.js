const MEMORY_KEY = "astramind_memory";

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readEntries() {
  if (!storageAvailable()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(MEMORY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function recallMemory() {
  return readEntries();
}

export function addMemory(entry) {
  if (!storageAvailable() || entry == null) return readEntries();
  const normalized =
    typeof entry === "string"
      ? { content: entry, createdAt: new Date().toISOString() }
      : { ...entry, createdAt: entry.createdAt || new Date().toISOString() };
  const entries = [...readEntries(), normalized].slice(-200);
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(entries));
  return entries;
}

export function recallRelevantMemory(query = "", limit = 5) {
  const terms = String(query).toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  const entries = readEntries();
  const ranked = entries
    .map((entry, index) => {
      const content = typeof entry === "string" ? entry : entry.content || JSON.stringify(entry);
      const lower = content.toLowerCase();
      const score = terms.reduce((total, term) => total + (lower.includes(term) ? 1 : 0), 0);
      return { content, score, index };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, limit)
    .map(({ content }) => content);
  return ranked.length ? ranked.join("\n") : null;
}