// src/core/platform/usageMeter.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  API_PLANS,
  DEFAULT_API_PLAN,
  USAGE_EVENT_TYPES,
  PROVIDERS,
  getDeveloperPlan,
  getCreditCost,
  getPlanLimits,
  calculateOverageUsd,
  canUseFeature,
} from "./developerPlans.js";

const DATA_DIR = path.resolve("server-data");
const USAGE_DIR = path.join(DATA_DIR, "usage");
const USAGE_FILE = path.join(USAGE_DIR, "developer-usage.json");
const LEDGER_FILE = path.join(USAGE_DIR, "usage-ledger.json");
const RATE_FILE = path.join(USAGE_DIR, "rate-windows.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

function makeId(prefix = "evt") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function getMinuteKey(date = new Date()) {
  const d = new Date(date);
  return `${getDayKey(d)}T${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function normalizeDeveloperId(developerId) {
  return String(developerId || "anonymous").trim() || "anonymous";
}

function normalizePlan(plan) {
  const value = String(plan || DEFAULT_API_PLAN).toUpperCase();
  return API_PLANS[value] || DEFAULT_API_PLAN;
}

function createEmptyDeveloperUsage({ developerId, plan = DEFAULT_API_PLAN }) {
  const normalizedPlan = normalizePlan(plan);
  const limits = getPlanLimits(normalizedPlan);

  return {
    developerId,
    plan: normalizedPlan,
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    credits: {
      includedMonthly: limits.includedCredits,
      currentBalance: limits.includedCredits,
      lifetimeUsed: 0,
      lifetimePurchased: 0,
      lifetimeOverageCredits: 0,
    },
    monthly: {},
    daily: {},
    totals: {
      requests: 0,
      creditsUsed: 0,
      estimatedProviderCostUsd: 0,
      estimatedRevenueUsd: 0,
      overageUsd: 0,
    },
    featureUsage: {},
    providerUsage: {},
    lastEvents: [],
    flags: {
      suspended: false,
      allowOverage: false,
      testMode: false,
    },
    metadata: {},
  };
}

function loadUsageDb() {
  return readJson(USAGE_FILE, {
    engine: "Aigenikz Developer Usage DB",
    version: 1,
    developers: {},
    updatedAt: nowIso(),
  });
}

function saveUsageDb(db) {
  writeJson(USAGE_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function loadLedger() {
  return readJson(LEDGER_FILE, {
    engine: "Aigenikz Usage Ledger",
    version: 1,
    events: [],
    updatedAt: nowIso(),
  });
}

function saveLedger(ledger) {
  writeJson(LEDGER_FILE, {
    ...ledger,
    updatedAt: nowIso(),
  });
}

function loadRates() {
  return readJson(RATE_FILE, {
    engine: "Aigenikz Rate Window DB",
    version: 1,
    windows: {},
    updatedAt: nowIso(),
  });
}

function saveRates(db) {
  writeJson(RATE_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function ensureDeveloper(db, { developerId, plan = DEFAULT_API_PLAN }) {
  const id = normalizeDeveloperId(developerId);

  if (!db.developers[id]) {
    db.developers[id] = createEmptyDeveloperUsage({
      developerId: id,
      plan,
    });
  }

  if (plan && db.developers[id].plan !== normalizePlan(plan)) {
    db.developers[id].plan = normalizePlan(plan);
  }

  return db.developers[id];
}

function estimateProviderCostUsd({ eventType, provider, quantity = 1, creditsUsed = 0 }) {
  const q = Number(quantity || 1);

  const roughProviderCostByType = {
    [USAGE_EVENT_TYPES.STORYBOARD_CREATE]: 0.01,
    [USAGE_EVENT_TYPES.IMAGE_GENERATE]: 0.05,
    [USAGE_EVENT_TYPES.VIDEO_GENERATE]: 0.65,
    [USAGE_EVENT_TYPES.VIDEO_RENDER_FULL]: 1.25,
    [USAGE_EVENT_TYPES.VOICEOVER_GENERATE]: 0.04,
    [USAGE_EVENT_TYPES.SOUNDTRACK_GENERATE]: 0.01,
    [USAGE_EVENT_TYPES.SUBTITLE_BURN]: 0.005,
    [USAGE_EVENT_TYPES.SOCIAL_PACKAGE]: 0.005,
    [USAGE_EVENT_TYPES.SOCIAL_PUBLISH]: 0.02,
  };

  const providerMultiplier = {
    [PROVIDERS.RUNWAY]: 2.1,
    [PROVIDERS.VEO]: 1.8,
    [PROVIDERS.LUMA]: 2.0,
    [PROVIDERS.OPENAI]: 1.2,
    [PROVIDERS.ELEVENLABS]: 1.3,
    [PROVIDERS.FALLBACK_MOTION]: 0.1,
    [PROVIDERS.ASTRAMIND_NATIVE]: 0.2,
  };

  const base = roughProviderCostByType[eventType] ?? 0.005;
  const multiplier = providerMultiplier[provider] ?? 1;

  return Number((base * multiplier * q + Number(creditsUsed) * 0.001).toFixed(4));
}

function estimateRevenueUsd(creditsUsed = 0) {
  return Number((Number(creditsUsed || 0) * 0.015).toFixed(4));
}

function addEventToRollingList(list = [], event, limit = 50) {
  return [event, ...list].slice(0, limit);
}

export function getDeveloperUsage({ developerId, plan = DEFAULT_API_PLAN } = {}) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId, plan });
  saveUsageDb(db);
  return developer;
}

export function updateDeveloperPlan({ developerId, plan }) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId, plan });

  developer.plan = normalizePlan(plan);
  developer.updatedAt = nowIso();

  const limits = getPlanLimits(developer.plan);

  if (developer.credits.includedMonthly !== limits.includedCredits) {
    developer.credits.includedMonthly = limits.includedCredits;
  }

  saveUsageDb(db);

  return {
    ok: true,
    developerId: developer.developerId,
    plan: developer.plan,
    usage: developer,
  };
}

export function addCredits({
  developerId,
  credits = 0,
  reason = "manual-credit",
  metadata = {},
}) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId });

  const amount = Math.max(0, Number(credits || 0));

  developer.credits.currentBalance =
    developer.credits.currentBalance === null
      ? null
      : Number((Number(developer.credits.currentBalance || 0) + amount).toFixed(3));

  developer.credits.lifetimePurchased = Number(
    (Number(developer.credits.lifetimePurchased || 0) + amount).toFixed(3)
  );

  developer.updatedAt = nowIso();

  const event = {
    id: makeId("credit"),
    type: "credit.add",
    developerId: developer.developerId,
    credits: amount,
    reason,
    metadata,
    createdAt: nowIso(),
  };

  developer.lastEvents = addEventToRollingList(developer.lastEvents, event);

  const ledger = loadLedger();
  ledger.events = addEventToRollingList(ledger.events, event, 5000);

  saveUsageDb(db);
  saveLedger(ledger);

  return {
    ok: true,
    event,
    usage: developer,
  };
}

export function resetMonthlyCredits({ developerId, monthKey = getMonthKey() }) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId });
  const limits = getPlanLimits(developer.plan);

  developer.credits.currentBalance = limits.includedCredits;
  developer.credits.includedMonthly = limits.includedCredits;
  developer.monthly[monthKey] = developer.monthly[monthKey] || {
    requests: 0,
    creditsUsed: 0,
    overageCredits: 0,
    providerCostUsd: 0,
    revenueUsd: 0,
    events: {},
  };
  developer.monthly[monthKey].resetAt = nowIso();
  developer.updatedAt = nowIso();

  saveUsageDb(db);

  return {
    ok: true,
    developerId: developer.developerId,
    plan: developer.plan,
    monthKey,
    balance: developer.credits.currentBalance,
  };
}

export function checkRateLimit({
  developerId,
  plan = DEFAULT_API_PLAN,
  eventType = USAGE_EVENT_TYPES.API_REQUEST,
  now = new Date(),
} = {}) {
  const id = normalizeDeveloperId(developerId);
  const normalizedPlan = normalizePlan(plan);
  const limits = getPlanLimits(normalizedPlan);

  const rateDb = loadRates();
  const minuteKey = `${id}:${getMinuteKey(now)}`;
  const dayKey = `${id}:${getDayKey(now)}`;

  const minuteRecord = rateDb.windows[minuteKey] || {
    developerId: id,
    key: minuteKey,
    type: "minute",
    count: 0,
    createdAt: nowIso(),
  };

  const dayRecord = rateDb.windows[dayKey] || {
    developerId: id,
    key: dayKey,
    type: "day",
    count: 0,
    createdAt: nowIso(),
  };

  const minuteAllowed =
    limits.maxRequestsPerMinute === null ||
    minuteRecord.count < limits.maxRequestsPerMinute;

  const dayAllowed =
    limits.maxRequestsPerDay === null || dayRecord.count < limits.maxRequestsPerDay;

  return {
    ok: minuteAllowed && dayAllowed,
    developerId: id,
    plan: normalizedPlan,
    eventType,
    minute: {
      allowed: minuteAllowed,
      used: minuteRecord.count,
      limit: limits.maxRequestsPerMinute,
      remaining:
        limits.maxRequestsPerMinute === null
          ? null
          : Math.max(0, limits.maxRequestsPerMinute - minuteRecord.count),
    },
    day: {
      allowed: dayAllowed,
      used: dayRecord.count,
      limit: limits.maxRequestsPerDay,
      remaining:
        limits.maxRequestsPerDay === null
          ? null
          : Math.max(0, limits.maxRequestsPerDay - dayRecord.count),
    },
  };
}

function incrementRateLimit({ developerId, now = new Date() }) {
  const id = normalizeDeveloperId(developerId);
  const rateDb = loadRates();

  const minuteKey = `${id}:${getMinuteKey(now)}`;
  const dayKey = `${id}:${getDayKey(now)}`;

  rateDb.windows[minuteKey] = rateDb.windows[minuteKey] || {
    developerId: id,
    key: minuteKey,
    type: "minute",
    count: 0,
    createdAt: nowIso(),
  };

  rateDb.windows[dayKey] = rateDb.windows[dayKey] || {
    developerId: id,
    key: dayKey,
    type: "day",
    count: 0,
    createdAt: nowIso(),
  };

  rateDb.windows[minuteKey].count += 1;
  rateDb.windows[minuteKey].updatedAt = nowIso();

  rateDb.windows[dayKey].count += 1;
  rateDb.windows[dayKey].updatedAt = nowIso();

  saveRates(rateDb);
}

export function preflightUsage({
  developerId,
  plan = DEFAULT_API_PLAN,
  eventType = USAGE_EVENT_TYPES.API_REQUEST,
  provider = PROVIDERS.ASTRAMIND_NATIVE,
  quantity = 1,
  feature = null,
} = {}) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId, plan });
  const normalizedPlan = developer.plan;
  const limits = getPlanLimits(normalizedPlan);

  if (developer.flags?.suspended || developer.status !== "active") {
    return {
      ok: false,
      reason: "developer_suspended",
      developerId: developer.developerId,
      plan: normalizedPlan,
    };
  }

  if (feature && !canUseFeature(normalizedPlan, feature)) {
    return {
      ok: false,
      reason: "feature_not_available_for_plan",
      developerId: developer.developerId,
      plan: normalizedPlan,
      feature,
    };
  }

  const rate = checkRateLimit({
    developerId: developer.developerId,
    plan: normalizedPlan,
    eventType,
  });

  if (!rate.ok) {
    return {
      ok: false,
      reason: "rate_limit_exceeded",
      developerId: developer.developerId,
      plan: normalizedPlan,
      rate,
    };
  }

  const q = Math.max(1, Number(quantity || 1));
  const creditsNeeded = Number((getCreditCost(eventType, provider) * q).toFixed(3));
  const balance = developer.credits.currentBalance;

  const enterpriseUnlimited = normalizedPlan === API_PLANS.ENTERPRISE && balance === null;

  if (!enterpriseUnlimited && balance < creditsNeeded && !developer.flags.allowOverage) {
    return {
      ok: false,
      reason: "insufficient_credits",
      developerId: developer.developerId,
      plan: normalizedPlan,
      creditsNeeded,
      currentBalance: balance,
      overageAllowed: Boolean(developer.flags.allowOverage),
    };
  }

  const monthKey = getMonthKey();
  const monthly = developer.monthly[monthKey];

  if (
    limits.maxMonthlyCredits !== null &&
    monthly &&
    Number(monthly.creditsUsed || 0) + creditsNeeded > limits.maxMonthlyCredits
  ) {
    return {
      ok: false,
      reason: "monthly_credit_limit_exceeded",
      developerId: developer.developerId,
      plan: normalizedPlan,
      creditsNeeded,
      maxMonthlyCredits: limits.maxMonthlyCredits,
      currentMonthlyCredits: monthly.creditsUsed,
    };
  }

  return {
    ok: true,
    developerId: developer.developerId,
    plan: normalizedPlan,
    eventType,
    provider,
    quantity: q,
    creditsNeeded,
    currentBalance: balance,
    rate,
  };
}

export function recordUsage({
  developerId,
  plan = DEFAULT_API_PLAN,
  eventType = USAGE_EVENT_TYPES.API_REQUEST,
  provider = PROVIDERS.ASTRAMIND_NATIVE,
  quantity = 1,
  feature = null,
  requestId = null,
  projectId = null,
  jobId = null,
  route = null,
  status = "success",
  metadata = {},
  allowNegative = false,
} = {}) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId, plan });

  const q = Math.max(1, Number(quantity || 1));
  const creditsUsed = Number((getCreditCost(eventType, provider) * q).toFixed(3));
  const monthKey = getMonthKey();
  const dayKey = getDayKey();

  developer.monthly[monthKey] = developer.monthly[monthKey] || {
    requests: 0,
    creditsUsed: 0,
    overageCredits: 0,
    providerCostUsd: 0,
    revenueUsd: 0,
    events: {},
  };

  developer.daily[dayKey] = developer.daily[dayKey] || {
    requests: 0,
    creditsUsed: 0,
    providerCostUsd: 0,
    revenueUsd: 0,
    events: {},
  };

  const providerCostUsd = estimateProviderCostUsd({
    eventType,
    provider,
    quantity: q,
    creditsUsed,
  });

  const revenueUsd = estimateRevenueUsd(creditsUsed);

  if (developer.credits.currentBalance !== null) {
    const nextBalance = Number(
      (Number(developer.credits.currentBalance || 0) - creditsUsed).toFixed(3)
    );

    if (nextBalance < 0 && !allowNegative && !developer.flags.allowOverage) {
      return {
        ok: false,
        reason: "insufficient_credits",
        developerId: developer.developerId,
        currentBalance: developer.credits.currentBalance,
        creditsUsed,
      };
    }

    developer.credits.currentBalance = nextBalance;
  }

  if (developer.credits.currentBalance < 0) {
    const overageCredits = Math.abs(developer.credits.currentBalance);
    developer.credits.lifetimeOverageCredits = Number(
      (Number(developer.credits.lifetimeOverageCredits || 0) + overageCredits).toFixed(3)
    );
    developer.monthly[monthKey].overageCredits = Number(
      (Number(developer.monthly[monthKey].overageCredits || 0) + overageCredits).toFixed(3)
    );
  }

  developer.credits.lifetimeUsed = Number(
    (Number(developer.credits.lifetimeUsed || 0) + creditsUsed).toFixed(3)
  );

  developer.monthly[monthKey].requests += 1;
  developer.monthly[monthKey].creditsUsed = Number(
    (developer.monthly[monthKey].creditsUsed + creditsUsed).toFixed(3)
  );
  developer.monthly[monthKey].providerCostUsd = Number(
    (developer.monthly[monthKey].providerCostUsd + providerCostUsd).toFixed(4)
  );
  developer.monthly[monthKey].revenueUsd = Number(
    (developer.monthly[monthKey].revenueUsd + revenueUsd).toFixed(4)
  );
  developer.monthly[monthKey].events[eventType] =
    (developer.monthly[monthKey].events[eventType] || 0) + q;

  developer.daily[dayKey].requests += 1;
  developer.daily[dayKey].creditsUsed = Number(
    (developer.daily[dayKey].creditsUsed + creditsUsed).toFixed(3)
  );
  developer.daily[dayKey].providerCostUsd = Number(
    (developer.daily[dayKey].providerCostUsd + providerCostUsd).toFixed(4)
  );
  developer.daily[dayKey].revenueUsd = Number(
    (developer.daily[dayKey].revenueUsd + revenueUsd).toFixed(4)
  );
  developer.daily[dayKey].events[eventType] =
    (developer.daily[dayKey].events[eventType] || 0) + q;

  developer.totals.requests += 1;
  developer.totals.creditsUsed = Number(
    (developer.totals.creditsUsed + creditsUsed).toFixed(3)
  );
  developer.totals.estimatedProviderCostUsd = Number(
    (developer.totals.estimatedProviderCostUsd + providerCostUsd).toFixed(4)
  );
  developer.totals.estimatedRevenueUsd = Number(
    (developer.totals.estimatedRevenueUsd + revenueUsd).toFixed(4)
  );

  const currentOverage = Math.max(0, -Number(developer.credits.currentBalance || 0));
  developer.totals.overageUsd = calculateOverageUsd(currentOverage);

  developer.featureUsage[feature || eventType] =
    (developer.featureUsage[feature || eventType] || 0) + q;

  developer.providerUsage[provider] = developer.providerUsage[provider] || {
    requests: 0,
    creditsUsed: 0,
    providerCostUsd: 0,
  };
  developer.providerUsage[provider].requests += 1;
  developer.providerUsage[provider].creditsUsed = Number(
    (developer.providerUsage[provider].creditsUsed + creditsUsed).toFixed(3)
  );
  developer.providerUsage[provider].providerCostUsd = Number(
    (developer.providerUsage[provider].providerCostUsd + providerCostUsd).toFixed(4)
  );

  developer.updatedAt = nowIso();

  const event = {
    id: makeId("usage"),
    requestId: requestId || makeId("req"),
    developerId: developer.developerId,
    plan: developer.plan,
    eventType,
    provider,
    quantity: q,
    creditsUsed,
    providerCostUsd,
    revenueUsd,
    feature,
    projectId,
    jobId,
    route,
    status,
    metadata,
    createdAt: nowIso(),
  };

  developer.lastEvents = addEventToRollingList(developer.lastEvents, event, 50);

  const ledger = loadLedger();
  ledger.events = addEventToRollingList(ledger.events, event, 5000);

  incrementRateLimit({ developerId: developer.developerId });

  saveUsageDb(db);
  saveLedger(ledger);

  return {
    ok: true,
    event,
    usage: developer,
  };
}

export function getUsageSummary({ developerId, plan = DEFAULT_API_PLAN } = {}) {
  const usage = getDeveloperUsage({ developerId, plan });
  const monthKey = getMonthKey();
  const dayKey = getDayKey();
  const planInfo = getDeveloperPlan(usage.plan);

  return {
    ok: true,
    developerId: usage.developerId,
    plan: usage.plan,
    planLabel: planInfo.label,
    status: usage.status,
    credits: usage.credits,
    currentMonth: usage.monthly[monthKey] || null,
    today: usage.daily[dayKey] || null,
    totals: usage.totals,
    providerUsage: usage.providerUsage,
    featureUsage: usage.featureUsage,
    limits: planInfo.limits,
    features: planInfo.features,
    lastEvents: usage.lastEvents,
  };
}

export function listDeveloperUsage() {
  const db = loadUsageDb();

  return {
    ok: true,
    count: Object.keys(db.developers || {}).length,
    developers: Object.values(db.developers || {}),
  };
}

export function suspendDeveloper({ developerId, reason = "manual_suspend" }) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId });

  developer.status = "suspended";
  developer.flags.suspended = true;
  developer.suspendedReason = reason;
  developer.updatedAt = nowIso();

  saveUsageDb(db);

  return {
    ok: true,
    developerId: developer.developerId,
    status: developer.status,
    reason,
  };
}

export function reactivateDeveloper({ developerId }) {
  const db = loadUsageDb();
  const developer = ensureDeveloper(db, { developerId });

  developer.status = "active";
  developer.flags.suspended = false;
  developer.suspendedReason = null;
  developer.updatedAt = nowIso();

  saveUsageDb(db);

  return {
    ok: true,
    developerId: developer.developerId,
    status: developer.status,
  };
}

export default {
  getDeveloperUsage,
  updateDeveloperPlan,
  addCredits,
  resetMonthlyCredits,
  checkRateLimit,
  preflightUsage,
  recordUsage,
  getUsageSummary,
  listDeveloperUsage,
  suspendDeveloper,
  reactivateDeveloper,
};