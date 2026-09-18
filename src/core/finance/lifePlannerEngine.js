const number = (value) => Math.max(0, Number(value) || 0);
const round = (value) => Math.round(value * 100) / 100;

export function analyzeLedger(transactions = []) {
  const income = transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const net = income - expenses;
  const savingsRate = income ? (net / income) * 100 : 0;
  return {
    income: round(income),
    expenses: round(expenses),
    net: round(net),
    savingsRate: round(savingsRate),
    health: net < 0 ? "Needs attention" : savingsRate >= 20 ? "Strong trajectory" : "Building momentum",
  };
}

export function buildTripBudget(input = {}) {
  const travelers = Math.max(1, Math.round(number(input.travelers) || 1));
  const days = Math.max(1, Math.round(number(input.days) || 1));
  const lodging = number(input.lodgingPerNight) * Math.max(1, days - 1);
  const food = number(input.foodPerPersonDay) * travelers * days;
  const transit = number(input.transportPerPerson) * travelers;
  const activities = number(input.activitiesPerPersonDay) * travelers * days;
  const rental = number(input.rentalDaily) * days;
  const subtotal = lodging + food + transit + activities + rental;
  const contingency = subtotal * (number(input.contingencyPercent) / 100);
  const total = subtotal + contingency;
  const saved = number(input.alreadySaved);
  const weeks = Math.max(1, Math.round(number(input.weeksUntilTrip) || 1));
  return {
    travelers,
    days,
    breakdown: { lodging: round(lodging), food: round(food), transit: round(transit), activities: round(activities), rental: round(rental), contingency: round(contingency) },
    total: round(total),
    remaining: round(Math.max(0, total - saved)),
    weeklyTarget: round(Math.max(0, total - saved) / weeks),
  };
}

export function compareCarRental(input = {}) {
  const days = Math.max(1, Math.round(number(input.days) || 1));
  const base = number(input.dailyRate) * days;
  const insurance = number(input.insuranceDaily) * days;
  const taxesAndFees = base * (number(input.feePercent) / 100);
  const fuel = number(input.miles) / Math.max(1, number(input.mpg) || 25) * number(input.gasPrice);
  return {
    base: round(base), insurance: round(insurance), taxesAndFees: round(taxesAndFees), fuel: round(fuel),
    total: round(base + insurance + taxesAndFees + fuel + number(input.parkingTolls)),
    checks: ["Compare the all-in price, not the advertised daily rate.", "Verify mileage, deposit, fuel, toll, and cancellation policies.", "Check whether your card or personal policy already includes rental coverage."],
  };
}

export function buildInvestorGuardrails(input = {}) {
  const capital = number(input.capital);
  const emergencyMonths = number(input.emergencyMonths);
  const horizon = number(input.horizonYears);
  const risk = input.risk || "balanced";
  const profiles = {
    conservative: { foundation: 75, growth: 15, speculative: 0, cash: 10 },
    balanced: { foundation: 65, growth: 25, speculative: 5, cash: 5 },
    growth: { foundation: 50, growth: 35, speculative: 10, cash: 5 },
  };
  const allocation = { ...(profiles[risk] || profiles.balanced) };
  if (emergencyMonths < 3 || horizon < 2) {
    allocation.cash += allocation.speculative + 10;
    allocation.foundation -= 10;
    allocation.speculative = 0;
  }
  return {
    allocation,
    dollars: Object.fromEntries(Object.entries(allocation).map(([key, value]) => [key, round(capital * value / 100)])),
    posture: emergencyMonths < 3 ? "Stabilize before taking market risk" : horizon < 2 ? "Preserve near-term capital" : "Diversify for the stated horizon",
    rules: ["Research fees, liquidity, concentration, and downside before any purchase.", "Treat individual stocks and crypto as higher-risk satellite positions.", "Never invest money required for bills, emergencies, or near-term travel."],
  };
}
