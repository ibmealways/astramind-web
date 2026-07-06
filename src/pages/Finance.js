// src/pages/Finance.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";

import { loadCreatorMemory } from "../core/memory/creatorMemory.js";
import { getChappyReply } from "../core/intelligence/hybridAI.js";
import FinanceTradePilot from "./modules/FinanceTradePilot.js";

const seedTx = [
  {
    id: "tx_001",
    date: "2025-06-01",
    description: "Freelance Payment",
    category: "Income",
    amount: 2000,
  },
  {
    id: "tx_002",
    date: "2025-06-01",
    description: "Software Subscription",
    category: "Expense",
    amount: -150,
  },
];

const money = (n) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
};

function classifyCategoryFromAmount(amount) {
  return amount >= 0 ? "Income" : "Expense";
}

export default function Finance() {
  const { setMode } = useOSMode();
  const creator = useMemo(() => loadCreatorMemory?.() || null, []);

  const [activeSection, setActiveSection] = useState("dashboard");

  const [transactions, setTransactions] = useState(() => {
    const stored = localStorage.getItem("astramind_finance_tx");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn("Bad finance storage, resetting ledger:", e);
      }
    }

    return seedTx;
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "Expense",
    amount: "",
  });

  const [insight, setInsight] = useState({
    text: "Finance intelligence ready. Click “Generate Insight” to analyze your ledger.",
    source: "SYSTEM",
  });

  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const insightRef = useRef(null);

  useEffect(() => {
    setMode(OS_MODES.FINANCE);
  }, [setMode]);

  useEffect(() => {
    localStorage.setItem("astramind_finance_tx", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("astramind_handoff");
      if (!saved) return;

      const handoff = JSON.parse(saved);

      const isFinanceHandoff =
        handoff.route === "Finance OS" || handoff.path === "/finance";

      if (!isFinanceHandoff) return;

      const promptText = handoff.prompt || "";
      const lowerPrompt = promptText.toLowerCase();

      const shouldOpenFinancePro =
        lowerPrompt.includes("stock") ||
        lowerPrompt.includes("invest") ||
        lowerPrompt.includes("trading") ||
        lowerPrompt.includes("robinhood") ||
        lowerPrompt.includes("portfolio") ||
        lowerPrompt.includes("tsla") ||
        lowerPrompt.includes("nvda") ||
        lowerPrompt.includes("buy") ||
        lowerPrompt.includes("sell");

      setPrompt(promptText);

      setInsight({
        text: handoff.reply || "Finance handoff loaded.",
        source: "CHAT_HANDOFF",
      });

      setActiveSection(shouldOpenFinancePro ? "tradepilot" : "dashboard");

      localStorage.setItem(
        "astramind_finance_seed",
        JSON.stringify({
          prompt: handoff.prompt,
          reply: handoff.reply,
          createdAt: handoff.createdAt,
          source: "chat_handoff",
        })
      );

      localStorage.removeItem("astramind_handoff");

      setTimeout(() => {
        if (shouldOpenFinancePro) {
          document.getElementById("finance-pro")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          insightRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 150);
    } catch (err) {
      console.error("Finance handoff load failed:", err);
      localStorage.removeItem("astramind_handoff");
    }
  }, []);

  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((a, b) => a + b.amount, 0);

    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((a, b) => a + Math.abs(b.amount), 0);

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }, [transactions]);

  const addTx = () => {
    const amountNum = Number(String(form.amount).replace(/[^0-9.-]/g, ""));

    if (!form.date) return alert("Pick a date.");
    if (!form.description.trim()) return alert("Add a description.");
    if (!Number.isFinite(amountNum) || amountNum === 0) {
      return alert("Enter a valid amount.");
    }

    const normalized =
      form.category === "Income" ? Math.abs(amountNum) : -Math.abs(amountNum);

    const tx = {
      id: `tx_${Date.now()}`,
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount: normalized,
    };

    setTransactions((prev) => [tx, ...prev]);
    setForm((p) => ({
      ...p,
      description: "",
      amount: "",
    }));
  };

  const removeTx = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    if (!window.confirm("Clear all finance transactions?")) return;

    setTransactions([]);
    localStorage.removeItem("astramind_finance_tx");

    setInsight({
      text: "Ledger cleared. Add new transactions to rebuild your Finance profile.",
      source: "SYSTEM",
    });
  };

  const normalizeTx = () => {
    setTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        category: t.category || classifyCategoryFromAmount(t.amount),
      }))
    );
  };

  const buildFinanceContext = () => {
    const last = transactions.slice(0, 12);

    const recentLines = last
      .map(
        (t) =>
          `${t.date} | ${t.category} | ${t.description} | ${
            t.amount >= 0 ? "+" : "-"
          }${money(Math.abs(t.amount))}`
      )
      .join("\n");

    return [
      "MODE: FINANCE",
      `SUMMARY: Income=${money(summary.income)}, Expenses=${money(
        summary.expenses
      )}, Net=${money(summary.net)}`,
      "RECENT_LEDGER (latest 12):",
      recentLines || "(empty)",
      `CREATOR_MEMORY: ${
        creator
          ? `${creator.niche} • ${creator.platform} • ${creator.tone}`
          : "none"
      }`,
    ].join("\n");
  };

  const generateInsight = async () => {
    if (thinking) return;

    const context = buildFinanceContext();

    const userAsk =
      prompt.trim() ||
      "Analyze my finance ledger. Give me 3 concrete next actions to improve cashflow and flag any overspending pattern.";

    const lowerAsk = userAsk.toLowerCase();

    const shouldOpenTradePilot =
      lowerAsk.includes("stock") ||
      lowerAsk.includes("invest") ||
      lowerAsk.includes("trading") ||
      lowerAsk.includes("robinhood") ||
      lowerAsk.includes("portfolio") ||
      lowerAsk.includes("tsla") ||
      lowerAsk.includes("nvda");

    if (shouldOpenTradePilot) {
      setActiveSection("tradepilot");

      setTimeout(() => {
        document.getElementById("finance-pro")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      setInsight({
        text:
          "This request belongs in Finance Pro. Opened TradePilot / MarketMentor so AstraMind can guide the subscriber through investing, trading, risk routing, and market signal review.",
        source: "ROUTED_TO_FINANCE_PRO",
      });

      return;
    }

    setThinking(true);

    setInsight({
      text: "Chappy Finance Intelligence is thinking…",
      source: "SYSTEM",
    });

    try {
      const result = await getChappyReply({
        message: `${context}\n\nREQUEST:\n${userAsk}`,
        creator,
        history: [
          {
            role: "system",
            content:
              "You are AstraMind Finance Intelligence. Be concise, tactical, and specific.",
          },
          {
            role: "user",
            content: userAsk,
          },
        ],
        mode: OS_MODES.FINANCE,
      });

      setInsight({
        text: result.reply,
        source: result.source,
      });
    } catch (e) {
      setInsight({
        text: "⚠️ Finance Intelligence failed. Check hybridAI + aiEngine wiring.",
        source: "ERROR",
      });

      console.error(e);
    } finally {
      setThinking(false);

      setTimeout(() => {
        insightRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  };

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full p-6 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-[0_0_45px_rgba(34,197,94,0.16)]">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-green-300 mb-2">
              💰 Finance Dashboard
            </h1>

            <p className="text-sm text-gray-300">
              Live tracking · instant totals · persistent ledger · Finance Pro
              routing · TradePilot intelligence.
            </p>

            {creator && (
              <p className="mt-2 text-[11px] text-emerald-300/90">
                Creator Memory Loaded · {creator.niche} · {creator.platform} ·{" "}
                {creator.tone}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={normalizeTx}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
              title="Repair missing categories"
            >
              Normalize
            </button>

            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveSection("dashboard")}
            className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${
              activeSection === "dashboard"
                ? "bg-green-600 text-white"
                : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}
          >
            Finance Dashboard
          </button>

          <button
            onClick={() => {
              setActiveSection("tradepilot");
              setTimeout(() => {
                document.getElementById("finance-pro")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }, 50);
            }}
            className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${
              activeSection === "tradepilot"
                ? "bg-purple-600 text-white"
                : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}
          >
            Finance Pro / TradePilot
          </button>
        </div>

        {activeSection === "dashboard" && (
          <div id="finance-dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <FinanceCard
                title="Total Income"
                value={money(summary.income)}
                color="text-green-300"
                glow="rgba(34,197,94,0.35)"
                icon="💸"
              />

              <FinanceCard
                title="Expenses"
                value={money(summary.expenses)}
                color="text-red-300"
                glow="rgba(239,68,68,0.32)"
                icon="📉"
              />

              <FinanceCard
                title="Net"
                value={money(summary.net)}
                color={summary.net >= 0 ? "text-emerald-200" : "text-rose-200"}
                glow={
                  summary.net >= 0
                    ? "rgba(16,185,129,0.26)"
                    : "rgba(244,63,94,0.26)"
                }
                icon="📊"
              />
            </div>

            <div className="mt-8 bg-black/30 rounded-xl border border-white/10 p-5 shadow-[0_0_30px_rgba(34,197,94,0.12)]">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-gray-200 mb-1">
                    🧠 Finance Intelligence
                  </h2>

                  <p className="text-[11px] text-gray-400">
                    Hybrid AI cloud → local fallback. Source:{" "}
                    <span className="text-emerald-200">{insight.source}</span>
                  </p>
                </div>

                <button
                  onClick={generateInsight}
                  disabled={thinking}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition text-sm font-semibold disabled:opacity-60"
                >
                  {thinking ? "…" : "Generate Insight"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="os-input md:col-span-2"
                  placeholder='Ask Finance Intelligence, ex: "Cut expenses by $300/mo"'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateInsight()}
                  disabled={thinking}
                />

                <button
                  onClick={() =>
                    setPrompt(
                      "Based on my ledger, give a weekly plan to increase net by 15% using fast changes + one revenue idea."
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                  disabled={thinking}
                >
                  Quick Prompt
                </button>
              </div>

              <div
                ref={insightRef}
                className="mt-4 max-h-[220px] overflow-y-auto pr-2 text-sm text-emerald-200 os-scroll whitespace-pre-wrap leading-relaxed border border-white/10 rounded-xl bg-black/20 p-4"
              >
                {insight.text}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-black/30 rounded-xl border border-white/10 p-5">
                <h2 className="text-sm font-semibold mb-4">
                  ➕ Add Transaction
                </h2>

                <input
                  type="date"
                  className="os-input mb-2"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      date: e.target.value,
                    }))
                  }
                />

                <input
                  className="os-input mb-2"
                  placeholder="Description, ex: Hood Cleaning Payment"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select
                    className="os-select"
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        category: e.target.value,
                      }))
                    }
                  >
                    <option>Expense</option>
                    <option>Income</option>
                  </select>

                  <input
                    className="os-input"
                    placeholder="$ Amount"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        amount: e.target.value,
                      }))
                    }
                  />
                </div>

                <button
                  onClick={addTx}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition"
                >
                  Add
                </button>

                <p className="mt-3 text-[11px] text-gray-400">
                  Stored locally as astramind_finance_tx. Insight panel reads
                  your ledger.
                </p>
              </div>

              <div className="lg:col-span-2 bg-black/30 rounded-xl border border-white/10 p-5">
                <h2 className="text-sm font-semibold mb-4">
                  Ledger ({transactions.length})
                </h2>

                <div className="max-h-[420px] overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                  <table className="min-w-full text-sm">
                    <thead className="bg-green-500/15 text-green-200">
                      <tr>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-left">Description</th>
                        <th className="py-2 px-3 text-left">Category</th>
                        <th className="py-2 px-3 text-left">Amount</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((t) => (
                        <tr
                          key={t.id}
                          className="border-t border-white/10 hover:bg-white/5 transition"
                        >
                          <td className="py-2 px-3">{t.date}</td>
                          <td className="py-2 px-3">{t.description}</td>
                          <td className="py-2 px-3">{t.category}</td>
                          <td
                            className={`py-2 px-3 ${
                              t.amount >= 0
                                ? "text-green-300"
                                : "text-red-300"
                            }`}
                          >
                            {t.amount >= 0
                              ? `+ ${money(t.amount)}`
                              : `- ${money(Math.abs(t.amount))}`}
                          </td>

                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => removeTx(t.id)}
                              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}

                      {transactions.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-gray-400"
                          >
                            No transactions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-[11px] text-gray-400">
                  Tip: Use consistent tags like supplies, gas, hood cleaning, or
                  snow to get sharper insights.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "tradepilot" && (
          <div id="finance-pro" className="mt-8">
            <FinanceTradePilot />
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceCard({ title, value, color, glow, icon }) {
  return (
    <div
      className="bg-black/30 p-6 rounded-xl border border-white/10"
      style={{
        boxShadow: `0 0 28px ${glow}`,
      }}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300">{title}</span>
        <span>{icon}</span>
      </div>

      <p className={`text-3xl font-extrabold mt-2 ${color}`}>{value}</p>
    </div>
  );
}








