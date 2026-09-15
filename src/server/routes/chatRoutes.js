const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://127.0.0.1:5000";
import express from "express";
import OpenAI from "openai";
import fetch from "node-fetch";

import { detectAgentIntent } from "../../core/agents/agentRouter.js";
import { getLiveNews } from "../../core/agents/newsAgent.js";

import { buildNewsIntelligence } from "../../core/intelligence/newsIntelEngine.js";
import { generateSignals } from "../../core/intelligence/signalEngine.js";
import { analyzePortfolio } from "../../core/finance/profitEngine.js";

import { generateFullContent } from "../../core/content/contentEngine.js";
import { saveContentProject } from "../../core/content/contentMemory.js";
import { generateVoice } from "../../core/content/voiceEngine.js";
import { buildVideoPrompt } from "../../core/content/videoPromptEngine.js";
import { generateRunwayVideo } from "../../core/content/runwayEngine.js";

const router = express.Router();

function hasAny(text = "", patterns = []) {
  const clean = String(text || "").toLowerCase();
  return patterns.some((pattern) => clean.includes(pattern));
}

function isFinanceMessage(message = "") {
  return hasAny(message, [
    "finance",
    "money",
    "budget",
    "income",
    "expense",
    "expenses",
    "cashflow",
    "cash flow",
    "profit",
    "loss",
    "ledger",
    "portfolio",
    "stock",
    "stocks",
    "invest",
    "investing",
    "investment",
    "trade",
    "trading",
    "robinhood",
    "brokerage",
    "etf",
    "index fund",
    "tsla",
    "nvda",
    "aapl",
    "msft",
    "spy",
    "voo",
    "qqq",
    "cpa",
    "tax",
    "taxes",
    "accountant",
    "broker",
    "financial advisor",
  ]);
}

function isTradePilotMessage(message = "") {
  return hasAny(message, [
    "stock",
    "stocks",
    "invest",
    "investing",
    "investment",
    "trade",
    "trading",
    "robinhood",
    "portfolio",
    "brokerage",
    "etf",
    "index fund",
    "buy",
    "sell",
    "tsla",
    "nvda",
    "aapl",
    "msft",
    "spy",
    "voo",
    "qqq",
  ]);
}

function resolveOutputMode(message = "", requestedMode = "AUTO") {
  const msg = message.toLowerCase();

  if (requestedMode && requestedMode !== "AUTO") return requestedMode;

  if (
    hasAny(msg, [
      "analyze",
      "brief",
      "intelligence",
      "report",
      "market impact",
      "research",
    ])
  ) {
    return "ANALYST";
  }

  if (
    hasAny(msg, [
      "book",
      "chapter",
      "script",
      "video",
      "song",
      "caption",
      "write",
      "generate",
      "create",
      "make",
      "draft",
      "produce",
    ])
  ) {
    return "GENERATOR";
  }

  return "CHAT";
}

function overrideIntent(intent, message = "") {
  const msg = message.toLowerCase();

  if (hasAny(msg, ["book", "novel", "chapter", "write a book"])) {
    return {
      ...intent,
      primaryAgent: "book",
      workflow: "book_full",
      confidence: 0.98,
      reasoning: "Creation request override: book generation.",
    };
  }

  if (
    hasAny(msg, [
      "video",
      "tiktok",
      "reel",
      "youtube",
      "short",
      "script",
      "caption",
      "content",
    ])
  ) {
    return {
      ...intent,
      primaryAgent: "content",
      workflow: "content_generation",
      confidence: 0.98,
      reasoning: "Creation request override: content/video generation.",
    };
  }

  if (isFinanceMessage(msg)) {
    return {
      ...intent,
      primaryAgent: "finance",
      workflow: isTradePilotMessage(msg) ? "finance_tradepilot" : "finance_os",
      confidence: Math.max(intent?.confidence || 0, 0.96),
      reasoning: "Finance routing override: money/investing/business finance detected.",
    };
  }

  return intent;
}

