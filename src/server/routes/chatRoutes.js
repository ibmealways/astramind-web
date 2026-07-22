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
import { KernelBootstrap } from "../../core/kernel/KernelBootstrap.js";
import SqliteMissionStore from "../../core/mission/SqliteMissionStore.js";
import db from "../db/sqlite.js";
import defaultManifest from "../../core/manifest/defaultManifest.js";
import { prepareAdaptiveContext } from "../../core/conversation/AdaptiveContextEngine.js";
import ConversationMemoryStore from "../../core/conversation/ConversationMemoryStore.js";
import { createDynamicConversationPlan } from "../../core/mission/DynamicConversationPlanner.js";
import { createBoundedResearchPlan } from "../../core/mission/BoundedAutonomyPlanner.js";
import MissionApprovalStore from "../../core/mission/MissionApprovalStore.js";
import ResearchArtifactStore from "../../core/research/ResearchArtifactStore.js";
import { attachResearchSources, buildEvidenceResearchQueries, planResearch, synthesizeResearch, validateResearchSources } from "../../core/research/ResearchPipeline.js";
import { buildProductFormulationProposal } from "../../core/research/ProductFormulationEngine.js";
import { runWebSearch } from "../../services/webSearchService.js";
import { generateAstraMindResponse } from "../../core/intelligence/AstraMindIntelligenceGateway.js";
import { generateLocalContentLabDialogue } from "../../core/research/ContentLabDialogueFallback.js";

const createResponseCapture = () => {
  let statusCode = 200;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      return { statusCode, body };
    },
  };
};

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

function isProductExperimentMessage(message = "") {
  const text = String(message || "").toLowerCase();
  return ["formulate", "formulation", "develop a product", "make a product", "prototype", "degreaser", "cleaning chemical", "biodegradable", "bio-degradable"]
    .some((term) => text.includes(term));
}

function buildProductResearchQuery(message = "") {
  const competitors = ["Purple Power", "Glitter", "Red-Hot"].filter((name) => String(message || "").toLowerCase().includes(name.toLowerCase()));
  return `biodegradable industrial degreaser restaurant kitchen safer ingredient classes performance testing surface compatibility EPA Safer Choice SDS GHS wastewater${competitors.length ? ` compare ${competitors.join(" and ")}` : ""}`;
}

