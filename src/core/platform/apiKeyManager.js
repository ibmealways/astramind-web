// src/core/platform/apiKeyManager.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  API_PLANS,
  DEFAULT_API_PLAN,
  getDeveloperPlan,
  normalizeApiPlan,
} from "./developerPlans.js";

const DATA_DIR = path.resolve("server-data");
const API_KEY_DIR = path.join(DATA_DIR, "api-keys");
const API_KEY_FILE = path.join(API_KEY_DIR, "developer-api-keys.json");

const KEY_PREFIX = {
  TEST: "ak_test",
  LIVE: "ak_live",
};

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

function clean(value = "") {
  return String(value || "").trim();
}

function makeId(prefix = "dev") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function timingSafeEqualHash(a, b) {
  const aa = Buffer.from(String(a || ""), "hex");
  const bb = Buffer.from(String(b || ""), "hex");

  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function generateSecretKey({ mode = "test" } = {}) {
  const normalizedMode = String(mode || "test").toLowerCase();
  const prefix = normalizedMode === "live" ? KEY_PREFIX.LIVE : KEY_PREFIX.TEST;
  const secret = crypto.randomBytes(32).toString("base64url");

  return `${prefix}_${secret}`;
}

function maskKey(apiKey = "") {
  const key = String(apiKey || "");

  if (key.length <= 16) return "********";
  return `${key.slice(0, 12)}...${key.slice(-6)}`;
}

function loadDb() {
  return readJson(API_KEY_FILE, {
    engine: "AstraMind Developer API Key Manager",
    version: 1,
    developers: {},
    keys: {},
    updatedAt: nowIso(),
  });
}

function saveDb(db) {
  writeJson(API_KEY_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function normalizeDeveloperId(developerId) {
  return clean(developerId) || makeId("dev");
}

function normalizeMode(mode = "test") {
  const m = String(mode || "test").toLowerCase();
  return m === "live" ? "live" : "test";
}

function createDeveloperRecord({
  developerId,
  email = "",
  name = "",
  company = "",
  plan = DEFAULT_API_PLAN,
  metadata = {},
} = {}) {
  const normalizedPlan = normalizeApiPlan(plan);

  return {
    developerId,
    email: clean(email).toLowerCase(),
    name: clean(name),
    company: clean(company),
    plan: normalizedPlan,
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metadata,
    settings: {
      allowOverage: false,
      webhookUrl: "",
      allowedOrigins: [],
      allowedIps: [],
      defaultMode: "test",
    },
    billing: {
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
  };
}

export function createDeveloper({
  developerId = "",
  email = "",
  name = "",
  company = "",
  plan = DEFAULT_API_PLAN,
  metadata = {},
} = {}) {
  const db = loadDb();
  const id = normalizeDeveloperId(developerId);

  if (db.developers[id]) {
    return {
      ok: true,
      created: false,
      developer: db.developers[id],
    };
  }

  db.developers[id] = createDeveloperRecord({
    developerId: id,
    email,
    name,
    company,
    plan,
    metadata,
  });

  saveDb(db);

  return {
    ok: true,
    created: true,
    developer: db.developers[id],
  };
}

export function updateDeveloper({
  developerId,
  email,
  name,
  company,
  plan,
  status,
  settings,
  billing,
  metadata,
} = {}) {
  const db = loadDb();
  const id = normalizeDeveloperId(developerId);

  if (!db.developers[id]) {
    throw new Error(`Developer not found: ${id}`);
  }

  const developer = db.developers[id];

  if (email !== undefined) developer.email = clean(email).toLowerCase();
  if (name !== undefined) developer.name = clean(name);
  if (company !== undefined) developer.company = clean(company);
  if (plan !== undefined) developer.plan = normalizeApiPlan(plan);
  if (status !== undefined) developer.status = clean(status) || developer.status;

  if (settings && typeof settings === "object") {
    developer.settings = {
      ...developer.settings,
      ...settings,
    };
  }

  if (billing && typeof billing === "object") {
    developer.billing = {
      ...developer.billing,
      ...billing,
    };
  }

  if (metadata && typeof metadata === "object") {
    developer.metadata = {
      ...developer.metadata,
      ...metadata,
    };
  }

  developer.updatedAt = nowIso();

  saveDb(db);

  return {
    ok: true,
    developer,
  };
}

export function createApiKey({
  developerId,
  mode = "test",
  label = "",
  plan = DEFAULT_API_PLAN,
  scopes = [],
  expiresAt = null,
  allowedOrigins = [],
  allowedIps = [],
  metadata = {},
} = {}) {
  const db = loadDb();
  const id = normalizeDeveloperId(developerId);
  const normalizedMode = normalizeMode(mode);

  if (!db.developers[id]) {
    db.developers[id] = createDeveloperRecord({
      developerId: id,
      plan,
      metadata: {
        autoCreatedBy: "createApiKey",
      },
    });
  }

  const apiKey = generateSecretKey({ mode: normalizedMode });
  const keyHash = sha256(apiKey);
  const keyId = makeId(normalizedMode === "live" ? "key_live" : "key_test");
  const maskedKey = maskKey(apiKey);

  const record = {
    keyId,
    developerId: id,
    mode: normalizedMode,
    label: clean(label) || `${normalizedMode.toUpperCase()} API Key`,
    keyHash,
    maskedKey,
    scopes: Array.isArray(scopes) ? scopes : [],
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    expiresAt,
    lastUsedAt: null,
    usageCount: 0,
    allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins : [],
    allowedIps: Array.isArray(allowedIps) ? allowedIps : [],
    metadata,
  };

  db.keys[keyId] = record;

  db.developers[id].updatedAt = nowIso();

  saveDb(db);

  return {
    ok: true,
    keyId,
    developerId: id,
    mode: normalizedMode,
    apiKey,
    maskedKey,
    record: {
      ...record,
      keyHash: undefined,
    },
  };
}

export function listApiKeys({ developerId = null, includeRevoked = false } = {}) {
  const db = loadDb();

  const keys = Object.values(db.keys || {})
    .filter((key) => {
      if (developerId && key.developerId !== developerId) return false;
      if (!includeRevoked && key.status === "revoked") return false;
      return true;
    })
    .map((key) => ({
      keyId: key.keyId,
      developerId: key.developerId,
      mode: key.mode,
      label: key.label,
      maskedKey: key.maskedKey,
      scopes: key.scopes,
      status: key.status,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      allowedOrigins: key.allowedOrigins,
      allowedIps: key.allowedIps,
      metadata: key.metadata,
    }));

  return {
    ok: true,
    count: keys.length,
    keys,
  };
}

export function listDevelopers() {
  const db = loadDb();

  const developers = Object.values(db.developers || {}).map((developer) => ({
    ...developer,
    planInfo: getDeveloperPlan(developer.plan),
  }));

  return {
    ok: true,
    count: developers.length,
    developers,
  };
}

export function getDeveloper({ developerId }) {
  const db = loadDb();
  const id = normalizeDeveloperId(developerId);
  const developer = db.developers[id];

  if (!developer) {
    return {
      ok: false,
      reason: "developer_not_found",
      developerId: id,
    };
  }

  return {
    ok: true,
    developer: {
      ...developer,
      planInfo: getDeveloperPlan(developer.plan),
    },
  };
}

export function revokeApiKey({ keyId, reason = "manual_revoke" } = {}) {
  const db = loadDb();

  if (!db.keys[keyId]) {
    return {
      ok: false,
      reason: "api_key_not_found",
      keyId,
    };
  }

  db.keys[keyId].status = "revoked";
  db.keys[keyId].revokedAt = nowIso();
  db.keys[keyId].revokedReason = reason;
  db.keys[keyId].updatedAt = nowIso();

  saveDb(db);

  return {
    ok: true,
    keyId,
    status: "revoked",
    reason,
  };
}

export function rotateApiKey({
  keyId,
  label = "",
  expiresAt = null,
  metadata = {},
} = {}) {
  const db = loadDb();
  const oldKey = db.keys[keyId];

  if (!oldKey) {
    return {
      ok: false,
      reason: "api_key_not_found",
      keyId,
    };
  }

  oldKey.status = "rotated";
  oldKey.rotatedAt = nowIso();
  oldKey.updatedAt = nowIso();

  saveDb(db);

  return createApiKey({
    developerId: oldKey.developerId,
    mode: oldKey.mode,
    label: label || `${oldKey.label} Rotated`,
    scopes: oldKey.scopes,
    expiresAt: expiresAt || oldKey.expiresAt,
    allowedOrigins: oldKey.allowedOrigins,
    allowedIps: oldKey.allowedIps,
    metadata: {
      ...oldKey.metadata,
      ...metadata,
      rotatedFrom: oldKey.keyId,
    },
  });
}

function isExpired(record) {
  if (!record?.expiresAt) return false;
  return new Date(record.expiresAt).getTime() < Date.now();
}

function originAllowed(record, origin = "") {
  const allowed = record.allowedOrigins || [];
  if (!allowed.length) return true;

  return allowed.includes(origin);
}

function ipAllowed(record, ip = "") {
  const allowed = record.allowedIps || [];
  if (!allowed.length) return true;

  return allowed.includes(ip);
}

function scopeAllowed(record, requiredScope = "") {
  if (!requiredScope) return true;
  const scopes = record.scopes || [];

  if (!scopes.length) return true;
  if (scopes.includes("*")) return true;

  return scopes.includes(requiredScope);
}

export function validateApiKey({
  apiKey,
  requiredScope = "",
  origin = "",
  ip = "",
  touch = true,
} = {}) {
  const db = loadDb();
  const supplied = clean(apiKey);

  if (!supplied) {
    return {
      ok: false,
      reason: "missing_api_key",
    };
  }

  const suppliedHash = sha256(supplied);

  const record = Object.values(db.keys || {}).find((key) =>
    timingSafeEqualHash(key.keyHash, suppliedHash)
  );

  if (!record) {
    return {
      ok: false,
      reason: "invalid_api_key",
    };
  }

  const developer = db.developers[record.developerId];

  if (!developer) {
    return {
      ok: false,
      reason: "developer_not_found",
      keyId: record.keyId,
    };
  }

  if (developer.status !== "active") {
    return {
      ok: false,
      reason: "developer_inactive",
      developerId: developer.developerId,
      status: developer.status,
    };
  }

  if (record.status !== "active") {
    return {
      ok: false,
      reason: "api_key_inactive",
      keyId: record.keyId,
      status: record.status,
    };
  }

  if (isExpired(record)) {
    return {
      ok: false,
      reason: "api_key_expired",
      keyId: record.keyId,
      expiresAt: record.expiresAt,
    };
  }

  if (!originAllowed(record, origin)) {
    return {
      ok: false,
      reason: "origin_not_allowed",
      keyId: record.keyId,
      origin,
    };
  }

  if (!ipAllowed(record, ip)) {
    return {
      ok: false,
      reason: "ip_not_allowed",
      keyId: record.keyId,
      ip,
    };
  }

  if (!scopeAllowed(record, requiredScope)) {
    return {
      ok: false,
      reason: "scope_not_allowed",
      keyId: record.keyId,
      requiredScope,
      scopes: record.scopes,
    };
  }

  if (touch) {
    record.lastUsedAt = nowIso();
    record.usageCount = Number(record.usageCount || 0) + 1;
    record.updatedAt = nowIso();
    developer.updatedAt = nowIso();
    saveDb(db);
  }

  return {
    ok: true,
    keyId: record.keyId,
    developerId: developer.developerId,
    mode: record.mode,
    plan: developer.plan,
    developer: {
      ...developer,
      planInfo: getDeveloperPlan(developer.plan),
    },
    apiKey: {
      keyId: record.keyId,
      mode: record.mode,
      label: record.label,
      maskedKey: record.maskedKey,
      scopes: record.scopes,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastUsedAt: record.lastUsedAt,
      usageCount: record.usageCount,
    },
  };
}

export function extractApiKeyFromRequest(req) {
  const authHeader = req?.headers?.authorization || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch) return bearerMatch[1];

  return (
    req?.headers?.["x-astramind-api-key"] ||
    req?.headers?.["x-api-key"] ||
    req?.query?.api_key ||
    req?.body?.apiKey ||
    ""
  );
}

export function requireApiKey(requiredScope = "") {
  return function astraMindApiKeyMiddleware(req, res, next) {
    const apiKey = extractApiKeyFromRequest(req);

    const result = validateApiKey({
      apiKey,
      requiredScope,
      origin: req.headers.origin || "",
      ip:
        req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
        req.socket?.remoteAddress ||
        "",
    });

    if (!result.ok) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
        reason: result.reason,
      });
    }

    req.astramindDeveloper = result.developer;
    req.astramindApiKey = result.apiKey;
    req.astramindPlan = result.plan;
    req.astramindDeveloperId = result.developerId;

    return next();
  };
}

