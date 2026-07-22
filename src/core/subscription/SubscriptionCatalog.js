export const BILLING_INTERVALS = Object.freeze({ MONTHLY: "monthly", YEARLY: "yearly" });
export const PLAN_IDS = Object.freeze({ FREE: "free", CREATOR: "creator", PRO: "pro", ELITE: "elite" });

const common = { chat: true, research: true, finance: true, scripts: true, memory: true };
export const SUBSCRIPTION_CATALOG = Object.freeze({
  [PLAN_IDS.FREE]: Object.freeze({ id: "free", name: "Free", monthlyPrice: 0, yearlyPrice: 0, monthlyCredits: 50, projectLimit: 5, entitlements: Object.freeze({ ...common, images: false, audio: false, video: false, books: false, exports: false, automation: false, connectors: false }) }),
  [PLAN_IDS.CREATOR]: Object.freeze({ id: "creator", name: "Creator", monthlyPrice: 19, yearlyPrice: 190, monthlyCredits: 500, projectLimit: 50, entitlements: Object.freeze({ ...common, images: true, audio: true, video: false, books: true, exports: true, automation: false, connectors: false }) }),
  [PLAN_IDS.PRO]: Object.freeze({ id: "pro", name: "Pro", monthlyPrice: 49, yearlyPrice: 490, monthlyCredits: 2000, projectLimit: 200, entitlements: Object.freeze({ ...common, images: true, audio: true, video: true, books: true, exports: true, batchExports: true, premiumVoice: true, brandKit: true, automation: false, connectors: false }) }),
  [PLAN_IDS.ELITE]: Object.freeze({ id: "elite", name: "Elite", monthlyPrice: 99, yearlyPrice: 990, monthlyCredits: 5000, projectLimit: 1000, entitlements: Object.freeze({ ...common, images: true, audio: true, video: true, books: true, exports: true, batchExports: true, premiumVoice: true, brandKit: true, automation: true, connectors: true, priorityQueue: true }) }),
});

export function normalizePlanId(value, fallback = PLAN_IDS.FREE) {
  const id = String(value || "").trim().toLowerCase();
  return SUBSCRIPTION_CATALOG[id] ? id : fallback;
}
export function normalizeBillingInterval(value) { return value === BILLING_INTERVALS.YEARLY ? BILLING_INTERVALS.YEARLY : BILLING_INTERVALS.MONTHLY; }
export function getPlan(value) { return SUBSCRIPTION_CATALOG[normalizePlanId(value)]; }
export function publicCatalog() { return Object.values(SUBSCRIPTION_CATALOG).map((plan) => ({ ...plan, entitlements: { ...plan.entitlements } })); }
export function stripePriceEnvKey(planId, interval) { return `STRIPE_PRICE_${normalizePlanId(planId).toUpperCase()}_${normalizeBillingInterval(interval).toUpperCase()}`; }

