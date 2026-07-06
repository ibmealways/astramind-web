import fetch from "node-fetch";

// ============================
// 📊 STOCK PRICES (Alpha Vantage)
// ============================

export async function getStockPrice(symbol) {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_KEY;

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    const price = data["Global Quote"]?.["05. price"];

    return price ? parseFloat(price) : null;

  } catch (err) {
    console.error("Stock fetch error:", err);
    return null;
  }
}

// ============================
// 🪙 CRYPTO PRICES (CoinGecko)
// ============================

export async function getCryptoPrice(symbol) {
  try {
    const map = {
      btc: "bitcoin",
      eth: "ethereum",
      sol: "solana",
    };

    const coin = map[symbol.toLowerCase()] || symbol;

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`;

    const res = await fetch(url);
    const data = await res.json();

    return data[coin]?.usd || null;

  } catch (err) {
    console.error("Crypto fetch error:", err);
    return null;
  }
}

// ============================
// 🔥 DETECT SYMBOL TYPE
// ============================

export async function getLivePrice(symbol) {
  if (!symbol) return null;

  const upper = symbol.toUpperCase();

  // Crypto detection
  if (["BTC", "ETH", "SOL"].includes(upper)) {
    const price = await getCryptoPrice(upper);
    return { symbol: upper, price, type: "crypto" };
  }

  // Default stock
  const price = await getStockPrice(upper);
  return { symbol: upper, price, type: "stock" };
}