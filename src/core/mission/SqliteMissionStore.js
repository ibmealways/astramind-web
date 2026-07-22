export default class SqliteMissionStore {
  constructor({ db, limit = 5000 } = {}) {
    if (!db) throw new Error("SqliteMissionStore requires a database connection.");
    this.db = db;
    this.limit = limit;
    this.db.prepare(`CREATE TABLE IF NOT EXISTS kernel_missions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      name TEXT NOT NULL,
      capability TEXT,
      record_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`).run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_kernel_missions_status ON kernel_missions(status)").run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_kernel_missions_updated ON kernel_missions(updated_at DESC)").run();
    this.recoverInterrupted();
  }

  create(mission) {
    this.write(mission);
    this.trim();
    return this.get(mission.id);
  }

  update(id, changes) {
    const current = this.get(id);
    if (!current) return null;
    const mission = { ...current, ...structuredClone(changes), updatedAt: new Date().toISOString() };
    this.write(mission);
    return mission;
  }

  write(mission) {
    this.db.prepare(`INSERT INTO kernel_missions (id, status, name, capability, record_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, name=excluded.name,
      capability=excluded.capability, record_json=excluded.record_json, updated_at=excluded.updated_at`
    ).run(mission.id, mission.status, mission.name, mission.capability || null, JSON.stringify(mission), mission.createdAt, mission.updatedAt);
  }

  get(id) {
    const row = this.db.prepare("SELECT record_json FROM kernel_missions WHERE id = ?").get(id);
    return row ? JSON.parse(row.record_json) : null;
  }

  list({ limit = 50, status } = {}) {
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const rows = status
      ? this.db.prepare("SELECT record_json FROM kernel_missions WHERE status = ? ORDER BY updated_at DESC LIMIT ?").all(status, size)
      : this.db.prepare("SELECT record_json FROM kernel_missions ORDER BY updated_at DESC LIMIT ?").all(size);
    return rows.map(({ record_json }) => JSON.parse(record_json));
  }

  count() { return this.db.prepare("SELECT COUNT(*) AS count FROM kernel_missions").get().count; }

  recoverInterrupted() {
    const interrupted = this.list({ limit: 100, status: "running" });
    for (const mission of interrupted) this.update(mission.id, {
      status: "failed", completedAt: new Date().toISOString(),
      error: { code: "MISSION_INTERRUPTED", message: "Mission was interrupted by a system restart." },
    });
    return interrupted.length;
  }

  trim() {
    this.db.prepare(`DELETE FROM kernel_missions WHERE id IN (
      SELECT id FROM kernel_missions ORDER BY updated_at DESC LIMIT -1 OFFSET ?
    )`).run(this.limit);
  }
}
