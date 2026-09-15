// src/core/platform/billingMeter.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  API_PLANS,
  PROVIDERS,
  USAGE_EVENT_TYPES,
  getDeveloperPlan,
  getCreditCost,
  calculateOverageUsd,
  OVERAGE_PRICING,
} from "./developerPlans.js";

import { getUsageSummary, addCredits } from "./usageMeter.js";

const DATA_DIR = path.resolve("server-data");
const BILLING_DIR = path.join(DATA_DIR, "billing");
const BILLING_FILE = path.join(BILLING_DIR, "billing-ledger.json");

export const BILLING_EVENT_TYPES = {
  CREDIT_PURCHASED: "credit.purchased",
  CREDIT_USED: "credit.used",
  OVERAGE_ACCRUED: "overage.accrued",
  SUBSCRIPTION_STARTED: "subscription.started",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",
  REFUND_ISSUED: "refund.issued",
};

export const CREDIT_PACKS = {
  SMALL: { id: "SMALL", label: "Small Pack", credits: 1000, priceUsd: 15 },
  CREATOR: { id: "CREATOR", label: "Creator Pack", credits: 5000, priceUsd: 65 },
  BUSINESS: { id: "BUSINESS", label: "Business Pack", credits: 15000, priceUsd: 175 },
  SCALE: { id: "SCALE", label: "Scale Pack", credits: 50000, priceUsd: 499 },
};

export const STRIPE_PLAN_ENV_KEYS = {
  [API_PLANS.STARTER]: "STRIPE_PRICE_STARTER_API",
  [API_PLANS.CREATOR_API]: "STRIPE_PRICE_CREATOR_API",
  [API_PLANS.BUSINESS_API]: "STRIPE_PRICE_BUSINESS_API",
  [API_PLANS.ENTERPRISE]: "STRIPE_PRICE_ENTERPRISE_API",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "bill") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
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

function loadBillingDb() {
  return readJson(BILLING_FILE, {
    engine: "Aigenikz Billing Meter",
    version: 1,
    events: [],
    invoices: {},
    developerBilling: {},
    updatedAt: nowIso(),
  });
}

function saveBillingDb(db) {
  writeJson(BILLING_FILE, {
    ...db,
    updatedAt: nowIso(),
  });
}

function dollars(value = 0) {
  return Number(Number(value || 0).toFixed(2));
}

function precise(value = 0) {
  return Number(Number(value || 0).toFixed(4));
}

function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getProviderEstimatedUsd(provider, eventType, quantity = 1) {
  const q = Math.max(1, Number(quantity || 1));

  const baseCost = {
    [USAGE_EVENT_TYPES.STORYBOARD_CREATE]: 0.01,
    [USAGE_EVENT_TYPES.IMAGE_GENERATE]: 0.06,
    [USAGE_EVENT_TYPES.VIDEO_GENERATE]: 0.75,
    [USAGE_EVENT_TYPES.VIDEO_RENDER_FULL]: 1.5,
    [USAGE_EVENT_TYPES.VOICEOVER_GENERATE]: 0.05,
    [USAGE_EVENT_TYPES.SOUNDTRACK_GENERATE]: 0.01,
    [USAGE_EVENT_TYPES.SUBTITLE_BURN]: 0.01,
    [USAGE_EVENT_TYPES.SOCIAL_PACKAGE]: 0.01,
    [USAGE_EVENT_TYPES.SOCIAL_PUBLISH]: 0.03,
  };

  const providerMultiplier = {
    [PROVIDERS.RUNWAY]: 2.25,
    [PROVIDERS.VEO]: 2.0,
    [PROVIDERS.LUMA]: 2.15,
    [PROVIDERS.OPENAI]: 1.25,
    [PROVIDERS.ELEVENLABS]: 1.35,
    [PROVIDERS.FALLBACK_MOTION]: 0.12,
    [PROVIDERS.ASTRAMIND_NATIVE]: 0.25,
  };

  return precise((baseCost[eventType] || 0.01) * (providerMultiplier[provider] || 1) * q);
}

function calculateGrossRevenueUsd(creditsUsed = 0) {
  return precise(Number(creditsUsed || 0) * OVERAGE_PRICING.creditUsd);
}

function calculateProfit({ revenueUsd = 0, providerCostUsd = 0 }) {
  const grossProfitUsd = precise(Number(revenueUsd || 0) - Number(providerCostUsd || 0));
  const marginPercent =
    Number(revenueUsd || 0) > 0
      ? precise((grossProfitUsd / Number(revenueUsd || 0)) * 100)
      : 0;

  return {
    grossProfitUsd,
    marginPercent,
  };
}

