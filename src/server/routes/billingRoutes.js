import express from "express";
import Stripe from "stripe";

const router = express.Router();

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing. Check your root .env file.");
  }

  return new Stripe(secretKey);
}

// ============================
// 🧾 CREATE CHECKOUT SESSION
// ============================
router.post("/create-checkout-session", async (req, res) => {
  try {
    const stripe = getStripe();
    const { tier, customerEmail } = req.body;

    if (!tier) {
      return res.status(400).json({ error: "Tier is required" });
    }

    const PRICE_MAP = {
      basic: process.env.STRIPE_PRICE_BASIC,
      pro: process.env.STRIPE_PRICE_PRO,
      elite: process.env.STRIPE_PRICE_ELITE,
    };

    const priceId = PRICE_MAP[tier.toLowerCase()];

    if (!priceId) {
      return res.status(400).json({
        error: "Invalid tier or missing Stripe price ID",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: customerEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/cancel",
      metadata: {
        tier: tier.toLowerCase(),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("🔥 STRIPE ERROR:", err.message);
    res.status(500).json({ error: err.message || "Checkout failed" });
  }
});

// ============================
// 📦 GET SUBSCRIPTION STATUS
// ============================
router.get("/status/:customerId", async (req, res) => {
  try {
    const stripe = getStripe();
    const { customerId } = req.params;

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return res.json({ active: false });
    }

    const sub = subscriptions.data[0];

    res.json({
      active: sub.status === "active" || sub.status === "trialing",
      status: sub.status,
      priceId: sub.items.data[0]?.price?.id || null,
      customerId,
    });
  } catch (err) {
    console.error("🔥 STATUS ERROR:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch status" });
  }
});

// ============================
// 🔔 STRIPE WEBHOOK
// ============================
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error("⚠️ Webhook signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log("📩 Stripe event received:", event.type);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          console.log("✅ Checkout completed:", {
            customerId: session.customer,
            subscriptionId: session.subscription,
            tier: session.metadata?.tier,
          });
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          console.log("✅ Invoice paid:", invoice.customer);
          break;
        }

        case "customer.subscription.created": {
          const subscription = event.data.object;
          console.log("✅ Subscription created:", subscription.id);
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object;
          console.log(
            "🔄 Subscription updated:",
            subscription.id,
            subscription.status
          );
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          console.log("❌ Subscription canceled:", subscription.id);
          break;
        }

        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("🔥 WEBHOOK ROUTE ERROR:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;