function overrideIntent(intent, message = "") {
  const msg = message.toLowerCase();

  if (isProductExperimentMessage(msg)) {
    const requiresResearch = hasAny(msg, ["research", "compare", "source", "evidence", "latest", "standard", "epa", "osha", "sds", "ghs", "wastewater"]);
    return {
      ...intent,
      primaryAgent: requiresResearch ? "research" : "general",
      workflow: requiresResearch ? "product_research" : "product_development",
      confidence: 0.99,
      reasoning: requiresResearch
        ? "Evidence-dependent product request routed through Research OS before Content Lab."
        : "Product-development follow-up routed directly to Content Lab guidance.",
    };
  }

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

export function classifyConversation(message = "", requestedOutputMode = "AUTO") {
  const intent = overrideIntent(detectAgentIntent(message), message);
  return {
    intent,
    outputMode: resolveOutputMode(message, requestedOutputMode),
    classifiedAt: new Date().toISOString(),
    classifier: "conversation-rules-v1",
  };
}

export function createChatManifest() {
  const manifest = JSON.parse(JSON.stringify(defaultManifest));
  const additions = [
    ["conversation.classify", "Conversation Intent Classification", "conversation", "classify"],
    ["conversation.memory.recall", "Conversation Memory Recall", "conversation", "recall-memory"],
    ["conversation.context.prepare", "Adaptive Conversation Context", "conversation", "prepare-context"],
    ["research.plan", "Research Planning", "research", "plan"],
    ["research.collect", "Research Source Collection", "research", "collect"],
    ["research.validate", "Research Source Validation", "research", "validate"],
    ["research.synthesize", "Research Synthesis", "research", "synthesize"],
  ].map(([id, name, authority, action]) => ({ id, name, version: "1.0.0", description: name, scope: "kernel", authority, action, permissions: [], status: "active" }));
  for (const capability of additions) {
    if (!manifest.capabilities.some(({ id }) => id === capability.id)) manifest.capabilities.push(capability);
    const authority = manifest.authorities.find(({ id }) => id === capability.authority);
    if (authority && !authority.requiredCapabilities.includes(capability.id)) authority.requiredCapabilities.push(capability.id);
  }
  return manifest;
}

function resolveChappyRole(intent, message, outputMode) {
  const msg = message.toLowerCase();

  const baseRule = `
You are AstraMind.

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
You are AstraMind Finance Intelligence.
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
You are Chappy, an adaptive AI assistant inside AstraMind.`,
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
    return `AstraMind detected this as an investing/trading request.

Here is the safe route:
1. Start with your capital plan.
2. Separate long-term investing from active trading.
3. Use small position sizing.
4. Avoid all-in trades.
5. Use Finance Pro / TradePilot to generate a WealthRoute, MarketMentor response, and SignalVision chart review.

AstraMind is a guidance and education tool. It does not guarantee profit or replace a licensed financial advisor.`;
  }

  return `AstraMind detected this as a finance request.

Best next step:
1. Open Finance OS.
2. Organize income, expenses, and net cashflow.
3. Review your ledger.
4. Generate Finance Intelligence.
5. Use Finance Pro if the request involves investing, trading, stocks, ETFs, or portfolio building.`;
}

function buildLocalChatFallback(message = "", intent = {}) {
  if (intent.workflow === "product_research" || isProductExperimentMessage(message)) {
    return {
      reply: "AstraMind has opened a safe product-development path. Define the target soils, surfaces, contact time, dilution, odor, corrosion limits, biodegradability standard, and cost ceiling. Compare candidate ingredient classes only after reviewing supplier safety data, then have a qualified formulation chemist create and validate prototypes. Required gates include bench performance, material compatibility, worker exposure, SDS/GHS classification, wastewater impact, stability, packaging compatibility, and applicable EPA/OSHA requirements. No unverified chemical formula or performance guarantee has been generated.",
      route: "Content Lab",
      suggestedNextStep: { type: "redirect", label: "Open Content Lab", path: "/content-lab", reason: "Continue the product experiment with evidence, variables, and safety gates." },
    };
  }
  if (/presentation|slide deck/i.test(message)) {
    return {
      reply: "The synthesis provider is unavailable, but AstraMind created a local production outline. Suggested deck structure: 1. Vision, 2. Customer problem, 3. AstraMind OS capabilities, 4. Connected creator and research workflows, 5. Finance and journey intelligence, 6. Demonstration, 7. Subscription plans, 8. Call to action.",
      route: "Creator Studio",
      suggestedNextStep: { type: "redirect", label: "Open Creator Studio", path: "/content", reason: "Continue building the deck in Creator Studio." },
    };
  }
  return { reply: "AstraMind received your request. Planning, memory, and local guidance remain online, but the external synthesis provider is unavailable. Restore provider credit for a fully generated response.", route: "Chat" };
}

