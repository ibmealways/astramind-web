import { randomUUID } from "node:crypto";

export default class ResearchArtifactStore {
  constructor({ db } = {}) {
    if (!db) throw new Error("ResearchArtifactStore requires a database connection.");
    this.db = db;
    this.db.prepare(`CREATE TABLE IF NOT EXISTS research_artifacts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
      mission_id TEXT, query TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL,
      citations_json TEXT NOT NULL, provenance_json TEXT NOT NULL, created_at TEXT NOT NULL
    )`).run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_research_artifacts_user ON research_artifacts(user_id, created_at DESC)").run();
  }

  create({ userId, conversationId = "default", missionId, query, brief, citations = [], provenance = {} }) {
    const artifact = { id: randomUUID(), userId, conversationId, missionId, query, title: `Research: ${String(query).slice(0, 90)}`, brief, citations, provenance, createdAt: new Date().toISOString() };
    this.db.prepare(`INSERT INTO research_artifacts (id, user_id, conversation_id, mission_id, query, title, brief, citations_json, provenance_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(artifact.id, userId, conversationId, missionId || null, query, artifact.title, brief, JSON.stringify(citations), JSON.stringify(provenance), artifact.createdAt);
    return artifact;
  }

  list({ userId, limit = 30 } = {}) {
    if (!userId) return [];
    return this.db.prepare("SELECT * FROM research_artifacts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(userId, Math.min(Math.max(Number(limit) || 30, 1), 100)).map((row) => this.map(row));
  }

  get(id, userId) { const row = this.db.prepare("SELECT * FROM research_artifacts WHERE id = ? AND user_id = ?").get(id, userId); return row ? this.map(row) : null; }
  delete(id, userId) { return this.db.prepare("DELETE FROM research_artifacts WHERE id = ? AND user_id = ?").run(id, userId).changes > 0; }
  map(row) { return { id: row.id, userId: row.user_id, conversationId: row.conversation_id, missionId: row.mission_id, query: row.query, title: row.title, brief: row.brief, citations: JSON.parse(row.citations_json), provenance: JSON.parse(row.provenance_json), createdAt: row.created_at }; }
}
