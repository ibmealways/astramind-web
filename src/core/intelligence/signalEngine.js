import { getLivePrice } from "../finance/marketData.js";

// ============================
// 🧠 SIGNAL ENGINE V2
// ============================

export async function generateSignals(intelText = "", portfolio = [], watchlist = []) {
  try {
    const symbols = extractSymbols(intelText);

    const allSymbols = [
      ...new Set([
        ...symbols,
        ...portfolio.map(p => p.symbol),
        ...watchlist.map(w => w.symbol),
      ]),
    ];

    const prices = await Promise.all(
      allSymbols.slice(0, 8).map(s => getLivePrice(s))
    );

    const validPrices = prices.filter(p => p && p.price);

    const signals = validPrices.map(asset => {
      const sentiment = detectSentiment(intelText, asset.symbol);

      const confidence = calculateConfidence(sentiment);
      const risk = calculateRisk(sentiment);

      const action =
        sentiment === "bullish"
          ? "BUY"
          : sentiment === "bearish"
          ? "SELL"
          : "HOLD";

      return {
        symbol: asset.symbol,
        price: asset.price,
        action,
        confidence,
        risk,
      };
    });

    return signals;

  } catch (err) {
    console.error("🔥 SIGNAL ENGINE ERROR:", err);
    return [];
  }
}

// ============================
// 🧠 HELPERS
// ============================

function extractSymbols(text = "") {
  const matches = text.match(/\b[A-Z]{2,5}\b/g);
  return matches || [];
}

function detectSentiment(text = "", symbol = "") {
  const lower = text.toLowerCase();

  if (lower.includes("surge") || lower.includes("rally") || lower.includes("bull"))
    return "bullish";

  if (lower.includes("crash") || lower.includes("war") || lower.includes("selloff"))
    return "bearish";

  return "neutral";
}

function calculateConfidence(sentiment) {
  if (sentiment === "bullish") return "78%";
  if (sentiment === "bearish") return "72%";
  return "50%";
}

function calculateRisk(sentiment) {
  if (sentiment === "bullish") return "Medium";
  if (sentiment === "bearish") return "High";
  return "Low";
}