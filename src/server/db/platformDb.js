import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH =
  process.env.ASTRAMIND_DB_PATH || path.join(DB_DIR, "astramind-platform.db");

let dbInstance = null;

export async function getPlatformDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await dbInstance.exec("PRAGMA journal_mode = WAL;");
  await dbInstance.exec("PRAGMA foreign_keys = ON;");
  await dbInstance.exec("PRAGMA synchronous = NORMAL;");

  return dbInstance;
}