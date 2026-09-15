export function generateWealthRoute({
  goal = "",
  startingCapital = 100,
  weeklyDeposit = 30,
  riskTolerance = "medium",
  experience = "beginner",
}) {
  const capital = Number(startingCapital);
  const deposit = Number(weeklyDeposit);

  let route = "incomeGrowth";
  let riskLevel = "Medium";
  let timeframe = "3–12 months";
  let reasoning = "";

  if (capital < 250 && experience === "beginner") {
    route = "incomeGrowth";
    riskLevel = "Medium";
    reasoning =
      "Starting capital is small, so the strongest route is combining weekly deposits, side-income growth, and paper trading before increasing live trade size.";
  } else if (riskTolerance === "low") {
    route = "safeGrowth";
    riskLevel = "Low to Medium";
    reasoning =
      "Lower-risk users should prioritize recurring investments, broad ETFs, and capital preservation.";
  } else if (riskTolerance === "high" && experience !== "beginner") {
    route = "skillGrowth";
    riskLevel = "High";
    reasoning =
      "Higher-risk users with some experience may focus more on active trading, but only with strict stop-loss and position-size rules.";
  } else {
    route = "hybridGrowth";
    riskLevel = "Medium";
    reasoning =
      "A hybrid strategy balances long-term investing, controlled trading practice, and weekly capital building.";
  }

  return {
    success: true,
    disclaimer:
      "Aigenikz is a financial education and decision-support tool. It does not guarantee profits or replace licensed financial advice.",
    userGoal: goal,
    recommendedRoute: route,
    riskLevel,
    estimatedTimeframe: timeframe,
    reasoning,
    capitalPlan: {
      startingCapital: capital,
      weeklyDeposit: deposit,
      suggestedAllocation: {
        longTermFoundation: Math.round(capital * 0.6),
        skillTradingPool: Math.round(capital * 0.3),
        cashReserve: Math.round(capital * 0.1),
      },
    },
    weeklyActionPlan: [
      "Add weekly deposit consistently.",
      "Keep 60% in long-term foundation assets.",
      "Use 30% for paper trading or very small controlled trades.",
      "Log every trade idea before entering.",
      "Review progress every Sunday.",
    ],
    guardrails: [
      "No profit guarantees.",
      "No all-in trades.",
      "No options trading for beginners.",
      "No trading money needed for bills.",
      "Stop after 2 losses in one day.",
    ],
    nextBestStep:
      "Complete the risk profile, set a weekly deposit amount, and begin with paper trading until consistency is proven.",
  };
}