export function createDefaultOwnerKey() {
  const ownerId = "owner_zimplyhoodz";

  const dev = createDeveloper({
    developerId: ownerId,
    email: "zimplyhoodsz@gmail.com",
    name: "Ivan Perez",
    company: "AstraMind Technologies",
    plan: API_PLANS.ENTERPRISE,
    metadata: {
      role: "owner",
      source: "default-owner-bootstrap",
    },
  });

  const existing = listApiKeys({
    developerId: ownerId,
    includeRevoked: false,
  });

  if (existing.keys.length) {
    return {
      ok: true,
      created: false,
      developer: dev.developer,
      keys: existing.keys,
      message: "Owner key already exists. Existing keys are masked only.",
    };
  }

  const key = createApiKey({
    developerId: ownerId,
    mode: "live",
    label: "Owner Live API Key",
    plan: API_PLANS.ENTERPRISE,
    scopes: ["*"],
    metadata: {
      owner: true,
    },
  });

  return {
    ok: true,
    created: true,
    developer: dev.developer,
    apiKey: key.apiKey,
    maskedKey: key.maskedKey,
    message:
      "Owner key created. Save this key now; it will not be shown again in full.",
  };
}

export default {
  createDeveloper,
  updateDeveloper,
  createApiKey,
  listApiKeys,
  listDevelopers,
  getDeveloper,
  revokeApiKey,
  rotateApiKey,
  validateApiKey,
  extractApiKeyFromRequest,
  requireApiKey,
  createDefaultOwnerKey,
};