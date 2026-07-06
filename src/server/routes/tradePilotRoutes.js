import express from "express";

import {
  getTradePilotPlan,
  calculateRisk,
  scanTradeSetup,
} from "../../services/tradePilotEngine.js";

import { generateWealthRoute } from "../../services/wealthRouteEngine.js";
import { generateMarketMentorReply } from "../../services/marketMentorEngine.js";
import { getIntradayCandles } from "../../services/marketDataService.js";

const router = express.Router();

/* ===============================
   SUBSCRIPTION GUARD
=============================== */
function requireFinancePro(req, res, next) {
  const subscriptionTier =
    req.headers["x-subscription-tier"] ||
    req.body?.subscriptionTier ||
    req.query?.subscriptionTier ||
    "free";

  const allowed = ["finance_pro", "premium", "admin"];

  if (!allowed.includes(String(subscriptionTier).toLowerCase())) {
    return res.status(403).json({
      success: false,
      upgradeRequired: true,
      requiredTier: "finance_pro",
      message: "Upgrade to AstraMind Finance Pro to unlock this feature.",
    });
  }

  next();
}

/* ===============================
   ROUTE TEST
=============================== */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TradePilot routes are mounted.",
    endpoints: [
      "GET /api/tradepilot/plan?subscriptionTier=finance_pro",
      "POST /api/tradepilot/risk",
      "POST /api/tradepilot/scan",
      "POST /api/tradepilot/wealth-route",
      "POST /api/tradepilot/market-mentor",
      "GET /api/tradepilot/market-data/:ticker?subscriptionTier=finance_pro",
    ],
  });
});

/* ===============================
   TRADE PILOT PLAN
=============================== */
router.get("/plan", requireFinancePro, (req, res) => {
  try {
    const plan = getTradePilotPlan({
      startingCapital: req.query.startingCapital || 100,
      weeklyDeposit: req.query.weeklyDeposit || 30,
    });

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("TradePilot plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate TradePilot plan.",
      error: error.message,
    });
  }
});

/* ===============================
   RISK CALCULATOR
=============================== */
router.post("/risk", requireFinancePro, (req, res) => {
  try {
    const result = calculateRisk(req.body);

    return res.json({
      success: result.valid,
      result,
    });
  } catch (error) {
    console.error("Risk calculation error:", error);

    return res.status(500).json({
      success: false,
      message: "Risk calculation failed.",
      error: error.message,
    });
  }
});

/* ===============================
   TRADE SETUP SCANNER
=============================== */
router.post("/scan", requireFinancePro, (req, res) => {
  try {
    const result = scanTradeSetup(req.body);

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Trade scan error:", error);

    return res.status(500).json({
      success: false,
      message: "Trade scan failed.",
      error: error.message,
    });
  }
});

/* ===============================
   WEALTH ROUTE ENGINE
=============================== */
router.post("/wealth-route", requireFinancePro, (req, res) => {
  try {
    const result = generateWealthRoute(req.body);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("WealthRoute error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate WealthRoute.",
      error: error.message,
    });
  }
});

/* ===============================
   MARKET MENTOR
=============================== */
router.post("/market-mentor", requireFinancePro, (req, res) => {
  try {
    const result = generateMarketMentorReply(req.body);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("MarketMentor error:", error);

    return res.status(500).json({
      success: false,
      message: "MarketMentor could not process request.",
      error: error.message,
    });
  }
});

/* ===============================
   LIVE MARKET DATA
=============================== */
router.get("/market-data/:ticker", requireFinancePro, async (req, res) => {
  try {
    const result = await getIntradayCandles({
      ticker: req.params.ticker,
      interval: req.query.interval || "5min",
      outputsize: req.query.outputsize || "compact",
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Market data error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch market data.",
      error: error.message,
    });
  }
});

export default router;