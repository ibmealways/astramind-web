const APPROVED_ASSETS = ["TSLA", "NVDA", "AAPL", "MSFT", "VOO", "SPY", "QQQ"];

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeTicker(value) {
  return String(value || "").toUpperCase().trim();
}

export function generateMarketMentorReply({
  question = "",
  ticker = "",
  accountSize = 100,
  weeklyDeposit = 30,
  riskTolerance = "medium",
  experience = "beginner",
}) {
  const symbol = normalizeTicker(ticker);
  const cleanQuestion = normalizeText(question);

  const isBuyQuestion =
    cleanQuestion.includes("buy") ||
    cleanQuestion.includes("entry") ||
    cleanQuestion.includes("should i get in") ||
    cleanQuestion.includes("should i invest");

  const isSellQuestion =
    cleanQuestion.includes("sell") ||
    cleanQuestion.includes("exit") ||
    cleanQuestion.includes("take profit") ||
    cleanQuestion.includes("cut loss");

  const isLongTermQuestion =
    cleanQuestion.includes("long term") ||
    cleanQuestion.includes("retirement") ||
    cleanQuestion.includes("hold") ||
    cleanQuestion.includes("weekly");

  const approved = !symbol || APPROVED_ASSETS.includes(symbol);

  if (!approved) {
    return {
      success: true,
      mode: "AstraMind MarketMentor AI",
      disclaimer:
        "Educational decision-support only. AstraMind does not guarantee profit, predict markets with certainty, or replace licensed financial advice.",
      answerType: "Asset outside approved beginner watchlist",
      ticker: symbol,
      signal: "WATCHLIST_REJECTED",
      riskLevel: "Unknown",
      guidance: [
        `${symbol} is outside the beginner-approved AstraMind watchlist.`,
        "Research the company, volatility, earnings dates, news catalysts, and liquidity first.",
        "Avoid random tickers until the subscriber has proven consistency through paper trading.",
      ],
      nextBestStep:
        "Start with the approved watchlist: TSLA, NVDA, AAPL, MSFT, VOO, SPY, or QQQ.",
    };
  }

  let recommendedRoute = "Research + Risk Route";
  let signal = "RESEARCH_MODE";
  let riskLevel = "Medium";
  let guidance = [];

  if (isBuyQuestion) {
    recommendedRoute = "Break + Pullback Confirmation Route";
    signal = "WAIT_FOR_CONFIRMATION";
    guidance = [
      "Do not buy only because the ticker is popular or moving fast.",
      "Check the daily trend first, then the 5-minute chart for trade timing.",
      "Look for higher highs, stronger volume, and a controlled pullback.",
      "Enter only after confirmation, not during emotional spikes.",
      "Use the risk calculator before placing the trade.",
      "If the setup is unclear, paper trade it instead of using real money.",
    ];
  } else if (isSellQuestion) {
    recommendedRoute = "Risk-Controlled Exit Route";
    signal = "REVIEW_EXIT_PLAN";
    guidance = [
      "Compare the current price to the original entry, target, and stop-loss.",
      "If the trade is near target, consider taking partial profit.",
      "If the original setup failed, protect capital first.",
      "Do not move the stop-loss farther away just to avoid taking a loss.",
      "Log the trade result so AstraMind can help improve future decisions.",
    ];
  } else if (isLongTermQuestion) {
    recommendedRoute = "Long-Term Foundation Route";
    signal = "BUILD_POSITION_SLOWLY";
    guidance = [
      "Use recurring contributions instead of trying to time every move.",
      "Favor broad-market foundation assets like VOO, SPY, or QQQ for long-term structure.",
      "Keep speculative trades separate from long-term investments.",
      "Review progress weekly, not emotionally every hour.",
      "Increase contributions before increasing risk.",
    ];
  } else {
    recommendedRoute = "Research + Risk Route";
    signal = "CLARIFY_PLAN";
    guidance = [
      "Clarify whether this is a long-term investment, swing trade, or paper trade.",
      "Check trend, volume, recent news, market direction, and upcoming earnings.",
      "Compare the higher-risk route against a safer ETF route.",
      "Build the plan before entering any position.",
      "Use TradePilot to calculate position size and risk before acting.",
    ];
  }

  if (riskTolerance === "high") riskLevel = "Medium-High";
  if (riskTolerance === "low") riskLevel = "Low-Medium";
  if (experience === "beginner" && isBuyQuestion) riskLevel = "High for beginner";

  return {
    success: true,
    mode: "AstraMind MarketMentor AI",
    disclaimer:
      "Educational decision-support only. AstraMind does not guarantee profits, predict markets with certainty, or replace licensed financial advice.",
    ticker: symbol || "No ticker provided",
    userQuestion: question,
    recommendedRoute,
    signal,
    riskLevel,
    guidance,
    accountContext: {
      accountSize: Number(accountSize),
      weeklyDeposit: Number(weeklyDeposit),
      riskTolerance,
      experience,
    },
    guardrails: [
      "No guaranteed outcomes.",
      "No all-in trades.",
      "No options trading for beginners.",
      "No trading with bill money.",
      "Paper trade unclear setups first.",
    ],
    nextBestStep:
      "Run the TradePilot risk calculator, confirm the setup, then paper trade before using real money.",
  };
}