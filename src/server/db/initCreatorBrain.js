import db from "./sqlite.js";

export function initCreatorBrainTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT DEFAULT '',
      primary_identity TEXT DEFAULT '',
      mission TEXT DEFAULT '',
      writing_tone TEXT DEFAULT '',
      preferred_platforms TEXT DEFAULT '[]',
      businesses TEXT DEFAULT '[]',
      active_goals TEXT DEFAULT '[]',
      preferences TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS creator_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      display_name TEXT DEFAULT '',
      primary_identity TEXT DEFAULT '',
      mission TEXT DEFAULT '',
      writing_tone TEXT DEFAULT '',
      preferred_platforms TEXT DEFAULT '[]',
      businesses TEXT DEFAULT '[]',
      active_goals TEXT DEFAULT '[]',
      preferences TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS creator_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      summary TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS creator_memory_entries (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT DEFAULT '',
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      linked_project_id TEXT DEFAULT '',
      importance INTEGER DEFAULT 3,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const table of ["creator_projects", "creator_memory_entries"]) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'`).run();
    } catch {}
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_creator_projects_user ON creator_projects(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_creator_memory_user ON creator_memory_entries(user_id, updated_at DESC);
  `);

  const existing = db
    .prepare("SELECT id FROM creator_profile WHERE id = 1")
    .get();

  if (!existing) {
    db.prepare(`
      INSERT INTO creator_profile (
        id,
        display_name,
        primary_identity,
        mission,
        writing_tone,
        preferred_platforms,
        businesses,
        active_goals,
        preferences,
        updated_at
      ) VALUES (
        1,
        '',
        '',
        '',
        '',
        '[]',
        '[]',
        '[]',
        '{}',
        CURRENT_TIMESTAMP
      )
    `).run();
  }
}
