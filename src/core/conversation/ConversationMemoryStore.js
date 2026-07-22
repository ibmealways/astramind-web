import { randomUUID } from "node:crypto";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
  "i", "in", "is", "it", "my", "of", "on", "or", "that", "the", "this",
  "to", "was", "what", "when", "where", "with", "you", "your",
]);

function tokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .match(/[a-z0-9]{2,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) || []
  );
}

function relevance(queryTokens, content) {
  const contentTokens = tokens(content);
  if (!queryTokens.size || !contentTokens.size) return 0;
  let overlap = 0;
  for (const token of queryTokens) if (contentTokens.has(token)) overlap++;
  return overlap / Math.sqrt(queryTokens.size * contentTokens.size);
}

export function filterSensitiveMemory(value) {
  let content = String(value || "");
  const detected = [];
  const rules = [
    ["api_key", /\b(?:sk|pk)_[a-z0-9_-]{12,}\b/gi],
    ["bearer_token", /\bBearer\s+[a-z0-9._~-]{12,}\b/gi],
    ["ssn", /\b\d{3}-\d{2}-\d{4}\b/g],
    ["credit_card", /\b(?:\d[ -]*?){13,19}\b/g],
    ["password", /\b(password|passcode|pin)\s*[:=]\s*\S+/gi],
  ];
  for (const [type, pattern] of rules) {
    if (pattern.test(content)) detected.push(type);
    pattern.lastIndex = 0;
    content = content.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  }
  return { content, detected };
}

export default class ConversationMemoryStore {
  constructor({ db, limit = 5000, retentionDays = 90 } = {}) {
    if (!db) throw new Error("ConversationMemoryStore requires a database connection.");
    this.db = db;
    this.limit = limit;
    this.retentionDays = Math.min(Math.max(Number(retentionDays) || 90, 1), 3650);
    this.db.prepare(`CREATE TABLE IF NOT EXISTS conversation_memories (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`).run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_conversation_memory_user ON conversation_memories(user_id, created_at DESC)").run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_conversation_memory_conversation ON conversation_memories(conversation_id, created_at DESC)").run();
    this.purgeExpired();
  }

  remember({ conversationId = "default", userId = "global", role, content, metadata = {} }) {
    const filtered = filterSensitiveMemory(content);
    const clean = filtered.content.trim();
    if (!clean || !["user", "assistant"].includes(role)) return null;
    const memory = {
      id: randomUUID(), conversationId, userId, role,
      content: clean.slice(0, 8000), metadata: { ...metadata, sensitiveDataRedacted: filtered.detected },
      createdAt: new Date().toISOString(),
    };
    this.db.prepare(`INSERT INTO conversation_memories
      (id, conversation_id, user_id, role, content, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(memory.id, memory.conversationId, memory.userId, memory.role, memory.content, JSON.stringify(memory.metadata), memory.createdAt);
    this.trim();
    return memory;
  }

  rememberExchange({ conversationId, userId, message, reply, metadata = {} }) {
    return [
      this.remember({ conversationId, userId, role: "user", content: message, metadata }),
      this.remember({ conversationId, userId, role: "assistant", content: reply, metadata }),
    ].filter(Boolean);
  }

  recall({ query, conversationId, userId = "global", limit = 6 } = {}) {
    const queryTokens = tokens(query);
    if (!queryTokens.size) return [];
    const rows = this.db.prepare(`SELECT id, conversation_id, user_id, role, content, metadata_json, created_at
      FROM conversation_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`).all(userId);
    return rows
      .map((row, index) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        metadata: JSON.parse(row.metadata_json || "{}"),
        createdAt: row.created_at,
        score: relevance(queryTokens, row.content) + (row.conversation_id === conversationId ? 0.15 : 0) + Math.max(0, 0.05 - index * 0.00025),
      }))
      .filter(({ score }) => score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(Number(limit) || 6, 1), 12));
  }

  count() {
    return this.db.prepare("SELECT COUNT(*) AS count FROM conversation_memories").get().count;
  }

  list({ userId, conversationId, limit = 50 } = {}) {
    if (!userId) return [];
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const rows = conversationId
      ? this.db.prepare(`SELECT * FROM conversation_memories WHERE user_id = ? AND conversation_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, conversationId, size)
      : this.db.prepare(`SELECT * FROM conversation_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, size);
    return rows.map((row) => ({ id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content, metadata: JSON.parse(row.metadata_json || "{}"), createdAt: row.created_at }));
  }

  delete({ id, userId } = {}) {
    if (!id || !userId) return false;
    return this.db.prepare("DELETE FROM conversation_memories WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
  }

  clear({ userId, conversationId } = {}) {
    if (!userId) return 0;
    const result = conversationId
      ? this.db.prepare("DELETE FROM conversation_memories WHERE user_id = ? AND conversation_id = ?").run(userId, conversationId)
      : this.db.prepare("DELETE FROM conversation_memories WHERE user_id = ?").run(userId);
    return result.changes;
  }

  purgeExpired(now = Date.now()) {
    const cutoff = new Date(now - this.retentionDays * 86400000).toISOString();
    return this.db.prepare("DELETE FROM conversation_memories WHERE created_at < ?").run(cutoff).changes;
  }

  trim() {
    this.db.prepare(`DELETE FROM conversation_memories WHERE id IN (
      SELECT id FROM conversation_memories ORDER BY created_at DESC LIMIT -1 OFFSET ?
    )`).run(this.limit);
  }
}
