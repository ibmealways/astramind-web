import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  createUser,
  sanitizeUser,
} from "./userService.js";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "aigenikz_local_development_only");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required when NODE_ENV=production.");
}
const JWT_EXPIRES_IN = "7d";

function createSessionToken(user) {
  const safeUser = sanitizeUser(user);

  return jwt.sign(
    {
      sub: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      plan: safeUser.plan,
      status: safeUser.status,
      createdAt: safeUser.createdAt,
      updatedAt: safeUser.updatedAt,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function registerUser({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanName) {
    throw new Error("Name is required.");
  }

  if (!cleanEmail) {
    throw new Error("Email is required.");
  }

  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const existing = findUserByEmail(cleanEmail);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10);

  const user = createUser({
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    plan: "starter",
  });

  const token = createSessionToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanEmail || !cleanPassword) {
    throw new Error("Email and password are required.");
  }

  const user = findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await bcrypt.compare(cleanPassword, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  const token = createSessionToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
