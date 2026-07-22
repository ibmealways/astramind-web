import crypto from "crypto";
import db from "../server/db/sqlite.js";

function nowIso() {
  return new Date().toISOString();
}

function createUserId() {
  return `user_${crypto.randomBytes(8).toString("hex")}`;
}

export function findUserByEmail(email) {
  return db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(String(email || "").trim().toLowerCase());
}

export function findUserById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

export function createUser({ name, email, passwordHash, plan = "free" }) {
  const id = createUserId();
  const createdAt = nowIso();
  const updatedAt = createdAt;

  db.prepare(`
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      plan,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id,
    String(name || "").trim(),
    String(email || "").trim().toLowerCase(),
    passwordHash,
    plan,
    createdAt,
    updatedAt
  );

  return findUserById(id);
}

export function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}