// ============================
// 🚀 MAIN ROUTE
// ============================
export async function executeLegacyChat(req, res) {
  try {
    const {
      message = "",
      history = [],
      outputMode: requestedOutputMode = "AUTO",
    } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    console.log("📥 Incoming:", message);

    const outputMode = resolveOutputMode(message, requestedOutputMode);

    const classified = req.body?.kernelIntent;
    let detectedIntent = classified || detectAgentIntent(message);
    if (!classified) detectedIntent = overrideIntent(detectedIntent, message);

    const role = resolveChappyRole(detectedIntent, message, outputMode);

    if (req.body?.kernelResearch?.synthesis) {
      const productResearch = detectedIntent.workflow === "product_research";
      return res.json({
        reply: req.body.kernelResearch.synthesis,
        route: productResearch ? "Content Lab" : "Research Workspace",
        outputMode: "ANALYST",
        citations: req.body.kernelResearch.citations || [],
        research: req.body.kernelResearch,
        suggestedNextStep: {
          type: "redirect",
          label: productResearch ? "Open Content Lab" : "Open Research Workspace",
          path: productResearch ? "/content-lab" : "/research",
          reason: productResearch ? "Turn the validated brief into a governed experiment." : "Continue with the validated research brief.",
        },
      });
    }

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OLLAMA_BASE_URL) {
      return res.json({ ...buildLocalChatFallback(message, detectedIntent), outputMode, providerStatus: "unavailable" });
    }

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
You are AstraMind Book Writer.

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
          fetch("http://localhost:5000/api/finance/portfolio"),
          fetch("http://localhost:5000/api/finance/watchlist"),
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

    const intelligence = await generateAstraMindResponse({
      systemPrompt: role.systemPrompt,
      messages: [...history.slice(-10), { role: "user", content: message }],
    });

    return res.json({
      reply: intelligence.text,
      route: detectedIntent.workflow === "product_development" ? "Content Lab" : role.route,
      outputMode,
      intelligence: { gateway: intelligence.gateway, provider: intelligence.provider, model: intelligence.model, responseId: intelligence.responseId },
      suggestedNextStep: detectedIntent.workflow === "product_development" ? {
        type: "redirect",
        label: "Open Content Lab",
        path: "/content-lab",
        reason: "Continue defining the governed product experiment in Content Lab.",
      } : undefined,
    });
  } catch (error) {
    console.error("🔥 ROUTE ERROR:", error);
    const fallback = buildLocalChatFallback(req.body?.message, req.body?.kernelIntent || {});
    return res.json({ ...fallback, outputMode: req.body?.outputMode || "CHAT", providerStatus: "unavailable", providerError: error.message });
  }
}

