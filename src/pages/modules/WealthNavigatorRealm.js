import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";
import { buildRetirementPlan, buildWealthNavigation } from "../../core/finance/wealthNavigatorEngine.js";
import "../../styles/finance-realm.css";

const STORAGE_KEY = "astramind_retirement_plan_v1";
const DEFAULT_FORM = {
  monthlyIncome: 5000,
  monthlyExpenses: 3600,
  cash: 5000,
  investments: 0,
  retirementSavings: 12000,
  debt: 8000,
  debtApr: 12,
  emergencyMonths: 4,
  currentAge: 40,
  retirementAge: 67,
  planningAge: 95,
  monthlyRetirementContribution: 500,
  monthlyEmployerContribution: 200,
  retirementSpendingToday: 3200,
  retirementHealthcareToday: 500,
  socialSecurityMonthly: 0,
  pensionMonthly: 0,
  otherRetirementIncomeMonthly: 0,
  preRetirementReturnPercent: 6,
  retirementReturnPercent: 4,
  inflationPercent: 2.5,
  annualFeesPercent: 0.5,
  annualContributionIncreasePercent: 2,
  retirementIncomeColaPercent: 0,
  legacyGoal: 0,
};

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
const percent = (value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;

function loadForm() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? { ...DEFAULT_FORM, ...saved } : DEFAULT_FORM;
  } catch {
    return DEFAULT_FORM;
  }
}

function ledgerTotals() {
  try {
    const transactions = JSON.parse(localStorage.getItem("astramind_finance_tx")) || [];
    return transactions.reduce((summary, item) => {
      const amount = Number(item?.amount || 0);
      if (amount >= 0) summary.income += amount;
      else summary.expenses += Math.abs(amount);
      return summary;
    }, { income: 0, expenses: 0, count: transactions.length });
  } catch {
    return { income: 0, expenses: 0, count: 0 };
  }
}

