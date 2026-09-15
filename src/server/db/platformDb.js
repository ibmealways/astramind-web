import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH =
  process.env.AIGENIKZ_PLATFORM_DB_PATH ||
  process.env.ASTRAMIND_DB_PATH ||
  path.join(DB_DIR, "astramind-platform.db");

let dbInstance = null;

export async function getPlatformDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const targetDir = path.dirname(DB_PATH);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);

  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
  dbInstance.pragma("synchronous = NORMAL");

  return dbInstance;
}
