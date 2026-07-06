const WATCHLIST = ["TSLA", "NVDA", "VOO", "SPY"];

export function getTradePilotPlan(userProfile = {}) {
  const startingCapital = Number(userProfile.startingCapital || 100);
  const weeklyDeposit = Number(userProfile.weeklyDeposit || 30);

  return {
    moduleName: "AstraMind TradePilot Pro",
    disclaimer:
      "Educational trading assistant only. This is not financial advice and does not guarantee profit.",
    capitalPlan: {
      startingCapital,
      weeklyDeposit,
      allocation: {
        longTermInvesting: Math.round(startingCapital * 0.6),
        activeTrading: Math.round(startingCapital * 0.3),
        cashReserve: Math.round(startingCapital * 0.1),
      },
    },
    watchlist: WATCHLIST,
    rules: {
      maxTradesPerDay: 2,
      tradeWindows: ["9:40 AM - 11:00 AM EST", "3:00 PM - 3:50 PM EST"],
      maxRiskPerTradePercent: 3,
      targetProfitPercent: "4% - 6%",
      stopLossPercent: "2% - 3%",
      beginnerMode: true,
      paperTradingFirst: true,
    },
  };
}

export function calculateRisk({ accountSize, riskPercent, entryPrice, stopPrice }) {
  const size = Number(accountSize);
  const risk = Number(riskPercent);
  const entry = Number(entryPrice);
  const stop = Number(stopPrice);

  if (!size || !risk || !entry || !stop || entry <= stop) {
    return {
      valid: false,
      message: "Enter valid account size, risk percent, entry price, and stop price.",
    };
  }

  const dollarsAtRisk = size * (risk / 100);
  const riskPerShare = entry - stop;
  const shares = dollarsAtRisk / riskPerShare;

  return {
    valid: true,
    dollarsAtRisk: Number(dollarsAtRisk.toFixed(2)),
    riskPerShare: Number(riskPerShare.toFixed(2)),
    suggestedShares: Number(shares.toFixed(4)),
    estimatedPositionSize: Number((shares * entry).toFixed(2)),
  };
}

export function scanTradeSetup({ ticker, trend, volume, pullback, candle }) {
  const symbol = String(ticker || "").toUpperCase();

  if (!WATCHLIST.includes(symbol)) {
    return {
      approved: false,
      signal: "REJECTED",
      reason: "Ticker is not inside the approved TradePilot watchlist.",
    };
  }

  const score =
    Number(trend === "up") +
    Number(volume === "increasing") +
    Number(pullback === "confirmed") +
    Number(candle === "green_reversal");

  if (score >= 4) {
    return {
      approved: true,
      signal: "WATCH_FOR_ENTRY",
      confidence: "High",
      reason: "Momentum, volume, pullback, and reversal candle are aligned.",
    };
  }

  if (score >= 2) {
    return {
      approved: false,
      signal: "WAIT",
      confidence: "Medium",
      reason: "Some conditions are present, but setup is not complete.",
    };
  }

  return {
    approved: false,
    signal: "NO_TRADE",
    confidence: "Low",
    reason: "Setup does not meet TradePilot rules.",
  };
}