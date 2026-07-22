import "dotenv/config";
import db from "../src/server/db/sqlite.js";
import SubscriptionStore from "../src/core/subscription/SubscriptionStore.js";
import { normalizePlanId, PLAN_IDS } from "../src/core/subscription/SubscriptionCatalog.js";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Development plan grants are disabled in production.");
}

const email = String(argument("email") || "").trim().toLowerCase();
const requestedPlan = String(argument("plan") || PLAN_IDS.PRO).trim().toLowerCase();
const planId = normalizePlanId(requestedPlan, "");

if (!email) {
  throw new Error('Provide the login email: npm run dev:grant-plan -- --email "you@example.com" --plan pro');
}
if (!planId) {
  throw new Error("Plan must be free, creator, pro, or elite.");
}

const user = db.prepare("SELECT id,name,email FROM users WHERE lower(email)=?").get(email);
if (!user) {
  throw new Error(`No AstraMind account exists for ${email}. Sign in or create the account first.`);
}

const store = new SubscriptionStore(db);
const subscription = store.upsert({ userId:user.id, planId, interval:"monthly", status:"active" });

console.log(`Development access granted to ${user.name || user.email}.`);
console.log(`Plan: ${subscription.plan.name}`);
console.log(`Credits: ${subscription.creditsBalance}`);
console.log("Refresh AstraMind or sign out and back in to reload the account realm.");

