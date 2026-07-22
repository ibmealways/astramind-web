import express from "express";
import Stripe from "stripe";
import requireAuth from "../middleware/requireAuth.js";
import { subscriptionStore as store } from "../../services/subscriptionService.js";
import { getPlan, normalizeBillingInterval, normalizePlanId, PLAN_IDS, publicCatalog, stripePriceEnvKey } from "../../core/subscription/SubscriptionCatalog.js";

const router = express.Router();
const json = express.json();
const getStripe = () => { if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing."); return new Stripe(process.env.STRIPE_SECRET_KEY); };
const appUrl = () => String(process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const periodEnd = (subscription) => subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

function resolvePriceId(planId, interval) {
  const key = stripePriceEnvKey(planId, interval);
  const legacy = interval === "monthly" ? process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] || (planId === "creator" ? process.env.STRIPE_PRICE_BASIC : null) : null;
  return { key, priceId: process.env[key] || legacy || null };
}

router.get("/catalog", (_req, res) => res.json({ ok: true, plans: publicCatalog().filter((plan) => plan.id !== PLAN_IDS.FREE) }));

router.get("/me", requireAuth, (req, res) => res.json({ ok: true, subscription: store.ensure(req.user.id) }));
router.get("/usage", requireAuth, (req, res) => res.json({ ok:true, subscription:store.ensure(req.user.id), ledger:store.listLedger(req.user.id, req.query.limit) }));
router.get("/readiness", requireAuth, (_req, res) => {
  const requiredEvents=["checkout.session.completed","invoice.payment_succeeded","invoice.payment_failed","customer.subscription.deleted"];
  const observed=store.observedBillingEvents();
  const priceKeys=["creator","pro","elite"].flatMap((plan)=>["monthly","yearly"].map((interval)=>stripePriceEnvKey(plan,interval)));
  const configuration={ stripeSecret:Boolean(process.env.STRIPE_SECRET_KEY), webhookSecret:Boolean(process.env.STRIPE_WEBHOOK_SECRET), appUrl:Boolean(process.env.APP_URL||process.env.FRONTEND_URL), prices:Object.fromEntries(priceKeys.map((key)=>[key,Boolean(process.env[key])])) };
  const configured=configuration.stripeSecret&&configuration.webhookSecret&&configuration.appUrl&&Object.values(configuration.prices).every(Boolean);
  const lifecycle=Object.fromEntries(requiredEvents.map((type)=>[type,{ observed:Boolean(observed[type]), count:observed[type]||0 }]));
  return res.json({ ok:true, configured, lifecycle, readyToActivate:configured&&Object.values(lifecycle).every((item)=>item.observed) });
});

router.post("/create-checkout-session", json, requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const planId = normalizePlanId(req.body?.planId || req.body?.tier, "");
    if (!planId || planId === PLAN_IDS.FREE) return res.status(400).json({ ok:false, code:"INVALID_PLAN", error:"Choose Creator, Pro, or Elite." });
    const interval = normalizeBillingInterval(req.body?.interval);
    const { key, priceId } = resolvePriceId(planId, interval);
    if (!priceId) return res.status(503).json({ ok:false, code:"PRICE_NOT_CONFIGURED", error:`Billing price is not configured (${key}).` });
    const current = store.ensure(req.user.id);
    const session = await stripe.checkout.sessions.create({
      mode:"subscription", line_items:[{ price:priceId, quantity:1 }], allow_promotion_codes:true,
      customer:current.stripeCustomerId || undefined, customer_email:current.stripeCustomerId ? undefined : req.user.email,
      client_reference_id:req.user.id,
      success_url:`${appUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${appUrl()}/billing/cancelled`,
      metadata:{ userId:req.user.id, planId, interval },
      subscription_data:{ metadata:{ userId:req.user.id, planId, interval } },
    });
    return res.json({ ok:true, url:session.url, sessionId:session.id });
  } catch (error) { console.error("Stripe checkout error:", error.message); return res.status(500).json({ ok:false, error:"Checkout could not be created." }); }
});

router.post("/portal", json, requireAuth, async (req, res) => {
  try {
    const subscription = store.ensure(req.user.id);
    if (!subscription.stripeCustomerId) return res.status(409).json({ ok:false, code:"CUSTOMER_NOT_LINKED", error:"No Stripe customer is linked to this account." });
    const session = await getStripe().billingPortal.sessions.create({ customer:subscription.stripeCustomerId, return_url:`${appUrl()}/settings` });
    return res.json({ ok:true, url:session.url });
  } catch (error) { return res.status(500).json({ ok:false, error:"Billing portal could not be opened." }); }
});

router.post("/webhook", express.raw({ type:"application/json" }), async (req, res) => {
  let event;
  try { event = getStripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return res.status(400).send(`Webhook Error: ${error.message}`); }
  try {
    const object = event.data.object;
    const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
    const linked = customerId ? store.getByCustomer(customerId) : null;
    const userId = object.metadata?.userId || object.client_reference_id || linked?.userId || null;
    if (!store.recordEvent({ id:event.id, type:event.type, userId, payload:{ objectId:object.id, customerId } })) return res.json({ received:true, duplicate:true });

    if (event.type === "checkout.session.completed" && userId) {
      const subscription = object.subscription ? await getStripe().subscriptions.retrieve(object.subscription) : null;
      store.upsert({ userId, planId:object.metadata?.planId, interval:object.metadata?.interval, status:subscription?.status || "active", customerId, subscriptionId:object.subscription, currentPeriodEnd:periodEnd(subscription) });
    } else if (["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type) && userId) {
      store.upsert({ userId, planId:object.metadata?.planId || linked?.planId, interval:object.metadata?.interval || linked?.interval, status:object.status || (event.type.endsWith("deleted") ? "canceled" : "active"), customerId, subscriptionId:object.id, currentPeriodEnd:periodEnd(object) });
    }
    return res.json({ received:true });
  } catch (error) { console.error("Stripe webhook persistence error:", error); return res.status(500).json({ received:false }); }
});

export { store as subscriptionStore };
export default router;