export function getCreditPack(packId = "SMALL") {
  return CREDIT_PACKS[String(packId || "SMALL").toUpperCase()] || null;
}

export function listCreditPacks() {
  return {
    ok: true,
    packs: Object.values(CREDIT_PACKS),
  };
}

export function getStripePriceIdForPlan(planId) {
  const envKey = STRIPE_PLAN_ENV_KEYS[planId];
  return envKey ? process.env[envKey] || "" : "";
}

export function getBillingPlanCatalog() {
  return Object.values(API_PLANS).map((planId) => {
    const plan = getDeveloperPlan(planId);

    return {
      planId,
      label: plan.label,
      monthlyBasePriceUsd: plan.limits.monthlyBasePriceUsd,
      includedCredits: plan.limits.includedCredits,
      maxMonthlyCredits: plan.limits.maxMonthlyCredits,
      stripePriceEnvKey: STRIPE_PLAN_ENV_KEYS[planId] || null,
      stripePriceConfigured: Boolean(getStripePriceIdForPlan(planId)),
      limits: plan.limits,
      features: plan.features,
    };
  });
}

export function recordBillingEvent({
  developerId,
  type,
  amountUsd = 0,
  credits = 0,
  provider = null,
  eventType = null,
  stripeCustomerId = "",
  stripeSubscriptionId = "",
  stripeInvoiceId = "",
  stripeSessionId = "",
  metadata = {},
} = {}) {
  const db = loadBillingDb();

  const event = {
    id: makeId("billing_evt"),
    developerId,
    type,
    amountUsd: dollars(amountUsd),
    credits: precise(credits),
    provider,
    eventType,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeInvoiceId,
    stripeSessionId,
    metadata,
    createdAt: nowIso(),
  };

  db.events = [event, ...(db.events || [])].slice(0, 10000);

  db.developerBilling[developerId] = db.developerBilling[developerId] || {
    developerId,
    lifetimeRevenueUsd: 0,
    lifetimeCreditsPurchased: 0,
    lifetimeOverageUsd: 0,
    lifetimeRefundsUsd: 0,
    lastEventAt: null,
  };

  const record = db.developerBilling[developerId];

  if (
    [
      BILLING_EVENT_TYPES.CREDIT_PURCHASED,
      BILLING_EVENT_TYPES.SUBSCRIPTION_STARTED,
      BILLING_EVENT_TYPES.SUBSCRIPTION_UPDATED,
      BILLING_EVENT_TYPES.INVOICE_PAID,
    ].includes(type)
  ) {
    record.lifetimeRevenueUsd = dollars(record.lifetimeRevenueUsd + event.amountUsd);
  }

  if (type === BILLING_EVENT_TYPES.CREDIT_PURCHASED) {
    record.lifetimeCreditsPurchased = precise(record.lifetimeCreditsPurchased + event.credits);
  }

  if (type === BILLING_EVENT_TYPES.OVERAGE_ACCRUED) {
    record.lifetimeOverageUsd = dollars(record.lifetimeOverageUsd + event.amountUsd);
  }

  if (type === BILLING_EVENT_TYPES.REFUND_ISSUED) {
    record.lifetimeRefundsUsd = dollars(record.lifetimeRefundsUsd + event.amountUsd);
  }

  record.lastEventAt = event.createdAt;

  saveBillingDb(db);

  return {
    ok: true,
    event,
    billing: record,
  };
}

export function applyCreditPurchase({
  developerId,
  packId = "SMALL",
  stripeSessionId = "",
  stripeCustomerId = "",
  metadata = {},
} = {}) {
  const pack = getCreditPack(packId);

  if (!pack) {
    return {
      ok: false,
      reason: "invalid_credit_pack",
      packId,
    };
  }

  const credits = addCredits({
    developerId,
    credits: pack.credits,
    reason: "billing_credit_purchase",
    metadata: {
      packId: pack.id,
      stripeSessionId,
      ...metadata,
    },
  });

  const billing = recordBillingEvent({
    developerId,
    type: BILLING_EVENT_TYPES.CREDIT_PURCHASED,
    amountUsd: pack.priceUsd,
    credits: pack.credits,
    stripeSessionId,
    stripeCustomerId,
    metadata: {
      pack,
      ...metadata,
    },
  });

  return {
    ok: true,
    pack,
    credits,
    billing,
  };
}

