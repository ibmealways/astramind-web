import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";
import { analyzeLedger } from "../../core/finance/lifePlannerEngine.js";
import "../../styles/finance-realm.css";

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
function ledger() { try { return JSON.parse(localStorage.getItem("astramind_finance_tx")) || []; } catch { return []; } }

export default function FinanceModuleWorkspace({ type }) {
  const { setMode } = useOSMode();
  const [transactions] = useState(ledger);
  const summary = useMemo(() => analyzeLedger(transactions), [transactions]);
  useEffect(() => setMode(OS_MODES.FINANCE), [setMode]);

  const config = {
    income: { eyebrow: "Income Intelligence", title: "Income Orbit", copy: "Map recurring and variable income, then model a more resilient monthly trajectory.", accent: "Revenue signals" },
    expenses: { eyebrow: "Spending Intelligence", title: "Expense Gravity", copy: "See where cash leaves the system and calculate a realistic reduction mission.", accent: "Outflow signals" },
    savings: { eyebrow: "Goal Intelligence", title: "Savings Vault", copy: "Turn a target and deadline into a measurable deposit cadence.", accent: "Reserve signals" },
  }[type];

  return <main className="finance-module"><div className="finance-shell">
    <header className="finance-hero"><div className="finance-eyebrow">{config.eyebrow} · Finance Kernel</div><h1>{config.title}</h1><p>{config.copy}</p><div className="finance-safety">Your values stay in this browser ledger. Connect verified banking data only through a future consent-based connector.</div></header>
    <div className="finance-tabs"><Link className="finance-tab" to="/finance">← Finance Realm</Link><Link className="finance-tab" to="/finance/income">Income</Link><Link className="finance-tab" to="/finance/expenses">Expenses</Link><Link className="finance-tab" to="/finance/savings">Savings</Link></div>
    <section className="finance-grid"><Metric title={config.accent} value={type === "income" ? money(summary.income) : type === "expenses" ? money(summary.expenses) : money(summary.net)} detail={`${transactions.length} ledger records`} />
      {type === "income" && <IncomeTool current={summary.income} />}
      {type === "expenses" && <ExpenseTool current={summary.expenses} />}
      {type === "savings" && <SavingsTool current={Math.max(0,summary.net)} />}
    </section>
  </div></main>;
}

function Metric({title,value,detail}) { return <article className="finance-card"><div className="finance-eyebrow">{title}</div><div className="finance-metric">{value}<small>{detail}</small></div></article>; }
function IncomeTool({current}) {
  const [rate,setRate]=useState(50),[hours,setHours]=useState(10),[other,setOther]=useState(0);
  const monthly=rate*hours*4.33+Number(other||0);
  return <article className="finance-card wide"><h2>Income scenario engine</h2><p>Model earned and recurring income without changing the ledger.</p><div className="finance-form"><label>Hourly / project rate<input type="number" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label><label>Hours / projects each week<input type="number" value={hours} onChange={e=>setHours(Number(e.target.value))}/></label><label className="finance-span-2">Other monthly income<input type="number" value={other} onChange={e=>setOther(Number(e.target.value))}/></label></div><div className="finance-result"><div className="finance-result-grid"><Box label="Projected monthly" value={money(monthly)}/><Box label="Current ledger income" value={money(current)}/><Box label="Potential difference" value={money(monthly-current)}/></div></div></article>;
}
function ExpenseTool({current}) {
  const [target,setTarget]=useState(15); const saved=current*(target/100);
  return <article className="finance-card wide"><h2>Expense compression engine</h2><p>Choose a reduction target and convert it into weekly review limits.</p><div className="finance-form"><label className="finance-span-2">Reduction target: {target}%<input type="range" min="0" max="40" value={target} onChange={e=>setTarget(Number(e.target.value))}/></label></div><div className="finance-result"><div className="finance-result-grid"><Box label="Current outflow" value={money(current)}/><Box label="Monthly reclaimed" value={money(saved)}/><Box label="New ceiling" value={money(current-saved)}/></div><p className="finance-empty-note">Review recurring charges first, then flexible categories. Protect housing, food, health, insurance, and required debt payments.</p></div></article>;
}
function SavingsTool({current}) {
  const [goal,setGoal]=useState(5000),[saved,setSaved]=useState(current),[months,setMonths]=useState(12); const remaining=Math.max(0,goal-saved); const monthly=remaining/Math.max(1,months);
  return <article className="finance-card wide"><h2>Goal cadence engine</h2><p>Build an emergency, travel, purchase, or opportunity fund.</p><div className="finance-form"><label>Goal amount<input type="number" value={goal} onChange={e=>setGoal(Number(e.target.value))}/></label><label>Already saved<input type="number" value={saved} onChange={e=>setSaved(Number(e.target.value))}/></label><label className="finance-span-2">Months to goal<input type="number" min="1" value={months} onChange={e=>setMonths(Number(e.target.value))}/></label></div><div className="finance-result"><div className="finance-result-grid"><Box label="Remaining" value={money(remaining)}/><Box label="Monthly deposit" value={money(monthly)}/><Box label="Weekly deposit" value={money(monthly/4.33)}/></div></div></article>;
}
function Box({label,value}) { return <div><small>{label}</small><br/><strong>{value}</strong></div>; }

