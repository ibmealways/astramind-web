const n = (value) => Math.max(0, Number(value) || 0);
const round = (value) => Math.round(Number(value) || 0);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function projectBalance({
  startingBalance,
  monthlyContribution,
  months,
  annualReturn,
  annualFees = 0,
  annualContributionIncrease = 0,
}) {
  const monthlyRate = Math.max(-0.99, annualReturn - annualFees) / 12;
  let balance = n(startingBalance);
  for (let month = 0; month < months; month += 1) {
    const contribution = n(monthlyContribution) * Math.pow(1 + annualContributionIncrease, Math.floor(month / 12));
    balance = Math.max(0, balance * (1 + monthlyRate) + contribution);
  }
  return balance;
}

function annuityPresentValue(monthlyNeed, months, realAnnualReturn) {
  if (monthlyNeed <= 0 || months <= 0) return 0;
  const monthlyRate = Math.pow(1 + realAnnualReturn, 1 / 12) - 1;
  if (Math.abs(monthlyRate) < 0.0000001) return monthlyNeed * months;
  return monthlyNeed * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
}

function requiredPersonalContribution({ target, startingBalance, employerContribution, months, annualReturn, annualFees, annualContributionIncrease }) {
  if (projectBalance({ startingBalance, monthlyContribution: employerContribution, months, annualReturn, annualFees, annualContributionIncrease }) >= target) return 0;
  let low = 0;
  let high = 100000;
  for (let index = 0; index < 60; index += 1) {
    const midpoint = (low + high) / 2;
    const projected = projectBalance({ startingBalance, monthlyContribution: midpoint + employerContribution, months, annualReturn, annualFees, annualContributionIncrease });
    if (projected >= target) high = midpoint;
    else low = midpoint;
  }
  return high;
}

function simulateFundedThroughAge({ balance, retirementAge, planningAge, monthlySpending, monthlyIncome, annualReturn, annualFees, inflation, incomeCola }) {
  let remaining = Math.max(0, balance);
  let spending = Math.max(0, monthlySpending);
  let income = Math.max(0, monthlyIncome);
  const monthlyRate = Math.max(-0.99, annualReturn - annualFees) / 12;
  const months = Math.max(0, Math.round((planningAge - retirementAge) * 12));
  for (let month = 0; month < months; month += 1) {
    if (month > 0 && month % 12 === 0) {
      spending *= 1 + inflation;
      income *= 1 + incomeCola;
    }
    remaining = remaining * (1 + monthlyRate) - Math.max(0, spending - income);
    if (remaining <= 0) return retirementAge + month / 12;
  }
  return planningAge;
}

function scenarioProjection({ name, preReturn, retirementReturn, inflation, context }) {
  const projectedBalance = projectBalance({
    startingBalance: context.startingBalance,
    monthlyContribution: context.personalContribution + context.employerContribution,
    months: context.monthsToRetirement,
    annualReturn: preReturn,
    annualFees: context.fees,
    annualContributionIncrease: context.contributionIncrease,
  });
  const inflationFactor = Math.pow(1 + inflation, context.yearsToRetirement);
  const monthlySpendingAtRetirement = (context.retirementSpendingToday + context.healthcareToday) * inflationFactor;
  const monthlyIncomeAtRetirement = context.socialSecurity + context.pension + context.otherIncome;
  const monthlyGap = Math.max(0, monthlySpendingAtRetirement - monthlyIncomeAtRetirement);
  const realAnnualReturn = Math.max(-0.1, Math.min(0.15, ((1 + Math.max(-0.99, retirementReturn - context.fees)) / (1 + inflation)) - 1));
  const requiredNestEgg = annuityPresentValue(monthlyGap, context.retirementMonths, realAnnualReturn) + context.legacyGoal / Math.pow(1 + Math.max(0, realAnnualReturn), context.retirementYears);
  const shortfall = Math.max(0, requiredNestEgg - projectedBalance);
  const fundingRatio = requiredNestEgg > 0 ? projectedBalance / requiredNestEgg : 1;
  const fundedThroughAge = simulateFundedThroughAge({
    balance: projectedBalance,
    retirementAge: context.retirementAge,
    planningAge: context.planningAge,
    monthlySpending: monthlySpendingAtRetirement,
    monthlyIncome: monthlyIncomeAtRetirement,
    annualReturn: retirementReturn,
    annualFees: context.fees,
    inflation,
    incomeCola: context.incomeCola,
  });
  return {
    name,
    preReturnPercent: round(preReturn * 1000) / 10,
    retirementReturnPercent: round(retirementReturn * 1000) / 10,
    inflationPercent: round(inflation * 1000) / 10,
    projectedBalance: round(projectedBalance),
    requiredNestEgg: round(requiredNestEgg),
    monthlySpendingAtRetirement: round(monthlySpendingAtRetirement),
    monthlyIncomeAtRetirement: round(monthlyIncomeAtRetirement),
    monthlyGap: round(monthlyGap),
    shortfall: round(shortfall),
    surplus: round(Math.max(0, projectedBalance - requiredNestEgg)),
    fundingRatio: Math.round(fundingRatio * 100),
    fundedThroughAge: Math.floor(fundedThroughAge * 10) / 10,
    status: fundingRatio >= 1 ? "On track under these assumptions" : fundingRatio >= 0.85 ? "Close—review contribution or timing" : "Projected funding gap",
  };
}

