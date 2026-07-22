import { loadMemory } from "./memoryStore.js";

/**
 * 🧠 MEMORY ENGINE CONFIG
 */
const MAX_CONTEXT_ITEMS = 12;
const MAX_CHAR_LENGTH = 4000;

/**
 * 🧠 Score memory relevance
 */
function scoreMemory(entry, query) {
  if (!entry || !entry.content) return 0;

  const content = entry.content.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  // Keyword match
  if (content.includes(q)) score += 5;

  // Partial word matches
  const words = q.split(" ");
  words.forEach((w) => {
    if (content.includes(w)) score += 1;
  });

  // Recency boost
  const age = Date.now() - (entry.timestamp || 0);
  const hours = age / (1000 * 60 * 60);

  if (hours < 1) score += 3;
  else if (hours < 24) score += 2;
  else if (hours < 72) score += 1;

  return score;
}

/**
 * 🧠 Rank memory
 */
function rankMemories(memories, query) {
  return memories
    .map((entry) => ({
      ...entry,
      score: scoreMemory(entry, query),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * 🧠 Compress memory into context
 */
function compressMemory(memories) {
  let combined = "";

  for (let m of memories) {
    const chunk = `• ${m.content}\n`;

    if ((combined + chunk).length > MAX_CHAR_LENGTH) break;

    combined += chunk;
  }

  return combined.trim();
}

/**
 * 🧠 Extract high-value context
 */
export function buildMemoryContext(query) {
  const memory = loadMemory();

  if (!Array.isArray(memory) || memory.length === 0) {
    return null;
  }

  const ranked = rankMemories(memory, query);

  const top = ranked.slice(0, MAX_CONTEXT_ITEMS);

  const compressed = compressMemory(top);

  if (!compressed) return null;

  return {
    context: compressed,
    usedEntries: top.length,
  };
}

/**
 * 🧠 Store structured memory safely
 */
export function storeMemory(entry) {
  if (!entry || !entry.content) return;

  const memory = loadMemory();

  memory.push({
    id: entry.id || `${Date.now()}`,
    type: entry.type || "general",
    content: String(entry.content),
    tags: entry.tags || [],
    timestamp: Date.now(),
  });

  // Limit memory size
  const trimmed = memory.slice(-500);

  localStorage.setItem(
    "astramind_memory",
    JSON.stringify(trimmed)
  );
}

/**
 * 🧠 Intelligent recall
 */
export function recallRelevantMemory(query) {
  const memory = loadMemory();

  if (!Array.isArray(memory) || memory.length === 0) {
    return null;
  }

  const q = query.toLowerCase();

  const filtered = memory
    .filter((m) => m?.content)
    .map((m) => ({
      ...m,
      score: m.content.toLowerCase().includes(q) ? 5 : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (filtered.length === 0) return null;

  return filtered.map((m) => `• ${m.content}`).join("\n");
}

// ============================
// 🔁 LEGACY COMPATIBILITY (DO NOT REMOVE)
// ============================

export function addMemory(entry) {
  if (!entry || !entry.content) return;

  storeMemory({
    content: entry.content,
    type: entry.type || "general",
    tags: entry.tags || [],
  });
}

export function recallMemory() {
  const memory = loadMemory();

  if (!Array.isArray(memory)) return [];

  return memory;
}