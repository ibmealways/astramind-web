const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export function createPortfolioBlueprint(input = {}) {
  const capital = clamp(input.capital, 0, 100000000);
  const horizon = clamp(input.horizonYears, 0, 60);
  const emergencyMonths = clamp(input.emergencyMonths, 0, 24);
  const risk = input.risk || "balanced";
  const templates = {
    conservative: { broadMarket: 35, growthIndex: 10, bonds: 35, cash: 18, crypto: 2 },
    balanced: { broadMarket: 50, growthIndex: 20, bonds: 18, cash: 7, crypto: 5 },
    growth: { broadMarket: 48, growthIndex: 30, bonds: 7, cash: 5, crypto: 10 },
  };
  const allocation = { ...(templates[risk] || templates.balanced) };
  if (!input.includeCrypto) { allocation.broadMarket += allocation.crypto; allocation.crypto = 0; }
  if (emergencyMonths < 3 || horizon < 2) {
    allocation.cash += allocation.crypto + 10;
    allocation.broadMarket = Math.max(0, allocation.broadMarket - 5);
    allocation.growthIndex = Math.max(0, allocation.growthIndex - 5);
    allocation.crypto = 0;
  }
  const labels = {
    broadMarket: "Broad U.S. market / S&P 500-style core",
    growthIndex: "Nasdaq-style growth satellite",
    bonds: "Investment-grade bond ballast",
    cash: "Cash / Treasury reserve",
    crypto: "High-risk crypto satellite",
  };
  const sleeves = Object.entries(allocation).filter(([,percent])=>percent>0).map(([key,percent])=>({ key, label: labels[key], percent, amount: Math.round(capital*percent/100), examples: ({ broadMarket:"Research examples: VTI, ITOT, VOO, SPY", growthIndex:"Research examples: QQQM, QQQ", bonds:"Research examples: BND, AGG, Treasury funds", cash:"Research examples: insured savings, Treasury bills, money-market funds", crypto:"Research examples: BTC and ETH only after suitability review" })[key] }));
  return { sleeves, posture: emergencyMonths < 3 ? "Reserve-first posture" : horizon < 2 ? "Capital-preservation posture" : `${risk[0].toUpperCase()+risk.slice(1)} diversified posture`, rebalance: risk === "growth" ? "Quarterly review" : "Semiannual review", rules: ["Use diversified funds as the core; research individual stocks as a limited satellite.", "Compare expense ratios, spreads, taxes, liquidity, concentration, and drawdowns.", "Dollar-cost averaging reduces timing pressure but does not prevent losses.", "An IPO has limited operating history and may be unusually volatile; watch before acting."] };
}