export function buildRetirementPlan(input = {}) {
  const currentAge = clamp(input.currentAge || 40, 18, 100);
  const retirementAge = clamp(Math.max(currentAge + 1, n(input.retirementAge) || 67), currentAge + 1, 100);
  const planningAge = clamp(Math.max(retirementAge + 1, n(input.planningAge) || 95), retirementAge + 1, 120);
  const yearsToRetirement = retirementAge - currentAge;
  const retirementYears = planningAge - retirementAge;
  const monthlyIncome = n(input.monthlyIncome);
  const monthlyExpenses = n(input.monthlyExpenses);
  const monthlyFree = Math.max(0, monthlyIncome - monthlyExpenses);
  const personalContribution = has(input, "monthlyRetirementContribution") ? n(input.monthlyRetirementContribution) : monthlyFree;
  const employerContribution = n(input.monthlyEmployerContribution);
  const startingBalance = n(input.retirementSavings) + n(input.investments);
  const preReturn = clamp(has(input, "preRetirementReturnPercent") ? input.preRetirementReturnPercent : 6, 0, 15) / 100;
  const retirementReturn = clamp(has(input, "retirementReturnPercent") ? input.retirementReturnPercent : 4, 0, 12) / 100;
  const inflation = clamp(has(input, "inflationPercent") ? input.inflationPercent : 2.5, 0, 10) / 100;
  const fees = clamp(has(input, "annualFeesPercent") ? input.annualFeesPercent : 0.5, 0, 5) / 100;
  const contributionIncrease = clamp(has(input, "annualContributionIncreasePercent") ? input.annualContributionIncreasePercent : 0, 0, 15) / 100;
  const context = {
    currentAge,
    retirementAge,
    planningAge,
    yearsToRetirement,
    retirementYears,
    monthsToRetirement: Math.round(yearsToRetirement * 12),
    retirementMonths: Math.round(retirementYears * 12),
    startingBalance,
    personalContribution,
    employerContribution,
    retirementSpendingToday: has(input, "retirementSpendingToday") ? n(input.retirementSpendingToday) : monthlyExpenses * 0.8,
    healthcareToday: n(input.retirementHealthcareToday),
    socialSecurity: n(input.socialSecurityMonthly),
    pension: n(input.pensionMonthly),
    otherIncome: n(input.otherRetirementIncomeMonthly),
    legacyGoal: n(input.legacyGoal),
    fees,
    contributionIncrease,
    incomeCola: clamp(has(input, "retirementIncomeColaPercent") ? input.retirementIncomeColaPercent : 0, 0, 10) / 100,
  };
  const scenarios = [
    scenarioProjection({ name: "Conservative", preReturn: Math.max(0, preReturn - 0.02), retirementReturn: Math.max(0, retirementReturn - 0.015), inflation: Math.min(0.1, inflation + 0.005), context }),
    scenarioProjection({ name: "Planned", preReturn, retirementReturn, inflation, context }),
    scenarioProjection({ name: "Optimistic", preReturn: Math.min(0.15, preReturn + 0.02), retirementReturn: Math.min(0.12, retirementReturn + 0.015), inflation: Math.max(0, inflation - 0.005), context }),
  ];
  const planned = scenarios[1];
  const requiredMonthlyContribution = requiredPersonalContribution({
    target: planned.requiredNestEgg,
    startingBalance,
    employerContribution,
    months: context.monthsToRetirement,
    annualReturn: preReturn,
    annualFees: fees,
    annualContributionIncrease: contributionIncrease,
  });
  const contributionGap = Math.max(0, requiredMonthlyContribution - personalContribution);
  const affordableContribution = Math.min(monthlyFree, personalContribution);
  const actions = [];
  if (monthlyIncome <= monthlyExpenses) actions.push("Create positive monthly cash flow before increasing long-term contributions.");
  if (n(input.debt) > 0 && n(input.debtApr) >= 8) actions.push("Compare additional retirement contributions with a high-interest debt payoff plan; keep any available employer match in view.");
  if (n(input.cash) < monthlyExpenses * Math.max(1, n(input.emergencyMonths) || 3)) actions.push("Build or protect an accessible emergency reserve so retirement assets are less likely to be tapped early.");
  if (employerContribution > 0) actions.push("Confirm contribution and vesting rules with the employer plan administrator and capture the available match when affordable.");
  if (contributionGap > 0) actions.push(`The planned scenario requires about $${round(requiredMonthlyContribution).toLocaleString()} per month from you—approximately $${round(contributionGap).toLocaleString()} above the entered contribution.`);
  else actions.push("The entered contribution meets the planned scenario under the selected assumptions; review it at least annually.");
  actions.push("Replace the Social Security estimate with the amount from your personal SSA earnings record and selected claiming age.");
  actions.push("Review taxes, account types, healthcare, insurance, beneficiaries, estate documents, and withdrawal sequencing with qualified professionals.");
  const warnings = [];
  if (personalContribution > monthlyFree) warnings.push("The entered retirement contribution exceeds calculated free monthly cash flow.");
  if (!context.socialSecurity && !context.pension && !context.otherIncome) warnings.push("No retirement income was entered, so investments are modeled as funding the entire retirement spending gap.");
  if (yearsToRetirement < 5) warnings.push("A short time to retirement makes results especially sensitive to market returns, spending, and timing.");
  return {
    currentAge,
    retirementAge,
    planningAge,
    yearsToRetirement,
    retirementYears,
    monthlyFree: round(monthlyFree),
    startingBalance: round(startingBalance),
    personalContribution: round(personalContribution),
    employerContribution: round(employerContribution),
    affordableContribution: round(affordableContribution),
    requiredMonthlyContribution: round(requiredMonthlyContribution),
    contributionGap: round(contributionGap),
    planned,
    scenarios,
    actions,
    warnings,
    assumptions: {
      contributionTiming: "Monthly, end of period",
      spendingBasis: "Retirement spending and healthcare are entered in today's dollars and inflated to retirement.",
      incomeBasis: "Social Security, pension, and other retirement income are entered as expected monthly amounts at retirement start.",
      taxes: "Not modeled",
      guarantees: "None",
    },
    disclaimer: "Educational guidance only. Results are hypothetical, sensitive to the values entered, and not guaranteed. AstraMind does not provide fiduciary, tax, legal, or regulated investment advice.",
  };
}

