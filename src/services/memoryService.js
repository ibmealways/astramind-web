import db from "../server/db/sqlite.js";

// ============================
// 🧠 STORE MEMORY
// ============================
export function storeMemory({ userId = "global", content, type = "general", tags = [] }) {
  if (!content) return;

  const id = Date.now().toString();

  db.prepare(`
    INSERT INTO memory (id, user_id, type, content, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    type,
    content,
    JSON.stringify(tags),
    new Date().toISOString()
  );
}

// ============================
// 🧠 RECALL MEMORY
// ============================
export function recallMemory(query = "", userId = "global") {
  if (!query) return [];

  const rows = db.prepare(`
    SELECT * FROM memory
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId);

  const q = query.toLowerCase();

  return rows
    .map(r => ({
      ...r,
      score: r.content.toLowerCase().includes(q) ? 5 : 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ============================
// 🧠 BUILD CONTEXT
// ============================
export function buildMemoryContext(memories = []) {
  if (!memories.length) return null;

  return memories
    .map(m => `• ${m.content}`)
    .join("\n");
}