function resolveChappyRole(intent, message, outputMode) {
  const msg = message.toLowerCase();

  const baseRule = `
You are Aigenikz.

Critical output rules:
- Answer exactly what the user asked for.
- Do not guarantee profits, market outcomes, or investment returns.
- Do not claim to replace licensed financial, legal, tax, or investment professionals.
- If the user asks to write, generate, create, draft, or make something, produce the requested material directly.
- Keep the response useful, direct, and execution-focused.
`;

  if (outputMode === "ANALYST") {
    return {
      role: "Intelligence Analyst",
      route: "Research Workspace",
      systemPrompt: `${baseRule}
You are in ANALYST MODE.
Provide structured analysis only when the user asks for analysis, news, research, intelligence, or market impact.`,
    };
  }

  if (outputMode === "GENERATOR") {
    return {
      role: "Generator",
      route: "Creator Workspace",
      systemPrompt: `${baseRule}
You are in GENERATOR MODE.
Create the requested material directly. No extra explanation unless the user asks.`,
    };
  }

  if (intent.primaryAgent === "finance") {
    return {
      role: "Finance Advisor",
      route: "Finance OS",
      systemPrompt: `${baseRule}
You are Aigenikz Finance Intelligence.
For investing/trading questions, provide educational guidance only.
Recommend using Finance Pro / TradePilot for WealthRoute, MarketMentor, SignalVision, risk review, and structured next steps.
Never guarantee profit.`,
    };
  }

  if (intent.primaryAgent === "news") {
    return {
      role: "Intelligence Analyst",
      route: "Research Workspace",
      systemPrompt: `${baseRule}
Only provide a news/intelligence brief when the user specifically asks for news, current events, updates, research, or analysis.`,
    };
  }

  if (msg.includes("music") || msg.includes("song")) {
    return {
      role: "Music Producer",
      route: "Audio Studio",
      systemPrompt: `${baseRule}
Create songs, hooks, lyrics, concepts, and music prompts directly.`,
    };
  }

  return {
    role: "General AI",
    route: "Chat",
    systemPrompt: `${baseRule}
You are Chappy, an adaptive AI assistant inside Aigenikz.`,
  };
}

function detectFinanceProfessionalNeed(message = "") {
  const msg = message.toLowerCase();
  const matchAny = (patterns) => patterns.some((p) => msg.includes(p));

  const professionalRules = [
    {
      type: "CPA / Tax Professional",
      confidence: 0.95,
      patterns: [
        "tax",
        "taxes",
        "irs",
        "deduction",
        "write off",
        "write-off",
        "amend",
        "audit",
        "1099",
        "w2",
        "schedule c",
        "tax return",
        "cpa",
        "accountant",
      ],
      reply: `This is CPA/accountant territory.

I can help you organize the numbers, deductions, business expenses, receipts, and questions.

A CPA, enrolled agent, or tax professional should handle the official filing, amended return, IRS issue, or final tax position.

Best next move:
1. Gather income records.
2. Gather business expenses.
3. Separate personal vs business spending.
4. Bring the cleaned records to a CPA or enrolled agent.`,
    },
    {
      type: "Bookkeeper",
      confidence: 0.9,
      patterns: [
        "bookkeeping",
        "books",
        "reconcile",
        "receipts",
        "quickbooks",
        "profit and loss",
        "p&l",
        "monthly expenses",
        "categorize transactions",
      ],
      reply: `This is bookkeeping territory.

I can help you organize your income, expenses, categories, receipts, and monthly reports.

A bookkeeper is best if you need ongoing transaction cleanup, monthly reports, receipt tracking, or QuickBooks-style organization.`,
    },
    {
      type: "Financial Advisor",
      confidence: 0.9,
      patterns: [
        "retirement",
        "roth ira",
        "ira",
        "401k",
        "long term investing",
        "financial plan",
        "wealth plan",
        "risk tolerance",
        "asset allocation",
        "portfolio allocation",
      ],
      reply: `This is financial advisor territory.

I can help you understand allocation, risk, diversification, and planning options.

A licensed financial advisor is best for personalized retirement planning, long-term portfolio allocation, and regulated investment advice.`,
    },
    {
      type: "Broker",
      confidence: 0.88,
      patterns: [
        "broker",
        "stock broker",
        "buy stocks for me",
        "trade for me",
        "execute trades",
        "business broker",
        "buy a business",
        "sell a business",
      ],
      reply: `This sounds like broker territory.

I can help you evaluate options, compare risks, prepare questions, and organize your strategy.

A licensed broker is needed when someone is executing regulated trades, selling securities, or brokering a business purchase/sale.`,
    },
    {
      type: "Investment Banker / Capital Advisor",
      confidence: 0.9,
      patterns: [
        "raise capital",
        "funding round",
        "investor deck",
        "investment banker",
        "private placement",
        "sell shares",
        "equity raise",
        "venture capital",
        "series a",
        "seed round",
      ],
      reply: `This is investment banker / capital advisor territory.

I can help build your pitch, financial story, valuation logic, investor deck, and funding strategy.

For regulated fundraising, selling equity, private placements, or larger capital raises, involve an investment banker, securities attorney, or qualified capital advisor.`,
    },
    {
      type: "Business Attorney",
      confidence: 0.9,
      patterns: [
        "contract",
        "lawsuit",
        "legal",
        "liability",
        "partnership agreement",
        "operating agreement",
        "terms and conditions",
        "business attorney",
        "sue",
        "settlement",
      ],
      reply: `This is business attorney territory.

I can help you prepare questions, summarize the issue, organize documents, and understand the business side.

A licensed attorney should review contracts, liability exposure, lawsuits, settlements, partnership agreements, or legal obligations.`,
    },
    {
      type: "Lender / Loan Officer",
      confidence: 0.85,
      patterns: [
        "business loan",
        "line of credit",
        "sba loan",
        "loan officer",
        "working capital",
        "equipment financing",
        "credit line",
        "borrow money",
      ],
      reply: `This is lender / loan officer territory.

I can help you prepare your numbers, business use case, documents, and repayment logic.

A lender or loan officer is best for actual loan approval, underwriting, SBA loans, equipment financing, or lines of credit.`,
    },
  ];

  const matched = professionalRules.find((rule) => matchAny(rule.patterns));
  if (!matched) return null;

  return {
    professionalType: matched.type,
    confidence: matched.confidence,
    route: "Finance OS",
    reply: matched.reply,
  };
}

