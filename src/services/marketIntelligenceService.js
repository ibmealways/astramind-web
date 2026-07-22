import fetch from "node-fetch";

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "DIA", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"];
const safeSymbols = (symbols = []) => [...new Set(symbols.map((symbol) => String(symbol).toUpperCase().replace(/[^A-Z0-9.\-]/g, "")).filter(Boolean))].slice(0, 20);

function parseCsvLine(line) {
  const values = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(current); current = ""; }
    else current += char;
  }
  values.push(current); return values;
}

export async function getMarketSnapshot(requested = DEFAULT_SYMBOLS) {
  const symbols = safeSymbols(requested);
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key) return { provider: "Alpha Vantage", freshness: "unavailable", warning: "Add ALPHA_VANTAGE_KEY to load market quotes.", quotes: symbols.map((symbol) => ({ symbol, price: null })) };
  try {
    const url = `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${encodeURIComponent(symbols.join(","))}&apikey=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    const data = await response.json();
    const raw = data.data || data.quotes || data["Realtime Bulk Quotes"] || [];
    if (!Array.isArray(raw) || !raw.length) throw new Error(data.Information || data.Note || "The real-time bulk feed returned no quotes.");
    const quotes = raw.map((item) => ({ symbol: item.symbol || item.ticker, price: Number(item.price || item.close), change: Number(item.change || 0), changePercent: Number(String(item.change_percent || item.changePercent || 0).replace("%", "")), volume: Number(item.volume || 0), timestamp: item.timestamp || item.latest_trading_day || null })).filter((item) => item.symbol);
    return { provider: "Alpha Vantage", freshness: "real-time licensed feed", quotes };
  } catch (error) {
    return { provider: "Alpha Vantage", freshness: "feed unavailable", warning: `${error.message} Real-time bulk quotes require an eligible Alpha Vantage market-data plan.`, quotes: symbols.map((symbol) => ({ symbol, price: null })) };
  }
}

export async function getCryptoSnapshot() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true");
    const data = await response.json();
    return Object.entries(data).map(([id, value]) => ({ symbol: ({ bitcoin: "BTC", ethereum: "ETH", solana: "SOL" }[id] || id.toUpperCase()), price: value.usd, changePercent: value.usd_24h_change, timestamp: value.last_updated_at ? new Date(value.last_updated_at * 1000).toISOString() : null }));
  } catch { return []; }
}

export async function getIpoCalendar() {
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key) return { provider: "Alpha Vantage", entries: [], warning: "Add ALPHA_VANTAGE_KEY to load the upcoming IPO calendar." };
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=IPO_CALENDAR&apikey=${encodeURIComponent(key)}`);
    const text = await response.text();
    if (!response.ok || text.trim().startsWith("{")) throw new Error("IPO calendar unavailable for the configured key.");
    const rows = text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
    const headers = rows.shift()?.map((value) => value.trim()) || [];
    const entries = rows.slice(0, 30).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))).map((item) => ({ symbol: item.symbol, name: item.name, ipoDate: item.ipoDate, priceRangeLow: item.priceRangeLow, priceRangeHigh: item.priceRangeHigh, currency: item.currency, exchange: item.exchange })).filter((item) => item.symbol || item.name);
    return { provider: "Alpha Vantage", range: "next 3 months", entries };
  } catch (error) { return { provider: "Alpha Vantage", entries: [], warning: error.message }; }
}

