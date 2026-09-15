import React, { useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function LiveSignalPanel({
  subscriptionTier = "finance_pro",
  riskTolerance = "medium",
  experience = "beginner",
  accountSize = 100,
  weeklyDeposit = 30,
}) {
  const [ticker, setTicker] = useState("TSLA");
  const [candles, setCandles] = useState([]);
  const [provider, setProvider] = useState("");
  const [marketWarning, setMarketWarning] = useState("");

  const [signal, setSignal] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [signalError, setSignalError] = useState("");

  const loadMarketData = async (selectedTicker = ticker) => {
    setLoadingMarket(true);
    setMarketWarning("");

    try {
      const url = `${API_URL}/api/tradepilot/market-data/${selectedTicker}?interval=5min&subscriptionTier=${subscriptionTier}`;

      const res = await fetch(url, {
        headers: {
          "x-subscription-tier": subscriptionTier,
        },
      });

      const data = await res.json();

      if (!res.ok || data.upgradeRequired) {
        throw new Error(data.message || "Upgrade required.");
      }

      setCandles(data.candles || []);
      setProvider(data.provider || "unknown");
      setMarketWarning(data.warning || "");
    } catch (err) {
      setMarketWarning(err.message || "Unable to load market data.");
      setCandles([]);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    loadMarketData(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const closes = useMemo(() => candles.map((candle) => candle.close), [candles]);

  const chartPoints = useMemo(() => {
    if (!closes.length) return "";

    const max = Math.max(...closes);
    const min = Math.min(...closes);
    const width = 520;
    const height = 220;

    return closes
      .map((price, index) => {
        const x = (index / (closes.length - 1 || 1)) * width;
        const y = height - ((price - min) / (max - min || 1)) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [closes]);

  const latestPrice = closes[closes.length - 1] || 0;
  const previousPrice = closes[closes.length - 2] || latestPrice;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = previousPrice
    ? ((priceChange / previousPrice) * 100).toFixed(2)
    : "0.00";

  const runSignalScan = async () => {
    setLoadingSignal(true);
    setSignalError("");
    setSignal(null);

    try {
      const question = `Analyze ${ticker} using Aigenikz live chart signal logic. Latest price is ${latestPrice}. Recent price change is ${priceChangePercent}%. Should subscriber watch, wait, avoid, buy, sell, or paper trade?`;

      const res = await fetch(`${API_URL}/api/tradepilot/market-mentor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-subscription-tier": subscriptionTier,
        },
        body: JSON.stringify({
          question,
          ticker,
          accountSize,
          weeklyDeposit,
          riskTolerance,
          experience,
          subscriptionTier,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.upgradeRequired) {
        throw new Error(data.message || "Upgrade required.");
      }

      setSignal(data);
    } catch (err) {
      setSignalError(err.message || "Unable to run signal scan.");
    } finally {
      setLoadingSignal(false);
    }
  };

  return (
    <section className="tradepilot-card live-signal-card">
      <div className="marketmentor-header">
        <div>
          <p className="tradepilot-eyebrow">Live Chart + Signal Overlay</p>
          <h2>SignalVision AI</h2>
        </div>
        <div className="mentor-pill">Premium Scanner</div>
      </div>

      <p className="mentor-intro">
        Real market-data chart guidance with AI signal routing. This is
        educational decision-support only — not a guaranteed buy/sell system.
      </p>

      <div className="signal-controls">
        <label>
          Select Ticker
          <select value={ticker} onChange={(e) => setTicker(e.target.value)}>
            <option value="TSLA">TSLA</option>
            <option value="NVDA">NVDA</option>
            <option value="AAPL">AAPL</option>
            <option value="MSFT">MSFT</option>
            <option value="VOO">VOO</option>
            <option value="SPY">SPY</option>
            <option value="QQQ">QQQ</option>
          </select>
        </label>

        <button onClick={() => loadMarketData(ticker)} disabled={loadingMarket}>
          {loadingMarket ? "Refreshing..." : "Refresh Market Data"}
        </button>

        <button
          onClick={runSignalScan}
          disabled={loadingSignal || !candles.length}
        >
          {loadingSignal ? "Scanning..." : "Run AI Signal Scan"}
        </button>
      </div>

      <div className="chart-shell">
        <div className="chart-topbar">
          <div>
            <span>
              {ticker} / {provider || "loading"}
            </span>
            <strong>${latestPrice.toFixed(2)}</strong>
          </div>

          <div className={priceChange >= 0 ? "price-up" : "price-down"}>
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)} / {priceChangePercent}%
          </div>
        </div>

        {marketWarning && (
          <div className="tradepilot-warning">{marketWarning}</div>
        )}

        <svg viewBox="0 0 520 240" className="signal-chart">
          <defs>
            <linearGradient id="signalGlow" x1="0" x2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f0abfc" />
            </linearGradient>
          </defs>

          {chartPoints ? (
            <polyline
              points={chartPoints}
              fill="none"
              stroke="url(#signalGlow)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <text x="165" y="120" fill="#94a3b8">
              No market data loaded
            </text>
          )}

          <line
            x1="0"
            y1="70"
            x2="520"
            y2="70"
            stroke="rgba(34, 211, 238, 0.22)"
            strokeDasharray="8 8"
          />

          <line
            x1="0"
            y1="165"
            x2="520"
            y2="165"
            stroke="rgba(248, 113, 113, 0.22)"
            strokeDasharray="8 8"
          />
        </svg>

        <div className="signal-zones">
          <span>Watch Zone</span>
          <span>Risk Zone</span>
        </div>
      </div>

      {signalError && <div className="tradepilot-error">{signalError}</div>}

      {signal && (
        <div className="signal-result">
          <div className="mentor-topline">
            <div>
              <span>Signal</span>
              <strong>{signal.signal}</strong>
            </div>
            <div>
              <span>Route</span>
              <strong>{signal.recommendedRoute}</strong>
            </div>
            <div>
              <span>Risk</span>
              <strong>{signal.riskLevel}</strong>
            </div>
          </div>

          <h3>AI Signal Guidance</h3>
          <ul>
            {signal.guidance?.map((item, index) => (
              <li key={`signal-guidance-${index}`}>{item}</li>
            ))}
          </ul>

          <div className="next-step-box">
            <strong>Next Best Step:</strong>
            <p>{signal.nextBestStep}</p>
          </div>
        </div>
      )}
    </section>
  );
}