export function buildWealthNavigation(input = {}) {
  const income = n(input.monthlyIncome);
  const expenses = n(input.monthlyExpenses);
  const cash = n(input.cash);
  const investments = n(input.investments) + n(input.retirementSavings);
  const debt = n(input.debt);
  const target = n(input.goal);
  const months = Math.max(1, n(input.months) || 1);
  const annualReturn = Math.min(0.12, n(input.returnPercent) / 100);
  const monthlyFree = Math.max(0, income - expenses);
  const netWorth = cash + investments - debt;
  const emergencyTarget = expenses * Math.max(1, n(input.emergencyMonths) || 3);
  const emergencyGap = Math.max(0, emergencyTarget - cash);
  const monthlyGoal = Math.max(0, (target - cash) / months);
  const monthlyRate = annualReturn / 12;
  const projected = monthlyRate ? investments * Math.pow(1 + monthlyRate, months) + monthlyFree * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) : investments + monthlyFree * months;
  const phase = debt > 0 && n(input.debtApr) >= 8 ? "Debt defense" : emergencyGap > 0 ? "Reserve construction" : "Wealth expansion";
  const actions = phase === "Debt defense" ? ["Keep minimum payments current on every debt.", "Direct extra cash to the highest APR balance first.", "Maintain a starter reserve to avoid new high-cost debt."] : phase === "Reserve construction" ? ["Automate the reserve contribution after each payday.", "Hold emergency funds in accessible, low-volatility accounts.", "Continue any employer retirement match if affordable."] : ["Define goal-specific accounts and deadlines.", "Automate diversified long-horizon investing.", "Review insurance, beneficiaries, taxes, and estate documents annually."];
  return { monthlyFree: round(monthlyFree), netWorth: round(netWorth), emergencyTarget: round(emergencyTarget), emergencyGap: round(emergencyGap), monthlyGoal: round(monthlyGoal), projected: round(projected), phase, actions };
}
