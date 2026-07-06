import React, { useEffect, useRef, useState } from "react";
import "./FinanceTradePilot.css";
import LiveSignalPanel from "./LiveSignalPanel.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function cleanMoneyNumber(value) {
  if (!value) return null;

  const cleaned = String(value).replace(/[$,\s]/g, "");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function extractDollarAmounts(text = "") {
  const matches = String(text).match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\$?\d+(?:\.\d+)?/g);

  if (!matches) return [];

  return matches
    .map((item) => cleanMoneyNumber(item))
    .filter((item) => Number.isFinite(item));
}

function extractWeeklyDeposit(text = "", amounts = []) {
  const lower = String(text).toLowerCase();

  const weeklyPatterns = [
    /\$?\s*(\d{1,6}(?:,\d{3})?(?:\.\d+)?)\s*(?:weekly|week|per week|a week)/i,
    /(?:weekly|week|per week|a week)\s*\$?\s*(\d{1,6}(?:,\d{3})?(?:\.\d+)?)/i,
    /add\s*\$?\s*(\d{1,6}(?:,\d{3})?(?:\.\d+)?)/i,
  ];

  for (const pattern of weeklyPatterns) {
    const match = lower.match(pattern);
    if (match?.[1]) {
      const value = cleanMoneyNumber(match[1]);
      if (value) return value;
    }
  }

  if (amounts.length >= 3) return amounts[2];
  if (amounts.length === 2) return 30;

  return null;
}

function extractTicker(text = "") {
  const upper = String(text).toUpperCase();

  const supported = ["TSLA", "NVDA", "AAPL", "MSFT", "VOO", "SPY", "QQQ"];

  const found = supported.find((ticker) =>
    new RegExp(`\\b${ticker}\\b`, "i").test(upper)
  );

  return found || null;
}

function extractRisk(text = "") {
  const lower = String(text).toLowerCase();

  if (lower.includes("low risk") || lower.includes("safe") || lower.includes("safer")) {
    return "low";
  }

  if (lower.includes("high risk") || lower.includes("aggressive")) {
    return "high";
  }

  return "medium";
}

function extractExperience(text = "") {
  const lower = String(text).toLowerCase();

  if (lower.includes("advanced") || lower.includes("experienced")) {
    return "advanced";
  }

  if (lower.includes("intermediate") || lower.includes("some experience")) {
    return "intermediate";
  }

  return "beginner";
}

function buildPrefillFromChat() {
  try {
    const rawSeed =
      localStorage.getItem("astramind_finance_seed") ||
      localStorage.getItem("astramind_handoff");

    if (!rawSeed) return null;

    const seed = JSON.parse(rawSeed);

    const prompt = seed.prompt || "";
    const reply = seed.reply || "";
    const combined = `${prompt}\n${reply}`;

    const amounts = extractDollarAmounts(prompt);
    const ticker = extractTicker(prompt);
    const riskTolerance = extractRisk(prompt);
    const experience = extractExperience(prompt);

    const startingCapital = amounts[0] || 100;
    const targetAmount = amounts[1] || null;
    const weeklyDeposit = extractWeeklyDeposit(prompt, amounts) || 30;

    const hasInvestingIntent =
      /invest|stock|trading|trade|portfolio|robinhood|ticker|buy|sell|tsla|nvda|aapl|msft|spy|voo|qqq/i.test(
        combined
      );

    const hasGoalIntent =
      /turn|grow|build|make|from|into|\$|weekly|per week|add/i.test(prompt);

    const goal =
      prompt ||
      (targetAmount
        ? `Turn $${startingCapital} into $${targetAmount} with $${weeklyDeposit} weekly`
        : `Build wealth starting with $${startingCapital} and $${weeklyDeposit} weekly`);

    return {
      prompt,
      reply,
      goal,
      ticker,
      startingCapital,
      weeklyDeposit,
      riskTolerance,
      experience,
      shouldAutoRunRoute: hasInvestingIntent || hasGoalIntent,
      shouldFocusMentor: Boolean(ticker) || /should i buy|good trade|trade today|marketmentor/i.test(prompt),
      shouldAutoRunMentor: Boolean(ticker) && /should i buy|good trade|trade today|buy|sell/i.test(prompt),
    };
  } catch (error) {
    console.warn("FinanceTradePilot prefill failed:", error);
    return null;
  }
}