function buildFinanceGuidance(message = "") {
  const tradePilot = isTradePilotMessage(message);

  if (tradePilot) {
    return `Aigenikz detected this as an investing/trading request.

Here is the safe route:
1. Start with your capital plan.
2. Separate long-term investing from active trading.
3. Use small position sizing.
4. Avoid all-in trades.
5. Use Finance Pro / TradePilot to generate a WealthRoute, MarketMentor response, and SignalVision chart review.

Aigenikz is a guidance and education tool. It does not guarantee profit or replace a licensed financial advisor.`;
  }

  return `Aigenikz detected this as a finance request.

Best next step:
1. Open Finance OS.
2. Organize income, expenses, and net cashflow.
3. Review your ledger.
4. Generate Finance Intelligence.
5. Use Finance Pro if the request involves investing, trading, stocks, ETFs, or portfolio building.`;
}

// ============================
// 🚀 MAIN ROUTE
// ============================
router.post("/", async (req, res) => {
  try {
    const {
      message = "",
      history = [],
      outputMode: requestedOutputMode = "AUTO",
    } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY missing." });
    }

    console.log("📥 Incoming:", message);

    const outputMode = resolveOutputMode(message, requestedOutputMode);

    let detectedIntent = detectAgentIntent(message);
    detectedIntent = overrideIntent(detectedIntent, message);

    const role = resolveChappyRole(detectedIntent, message, outputMode);

    console.log("🧠 Intent:", detectedIntent);
    console.log("🎛️ Output Mode:", outputMode);

    if (detectedIntent.primaryAgent === "book") {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are Aigenikz Book Writer.

Write only the book material requested.
Do not create a news brief.
Do not create market analysis.
Do not add trade signals.
If the user says "help me write a book," give a strong book concept, title options, premise, chapter outline, and Chapter 1 starter unless they ask for something else.
`,
          },
          ...history.slice(-10),
          { role: "user", content: message },
        ],
        temperature: 0.75,
      });

      return res.json({
        reply: completion.choices[0].message.content,
        route: "Book Writer",
        outputMode,
        suggestedNextStep: {
          type: "redirect",
          label: "Open Book Writer",
          path: "/content/book",
          reason: "This request is best continued in the Book Writer workspace.",
        },
      });
    }

    if (detectedIntent.primaryAgent === "content") {
      try {
        console.log("🎬 CONTENT PIPELINE START");

        const content = await generateFullContent({
          idea: message,
          style: "viral",
          platform: "tiktok",
        });

        let voiceBuffer = null;
        try {
          voiceBuffer = await generateVoice(content.slice(0, 1200));
        } catch {
          console.log("⚠️ Voice skipped");
        }

        const videoPrompt = buildVideoPrompt(content);

        let videoUrl = null;
        try {
          videoUrl = await generateRunwayVideo(videoPrompt);
        } catch {
          console.log("⚠️ Runway fallback");
          videoUrl = null;
        }

        saveContentProject({
          idea: message,
          content,
          videoPrompt,
          videoUrl,
          hasVoice: !!voiceBuffer,
        });

        return res.json({
          reply: content,
          route: "content_creation",
          outputMode,
          suggestedNextStep: {
            type: "redirect",
            label: "Open Content Creator",
            path: "/content",
            reason:
              "This request is best continued in the Content Creation workspace.",
          },
        });
      } catch (err) {
        console.error("🔥 Content Error:", err);
        return res.json({
          reply: "⚠️ Content generation failed.",
          route: "content_creation",
          outputMode,
        });
      }
    }

    if (detectedIntent.primaryAgent === "news" && outputMode === "ANALYST") {
      try {
        const articles = await getLiveNews(message);

        if (!articles?.length) {
          return res.json({
            reply: "⚠️ No news found.",
            route: "Research Workspace",
            outputMode,
          });
        }

        const intel = await buildNewsIntelligence(articles);
        const signals = await generateSignals(intel);

        const signalText = signals
          .map((s) => `${s.symbol} → ${s.action} (${s.confidence}%)`)
          .join("\n");

        return res.json({
          reply: `${intel}\n\n🚀 Signals:\n${signalText}`,
          route: "Research Workspace",
          outputMode,
          suggestedNextStep: {
            type: "redirect",
            label: "Open Research Workspace",
            path: "/research",
            reason:
              "Live intelligence is best explored in the Research Workspace.",
          },
        });
      } catch (err) {
        console.error("🔥 News Error:", err);
      }
    }

    if (detectedIntent.primaryAgent === "finance") {
      const professionalNeed = detectFinanceProfessionalNeed(message);
      const tradePilot = isTradePilotMessage(message);

      if (professionalNeed) {
        return res.json({
          reply: professionalNeed.reply,
          route: "Finance OS",
          outputMode,
          agent: "finance",
          financeMode: tradePilot ? "tradepilot" : "dashboard",
          professionalType: professionalNeed.professionalType,
          confidence: professionalNeed.confidence,
          suggestedNextStep: {
            type: "redirect",
            label: "Open Finance OS",
            path: "/finance",
            reason: `${professionalNeed.professionalType} detected. This request is best continued inside Finance OS.`,
            targetSection: tradePilot ? "tradepilot" : "dashboard",
          },
        });
      }

      let portfolioText = "No portfolio data available.";

      try {
        const [pRes, wRes] = await Promise.all([
          fetch(`${INTERNAL_API_URL}/api/finance/portfolio`),
          fetch(`${INTERNAL_API_URL}/api/finance/watchlist`),
        ]);

        const portfolio = (await pRes.json()).data || [];
        const watchlist = (await wRes.json()).data || [];
        const analysis = await analyzePortfolio(portfolio, watchlist);

        portfolioText =
          analysis
            .map((a) => `${a.symbol} $${a.price} ${a.profitPercent}%`)
            .join("\n") || "No portfolio data available.";
      } catch (err) {
        console.warn("⚠️ Portfolio analysis skipped:", err.message);
      }

      const financeGuidance = buildFinanceGuidance(message);

      return res.json({
        reply: `${financeGuidance}\n\nPortfolio Snapshot:\n${portfolioText}`,
        route: "Finance OS",
        outputMode,
        agent: "finance",
        financeMode: tradePilot ? "tradepilot" : "dashboard",
        suggestedNextStep: {
          type: "redirect",
          label: tradePilot ? "Open Finance Pro / TradePilot" : "Open Finance OS",
          path: "/finance",
          reason: tradePilot
            ? "Investing/trading request detected. Continue inside Finance Pro / TradePilot."
            : "Manage and analyze finances inside Finance OS.",
          targetSection: tradePilot ? "tradepilot" : "dashboard",
        },
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: role.systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message },
      ],
      temperature: outputMode === "GENERATOR" ? 0.75 : 0.6,
    });

    return res.json({
      reply: completion.choices[0].message.content,
      route: role.route,
      outputMode,
    });
  } catch (error) {
    console.error("🔥 ROUTE ERROR:", error);
    return res.status(500).json({ error: "Chat failed" });
  }
});

export default router;