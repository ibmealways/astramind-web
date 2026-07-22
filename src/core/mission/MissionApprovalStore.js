import { randomUUID } from "node:crypto";

export default class MissionApprovalStore {
  constructor({ db, expiryMinutes = 30 } = {}) {
    if (!db) throw new Error("MissionApprovalStore requires a database connection.");
    this.db = db;
    this.expiryMinutes = Math.min(Math.max(Number(expiryMinutes) || 30, 1), 1440);
    this.db.prepare(`CREATE TABLE IF NOT EXISTS mission_approvals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT NOT NULL,
      request_json TEXT NOT NULL, planning_json TEXT NOT NULL,
      decision_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL
    )`).run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_mission_approvals_user ON mission_approvals(user_id, created_at DESC)").run();
    this.expirePending();
  }

  create({ userId, request, planning }) {
    if (!userId) throw new Error("Approval requests require a user identity.");
    const createdAt = new Date().toISOString();
    const record = { id: randomUUID(), userId, status: "pending", request, planning, createdAt, updatedAt: createdAt, expiresAt: new Date(Date.now() + this.expiryMinutes * 60000).toISOString() };
    this.db.prepare(`INSERT INTO mission_approvals (id, user_id, status, request_json, planning_json, created_at, updated_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(record.id, userId, record.status, JSON.stringify(request), JSON.stringify(planning), createdAt, createdAt, record.expiresAt);
    return record;
  }

  get(id, userId) {
    this.expirePending();
    const row = this.db.prepare("SELECT * FROM mission_approvals WHERE id = ? AND user_id = ?").get(id, userId);
    return row ? this.map(row) : null;
  }

  decide({ id, userId, status, reason = null }) {
    if (!['approved', 'rejected'].includes(status)) throw new Error("Invalid approval decision.");
    const current = this.get(id, userId);
    if (!current || current.status !== "pending") return null;
    const updatedAt = new Date().toISOString();
    this.db.prepare("UPDATE mission_approvals SET status = ?, decision_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(status, JSON.stringify({ reason, decidedAt: updatedAt }), updatedAt, id, userId);
    return this.get(id, userId);
  }

  expirePending(now = new Date().toISOString()) {
    return this.db.prepare("UPDATE mission_approvals SET status = 'expired', updated_at = ? WHERE status = 'pending' AND expires_at < ?").run(now, now).changes;
  }

  map(row) {
    return { id: row.id, userId: row.user_id, status: row.status, request: JSON.parse(row.request_json), planning: JSON.parse(row.planning_json), decision: row.decision_json ? JSON.parse(row.decision_json) : null, createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at };
  }
}