export default function FinanceTradePilot() {
  const prefillAppliedRef = useRef(false);

  const [form, setForm] = useState({
    goal: "Turn $100 into $1,000",
    startingCapital: 100,
    weeklyDeposit: 30,
    riskTolerance: "medium",
    experience: "beginner",
    subscriptionTier: "finance_pro",
  });

  const [mentorForm, setMentorForm] = useState({
    question: "Should I buy TSLA today?",
    ticker: "TSLA",
    accountSize: 100,
    weeklyDeposit: 30,
    riskTolerance: "medium",
    experience: "beginner",
    subscriptionTier: "finance_pro",
  });

  const [route, setRoute] = useState(null);
  const [mentorReply, setMentorReply] = useState(null);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingMentor, setLoadingMentor] = useState(false);

  const [error, setError] = useState("");
  const [mentorError, setMentorError] = useState("");
  const [prefillNotice, setPrefillNotice] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateMentorField = (field, value) => {
    setMentorForm((prev) => ({ ...prev, [field]: value }));
  };

  const syncMentorWithRouteProfile = () => {
    setMentorForm((prev) => ({
      ...prev,
      accountSize: form.startingCapital,
      weeklyDeposit: form.weeklyDeposit,
      riskTolerance: form.riskTolerance,
      experience: form.experience,
      subscriptionTier: form.subscriptionTier,
    }));
  };

  const generateRoute = async (overrideForm = null) => {
    const activeForm = overrideForm || form;

    setLoadingRoute(true);
    setError("");
    setRoute(null);

    try {
      const payload = {
        ...activeForm,
        startingCapital: Number(activeForm.startingCapital),
        weeklyDeposit: Number(activeForm.weeklyDeposit),
      };

      const res = await fetch(`${API_URL}/api/tradepilot/wealth-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-subscription-tier": payload.subscriptionTier,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.upgradeRequired) {
        throw new Error(data.message || "Upgrade required.");
      }

      setRoute(data);

      setMentorForm((prev) => ({
        ...prev,
        accountSize: payload.startingCapital,
        weeklyDeposit: payload.weeklyDeposit,
        riskTolerance: payload.riskTolerance,
        experience: payload.experience,
        subscriptionTier: payload.subscriptionTier,
      }));
    } catch (err) {
      setError(err.message || "Unable to generate WealthRoute.");
    } finally {
      setLoadingRoute(false);
    }
  };

  const askMarketMentor = async (overrideMentorForm = null) => {
    const activeMentorForm = overrideMentorForm || mentorForm;

    setLoadingMentor(true);
    setMentorError("");
    setMentorReply(null);

    const payload = {
      ...activeMentorForm,
      accountSize: Number(activeMentorForm.accountSize),
      weeklyDeposit: Number(activeMentorForm.weeklyDeposit),
      ticker: String(activeMentorForm.ticker || "TSLA").toUpperCase(),
    };

    try {
      const res = await fetch(`${API_URL}/api/tradepilot/market-mentor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-subscription-tier": payload.subscriptionTier,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.upgradeRequired) {
        throw new Error(data.message || "Upgrade required.");
      }

      setMentorReply(data);
    } catch (err) {
      setMentorError(err.message || "MarketMentor could not answer right now.");
    } finally {
      setLoadingMentor(false);
    }
  };

  useEffect(() => {
    if (prefillAppliedRef.current) return;

    const prefill = buildPrefillFromChat();
    if (!prefill) return;

    prefillAppliedRef.current = true;

    const nextForm = {
      goal: prefill.goal,
      startingCapital: prefill.startingCapital,
      weeklyDeposit: prefill.weeklyDeposit,
      riskTolerance: prefill.riskTolerance,
      experience: prefill.experience,
      subscriptionTier: "finance_pro",
    };

    const nextMentorForm = {
      question:
        prefill.prompt ||
        (prefill.ticker
          ? `Should I buy ${prefill.ticker} today?`
          : "Should I buy TSLA today?"),
      ticker: prefill.ticker || "TSLA",
      accountSize: prefill.startingCapital,
      weeklyDeposit: prefill.weeklyDeposit,
      riskTolerance: prefill.riskTolerance,
      experience: prefill.experience,
      subscriptionTier: "finance_pro",
    };

    setForm(nextForm);
    setMentorForm(nextMentorForm);

    setPrefillNotice(
      prefill.ticker
        ? `Loaded chat handoff: ${prefill.ticker}, $${prefill.startingCapital} starting, $${prefill.weeklyDeposit} weekly.`
        : `Loaded chat handoff: $${prefill.startingCapital} starting, $${prefill.weeklyDeposit} weekly.`
    );

    setTimeout(() => {
      if (prefill.shouldFocusMentor) {
        document.getElementById("marketmentor-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        document.getElementById("wealthroute-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 250);

    if (prefill.shouldAutoRunRoute) {
      setTimeout(() => generateRoute(nextForm), 500);
    }

    if (prefill.shouldAutoRunMentor) {
      setTimeout(() => askMarketMentor(nextMentorForm), 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tradepilot-page">
      <div className="tradepilot-hero">
        <p className="tradepilot-eyebrow">AstraMind Finance Pro</p>
        <h1>WealthRoute + MarketMentor AI</h1>
        <p>
          Goal-based financial guidance and TradeGPT-style market coaching for
          subscribers. AstraMind helps compare routes, risk levels, trade logic,
          and next best steps — without guaranteeing outcomes.
        </p>

        {prefillNotice && (
          <div className="tradepilot-warning" style={{ marginTop: "1rem" }}>
            {prefillNotice}
          </div>
        )}
      </div>

      <div className="tradepilot-grid" id="wealthroute-section">
        <section className="tradepilot-card">
          <h2>Build My WealthRoute</h2>

          <label>
            Goal
            <textarea
              value={form.goal}
              onChange={(e) => updateField("goal", e.target.value)}
              placeholder="Example: I want to turn $100 into $1,000"
            />
          </label>

          <label>
            Starting Capital
            <input
              type="number"
              value={form.startingCapital}
              onChange={(e) => updateField("startingCapital", e.target.value)}
            />
          </label>

          <label>
            Weekly Deposit
            <input
              type="number"
              value={form.weeklyDeposit}
              onChange={(e) => updateField("weeklyDeposit", e.target.value)}
            />
          </label>

          <label>
            Risk Tolerance
            <select
              value={form.riskTolerance}
              onChange={(e) => updateField("riskTolerance", e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label>
            Experience Level
            <select
              value={form.experience}
              onChange={(e) => updateField("experience", e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <button onClick={() => generateRoute()} disabled={loadingRoute}>
            {loadingRoute ? "Generating Route..." : "Generate My WealthRoute"}
          </button>

          {error && <div className="tradepilot-error">{error}</div>}
        </section>

        <section className="tradepilot-card result-card">
          {!route ? (
            <div className="empty-state">
              <h2>Your WealthRoute appears here</h2>
              <p>
                Enter a goal and AstraMind will guide the subscriber toward the
                best possible route based on capital, weekly contribution, risk,
                and experience.
              </p>
            </div>
          ) : (
            <>
              <p className="tradepilot-disclaimer">{route.disclaimer}</p>

              <h2>Recommended Route</h2>
              <div className="route-badge">{route.recommendedRoute}</div>

              <div className="route-summary">
                <p>
                  <strong>Goal:</strong> {route.userGoal}
                </p>
                <p>
                  <strong>Risk Level:</strong> {route.riskLevel}
                </p>
                <p>
                  <strong>Estimated Timeframe:</strong>{" "}
                  {route.estimatedTimeframe}
                </p>
                <p>
                  <strong>Reasoning:</strong> {route.reasoning}
                </p>
              </div>

              <h3>Capital Plan</h3>
              <div className="allocation-grid">
                <div>
                  <span>Long-Term Foundation</span>
                  <strong>
                    ${route.capitalPlan.suggestedAllocation.longTermFoundation}
                  </strong>
                </div>
                <div>
                  <span>Skill Trading Pool</span>
                  <strong>
                    ${route.capitalPlan.suggestedAllocation.skillTradingPool}
                  </strong>
                </div>
                <div>
                  <span>Cash Reserve</span>
                  <strong>
                    ${route.capitalPlan.suggestedAllocation.cashReserve}
                  </strong>
                </div>
              </div>

              <h3>Weekly Action Plan</h3>
              <ul>
                {route.weeklyActionPlan.map((item, index) => (
                  <li key={`weekly-${index}`}>{item}</li>
                ))}
              </ul>

              <h3>Guardrails</h3>
              <ul>
                {route.guardrails.map((item, index) => (
                  <li key={`guardrail-${index}`}>{item}</li>
                ))}
              </ul>

              <div className="next-step-box">
                <strong>Next Best Step:</strong>
                <p>{route.nextBestStep}</p>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="marketmentor-wrap" id="marketmentor-section">
        <section className="tradepilot-card marketmentor-card">
          <div className="marketmentor-header">
            <div>
              <p className="tradepilot-eyebrow">Premium AI Co-Pilot</p>
              <h2>MarketMentor AI</h2>
            </div>
            <div className="mentor-pill">TradeGPT-Style Guidance</div>
          </div>

          <p className="mentor-intro">
            Ask AstraMind about a ticker, trade idea, exit plan, long-term route,
            or risk decision. MarketMentor guides the subscriber toward a
            structured decision without claiming certainty or guaranteed profit.
          </p>

          <div className="mentor-layout">
            <div className="mentor-form">
              <label>
                Ask MarketMentor
                <textarea
                  value={mentorForm.question}
                  onChange={(e) =>
                    updateMentorField("question", e.target.value)
                  }
                  placeholder="Example: Should I buy TSLA today?"
                />
              </label>

              <div className="mentor-mini-grid">
                <label>
                  Ticker
                  <input
                    value={mentorForm.ticker}
                    onChange={(e) =>
                      updateMentorField("ticker", e.target.value.toUpperCase())
                    }
                    placeholder="TSLA"
                  />
                </label>

                <label>
                  Account Size
                  <input
                    type="number"
                    value={mentorForm.accountSize}
                    onChange={(e) =>
                      updateMentorField("accountSize", e.target.value)
                    }
                  />
                </label>

                <label>
                  Weekly Deposit
                  <input
                    type="number"
                    value={mentorForm.weeklyDeposit}
                    onChange={(e) =>
                      updateMentorField("weeklyDeposit", e.target.value)
                    }
                  />
                </label>

                <label>
                  Risk
                  <select
                    value={mentorForm.riskTolerance}
                    onChange={(e) =>
                      updateMentorField("riskTolerance", e.target.value)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Experience
                  <select
                    value={mentorForm.experience}
                    onChange={(e) =>
                      updateMentorField("experience", e.target.value)
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
              </div>

              <button onClick={() => askMarketMentor()} disabled={loadingMentor}>
                {loadingMentor ? "MarketMentor Thinking..." : "Ask MarketMentor"}
              </button>

              {mentorError && (
                <div className="tradepilot-error">{mentorError}</div>
              )}
            </div>

            <div className="mentor-response">
              {!mentorReply ? (
                <div className="empty-state mentor-empty">
                  <h2>MarketMentor response appears here</h2>
                  <p>
                    Example questions: “Should I buy NVDA?”, “When should I exit
                    TSLA?”, “What is the safer route for $100?”, or “How should I
                    manage this trade?”
                  </p>
                </div>
              ) : (
                <>
                  <p className="tradepilot-disclaimer">
                    {mentorReply.disclaimer}
                  </p>

                  <div className="mentor-topline">
                    <div>
                      <span>Ticker</span>
                      <strong>{mentorReply.ticker}</strong>
                    </div>
                    <div>
                      <span>Signal</span>
                      <strong>{mentorReply.signal}</strong>
                    </div>
                    <div>
                      <span>Risk</span>
                      <strong>{mentorReply.riskLevel}</strong>
                    </div>
                  </div>

                  <h3>Recommended Route</h3>
                  <div className="route-badge">
                    {mentorReply.recommendedRoute}
                  </div>

                  <div className="route-summary">
                    <p>
                      <strong>Question:</strong> {mentorReply.userQuestion}
                    </p>
                    <p>
                      <strong>Mode:</strong> {mentorReply.mode}
                    </p>
                  </div>

                  <h3>Guidance</h3>
                  <ul>
                    {mentorReply.guidance?.map((item, index) => (
                      <li key={`mentor-guidance-${index}`}>{item}</li>
                    ))}
                  </ul>

                  <h3>Guardrails</h3>
                  <ul>
                    {mentorReply.guardrails?.map((item, index) => (
                      <li key={`mentor-guardrail-${index}`}>{item}</li>
                    ))}
                  </ul>

                  <div className="next-step-box">
                    <strong>Next Best Step:</strong>
                    <p>{mentorReply.nextBestStep}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="marketmentor-wrap">
        <LiveSignalPanel
          subscriptionTier={form.subscriptionTier}
          riskTolerance={form.riskTolerance}
          experience={form.experience}
          accountSize={form.startingCapital}
          weeklyDeposit={form.weeklyDeposit}
        />
      </div>
    </div>
  );
}