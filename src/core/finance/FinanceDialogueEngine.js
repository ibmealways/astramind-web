import { analyzeLedger, buildInvestorGuardrails } from "./lifePlannerEngine.js";

const clean = (value, limit = 5000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

function normalizedLedger(transactions = []) {
  return (Array.isArray(transactions) ? transactions : []).map((entry, index) => {
    const category = clean(entry?.category || entry?.type, 40).toLowerCase();
    const raw = Number(entry?.amount || 0);
    const amount = category === "expense" ? -Math.abs(raw) : category === "income" ? Math.abs(raw) : raw;
    return { id: entry?.id || `entry-${index + 1}`, description: clean(entry?.description || "Unlabeled transaction", 160), amount: Number.isFinite(amount) ? amount : 0 };
  }).filter(({ amount }) => amount !== 0);
}

function largestExpenses(transactions) {
  return transactions.filter(({ amount }) => amount < 0).sort((left, right) => left.amount - right.amount).slice(0, 3);
}

function requestedAmount(message) {
  const match = message.match(/\$\s*([\d,]+(?:\.\d{1,2})?)|\b([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd)\b/i);
  return Number(String(match?.[1] || match?.[2] || "").replace(/,/g, "")) || 0;
}

function requestedMonths(message, fallback = 3) {
  const numeric = message.match(/\b(\d+(?:\.\d+)?)\s*months?\b/i);
  if (numeric) return Math.max(1, Math.min(120, Math.round(Number(numeric[1]))));
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  const named = message.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)[ -]months?\b/i);
  return named ? words[named[1].toLowerCase()] : fallback;
}

function ledgerHeader(summary, transactions) {
  return `### Local financial snapshot\n\n- Income: **${money(summary.income)}**\n- Expenses: **${money(summary.expenses)}**\n- Available monthly cash flow: **${money(summary.net)}**\n- Savings rate: **${percent(summary.savingsRate)}**\n- Ledger records analyzed: **${transactions.length}**`;
}

function budgetAnswer(summary, transactions) {
  const top = largestExpenses(transactions);
  const risk = summary.net < 0 ? "Spending currently exceeds recorded income." : summary.savingsRate < 10 ? "The current margin is thin and vulnerable to irregular expenses." : summary.savingsRate < 20 ? "Cash flow is positive, but reserve-building can be strengthened." : "The recorded monthly margin supports deliberate saving if the ledger is complete.";
  return `${ledgerHeader(summary, transactions)}\n\n### Budget guidance\n\n**Current signal:** ${risk}\n\n**Largest recorded outflows:**\n${top.length ? top.map((entry, index) => `${index + 1}. ${entry.description}: ${money(Math.abs(entry.amount))}`).join("\n") : "No expense records were supplied."}\n\n**90-day route:**\n1. Confirm the ledger includes housing, utilities, food, transportation, insurance, minimum debt payments, and irregular annual costs.\n2. Protect required bills first; review the three largest flexible outflows for a realistic reduction.\n3. Automate a transfer no greater than the verified monthly surplus of ${money(Math.max(0, summary.net))}.\n4. Reconcile actual transactions weekly and revise the plan rather than borrowing to preserve an unrealistic target.`;
}

function emergencyAnswer(message, summary, transactions, context) {
  const months = requestedMonths(message, 3);
  const reserve = Math.max(0, Number(context?.cash || context?.emergencySavings || 0));
  const target = summary.expenses * months;
  const gap = Math.max(0, target - reserve);
  const contribution = Math.max(0, summary.net);
  const monthsToFund = contribution > 0 ? Math.ceil(gap / contribution) : null;
  return `${ledgerHeader(summary, transactions)}\n\n### ${months}-month emergency-fund path\n\n- Modeled target: **${money(target)}**\n- Entered accessible reserve: **${money(reserve)}**\n- Remaining gap: **${money(gap)}**\n- Maximum contribution supported by this ledger: **${money(contribution)}/month**\n- Estimated time at that contribution: **${gap === 0 ? "Target met" : monthsToFund ? `${monthsToFund} months` : "Not currently fundable"}**\n\nKeep emergency savings accessible and low-volatility. If the entered reserve is incomplete, update it before relying on this timeline. A negative or zero surplus must be corrected before automating the contribution.`;
}

