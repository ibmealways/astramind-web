import { getLivePrice } from "./marketData.js";

export async function analyzePortfolio(portfolio = []) {
  if (!portfolio.length) return [];

  const results = [];

  for (const asset of portfolio) {
    const live = await getLivePrice(asset.symbol);

    if (!live || !live.price) continue;

    const currentValue = live.price * asset.amount;
    const invested = asset.avgPrice * asset.amount;

    const profit = currentValue - invested;
    const profitPercent = ((profit / invested) * 100).toFixed(2);

    const signal = getSignal(profitPercent);

    results.push({
      symbol: asset.symbol,
      price: live.price,
      profit: profit.toFixed(2),
      profitPercent,
      signal,
    });
  }

  return results;
}

// 🧠 SIGNAL ENGINE
function getSignal(percent) {
  const p = Number(percent);

  if (p > 20) return "🔥 STRONG HOLD";
  if (p > 5) return "📈 HOLD";
  if (p > -5) return "⚖️ NEUTRAL";
  if (p > -15) return "⚠️ RISK";
  return "🚨 SELL";
}