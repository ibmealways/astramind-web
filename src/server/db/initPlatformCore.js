import { getPlatformDb } from "./platformDb.js";

export async function initPlatformCoreTables() {
  const db = await getPlatformDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS platform_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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

  const projectColumns = db.prepare("PRAGMA table_info(platform_projects)").all();
  if (!projectColumns.some((column) => column.name === "user_id")) {
    db.exec("ALTER TABLE platform_projects ADD COLUMN user_id TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_episodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      episode_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      synopsis TEXT DEFAULT '',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES platform_projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS creator_scenes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      episode_id TEXT,
      scene_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      duration_seconds REAL NOT NULL DEFAULT 5,
      script TEXT DEFAULT '',
      visual_prompt TEXT DEFAULT '',
      production_method TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES platform_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (episode_id) REFERENCES creator_episodes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS creator_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      scene_id TEXT,
      asset_type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      source TEXT DEFAULT 'user',
      mime_type TEXT DEFAULT '',
      storage_uri TEXT DEFAULT '',
      local_path TEXT DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      parent_asset_id TEXT,
      reusable INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES platform_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES creator_scenes(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_asset_id) REFERENCES creator_assets(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creator_episodes_owner ON creator_episodes(user_id, project_id, episode_number);
    CREATE INDEX IF NOT EXISTS idx_creator_scenes_owner ON creator_scenes(user_id, project_id, episode_id, scene_number);
    CREATE INDEX IF NOT EXISTS idx_creator_assets_owner ON creator_assets(user_id, project_id, asset_type, updated_at DESC);
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
