import express from "express";

import {
  addPosition,
  getPortfolio,
} from "../../core/finance/portfolioEngine.js";

import {
  addToWatchlist,
  getWatchlist,
} from "../../core/finance/watchlistEngine.js";

const router = express.Router();

// ============================
// 📊 PORTFOLIO
// ============================

router.get("/portfolio", async (req, res) => {
  const data = await getPortfolio();
  res.json({ data });
});

router.post("/portfolio", (req, res) => {
  const { symbol, amount, avgPrice } = req.body;

  const data = addPosition(symbol, amount, avgPrice);

  res.json({ ok: true, data });
});

// ============================
// 👀 WATCHLIST
// ============================

router.get("/watchlist", async (req, res) => {
  const data = await getWatchlist();
  res.json({ data });
});

router.post("/watchlist", (req, res) => {
  const { symbol } = req.body;

  const data = addToWatchlist(symbol);

  res.json({ ok: true, data });
});

export default router;