export function estimateUsageCharge({
  eventType = USAGE_EVENT_TYPES.API_REQUEST,
  provider = PROVIDERS.ASTRAMIND_NATIVE,
  quantity = 1,
} = {}) {
  const q = Math.max(1, Number(quantity || 1));
  const credits = precise(getCreditCost(eventType, provider) * q);
  const revenueUsd = calculateGrossRevenueUsd(credits);
  const providerCostUsd = getProviderEstimatedUsd(provider, eventType, q);
  const profit = calculateProfit({ revenueUsd, providerCostUsd });

  return {
    ok: true,
    eventType,
    provider,
    quantity: q,
    credits,
    revenueUsd,
    providerCostUsd,
    ...profit,
  };
}

export function getDeveloperBillingSummary({ developerId }) {
  const db = loadBillingDb();
  const usage = getUsageSummary({ developerId });

  const record = db.developerBilling[developerId] || {
    developerId,
    lifetimeRevenueUsd: 0,
    lifetimeCreditsPurchased: 0,
    lifetimeOverageUsd: 0,
    lifetimeRefundsUsd: 0,
    lastEventAt: null,
  };

  const currentBalance = Number(usage?.credits?.currentBalance || 0);
  const overageCredits = Math.max(0, -currentBalance);
  const currentOverageUsd = calculateOverageUsd(overageCredits);

  return {
    ok: true,
    developerId,
    billing: record,
    usage,
    currentOverage: {
      credits: precise(overageCredits),
      amountUsd: dollars(currentOverageUsd),
    },
    monthKey: getMonthKey(),
  };
}

export function createInternalInvoice({
  developerId,
  description = "Aigenikz API usage invoice",
  lineItems = [],
  metadata = {},
} = {}) {
  const db = loadBillingDb();

  const subtotalUsd = dollars(
    lineItems.reduce((sum, item) => sum + Number(item.amountUsd || 0), 0)
  );

  const invoice = {
    invoiceId: makeId("invoice"),
    developerId,
    description,
    lineItems,
    subtotalUsd,
    totalUsd: subtotalUsd,
    status: "draft",
    metadata,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.invoices[invoice.invoiceId] = invoice;
  saveBillingDb(db);

  recordBillingEvent({
    developerId,
    type: BILLING_EVENT_TYPES.INVOICE_CREATED,
    amountUsd: invoice.totalUsd,
    metadata: {
      invoiceId: invoice.invoiceId,
    },
  });

  return {
    ok: true,
    invoice,
  };
}

export function markInternalInvoicePaid({
  invoiceId,
  stripeInvoiceId = "",
  stripeSessionId = "",
} = {}) {
  const db = loadBillingDb();
  const invoice = db.invoices[invoiceId];

  if (!invoice) {
    return {
      ok: false,
      reason: "invoice_not_found",
      invoiceId,
    };
  }

  invoice.status = "paid";
  invoice.paidAt = nowIso();
  invoice.updatedAt = nowIso();
  invoice.stripeInvoiceId = stripeInvoiceId;
  invoice.stripeSessionId = stripeSessionId;

  saveBillingDb(db);

  recordBillingEvent({
    developerId: invoice.developerId,
    type: BILLING_EVENT_TYPES.INVOICE_PAID,
    amountUsd: invoice.totalUsd,
    stripeInvoiceId,
    stripeSessionId,
    metadata: {
      invoiceId,
    },
  });

  return {
    ok: true,
    invoice,
  };
}

export function getBillingLedger({ developerId = null, limit = 200 } = {}) {
  const db = loadBillingDb();

  let events = db.events || [];

  if (developerId) {
    events = events.filter((event) => event.developerId === developerId);
  }

  return {
    ok: true,
    count: events.slice(0, limit).length,
    events: events.slice(0, limit),
    updatedAt: db.updatedAt,
  };
}

export default {
  BILLING_EVENT_TYPES,
  CREDIT_PACKS,
  STRIPE_PLAN_ENV_KEYS,
  getCreditPack,
  listCreditPacks,
  getStripePriceIdForPlan,
  getBillingPlanCatalog,
  recordBillingEvent,
  applyCreditPurchase,
  estimateUsageCharge,
  getDeveloperBillingSummary,
  createInternalInvoice,
  markInternalInvoicePaid,
  getBillingLedger,
};