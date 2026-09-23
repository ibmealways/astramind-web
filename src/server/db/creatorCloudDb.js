import pg from "pg";

const { Pool } = pg;
const connectionString = String(process.env.DATABASE_URL || process.env.AIGENIKZ_DATABASE_URL || "").trim();
export const usingCloudCreatorDb = Boolean(connectionString);

let pool;
let initialized;

export function getCreatorCloudPool() {
  if (!usingCloudCreatorDb) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.AIGENIKZ_DB_POOL_SIZE || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on("error", (error) => console.error("Creator cloud database pool error:", error));
  }
  return pool;
}

export async function ensureCreatorCloudSchema() {
  if (!usingCloudCreatorDb) return false;
  if (!initialized) initialized = getCreatorCloudPool().query(`
    CREATE TABLE IF NOT EXISTS creator_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'video-series',
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS creator_episodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      episode_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      synopsis TEXT NOT NULL DEFAULT '',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS creator_scenes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,
      episode_id TEXT REFERENCES creator_episodes(id) ON DELETE CASCADE,
      scene_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 5,
      script TEXT NOT NULL DEFAULT '',
      visual_prompt TEXT NOT NULL DEFAULT '',
      production_method TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS creator_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT REFERENCES creator_projects(id) ON DELETE CASCADE,
      scene_id TEXT REFERENCES creator_scenes(id) ON DELETE SET NULL,
      asset_type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      source TEXT NOT NULL DEFAULT 'user',
      mime_type TEXT NOT NULL DEFAULT '',
      storage_uri TEXT NOT NULL DEFAULT '',
      local_path TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      parent_asset_id TEXT REFERENCES creator_assets(id) ON DELETE SET NULL,
      reusable BOOLEAN NOT NULL DEFAULT TRUE,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_creator_projects_owner ON creator_projects(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_creator_episodes_owner ON creator_episodes(user_id, project_id, episode_number);
    CREATE INDEX IF NOT EXISTS idx_creator_scenes_owner ON creator_scenes(user_id, project_id, episode_id, scene_number);
    CREATE INDEX IF NOT EXISTS idx_creator_assets_owner ON creator_assets(user_id, project_id, asset_type, updated_at DESC);
  `).then(() => true).catch((error) => { initialized = null; throw error; });
  return initialized;
}

export async function creatorCloudQuery(text, values = []) {
  await ensureCreatorCloudSchema();
  return getCreatorCloudPool().query(text, values);
}

export async function closeCreatorCloudPool() {
  if (pool) await pool.end();
  pool = null;
  initialized = null;
}