function tripAnswer(message, summary, transactions) {
  const target = requestedAmount(message);
  const months = requestedMonths(message, 4);
  if (!target) return `${ledgerHeader(summary, transactions)}\n\n### Trip-affordability input needed\n\nProvide the all-in trip target and deadline—for example, \`Can I afford a $2,500 trip in four months?\` Use Trip Planner to calculate transportation, lodging, meals, activities, fees, and contingency before treating the target as complete.`;
  const required = target / months;
  const remaining = summary.net - required;
  const affordable = summary.net > 0 && remaining >= 0;
  return `${ledgerHeader(summary, transactions)}\n\n### Trip affordability: ${money(target)} in ${months} months\n\n- Required monthly trip deposit: **${money(required)}**\n- Recorded monthly surplus: **${money(summary.net)}**\n- Surplus after trip deposit: **${money(remaining)}**\n- Planning result: **${affordable ? "Feasible from the recorded cash flow" : "Not feasible without changing cost, timing, or cash flow"}**\n\nThis result assumes the ledger is complete and the trip target includes taxes, baggage, local transportation, lodging, food, activities, insurance, and contingency. Verify live prices in Trip Planner before purchasing.`;
}

function debtAnswer(summary, transactions, context) {
  const debt = Math.max(0, Number(context?.debt || 0));
  const apr = Math.max(0, Number(context?.debtApr || 0));
  return `${ledgerHeader(summary, transactions)}\n\n### Debt decision boundary\n\n- Debt entered: **${money(debt)}**\n- APR entered: **${apr ? percent(apr) : "Not supplied"}**\n- Cash available after recorded expenses: **${money(Math.max(0, summary.net))}/month**\n\n${!debt || !apr ? "Enter each balance, APR, minimum payment, and whether it is secured before AstraMind ranks a payoff route." : apr >= 8 ? "Preserve a starter emergency reserve and compare directing additional cash toward the highest APR balance while keeping every minimum payment current." : "Compare the guaranteed interest saved from extra payments with other goals, liquidity needs, taxes, and any employer retirement match."}\n\nAstraMind does not negotiate, refinance, or move money. Confirm payoff terms and penalties with each creditor.`;
}

function investingAnswer(summary, transactions, context) {
  const profile = context?.investor || {};
  const guardrails = buildInvestorGuardrails(profile);
  return `${ledgerHeader(summary, transactions)}\n\n### Educational investor guardrails\n\n**Posture:** ${guardrails.posture}\n\n${Object.entries(guardrails.allocation).map(([key, value]) => `- ${key}: ${value}% (${money(guardrails.dollars[key])})`).join("\n")}\n\n${guardrails.rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}\n\nThis is a risk framework, not a recommendation to buy a security. Current prices, company claims, IPO schedules, and crypto data must come from the licensed Pro Markets feed and be independently verified.`;
}

function retirementAnswer(summary, transactions) {
  return `${ledgerHeader(summary, transactions)}\n\n### Retirement readiness handoff\n\nThe ledger establishes an estimated contribution ceiling of **${money(Math.max(0, summary.net))}/month**, but a defensible retirement projection also requires current age, target retirement age, retirement balances, contribution and employer match, expected spending, healthcare, Social Security estimate, pension or other income, fees, inflation, and return assumptions.\n\nOpen **Wealth + Retirement**, import this ledger, enter those values, and compare conservative, planned, and optimistic scenarios. Results are hypothetical and not guaranteed.`;
}

export function generateLocalFinanceDialogue({ message, transactions = [], context = {} } = {}) {
  const question = clean(message);
  const ledger = normalizedLedger(transactions);
  const summary = analyzeLedger(ledger);
  const lower = question.toLowerCase();
  let text;
  if (/retire|401\s*\(?k\)?|pension|social security/.test(lower)) text = retirementAnswer(summary, ledger);
  else if (/trip|travel|vacation|cruise|flight|hotel/.test(lower)) text = tripAnswer(question, summary, ledger);
  else if (/emergency|rainy day|reserve/.test(lower)) text = emergencyAnswer(question, summary, ledger, context);
  else if (/debt|credit card|loan|apr|payoff/.test(lower)) text = debtAnswer(summary, ledger, context);
  else if (/stock|crypto|invest|portfolio|etf|nasdaq|s&p|ipo/.test(lower)) text = investingAnswer(summary, ledger, context);
  else text = budgetAnswer(summary, ledger);
  return {
    ok: true,
    reply: `${text}\n\n---\n*Generated by AstraMind's governed local Finance engine from the values supplied. Educational guidance only; results are not guaranteed and are not fiduciary, tax, legal, lending, booking, or investment advice.*`,
    source: "ASTRAMIND_LOCAL_FINANCE",
    engine: "finance-dialogue-v1",
    summary,
    providerRequired: false,
  };
}

export default generateLocalFinanceDialogue;