export default function WealthNavigatorRealm() {
  const { setMode } = useOSMode();
  const [form, setForm] = useState(loadForm);
  const [ledgerNotice, setLedgerNotice] = useState("");
  const wealth = useMemo(() => buildWealthNavigation(form), [form]);
  const retirement = useMemo(() => buildRetirementPlan(form), [form]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => setMode(OS_MODES.FINANCE), [setMode]);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(form)), [form]);

  const importLedger = () => {
    const totals = ledgerTotals();
    if (!totals.count) {
      setLedgerNotice("No Finance Hub ledger entries were found.");
      return;
    }
    setForm((current) => ({ ...current, monthlyIncome: totals.income, monthlyExpenses: totals.expenses }));
    setLedgerNotice(`Imported ${totals.count} ledger entries as one representative month. Verify recurring items and remove duplicates before relying on the projection.`);
  };

  return (
    <main className="finance-module wealth-realm">
      <div className="finance-shell">
        <header className="finance-hero retirement-hero">
          <div className="finance-eyebrow">Aigenikz Wealth Navigator · Retirement Guidance Contract</div>
          <h1>Wealth Navigator<br /><span>Retirement Planner</span></h1>
          <p>Turn income, recurring expenses, reserves, debt, retirement accounts, expected benefits, and time into a measurable range of possible retirement paths.</p>
          <div className="finance-safety"><strong>Guidance results are not guaranteed.</strong> Projections are hypothetical and highly sensitive to returns, inflation, fees, taxes, healthcare, longevity, benefit estimates, and the accuracy of your entries. Aigenikz does not provide fiduciary, tax, legal, or regulated investment advice.</div>
          <div className="retirement-privacy">Local-first calculation · no video render · no media provider · values remain in this browser</div>
        </header>

        <RealmNav />

        <section className="finance-grid">
          <article className="finance-card">
            <div className="finance-eyebrow">Current foundation</div>
            <div className="finance-metric">{wealth.phase}<small>Aigenikz priority route</small></div>
            <div className="wealth-orbit"><span>{money(wealth.netWorth)}</span><small>estimated net worth</small></div>
          </article>

          <article className="finance-card wide">
            <div className="retirement-card-heading"><div><div className="finance-eyebrow">Cash-flow coordinates</div><h2>Build the monthly foundation</h2></div><button className="finance-button" type="button" onClick={importLedger}>Import Finance ledger</button></div>
            {ledgerNotice && <div className="retirement-notice">{ledgerNotice}</div>}
            <div className="finance-form">
              <Field label="Monthly after-tax income" value={form.monthlyIncome} onChange={(value) => set("monthlyIncome", value)} />
              <Field label="Monthly rent, utilities, food, transportation, insurance + spending" value={form.monthlyExpenses} onChange={(value) => set("monthlyExpenses", value)} />
              <Field label="Accessible cash reserves" value={form.cash} onChange={(value) => set("cash", value)} />
              <Field label="Taxable investment balances" value={form.investments} onChange={(value) => set("investments", value)} />
              <Field label="Non-mortgage debt" value={form.debt} onChange={(value) => set("debt", value)} />
              <Field label="Highest debt APR %" value={form.debtApr} onChange={(value) => set("debtApr", value)} step="0.1" />
              <Field label="Emergency reserve target (months)" value={form.emergencyMonths} onChange={(value) => set("emergencyMonths", value)} />
              <ReadOnly label="Calculated free cash / month" value={money(wealth.monthlyFree)} />
            </div>
          </article>

          <article className="finance-card full retirement-input-card">
            <div className="retirement-card-heading"><div><div className="finance-eyebrow">Retirement coordinates</div><h2>Define the path and assumptions</h2></div><button className="finance-button" type="button" onClick={() => setForm(DEFAULT_FORM)}>Reset illustrative values</button></div>
            <p className="finance-empty-note">Replace every illustrative value with your own. Use a personalized Social Security estimate and verify employer-plan rules and current contribution limits.</p>
            <div className="retirement-input-groups">
              <InputGroup title="Timeline">
                <Field label="Current age" value={form.currentAge} onChange={(value) => set("currentAge", value)} />
                <Field label="Target retirement age" value={form.retirementAge} onChange={(value) => set("retirementAge", value)} />
                <Field label="Plan through age" value={form.planningAge} onChange={(value) => set("planningAge", value)} />
              </InputGroup>
              <InputGroup title="Balances and contributions">
                <Field label="401(k), IRA + retirement balances" value={form.retirementSavings} onChange={(value) => set("retirementSavings", value)} />
                <Field label="Your monthly retirement contribution" value={form.monthlyRetirementContribution} onChange={(value) => set("monthlyRetirementContribution", value)} />
                <Field label="Employer monthly contribution / match" value={form.monthlyEmployerContribution} onChange={(value) => set("monthlyEmployerContribution", value)} />
                <Field label="Annual contribution increase %" value={form.annualContributionIncreasePercent} onChange={(value) => set("annualContributionIncreasePercent", value)} step="0.1" />
              </InputGroup>
              <InputGroup title="Retirement spending in today's dollars">
                <Field label="Expected monthly living expenses" value={form.retirementSpendingToday} onChange={(value) => set("retirementSpendingToday", value)} />
                <Field label="Additional monthly healthcare" value={form.retirementHealthcareToday} onChange={(value) => set("retirementHealthcareToday", value)} />
                <Field label="Desired legacy / end reserve" value={form.legacyGoal} onChange={(value) => set("legacyGoal", value)} />
              </InputGroup>
              <InputGroup title="Expected monthly retirement income">
                <Field label="Social Security estimate at retirement" value={form.socialSecurityMonthly} onChange={(value) => set("socialSecurityMonthly", value)} />
                <Field label="Pension income" value={form.pensionMonthly} onChange={(value) => set("pensionMonthly", value)} />
                <Field label="Other recurring retirement income" value={form.otherRetirementIncomeMonthly} onChange={(value) => set("otherRetirementIncomeMonthly", value)} />
                <Field label="Expected annual income COLA %" value={form.retirementIncomeColaPercent} onChange={(value) => set("retirementIncomeColaPercent", value)} step="0.1" />
              </InputGroup>
              <InputGroup title="Planning assumptions">
                <Field label="Pre-retirement annual return %" value={form.preRetirementReturnPercent} onChange={(value) => set("preRetirementReturnPercent", value)} step="0.1" />
                <Field label="Retirement annual return %" value={form.retirementReturnPercent} onChange={(value) => set("retirementReturnPercent", value)} step="0.1" />
                <Field label="Annual inflation %" value={form.inflationPercent} onChange={(value) => set("inflationPercent", value)} step="0.1" />
                <Field label="Annual investment fees %" value={form.annualFeesPercent} onChange={(value) => set("annualFeesPercent", value)} step="0.1" />
              </InputGroup>
            </div>
            <div className="retirement-reference-links"><a href="https://www.ssa.gov/prepare/get-benefits-estimate" target="_blank" rel="noreferrer">Get a personal Social Security estimate</a><a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-contributions" target="_blank" rel="noreferrer">Verify current retirement contribution rules</a></div>
          </article>

          <article className={`finance-card full retirement-verdict ${retirement.planned.fundingRatio >= 100 ? "on-track" : "gap"}`}>
            <div><div className="finance-eyebrow">Planned scenario</div><h2>{retirement.planned.status}</h2><p>Target retirement age {retirement.retirementAge} · modeled through age {retirement.planningAge} · {retirement.yearsToRetirement} years to prepare</p></div>
            <div className="retirement-ratio"><strong>{percent(retirement.planned.fundingRatio)}</strong><span>projected funding</span></div>
          </article>

          <article className="finance-card full">
            <div className="finance-eyebrow">Retirement trajectory</div>
            <div className="retirement-metrics">
              <Metric label="Projected at retirement" value={money(retirement.planned.projectedBalance)} />
              <Metric label="Modeled amount needed" value={money(retirement.planned.requiredNestEgg)} />
              <Metric label={retirement.planned.shortfall ? "Projected shortfall" : "Projected surplus"} value={money(retirement.planned.shortfall || retirement.planned.surplus)} alert={Boolean(retirement.planned.shortfall)} />
              <Metric label="Required personal contribution" value={`${money(retirement.requiredMonthlyContribution)}/mo`} />
              <Metric label="Future monthly spending" value={money(retirement.planned.monthlySpendingAtRetirement)} />
              <Metric label="Expected monthly income" value={money(retirement.planned.monthlyIncomeAtRetirement)} />
              <Metric label="Monthly portfolio gap" value={money(retirement.planned.monthlyGap)} />
              <Metric label="Modeled funding age" value={retirement.planned.fundedThroughAge >= retirement.planningAge ? `${retirement.planningAge}+` : retirement.planned.fundedThroughAge} />
            </div>
          </article>

          <article className="finance-card full">
            <div className="finance-eyebrow">Uncertainty range</div><h2>Three assumption scenarios</h2>
            <div className="retirement-scenarios">
              {retirement.scenarios.map((scenario) => <Scenario key={scenario.name} scenario={scenario} />)}
            </div>
            <p className="finance-empty-note">These are deterministic illustrations, not probability forecasts or Monte Carlo results. Actual returns and inflation will vary.</p>
          </article>

          <article className="finance-card wide">
            <div className="finance-eyebrow">Next-best-action engine</div><h2>Retirement guidance path</h2>
            <ol className="wealth-actions">{retirement.actions.map((action, index) => <li key={action}><span>{index + 1}</span>{action}</li>)}</ol>
          </article>
          <article className="finance-card">
            <div className="finance-eyebrow">Assumption monitor</div><h2>Review before acting</h2>
            {retirement.warnings.length ? <ul className="retirement-warnings">{retirement.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p>No immediate input conflicts detected.</p>}
            <div className="retirement-assumptions"><strong>Not modeled</strong><span>Taxes, account-specific withdrawal rules, Medicare premiums, long-term care, market sequence, and changes in law or benefits.</span></div>
            <Link className="finance-button primary" to="/finance">Review Finance ledger</Link>
          </article>

          <article className="finance-card full retirement-disclaimer"><strong>Guidance results are not guaranteed.</strong><span>{retirement.disclaimer}</span></article>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, step = "1" }) {
  return <label>{label}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReadOnly({ label, value }) {
  return <div className="retirement-readonly"><small>{label}</small><strong>{value}</strong></div>;
}

function InputGroup({ title, children }) {
  return <section className="retirement-input-group"><h3>{title}</h3><div className="finance-form">{children}</div></section>;
}

function Metric({ label, value, alert }) {
  return <div className={alert ? "alert" : ""}><small>{label}</small><strong>{value}</strong></div>;
}

function Scenario({ scenario }) {
  return <article className={`retirement-scenario ${scenario.fundingRatio >= 100 ? "on-track" : "gap"}`}><div className="retirement-card-heading"><h3>{scenario.name}</h3><strong>{percent(scenario.fundingRatio)}</strong></div><p>{scenario.status}</p><dl><div><dt>Projected</dt><dd>{money(scenario.projectedBalance)}</dd></div><div><dt>Needed</dt><dd>{money(scenario.requiredNestEgg)}</dd></div><div><dt>Funded through</dt><dd>Age {scenario.fundedThroughAge}</dd></div><div><dt>Return / inflation</dt><dd>{scenario.preReturnPercent}% / {scenario.inflationPercent}%</dd></div></dl></article>;
}

function RealmNav() {
  return <div className="finance-tabs"><Link className="finance-tab" to="/finance">← Finance Hub</Link><Link className="finance-tab" to="/finance/income">Trip Planner</Link><Link className="finance-tab" to="/finance/expenses">Pro Markets</Link><Link className="finance-tab active" to="/finance/savings">Wealth + Retirement</Link></div>;
}
