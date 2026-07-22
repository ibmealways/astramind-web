import { randomUUID } from "crypto";
import { getPlan, normalizeBillingInterval, normalizePlanId, PLAN_IDS } from "./SubscriptionCatalog.js";

export default class SubscriptionStore {
  constructor(db) {
    this.db = db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id TEXT PRIMARY KEY, plan_id TEXT NOT NULL DEFAULT 'free', billing_interval TEXT NOT NULL DEFAULT 'monthly',
        status TEXT NOT NULL DEFAULT 'active', stripe_customer_id TEXT, stripe_subscription_id TEXT,
        current_period_end TEXT, credits_balance INTEGER NOT NULL DEFAULT 50, credits_period_key TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS subscription_events (
        event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, user_id TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, operation TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL,
        reference_id TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);
    `);
  }

  periodKey(date = new Date()) { return date.toISOString().slice(0, 7); }
  ensure(userId) {
    if (!userId) throw new Error("Subscription identity is required.");
    const now = new Date().toISOString(); const plan = getPlan(PLAN_IDS.FREE); const period = this.periodKey();
    this.db.prepare(`INSERT OR IGNORE INTO subscriptions (user_id,plan_id,billing_interval,status,credits_balance,credits_period_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).run(userId, plan.id, "monthly", "active", plan.monthlyCredits, period, now, now);
    this.refreshCredits(userId);
    return this.get(userId);
  }
  refreshCredits(userId) {
    const row = this.db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(userId); if (!row || row.credits_period_key === this.periodKey()) return;
    const plan = getPlan(row.plan_id); this.db.prepare("UPDATE subscriptions SET credits_balance=?,credits_period_key=?,updated_at=? WHERE user_id=?").run(plan.monthlyCredits, this.periodKey(), new Date().toISOString(), userId);
  }
  get(userId) { const row = this.db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(userId); return row ? this.map(row) : null; }
  getByCustomer(customerId) { const row = this.db.prepare("SELECT * FROM subscriptions WHERE stripe_customer_id=?").get(customerId); return row ? this.map(row) : null; }
  upsert({ userId, planId, interval, status = "active", customerId = null, subscriptionId = null, currentPeriodEnd = null }) {
    const current = this.ensure(userId); const plan = getPlan(planId); const now = new Date().toISOString();
    const resetCredits = current.planId !== plan.id ? plan.monthlyCredits : current.creditsBalance;
    this.db.prepare(`UPDATE subscriptions SET plan_id=?,billing_interval=?,status=?,stripe_customer_id=COALESCE(?,stripe_customer_id),stripe_subscription_id=COALESCE(?,stripe_subscription_id),current_period_end=?,credits_balance=?,credits_period_key=?,updated_at=? WHERE user_id=?`).run(plan.id, normalizeBillingInterval(interval), status, customerId, subscriptionId, currentPeriodEnd, resetCredits, this.periodKey(), now, userId);
    this.db.prepare("UPDATE users SET plan=?,updated_at=? WHERE id=?").run(plan.id, now, userId);
    return this.get(userId);
  }
  recordEvent(event) { const result = this.db.prepare("INSERT OR IGNORE INTO subscription_events (event_id,event_type,user_id,payload_json,created_at) VALUES (?,?,?,?,?)").run(event.id,event.type,event.userId||null,JSON.stringify(event.payload||{}),new Date().toISOString()); return result.changes > 0; }
  reserve({ userId, operation, amount, referenceId = null, metadata = {} }) {
    const units = Math.max(1, Math.ceil(Number(amount) || 0)); const subscription = this.ensure(userId);
    if (!subscription.active) throw Object.assign(new Error("An active subscription is required."), { code: "SUBSCRIPTION_INACTIVE" });
    const id = randomUUID(); const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      const result = this.db.prepare("UPDATE subscriptions SET credits_balance=credits_balance-?,updated_at=? WHERE user_id=? AND credits_balance>=?").run(units,now,userId,units);
      if (!result.changes) throw Object.assign(new Error("Not enough AstraMind credits."), { code: "INSUFFICIENT_CREDITS" });
      this.db.prepare("INSERT INTO credit_ledger (id,user_id,operation,amount,status,reference_id,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(id,userId,operation,-units,"reserved",referenceId,JSON.stringify(metadata),now,now);
    }); transaction(); return { id, amount: units, balance: this.get(userId).creditsBalance };
  }
  settle(reservationId, { success, metadata = {} } = {}) {
    const row = this.db.prepare("SELECT * FROM credit_ledger WHERE id=?").get(reservationId); if (!row || row.status !== "reserved") return false;
    const now = new Date().toISOString(); const transaction = this.db.transaction(() => {
      if (!success) this.db.prepare("UPDATE subscriptions SET credits_balance=credits_balance+?,updated_at=? WHERE user_id=?").run(Math.abs(row.amount),now,row.user_id);
      this.db.prepare("UPDATE credit_ledger SET status=?,metadata_json=?,updated_at=? WHERE id=?").run(success?"settled":"released",JSON.stringify(metadata),now,reservationId);
    }); transaction(); return true;
  }
  listLedger(userId, limit = 30) {
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    return this.db.prepare("SELECT id,operation,amount,status,reference_id,metadata_json,created_at,updated_at FROM credit_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT ?").all(userId,size).map((row)=>({ id:row.id,operation:row.operation,amount:row.amount,status:row.status,referenceId:row.reference_id,metadata:JSON.parse(row.metadata_json||"{}"),createdAt:row.created_at,updatedAt:row.updated_at }));
  }
  observedBillingEvents() {
    return this.db.prepare("SELECT event_type,COUNT(*) AS count FROM subscription_events GROUP BY event_type").all().reduce((result,row)=>({ ...result,[row.event_type]:row.count }),{});
  }
  map(row) { const plan = getPlan(row.plan_id); return { userId:row.user_id,planId:plan.id,plan,interval:row.billing_interval,status:row.status,active:["active","trialing"].includes(row.status),stripeCustomerId:row.stripe_customer_id,stripeSubscriptionId:row.stripe_subscription_id,currentPeriodEnd:row.current_period_end,creditsBalance:row.credits_balance,creditsPeriodKey:row.credits_period_key,updatedAt:row.updated_at }; }
}
