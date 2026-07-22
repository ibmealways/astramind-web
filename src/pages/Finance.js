import React, { useEffect, useMemo, useState } from "react";
import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";
import { analyzeLedger, buildInvestorGuardrails, buildTripBudget, compareCarRental } from "../core/finance/lifePlannerEngine.js";
import { generateLocalFinanceDialogue } from "../core/finance/FinanceDialogueEngine.js";
import FinanceTradePilot from "./modules/FinanceTradePilot.js";
import "../styles/finance-realm.css";

const seed = [
  { id: "seed-income", date: "2026-07-01", description: "Creator income", category: "Income", amount: 2000 },
  { id: "seed-expense", date: "2026-07-02", description: "Software subscriptions", category: "Expense", amount: -150 },
];
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
const initialTrip = { travelers: 2, days: 5, lodgingPerNight: 180, foodPerPersonDay: 65, transportPerPerson: 350, activitiesPerPersonDay: 45, rentalDaily: 55, contingencyPercent: 12, alreadySaved: 500, weeksUntilTrip: 12 };
const initialRental = { days: 5, dailyRate: 48, insuranceDaily: 18, feePercent: 22, miles: 450, mpg: 28, gasPrice: 3.5, parkingTolls: 70 };

export default function Finance() {
  const { setMode } = useOSMode();
  const [tab, setTab] = useState("cockpit");
  const [transactions, setTransactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("astramind_finance_tx")) || seed; } catch { return seed; }
  });
  const [entry, setEntry] = useState({ date: new Date().toISOString().slice(0, 10), description: "", category: "Expense", amount: "" });
  const [prompt, setPrompt] = useState("");
  const [insight, setInsight] = useState("Your Finance Kernel is online. Ask for a cash-flow, spending, savings, travel, or investing readiness review.");
  const [thinking, setThinking] = useState(false);
  const [trip, setTrip] = useState(initialTrip);
  const [rental, setRental] = useState(initialRental);
  const [investor, setInvestor] = useState({ capital: 1000, emergencyMonths: 3, horizonYears: 5, risk: "balanced" });
  const summary = useMemo(() => analyzeLedger(transactions), [transactions]);
  const tripPlan = useMemo(() => buildTripBudget(trip), [trip]);
  const rentalPlan = useMemo(() => compareCarRental(rental), [rental]);
  const investorPlan = useMemo(() => buildInvestorGuardrails(investor), [investor]);

  useEffect(() => setMode(OS_MODES.FINANCE), [setMode]);
  useEffect(() => localStorage.setItem("astramind_finance_tx", JSON.stringify(transactions)), [transactions]);
  useEffect(() => {
    try {
      const handoff = JSON.parse(localStorage.getItem("astramind_handoff"));
      if (!handoff || (handoff.path !== "/finance" && handoff.route !== "Finance OS")) return;
      setPrompt(handoff.prompt || "");
      setInsight(handoff.reply || insight);
      if (/stock|crypto|invest|portfolio|trade/i.test(handoff.prompt || "")) setTab("tradepilot");
      if (/travel|trip|flight|hotel|rental car/i.test(handoff.prompt || "")) setTab("travel");
      localStorage.removeItem("astramind_handoff");
    } catch { localStorage.removeItem("astramind_handoff"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTransaction = () => {
    const raw = Number(entry.amount);
    if (!entry.description.trim() || !Number.isFinite(raw) || raw <= 0) return;
    setTransactions((items) => [{ ...entry, id: `tx-${Date.now()}`, amount: entry.category === "Income" ? raw : -raw }, ...items]);
    setEntry((value) => ({ ...value, description: "", amount: "" }));
  };

  const generateInsight = async () => {
    if (thinking) return;
    setThinking(true);
    const ask = prompt.trim() || "Review my cash flow and give me three practical next steps.";
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/finance/guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` },
        body: JSON.stringify({ message: ask, transactions, context: { trip, rental, investor } }),
      });
      const result = await response.json();
      if (!response.ok || !result?.reply) throw new Error(result?.error || "Finance guidance failed.");
      setInsight(result.reply);
    } catch {
      setInsight(generateLocalFinanceDialogue({ message: ask, transactions, context: { trip, rental, investor } }).reply);
    }
    finally { setThinking(false); }
  };

  return (
    <main className="finance-realm">
      <div className="finance-shell">
        <header className="finance-hero">
          <div className="finance-eyebrow">AstraMind Finance Contract · Kernel online</div>
          <h1>Finance & Journey Realm</h1>
          <p>One command deck for cash flow, savings, investment readiness, trip budgeting, and car-rental cost intelligence. Move from “what can I afford?” to a measurable route.</p>
          <div className="finance-safety">Educational planning only. AstraMind does not execute trades, guarantee returns, provide regulated financial advice, or finalize travel bookings. Verify live prices, terms, and suitability with qualified providers.</div>
        </header>

        <nav className="finance-tabs" aria-label="Finance workspaces">
          {[["cockpit","◈ Finance Cockpit"],["travel","✦ Travel AI"],["rental","◇ Car Rental AI"],["invest","⌁ Investor Lab"],["tradepilot","✺ TradePilot AI"]].map(([id,label]) => <button key={id} className={`finance-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>)}
        </nav>

        {tab === "cockpit" && <>
          <section className="finance-grid">
            <Metric title="Income detected" value={money(summary.income)} detail="Ledger inflows" />
            <Metric title="Expenses detected" value={money(summary.expenses)} detail="Ledger outflows" />
            <Metric title="Net trajectory" value={money(summary.net)} detail={`${summary.savingsRate}% savings rate · ${summary.health}`} />
            <article className="finance-card full">
              <div className="finance-eyebrow">Finance Intelligence</div><h2>Ask across your financial life</h2>
              <div className="finance-form"><label className="finance-span-2">Your question<input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generateInsight()} placeholder="Can I afford a $2,500 trip in four months while building my emergency fund?" /></label></div>
              <button className="finance-button primary" onClick={generateInsight} disabled={thinking}>{thinking ? "Mapping your route…" : "Generate guidance"}</button>
              <div className="finance-insight">{insight}</div>
            </article>
            <article className="finance-card">
              <div className="finance-eyebrow">Ledger portal</div><h2>Add transaction</h2>
              <div className="finance-form">
                <label>Date<input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></label>
                <label>Type<select value={entry.category} onChange={(e) => setEntry({ ...entry, category: e.target.value })}><option>Expense</option><option>Income</option></select></label>
                <label className="finance-span-2">Description<input value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} /></label>
                <label className="finance-span-2">Amount<input type="number" min="0" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} /></label>
              </div><button className="finance-button primary" onClick={addTransaction}>Add to ledger</button>
            </article>
            <article className="finance-card wide"><h2>Persistent ledger</h2><div style={{overflowX:"auto"}}><table className="finance-ledger"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.description}</td><td>{item.category}</td><td className={item.amount >= 0 ? "positive" : "negative"}>{money(item.amount)}</td><td><button className="finance-tab" onClick={() => setTransactions((all) => all.filter((tx) => tx.id !== item.id))}>Remove</button></td></tr>)}</tbody></table></div></article>
            <article className="finance-card full"><div className="finance-action-grid">{[["✦","Travel AI","Build a complete trip target","travel"],["◇","Rental AI","Expose the real all-in vehicle cost","rental"],["⌁","Investor Lab","Set risk and allocation guardrails","invest"],["✺","TradePilot","Explore stocks and crypto responsibly","tradepilot"]].map(([icon,title,copy,id]) => <button className="finance-action" key={id} onClick={() => setTab(id)}><span>{icon}</span><strong>{title}</strong><p>{copy}</p></button>)}</div></article>
          </section>
        </>}

        {tab === "travel" && <Planner title="Travel AI · Mission Budget" copy="Model the complete trip before searching live inventory.">
          <NumberFields state={trip} setState={setTrip} fields={[["travelers","Travelers"],["days","Days"],["lodgingPerNight","Lodging / night"],["foodPerPersonDay","Food / person / day"],["transportPerPerson","Flight or transit / person"],["activitiesPerPersonDay","Activities / person / day"],["rentalDaily","Rental car / day"],["contingencyPercent","Contingency %"],["alreadySaved","Already saved"],["weeksUntilTrip","Weeks until trip"]]} />
          <ResultGrid items={[["Mission total",money(tripPlan.total)],["Still needed",money(tripPlan.remaining)],["Weekly target",money(tripPlan.weeklyTarget)],["Lodging",money(tripPlan.breakdown.lodging)],["Food",money(tripPlan.breakdown.food)],["Transit",money(tripPlan.breakdown.transit)]]} />
        </Planner>}

        {tab === "rental" && <Planner title="Car Rental AI · True Cost Scanner" copy="Compare advertised rates using fees, coverage, fuel, mileage, parking, and toll assumptions.">
          <NumberFields state={rental} setState={setRental} fields={[["days","Rental days"],["dailyRate","Daily rate"],["insuranceDaily","Coverage / day"],["feePercent","Taxes & fees %"],["miles","Expected miles"],["mpg","Vehicle MPG"],["gasPrice","Gas price"],["parkingTolls","Parking & tolls"]]} />
          <ResultGrid items={[["All-in estimate",money(rentalPlan.total)],["Base rental",money(rentalPlan.base)],["Taxes & fees",money(rentalPlan.taxesAndFees)],["Coverage",money(rentalPlan.insurance)],["Fuel",money(rentalPlan.fuel)]]} />
          <div className="finance-result"><strong>Comparison protocol</strong><ul>{rentalPlan.checks.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </Planner>}

        {tab === "invest" && <Planner title="Investor Lab · Risk Architecture" copy="Build guardrails before researching any stock, ETF, or crypto asset.">
          <div className="finance-form"><label>Capital<input type="number" value={investor.capital} onChange={(e) => setInvestor({...investor,capital:e.target.value})}/></label><label>Emergency fund (months)<input type="number" value={investor.emergencyMonths} onChange={(e) => setInvestor({...investor,emergencyMonths:e.target.value})}/></label><label>Horizon (years)<input type="number" value={investor.horizonYears} onChange={(e) => setInvestor({...investor,horizonYears:e.target.value})}/></label><label>Risk posture<select value={investor.risk} onChange={(e) => setInvestor({...investor,risk:e.target.value})}><option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="growth">Growth</option></select></label></div>
          <div className="finance-result"><h3>{investorPlan.posture}</h3><ResultGrid items={Object.entries(investorPlan.allocation).map(([key,value]) => [`${key} · ${value}%`,money(investorPlan.dollars[key])])} /><ul>{investorPlan.rules.map((item) => <li key={item}>{item}</li>)}</ul><button className="finance-button primary" onClick={() => setTab("tradepilot")}>Continue to TradePilot research</button></div>
        </Planner>}

        {tab === "tradepilot" && <section id="finance-pro"><FinanceTradePilot /></section>}
      </div>
    </main>
  );
}

function Metric({ title, value, detail }) { return <article className="finance-card"><div className="finance-eyebrow">{title}</div><div className="finance-metric">{value}<small>{detail}</small></div></article>; }
function Planner({ title, copy, children }) { return <section className="finance-grid"><article className="finance-card full"><div className="finance-eyebrow">Decision engine</div><h2>{title}</h2><p>{copy}</p>{children}</article></section>; }
function NumberFields({ state, setState, fields }) { return <div className="finance-form">{fields.map(([key,label]) => <label key={key}>{label}<input type="number" min="0" value={state[key]} onChange={(e) => setState({...state,[key]:e.target.value})}/></label>)}</div>; }
function ResultGrid({ items }) { return <div className="finance-result"><div className="finance-result-grid">{items.map(([label,value]) => <div key={label}><small>{label}</small><br/><strong>{value}</strong></div>)}</div></div>; }