export function createChatRouter({
  legacyHandler = executeLegacyChat,
  intelligenceResponder = generateAstraMindResponse,
  bootstrap,
  memoryStore,
  researchCollector,
  approvalStore,
  artifactStore,
} = {}) {
  const router = express.Router();
  const conversationMemory = memoryStore || new ConversationMemoryStore({ db });
  const approvals = approvalStore || new MissionApprovalStore({ db });
  const artifacts = artifactStore || new ResearchArtifactStore({ db });
  const collectResearch = researchCollector || (async (query, options = {}) => {
    const result = await runWebSearch(query, { maxResults: options.maxResults || 4, searchDepth: "advanced" });
    console.log("[Research OS] source collection", { provider: result.provider, results: result.results?.length || 0, fallbackUsed: Boolean(result.fallbackUsed), attempts: result.attempts });
    return result;
  });

  const chatBootstrap = bootstrap || new KernelBootstrap({
    manifest: createChatManifest(),
    authorityFactories: {
      conversation: () => ({
        execute: async ({ action, payload }) => {
          const request = payload.input || {};
          if (action === "classify") return classifyConversation(request.message, request.outputMode);
          if (action === "recall-memory") {
            return {
              classification: payload.previousResult,
              recalledMemories: conversationMemory.recall({ query: request.message, conversationId: request.conversationId, userId: request.userId || "global" }),
            };
          }
          if (action === "prepare-context") {
            return {
              classification: payload.previousResult?.classification,
              recalledMemories: payload.previousResult?.recalledMemories || [],
              context: prepareAdaptiveContext({ ...request, recalledMemories: payload.previousResult?.recalledMemories }),
            };
          }
          throw new Error(`Unsupported conversation action: ${action}`);
        },
      }),
      research: () => ({
        execute: async ({ action, payload }) => {
          const request = payload.input || {};
          if (action === "plan") return planResearch(request.message, payload.previousResult);
          if (action === "collect") {
            if (Array.isArray(request.researchSources)) {
              return attachResearchSources(payload.previousResult, request.researchSources, { provider: "supplied", queryCount: 0, governanceVersion: "2.0" });
            }
            const productResearch = payload.previousResult?.classification?.intent?.workflow === "product_research";
            const baseQuery = productResearch ? buildProductResearchQuery(request.message) : request.message;
            const lanes = payload.previousResult?.research?.lanes?.length
              ? payload.previousResult.research.lanes
              : buildEvidenceResearchQueries(baseQuery);
            const sources = [];
            const providers = new Set();
            const attempts = [];
            for (const lane of lanes.slice(0, 6)) {
              const collected = await collectResearch(lane.query, { maxResults: 4, lane: lane.lane });
              const result = Array.isArray(collected) ? { results: collected, provider: "injected" } : collected;
              if (result?.provider) providers.add(result.provider);
              attempts.push({ lane: lane.lane, provider: result?.provider || "unknown", resultCount: result?.results?.length || 0, ok: Boolean(result?.results?.length) });
              for (const source of result?.results || []) sources.push({ ...source, evidenceLane: lane.lane, provider: result?.provider || source.provider });
            }
            return attachResearchSources(payload.previousResult, sources, { providers: [...providers], queryCount: lanes.slice(0, 6).length, attempts, governanceVersion: "2.0" });
          }
          if (action === "validate") return validateResearchSources(payload.previousResult);
          if (action === "synthesize") return synthesizeResearch(payload.previousResult);
          throw new Error(`Unsupported research action: ${action}`);
        },
      }),
    },
    workflowHandler: async ({ input, previousResult }, metadata = {}) => {
      const classification = previousResult?.classification || null;
      const adaptiveContext = previousResult?.context || null;
      const research = previousResult?.research || null;
      const captured = await legacyHandler({
        body: {
          ...input,
          history: adaptiveContext?.history || input?.history,
          kernelIntent: classification?.intent,
          kernelResearch: research,
          outputMode: classification?.outputMode || input?.outputMode,
        },
      }, createResponseCapture());
      if (!captured || typeof captured.statusCode !== "number") throw new Error("Chat adapter did not return a response.");
      if (captured.statusCode >= 400) {
        const error = new Error(captured.body?.error || "Chat request failed.");
        error.status = captured.statusCode;
        error.code = captured.body?.code || "CHAT_EXECUTION_FAILED";
        throw error;
      }
      const reply = captured.body?.reply || captured.body?.content || captured.body?.result || "";
      const remembered = conversationMemory.rememberExchange({
        conversationId: input?.conversationId || "default",
        userId: input?.userId || "global",
        message: input?.message,
        reply: typeof reply === "string" ? reply : JSON.stringify(reply),
        metadata: { missionId: metadata.missionId, intent: classification?.intent?.primaryAgent },
      });
      const artifact = research?.synthesis && research.validSourceCount > 0 ? artifacts.create({
        userId: input?.userId || "global",
        conversationId: input?.conversationId || "default",
        missionId: metadata.missionId,
        query: research.query,
        brief: research.synthesis,
        citations: research.citations || [],
        provenance: { method: research.method, validSourceCount: research.validSourceCount || 0 },
      }) : null;
      const productResearch = classification?.intent?.workflow === "product_research" || /product|prototype|degreaser|formula|material/i.test(research?.query || "");
      const formulationProposal = productResearch ? buildProductFormulationProposal({ objective: research?.query || input?.message, batchSizeGrams: 1000 }) : null;
      const contentLabExperiment = artifact ? {
        id: `research-${artifact.id}`,
        domain: productResearch ? "engineering" : "science",
        title: String(research.query || artifact.title).slice(0, 90),
        question: research.query,
        hypothesis: [
          research.report?.executiveSummary,
          ...(research.report?.recommendedExperiments || []).map((item, index) => `${index + 1}. ${item}`),
        ].filter(Boolean).join("\n\n").slice(0, 6000),
        status: "evidence-ready",
        researchArtifactId: artifact.id,
        missionId: metadata.missionId,
        citations: research.citations || [],
        evidenceGovernance: research.report?.evidenceStrength || null,
        formulationProposal,
        createdAt: new Date().toISOString(),
      } : null;
      return {
        ...captured.body,
        classification,
        research,
        citations: captured.body?.citations || research?.citations || [],
        artifact,
        formulationProposal,
        contentLabExperiment,
        adaptiveContext: adaptiveContext ? { stats: adaptiveContext.stats, strategy: adaptiveContext.strategy, preparedAt: adaptiveContext.preparedAt } : null,
        memory: { recalled: adaptiveContext?.stats?.retrievedMemories || 0, stored: remembered.length },
      };
    },
    missionStore: new SqliteMissionStore({ db }),
  });

  const resolveUserId = (req) => String(req.user?.id || req.get("x-memory-user-id") || req.body?.userId || "").trim();
  const requireMemoryUser = (req, res) => {
    const userId = resolveUserId(req);
    if (!userId) res.status(401).json({ error: "Memory identity is required.", code: "MEMORY_IDENTITY_REQUIRED" });
    return userId || null;
  };
  const shapeExecution = (execution, planning) => ({
    ...execution.data,
    planning,
    missionId: execution.mission.id,
    executionId: execution.requestId,
    mission: { id: execution.mission.id, name: execution.mission.name, status: execution.mission.status, plan: execution.mission.plan, createdAt: execution.mission.createdAt, completedAt: execution.mission.completedAt },
    architecture: "AstraMind OS 3.0",
    compatibilityMode: false,
  });
  const executePlannedRequest = async (request, planning) => {
    const execution = await (await chatBootstrap.boot()).executeMission({ mission: "chat.message", input: request, plan: planning.plan, metadata: { channel: "chat-api" } });
    return shapeExecution(execution, planning);
  };

  router.post("/lab-dialogue", async (req, res) => {
    try {
      const userId = requireMemoryUser(req, res); if (!userId) return;
      const message = String(req.body?.message || "").trim();
      const experiment = req.body?.experiment && typeof req.body.experiment === "object" ? req.body.experiment : {};
      const experimentId = String(experiment.id || req.body?.experimentId || "").trim();
      if (!experimentId) return res.status(400).json({ error: "Experiment identity is required.", code: "LAB_EXPERIMENT_REQUIRED" });
      if (!message) return res.status(400).json({ error: "Follow-up question is required.", code: "LAB_MESSAGE_REQUIRED" });
      const history = (Array.isArray(req.body?.history) ? req.body.history : []).slice(-12).map(({ role, content }) => ({ role: role === "assistant" ? "assistant" : "user", content: String(content || "").slice(0, 8000) }));
      const labContext = {
        experimentId,
        title: String(experiment.title || "").slice(0, 300),
        question: String(experiment.question || "").slice(0, 4000),
        evidenceSummary: String(experiment.hypothesis || "").slice(0, 6000),
        status: experiment.status || "draft",
        evidenceGovernance: experiment.evidenceGovernance || null,
        formulationProposal: experiment.formulationProposal || null,
        citationCount: Array.isArray(experiment.citations) ? experiment.citations.length : 0,
      };
      let intelligence;
      try {
        intelligence = await intelligenceResponder({
          systemPrompt: `You are AstraMind Content Lab Dialogue, the continuation assistant for one governed experiment. Answer the creator's follow-up using the experiment context below. Distinguish sourced evidence, design assumptions, and unverified hypotheses. Never describe a research formulation as commercially validated, safe, certified, patent-cleared, or guaranteed. Do not silently change ingredient percentages; identify any proposed revision as a new candidate version and preserve a 100% mass balance. For legal, chemical-safety, food-contact, wastewater, or commercialization questions, explain the applicable professional or testing gate. If current external evidence is required, say that a new governed research mission should be run. Stay focused on this experiment and give actionable next steps.\n\nEXPERIMENT CONTEXT:\n${JSON.stringify(labContext)}`,
          messages: [...history, { role: "user", content: message }],
        });
      } catch (providerError) {
        if (providerError.code !== "INTELLIGENCE_PROVIDERS_EXHAUSTED") throw providerError;
        console.warn("[Content Lab Dialogue] cloud providers exhausted; using governed local fallback", { experimentId });
        intelligence = generateLocalContentLabDialogue({ message, experiment: labContext });
      }
      const conversationId = `content-lab:${experimentId}`;
      conversationMemory.rememberExchange({ conversationId, userId, message, reply: intelligence.text, metadata: { workspace: "content-lab", experimentId } });
      return res.json({ ok: true, reply: intelligence.text, conversationId, experimentId, intelligence: { gateway: intelligence.gateway, provider: intelligence.provider, model: intelligence.model, responseId: intelligence.responseId, fallback: Boolean(intelligence.fallback) } });
    } catch (error) {
      console.error("[Content Lab Dialogue]", error);
      return res.status(Number.isInteger(error.status) ? error.status : 500).json({ error: error.message || "Content Lab dialogue failed.", code: error.code || "LAB_DIALOGUE_FAILED" });
    }
  });

  const shapeAutonomousExecution = (run, planning) => ({
    ok: true,
    architecture: "AstraMind OS 3.0",
    autonomy: { mode: "supervised-bounded", version: "bounded-autonomy-v1", governance: planning.governance },
    missionId: run.mission.id,
    status: run.mission.status,
    awaitingApproval: Boolean(run.awaitingApproval),
    approval: run.approval || run.mission.autonomy?.approval || null,
    bounds: run.mission.autonomy?.bounds,
    usage: run.mission.autonomy?.usage,
    checkpoint: run.mission.autonomy?.checkpoint ? {
      nextStepIndex: run.mission.autonomy.checkpoint.nextStepIndex,
      completedStepId: run.mission.autonomy.checkpoint.completedStepId || null,
      savedAt: run.mission.autonomy.checkpoint.savedAt,
    } : null,
    plan: run.mission.plan,
    result: run.execution?.data || null,
  });

  router.post("/", async (req, res) => {
    try {
      const input = { ...(req.body || {}), userId: resolveUserId(req) || "global" };
      if (!String(input.message || "").trim()) return res.status(400).json({ error: "Message is required.", code: "MESSAGE_REQUIRED" });
      const classification = classifyConversation(input.message, input.outputMode);
      const planning = createDynamicConversationPlan({ classification, input });
      if (planning.approval.required) {
        const userId = input.userId;
        const approval = approvals.create({ userId, request: input, planning });
        return res.status(202).json({
          awaitingApproval: true,
          approval,
          planning,
          classification,
          reply: "Research OS prepared a governed source-collection mission. Approve it to search, validate citations, and create the Content Lab handoff.",
        });
      }
      return res.status(200).json(await executePlannedRequest(input, planning));
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status >= 500) console.error("[Chat Kernel]", error);
      return res.status(status).json({ error: error.message || "Chat failed", code: error.code || "CHAT_EXECUTION_FAILED" });
    }
  });

  router.post("/autonomy/research", async (req, res) => {
    try {
      const userId = requireMemoryUser(req, res); if (!userId) return;
      const objective = String(req.body?.objective || req.body?.message || "").trim();
      const input = { ...(req.body?.input || {}), message: objective, userId, conversationId: req.body?.conversationId || req.body?.input?.conversationId || "autonomous-research" };
      if (Array.isArray(req.body?.researchSources)) input.researchSources = req.body.researchSources;
      const planning = createBoundedResearchPlan({ objective, input, bounds: req.body?.bounds });
      const kernel = await chatBootstrap.boot();
      const run = await kernel.executeAutonomousMission({
        mission: "autonomous.research",
        objective: planning.objective,
        input,
        plan: planning.plan,
        bounds: planning.bounds,
        user: { id: userId },
        constraints: planning.governance,
        metadata: { channel: "autonomous-research-api", userId, template: planning.template, governance: planning.governance },
      });
      return res.status(run.awaitingApproval ? 202 : 200).json(shapeAutonomousExecution(run, planning));
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status >= 500) console.error("[Bounded Autonomy]", error);
      return res.status(status).json({ ok: false, error: error.message, code: error.code || "AUTONOMY_START_FAILED" });
    }
  });

  router.post("/autonomy/missions/:missionId/approve", async (req, res) => {
    try {
      const userId = requireMemoryUser(req, res); if (!userId) return;
      const kernel = await chatBootstrap.boot();
      const mission = kernel.getMission(req.params.missionId);
      if (!mission || mission.name !== "autonomous.research" || mission.metadata?.userId !== userId) return res.status(404).json({ ok: false, error: "Autonomous mission not found.", code: "AUTONOMY_MISSION_NOT_FOUND" });
      const run = await kernel.approveAutonomousMission(req.params.missionId, { userId, approvalId: req.body?.approvalId });
      const planning = { governance: mission.metadata.governance };
      return res.status(run.awaitingApproval ? 202 : 200).json(shapeAutonomousExecution(run, planning));
    } catch (error) {
      return res.status(Number.isInteger(error.status) ? error.status : 500).json({ ok: false, error: error.message, code: error.code || "AUTONOMY_APPROVAL_FAILED" });
    }
  });

  router.post("/autonomy/missions/:missionId/cancel", async (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    const kernel = await chatBootstrap.boot();
    const mission = kernel.getMission(req.params.missionId);
    if (!mission || mission.name !== "autonomous.research" || mission.metadata?.userId !== userId) return res.status(404).json({ ok: false, error: "Autonomous mission not found.", code: "AUTONOMY_MISSION_NOT_FOUND" });
    if (!kernel.cancelAutonomousMission(req.params.missionId, userId)) return res.status(409).json({ ok: false, error: `Mission is already ${mission.status}.`, code: "AUTONOMY_MISSION_TERMINAL" });
    return res.status(202).json({ ok: true, missionId: mission.id, status: "cancelling" });
  });

  router.post("/autonomy/missions/:missionId/pause", async (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    const kernel = await chatBootstrap.boot();
    if (!kernel.pauseAutonomousMission(req.params.missionId, userId)) return res.status(409).json({ ok: false, error: "Only an active mission owned by this creator can be paused.", code: "AUTONOMY_MISSION_NOT_ACTIVE" });
    return res.status(202).json({ ok: true, missionId: req.params.missionId, status: "pausing" });
  });

  router.post("/autonomy/missions/:missionId/resume", async (req, res) => {
    try {
      const userId = requireMemoryUser(req, res); if (!userId) return;
      const kernel = await chatBootstrap.boot();
      const mission = kernel.getMission(req.params.missionId);
      if (!mission || mission.name !== "autonomous.research" || mission.metadata?.userId !== userId) return res.status(404).json({ ok: false, error: "Autonomous mission not found.", code: "AUTONOMY_MISSION_NOT_FOUND" });
      const run = await kernel.resumeAutonomousMission(req.params.missionId, userId);
      return res.status(run.awaitingApproval ? 202 : 200).json(shapeAutonomousExecution(run, { governance: mission.metadata.governance }));
    } catch (error) {
      return res.status(Number.isInteger(error.status) ? error.status : 500).json({ ok: false, error: error.message, code: error.code || "AUTONOMY_RESUME_FAILED" });
    }
  });

  router.get("/autonomy/missions", async (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    const kernel = await chatBootstrap.boot();
    const missions = kernel.listMissions({ limit: 100, status: req.query.status })
      .filter((mission) => mission.name === "autonomous.research" && mission.metadata?.userId === userId)
      .slice(0, Math.min(Math.max(Number(req.query.limit) || 20, 1), 50));
    return res.json({ ok: true, missions });
  });

  router.get("/autonomy/missions/:missionId", async (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    const kernel = await chatBootstrap.boot();
    const mission = kernel.getMission(req.params.missionId);
    if (!mission || mission.name !== "autonomous.research" || mission.metadata?.userId !== userId) return res.status(404).json({ ok: false, error: "Autonomous mission not found.", code: "AUTONOMY_MISSION_NOT_FOUND" });
    return res.json({ ok: true, mission });
  });

  router.post("/approvals/:approvalId/approve", async (req, res) => {
    try {
      const userId = requireMemoryUser(req, res); if (!userId) return;
      const approval = approvals.decide({ id: req.params.approvalId, userId, status: "approved" });
      if (!approval) return res.status(404).json({ error: "Pending approval not found.", code: "APPROVAL_NOT_FOUND" });
      return res.json({ ...(await executePlannedRequest(approval.request, approval.planning)), approval });
    } catch (error) { return res.status(500).json({ error: error.message, code: "APPROVAL_EXECUTION_FAILED" }); }
  });

  router.post("/approvals/:approvalId/reject", (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    const approval = approvals.decide({ id: req.params.approvalId, userId, status: "rejected", reason: req.body?.reason });
    if (!approval) return res.status(404).json({ error: "Pending approval not found.", code: "APPROVAL_NOT_FOUND" });
    return res.json({ approval });
  });

  router.get("/memory", (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    return res.json({ memories: conversationMemory.list({ userId, conversationId: req.query.conversationId, limit: req.query.limit }), retentionDays: conversationMemory.retentionDays });
  });
  router.delete("/memory/:memoryId", (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    if (!conversationMemory.delete({ id: req.params.memoryId, userId })) return res.status(404).json({ error: "Memory not found.", code: "MEMORY_NOT_FOUND" });
    return res.json({ deleted: true });
  });
  router.delete("/memory", (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    return res.json({ deleted: conversationMemory.clear({ userId, conversationId: req.query.conversationId }) });
  });
  router.get("/research/artifacts", (req, res) => {
    const userId = requireMemoryUser(req, res); if (!userId) return;
    return res.json({ artifacts: artifacts.list({ userId, limit: req.query.limit }) });
  });

  router.get("/missions/:missionId", async (req, res) => {
    const kernel = await chatBootstrap.boot();
    const mission = kernel.getMission(req.params.missionId);
    if (!mission) return res.status(404).json({ error: "Mission not found.", code: "MISSION_NOT_FOUND" });
    return res.json({ mission });
  });

  router.get("/missions", async (req, res) => {
    const kernel = await chatBootstrap.boot();
    const requestedLimit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const missions = kernel
      .listMissions({ limit: 100, status: req.query.status })
      .filter(({ name }) => name === "chat.message")
      .slice(0, requestedLimit);
    return res.json({ missions });
  });

  router.delete("/missions/:missionId", async (req, res) => {
    const kernel = await chatBootstrap.boot();
    const mission = kernel.getMission(req.params.missionId);
    if (!mission || mission.name !== "chat.message") {
      return res.status(404).json({ error: "Mission not found.", code: "MISSION_NOT_FOUND" });
    }
    if (!kernel.cancelMission(req.params.missionId)) {
      return res.status(409).json({ error: "Mission is not running.", code: "MISSION_NOT_RUNNING" });
    }
    return res.json({ mission: kernel.getMission(req.params.missionId) });
  });

  return router;
}

const router = createChatRouter();

export default router;
