// src/services/moneyFlowEngine.js

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function calculateRSI(closes = [], period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  const recent = closes.slice(-(period + 1));

  for (let i = 1; i < recent.length; i += 1) {
    const diff = recent[i] - recent[i - 1];

    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  if (losses === 0) return 100;

  const rs = gains / losses;
  return round(100 - 100 / (1 + rs), 2);
}

function calculateTrend(closes = []) {
  if (!closes.length) {
    return {
      label: "UNKNOWN",
      score: 0,
      slope: 0,
    };
  }

  const first = closes[0];
  const last = closes[closes.length - 1];
  const slope = first ? ((last - first) / first) * 100 : 0;

  if (slope >= 4) {
    return {
      label: "STRONG_UPTREND",
      score: 24,
      slope: round(slope),
    };
  }

  if (slope >= 1.5) {
    return {
      label: "UPTREND",
      score: 18,
      slope: round(slope),
    };
  }

  if (slope <= -4) {
    return {
      label: "STRONG_DOWNTREND",
      score: -24,
      slope: round(slope),
    };
  }

  if (slope <= -1.5) {
    return {
      label: "DOWNTREND",
      score: -18,
      slope: round(slope),
    };
  }

  return {
    label: "SIDEWAYS",
    score: 4,
    slope: round(slope),
  };
}

function calculateVolumePressure(candles = []) {
  const volumes = candles.map((candle) => Number(candle.volume || 0));
  const latestVolume = volumes[volumes.length - 1] || 0;
  const avgVolume = average(volumes.slice(0, -1));
  const relativeVolume = avgVolume ? latestVolume / avgVolume : 1;

  if (relativeVolume >= 2) {
    return {
      label: "EXTREME_VOLUME_SPIKE",
      score: 25,
      relativeVolume: round(relativeVolume),
    };
  }

  if (relativeVolume >= 1.5) {
    return {
      label: "ELEVATED_VOLUME",
      score: 18,
      relativeVolume: round(relativeVolume),
    };
  }

  if (relativeVolume >= 1.1) {
    return {
      label: "ABOVE_AVERAGE_VOLUME",
      score: 10,
      relativeVolume: round(relativeVolume),
    };
  }

  if (relativeVolume <= 0.65) {
    return {
      label: "LOW_VOLUME",
      score: -8,
      relativeVolume: round(relativeVolume),
    };
  }

  return {
    label: "NORMAL_VOLUME",
    score: 3,
    relativeVolume: round(relativeVolume),
  };
}

function calculateAccumulation(candles = []) {
  if (!candles.length) {
    return {
      label: "UNKNOWN",
      score: 0,
      bullishCount: 0,
      bearishCount: 0,
    };
  }

  let bullishCount = 0;
  let bearishCount = 0;

  candles.forEach((candle) => {
    const open = Number(candle.open || 0);
    const close = Number(candle.close || 0);

    if (close > open) bullishCount += 1;
    if (close < open) bearishCount += 1;
  });

  const bullishRatio = bullishCount / candles.length;

  if (bullishRatio >= 0.68) {
    return {
      label: "POSSIBLE_ACCUMULATION",
      score: 22,
      bullishCount,
      bearishCount,
      bullishRatio: round(bullishRatio),
    };
  }

  if (bullishRatio >= 0.55) {
    return {
      label: "MILD_ACCUMULATION",
      score: 12,
      bullishCount,
      bearishCount,
      bullishRatio: round(bullishRatio),
    };
  }

  if (bullishRatio <= 0.32) {
    return {
      label: "POSSIBLE_DISTRIBUTION",
      score: -22,
      bullishCount,
      bearishCount,
      bullishRatio: round(bullishRatio),
    };
  }

  if (bullishRatio <= 0.45) {
    return {
      label: "MILD_DISTRIBUTION",
      score: -12,
      bullishCount,
      bearishCount,
      bullishRatio: round(bullishRatio),
    };
  }

  return {
    label: "BALANCED_FLOW",
    score: 4,
    bullishCount,
    bearishCount,
    bullishRatio: round(bullishRatio),
  };
}

function calculateMomentum(closes = []) {
  if (closes.length < 4) {
    return {
      label: "UNKNOWN",
      score: 0,
      recentChangePercent: 0,
    };
  }

  const recent = closes.slice(-4);
  const start = recent[0];
  const end = recent[recent.length - 1];

  const recentChangePercent = start ? ((end - start) / start) * 100 : 0;

  if (recentChangePercent >= 3) {
    return {
      label: "STRONG_MOMENTUM",
      score: 18,
      recentChangePercent: round(recentChangePercent),
    };
  }

  if (recentChangePercent >= 1) {
    return {
      label: "POSITIVE_MOMENTUM",
      score: 10,
      recentChangePercent: round(recentChangePercent),
    };
  }

  if (recentChangePercent <= -3) {
    return {
      label: "NEGATIVE_MOMENTUM",
      score: -18,
      recentChangePercent: round(recentChangePercent),
    };
  }

  if (recentChangePercent <= -1) {
    return {
      label: "WEAK_MOMENTUM",
      score: -10,
      recentChangePercent: round(recentChangePercent),
    };
  }

  return {
    label: "NEUTRAL_MOMENTUM",
    score: 2,
    recentChangePercent: round(recentChangePercent),
  };
}

function classifyMoneyFlow(score, rsi) {
  if (score >= 78 && rsi < 78) return "STRONG_INFLOW";
  if (score >= 62) return "ACCUMULATION_WATCH";
  if (score >= 48) return "WATCHLIST_CANDIDATE";
  if (score >= 35) return "NEUTRAL_FLOW";
  if (score >= 20) return "WEAK_FLOW";
  return "AVOID_OR_WAIT";
}

function buildActionPlan({ classification, rsi, riskTolerance, experience }) {
  const beginner = String(experience).toLowerCase() === "beginner";

  if (classification === "STRONG_INFLOW") {
    return [
      "Do not chase the move immediately.",
      "Wait for pullback or breakout confirmation.",
      "Check whether volume stays elevated on the next candle.",
      beginner
        ? "Paper trade first because this can reverse quickly."
        : "Use tight risk controls and define invalidation before entry.",
    ];
  }

  if (classification === "ACCUMULATION_WATCH") {
    return [
      "Add ticker to high-priority watchlist.",
      "Look for higher lows and controlled pullbacks.",
      "Compare the move against sector/index strength.",
      "Use small size until confirmation improves.",
    ];
  }

  if (classification === "WATCHLIST_CANDIDATE") {
    return [
      "Watch for stronger volume before entering.",
      "Avoid buying during sideways chop.",
      "Wait for a clean setup with defined stop zone.",
    ];
  }

  if (classification === "NEUTRAL_FLOW") {
    return [
      "No urgent trade signal.",
      "Keep on watchlist only if a catalyst exists.",
      "Wait for trend or volume confirmation.",
    ];
  }

  return [
    "Avoid forcing a trade.",
    "Wait for clearer accumulation, stronger trend, or better volume.",
    "Preserve capital and review stronger tickers.",
  ];
}

export function analyzeMoneyFlow({
  ticker = "TSLA",
  candles = [],
  riskTolerance = "medium",
  experience = "beginner",
}) {
  const cleanCandles = Array.isArray(candles)
    ? candles
        .map((candle) => ({
          time: candle.time,
          open: Number(candle.open || 0),
          high: Number(candle.high || 0),
          low: Number(candle.low || 0),
          close: Number(candle.close || 0),
          volume: Number(candle.volume || 0),
        }))
        .filter((candle) => candle.close > 0)
    : [];

  if (!cleanCandles.length) {
    return {
      success: false,
      ticker,
      message: "No candle data available for MoneyFlow analysis.",
    };
  }

  const closes = cleanCandles.map((candle) => candle.close);
  const latestPrice = closes[closes.length - 1];

  const trend = calculateTrend(closes);
  const volumePressure = calculateVolumePressure(cleanCandles);
  const accumulation = calculateAccumulation(cleanCandles);
  const momentum = calculateMomentum(closes);
  const rsi = calculateRSI(closes);

  let rsiScore = 0;

  if (rsi >= 70) rsiScore = -8;
  else if (rsi >= 55) rsiScore = 12;
  else if (rsi >= 45) rsiScore = 4;
  else if (rsi <= 30) rsiScore = -10;
  else rsiScore = -2;

  const rawScore =
    50 +
    trend.score +
    volumePressure.score +
    accumulation.score +
    momentum.score +
    rsiScore;

  const moneyFlowScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const classification = classifyMoneyFlow(moneyFlowScore, rsi);

  const institutionalClue =
    accumulation.label.includes("ACCUMULATION") &&
    volumePressure.relativeVolume >= 1.1
      ? "Possible institutional-style accumulation clue. Needs confirmation."
      : accumulation.label.includes("DISTRIBUTION")
        ? "Possible distribution pressure. Avoid forcing long entries."
        : "No strong institutional-style clue detected.";

  const riskLevel =
    moneyFlowScore >= 70 && rsi >= 70
      ? "High — extended move risk"
      : moneyFlowScore >= 65
        ? "Medium-high"
        : moneyFlowScore <= 35
          ? "High — weak flow"
          : "Medium";

  return {
    success: true,
    ticker: String(ticker).toUpperCase(),
    latestPrice: round(latestPrice),
    moneyFlowScore,
    classification,
    signal:
      moneyFlowScore >= 70
        ? "WATCH_FOR_CONFIRMATION"
        : moneyFlowScore >= 55
          ? "ADD_TO_WATCHLIST"
          : moneyFlowScore >= 40
            ? "WAIT"
            : "AVOID_FOR_NOW",
    trend,
    volumePressure,
    accumulation,
    momentum,
    rsi,
    institutionalClue,
    riskLevel,
    actionPlan: buildActionPlan({
      classification,
      rsi,
      riskTolerance,
      experience,
    }),
    guardrails: [
      "No guaranteed outcomes.",
      "No all-in trades.",
      "Do not trade only from one signal.",
      "Confirm with trend, volume, catalyst, and risk sizing.",
      "Paper trade unclear setups first.",
    ],
    disclaimer:
      "AstraMind MoneyFlow is educational decision-support. It does not guarantee profits, predict markets with certainty, or replace licensed financial advice.",
  };
}