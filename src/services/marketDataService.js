const APPROVED_ASSETS = ["TSLA", "NVDA", "AAPL", "MSFT", "VOO", "SPY", "QQQ"];

function normalizeTicker(ticker = "") {
  return String(ticker).toUpperCase().trim();
}

function buildFallbackCandles(symbol) {
  const basePrices = {
    TSLA: 188,
    NVDA: 927,
    AAPL: 181,
    MSFT: 429,
    VOO: 482,
    SPY: 527,
    QQQ: 452,
  };

  const base = basePrices[symbol] || 100;

  return Array.from({ length: 24 }).map((_, index) => {
    const wave = Math.sin(index / 2) * 2;
    const trend = index * 0.35;
    const close = Number((base + wave + trend).toFixed(2));

    return {
      time: `Fallback-${index + 1}`,
      open: Number((close - 0.8).toFixed(2)),
      high: Number((close + 1.4).toFixed(2)),
      low: Number((close - 1.6).toFixed(2)),
      close,
      volume: 0,
    };
  });
}

export async function getIntradayCandles({
  ticker = "TSLA",
  interval = "5min",
  outputsize = "compact",
}) {
  const symbol = normalizeTicker(ticker);

  if (!APPROVED_ASSETS.includes(symbol)) {
    return {
      success: false,
      message: `${symbol} is not inside the approved AstraMind watchlist.`,
      candles: [],
    };
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return {
      success: true,
      provider: "fallback",
      warning: "Missing ALPHA_VANTAGE_API_KEY. Showing fallback demo candles.",
      ticker: symbol,
      interval,
      candles: buildFallbackCandles(symbol),
    };
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", outputsize);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url);
    const data = await response.json();

    const key = `Time Series (${interval})`;
    const series = data[key];

    if (!series) {
      return {
        success: true,
        provider: "fallback",
        warning:
          data.Note ||
          data.Information ||
          data["Error Message"] ||
          "Market data provider returned no intraday series. Showing fallback demo candles.",
        ticker: symbol,
        interval,
        candles: buildFallbackCandles(symbol),
      };
    }

    const candles = Object.entries(series)
      .slice(0, 40)
      .reverse()
      .map(([time, values]) => ({
        time,
        open: Number(values["1. open"]),
        high: Number(values["2. high"]),
        low: Number(values["3. low"]),
        close: Number(values["4. close"]),
        volume: Number(values["5. volume"]),
      }));

    return {
      success: true,
      provider: "alpha_vantage",
      ticker: symbol,
      interval,
      candles,
    };
  } catch (error) {
    console.error("Market data error:", error);

    return {
      success: true,
      provider: "fallback",
      warning: "Unable to fetch live market data. Showing fallback demo candles.",
      ticker: symbol,
      interval,
      candles: buildFallbackCandles(symbol),
    };
  }
}