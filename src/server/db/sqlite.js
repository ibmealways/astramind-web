import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "../../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "astramind.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// =============================
// CORE TABLES
// =============================

// USERS
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`).run();

// 🧠 MEMORY TABLE (🔥 THIS FIXES YOUR ERROR)
db.prepare(`
  CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    content TEXT,
    tags TEXT,
    created_at TEXT
  )
`).run();

// =============================
// DATABASE MIGRATIONS (SAFE)
// =============================
try {
  db.prepare(`
    ALTER TABLE platform_projects ADD COLUMN user_id TEXT
  `).run();
} catch (err) {}

try {
  db.prepare(`
    ALTER TABLE workflow_runs ADD COLUMN user_id TEXT
  `).run();
} catch (err) {}

try {
  db.prepare(`
    ALTER TABLE research_sources ADD COLUMN user_id TEXT
  `).run();
} catch (err) {}

export default db;