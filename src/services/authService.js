import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  createUser,
  sanitizeUser,
} from "./userService.js";

const DEVELOPMENT_SECRET = "astramind_dev_secret_change_me";
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required when NODE_ENV=production.");
  }
  return DEVELOPMENT_SECRET;
}
const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = "7d";

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
    plan: "free",
  });

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

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

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: sanitizeUser(user),
  };
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
