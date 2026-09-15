// src/core/platform/rateLimiter.js
import fs from "fs";
import path from "path";

import { DEFAULT_API_PLAN, getPlanLimits, normalizeApiPlan } from "./developerPlans.js";

const DATA_DIR = path.resolve("server-data");
const RATE_DIR = path.join(DATA_DIR, "rate-limits");
const RATE_FILE = path.join(RATE_DIR, "rate-limit-windows.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath, fallback) {
  try {
    ensureDir(path.dirname(filePath));
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function loadDb() {
  return readJson(RATE_FILE, {
    engine: "Aigenikz Platform Rate Limiter",
    version: 1,
    windows: {},
    updatedAt: nowIso(),
  });
}

function saveDb(db) {
  writeJson(RATE_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function clean(value = "") {
  return String(value || "").trim();
}

function getMinuteKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function getDayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function getClientIp(req) {
  return (
    req?.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req?.socket?.remoteAddress ||
    "unknown"
  );
}

function getRateIdentity(req, fallback = "anonymous") {
  return (
    req?.astramindDeveloperId ||
    req?.headers?.["x-astramind-api-key"] ||
    req?.headers?.["x-api-key"] ||
    getClientIp(req) ||
    fallback
  );
}

function makeWindowKey({ identity, type, key, route = "global" }) {
  return `${clean(identity)}:${clean(route)}:${type}:${key}`;
}

function pruneOldWindows(db, keepDays = 3) {
  const cutoff = Date.now() - Number(keepDays || 3) * 24 * 60 * 60 * 1000;

  for (const [key, record] of Object.entries(db.windows || {})) {
    const updated = new Date(record.updatedAt || record.createdAt || 0).getTime();
    if (updated && updated < cutoff) {
      delete db.windows[key];
    }
  }
}

export function checkPlatformRateLimit({
  identity = "anonymous",
  plan = DEFAULT_API_PLAN,
  route = "global",
  now = new Date(),
  increment = false,
  customMinuteLimit = null,
  customDayLimit = null,
} = {}) {
  const normalizedPlan = normalizeApiPlan(plan);
  const limits = getPlanLimits(normalizedPlan);

  const minuteLimit =
    customMinuteLimit ?? limits.maxRequestsPerMinute ?? 30;
  const dayLimit = customDayLimit ?? limits.maxRequestsPerDay ?? 1000;

  const db = loadDb();
  pruneOldWindows(db);

  const minuteKey = makeWindowKey({
    identity,
    type: "minute",
    key: getMinuteKey(now),
    route,
  });

  const dayKey = makeWindowKey({
    identity,
    type: "day",
    key: getDayKey(now),
    route,
  });

  db.windows[minuteKey] = db.windows[minuteKey] || {
    identity,
    route,
    type: "minute",
    count: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.windows[dayKey] = db.windows[dayKey] || {
    identity,
    route,
    type: "day",
    count: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const minuteUsed = db.windows[minuteKey].count;
  const dayUsed = db.windows[dayKey].count;

  const minuteAllowed = minuteLimit === null || minuteUsed < minuteLimit;
  const dayAllowed = dayLimit === null || dayUsed < dayLimit;

  const allowed = minuteAllowed && dayAllowed;

  if (increment && allowed) {
    db.windows[minuteKey].count += 1;
    db.windows[minuteKey].updatedAt = nowIso();

    db.windows[dayKey].count += 1;
    db.windows[dayKey].updatedAt = nowIso();
  }

  saveDb(db);

  return {
    ok: allowed,
    identity,
    plan: normalizedPlan,
    route,
    minute: {
      limit: minuteLimit,
      used: increment && allowed ? minuteUsed + 1 : minuteUsed,
      remaining:
        minuteLimit === null
          ? null
          : Math.max(0, minuteLimit - (increment && allowed ? minuteUsed + 1 : minuteUsed)),
      allowed: minuteAllowed,
    },
    day: {
      limit: dayLimit,
      used: increment && allowed ? dayUsed + 1 : dayUsed,
      remaining:
        dayLimit === null
          ? null
          : Math.max(0, dayLimit - (increment && allowed ? dayUsed + 1 : dayUsed)),
      allowed: dayAllowed,
    },
  };
}

export function platformRateLimitMiddleware({
  route = "global",
  planResolver = null,
  identityResolver = null,
  customMinuteLimit = null,
  customDayLimit = null,
} = {}) {
  return function astraMindRateLimiter(req, res, next) {
    const identity = identityResolver ? identityResolver(req) : getRateIdentity(req);
    const plan = planResolver
      ? planResolver(req)
      : req.astramindPlan || req.astramindDeveloper?.plan || DEFAULT_API_PLAN;

    const result = checkPlatformRateLimit({
      identity,
      plan,
      route,
      increment: true,
      customMinuteLimit,
      customDayLimit,
    });

    res.setHeader("X-AstraMind-RateLimit-Minute-Limit", result.minute.limit ?? "unlimited");
    res.setHeader("X-AstraMind-RateLimit-Minute-Remaining", result.minute.remaining ?? "unlimited");
    res.setHeader("X-AstraMind-RateLimit-Day-Limit", result.day.limit ?? "unlimited");
    res.setHeader("X-AstraMind-RateLimit-Day-Remaining", result.day.remaining ?? "unlimited");

    if (!result.ok) {
      return res.status(429).json({
        ok: false,
        error: "Rate limit exceeded",
        reason: "rate_limit_exceeded",
        rateLimit: result,
      });
    }

    req.astramindRateLimit = result;
    return next();
  };
}

export function getRateLimitStats({ identity = null, route = null } = {}) {
  const db = loadDb();

  let records = Object.entries(db.windows || {}).map(([key, value]) => ({
    key,
    ...value,
  }));

  if (identity) records = records.filter((record) => record.identity === identity);
  if (route) records = records.filter((record) => record.route === route);

  return {
    ok: true,
    count: records.length,
    records,
    updatedAt: db.updatedAt,
  };
}

export function clearRateLimitWindows({ identity = null, route = null } = {}) {
  const db = loadDb();
  let cleared = 0;

  for (const [key, record] of Object.entries(db.windows || {})) {
    if (identity && record.identity !== identity) continue;
    if (route && record.route !== route) continue;

    delete db.windows[key];
    cleared += 1;
  }

  saveDb(db);

  return {
    ok: true,
    cleared,
  };
}

export default {
  checkPlatformRateLimit,
  platformRateLimitMiddleware,
  getRateLimitStats,
  clearRateLimitWindows,
};