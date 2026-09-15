import { getPlatformDb } from "./platformDb.js";

export async function initPlatformCoreTables() {
  const db = await getPlatformDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS platform_projects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      topic TEXT DEFAULT '',
      tone TEXT DEFAULT '',
      audience TEXT DEFAULT '',
      intensity TEXT DEFAULT 'medium',
      metadata_json TEXT DEFAULT '{}',
      book_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS book_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT DEFAULT '',
      purpose TEXT DEFAULT '',
      tone TEXT DEFAULT '',
      intensity TEXT DEFAULT 'medium',
      content TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, chapter_number),
      FOREIGN KEY (project_id) REFERENCES platform_projects(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      workflow_key TEXT NOT NULL,
      primary_agent TEXT NOT NULL,
      input_text TEXT DEFAULT '',
      result_text TEXT DEFAULT '',
      structured_output_json TEXT DEFAULT '{}',
      sources_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES platform_projects(id) ON DELETE SET NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS research_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'research',
      topic TEXT DEFAULT '',
      title TEXT DEFAULT '',
      url TEXT DEFAULT '',
      source_name TEXT DEFAULT '',
      snippet TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_platform_projects_type
    ON platform_projects(type);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_platform_projects_updated_at
    ON platform_projects(updated_at DESC);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_book_chapters_project_id
    ON book_chapters(project_id);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_project_id
    ON workflow_runs(project_id);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_key
    ON workflow_runs(workflow_key);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_research_sources_topic
    ON research_sources(topic);
  `);

  console.log("🗄️ Aigenikz platform core tables initialized.");
}