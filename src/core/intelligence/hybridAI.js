// src/core/intelligence/hybridAI.js

import { runLocalAI } from "../memory/aiEngine.js";
import { detectAgentIntent } from "../agents/agentRouter.js";
import { runAutonomousWorkflow } from "../workflows/workflowEngine.js";
import { recallRelevantMemory } from "../memory/memoryEngine.js";

const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` });

// ============================
// 🧠 SEMANTIC MEMORY
// ============================

export async function storeSemantic(content) {
  try {
    if (!content) return;
    await fetch(`${DEFAULT_API_URL}/api/memory/store`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.warn("⚠️ Semantic store failed:", err);
  }
}

export async function getSemanticContext(query) {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/api/memory/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    return data.map((d) => `• ${d.content}`).join("\n");
  } catch (err) {
    console.warn("⚠️ Semantic fetch failed:", err);
    return null;
  }
}

export function fetchResearchMemory() {
  return JSON.parse(localStorage.getItem("researchMemory") || "[]");
}

export function deleteResearchSource(id) {
  const data = fetchResearchMemory().filter(item => item.id !== id);
  localStorage.setItem("researchMemory", JSON.stringify(data));
}

export function updateResearchSource(id, updated) {
  const data = fetchResearchMemory().map(item =>
    item.id === id ? { ...item, ...updated } : item
  );
  localStorage.setItem("researchMemory", JSON.stringify(data));
}

export function compileBookPack() {
  const data = fetchResearchMemory();
  return data.map(d => d.content).join("\n\n");
}

// ============================
// ⚙️ CONFIG
// ============================

function getAIConfig() {
  return {
    route: "cloud",
    timeoutMs: 20000,
    apiUrl: DEFAULT_API_URL,
    retries: 1,
  };
}

// ============================
// 🔌 HELPERS
// ============================

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callCloudAI({ apiUrl, payload, timeoutMs, retries = 1 }) {
  let lastError = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(
        `${apiUrl}/api/chat`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
        timeoutMs
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("🔥 CLOUD RESPONSE ERROR:", errText);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ CLOUD RESPONSE:", data?.source || "NO SOURCE");
      return data;

    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Cloud attempt ${i + 1} failed:`, err.message);
    }
  }

  throw lastError;
}

function normalizeResponse(data, agentIntent, fallbackSource = "CLOUD") {
  return {
    reply: data?.reply || "⚠️ No response returned.",
    source: data?.source || fallbackSource,
    sources: Array.isArray(data?.sources) ? data.sources : [],
    researchMeta: data?.researchMeta || null,
    agentMeta: data?.agentMeta || {
      primaryAgent: agentIntent.primaryAgent,
      workflow: agentIntent.workflow,
      confidence: agentIntent.confidence,
    },
  };
}

// ============================
// 🚀 MAIN AI ROUTER
// ============================

export async function getChappyReply({
  message,
  creator,
  history = [],
  mode,
}) {
  const config = getAIConfig();
  const agentIntent = detectAgentIntent(message);

  console.log("🧠 AGENT INTENT:", agentIntent);

  // ============================
  // 🤖 AUTONOMOUS EXECUTION (FIXED)
  // ============================

  if (agentIntent?.workflow) {
    try {
      console.log("🤖 Autonomous workflow triggered:", agentIntent.workflow);

      const workflowResult = await runAutonomousWorkflow(message, {});

      if (workflowResult?.workflowExecuted && workflowResult?.result) {
        return {
          reply:
            workflowResult.result.reply ||
            workflowResult.result.output ||
            JSON.stringify(workflowResult.result, null, 2),
          source: "AUTONOMOUS",
          sources: [],
          agentMeta: {
            ...agentIntent,
            autonomous: true,
          },
        };
      }

    } catch (err) {
      console.warn("⚠️ Autonomous workflow failed:", err);
    }
  }

  // ============================
  // 🧠 MEMORY
  // ============================

  let memoryContext = null;
  let semanticContext = null;

  try {
    memoryContext = recallRelevantMemory(message);
    semanticContext = await getSemanticContext(message);
  } catch (err) {
    console.warn("⚠️ Memory failed:", err);
  }

  const enrichedHistory = [
    ...(memoryContext
      ? [{ role: "system", content: `Memory:\n${memoryContext}` }]
      : []),
    ...(semanticContext
      ? [{ role: "system", content: `Semantic:\n${semanticContext}` }]
      : []),
    ...history,
  ];

  // ============================
  // 🌐 CLOUD
  // ============================

  try {
    const data = await callCloudAI({
      apiUrl: config.apiUrl,
      payload: {
        message,
        creator,
        history: enrichedHistory,
        mode,
        agentIntent,
      },
      timeoutMs: config.timeoutMs,
      retries: config.retries,
    });

    if (!data?.reply) throw new Error("Empty response");

    storeSemantic(message);
    storeSemantic(data.reply);

    return normalizeResponse(data, agentIntent, "CLOUD");

  } catch (err) {
    console.warn("⚠️ CLOUD FAILED → FALLBACK");

    const local = await runLocalAI({
      message,
      creator,
      history: enrichedHistory,
      mode,
    });

    return normalizeResponse(
      { reply: local?.reply },
      agentIntent,
      "LOCAL_FALLBACK"
    );
  }
}

// ============================
// 🧩 SUPPORT EXPORTS
// ============================

export async function saveResearchSource(source) {
  try {
    await fetch(`${DEFAULT_API_URL}/api/research/save`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(source),
    });
  } catch (err) {
    console.warn("⚠️ saveResearchSource failed:", err);
  }
}

// ============================
// 📚 BOOK SYSTEM (RESTORED)
// ============================

export async function fetchBookProjects() {
  const res = await fetch(`${DEFAULT_API_URL}/api/book-projects`,{headers:authHeaders()});
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchBookProject(id) {
  const res = await fetch(`${DEFAULT_API_URL}/api/book-project/${id}`,{headers:authHeaders()});
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function createBookProject(data) {
  const res = await fetch(`${DEFAULT_API_URL}/api/book-project/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function draftBookChapter(payload) {
  const res = await fetch(`${DEFAULT_API_URL}/api/book-project/${payload.projectId}/chapter-draft`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to draft chapter");
  return res.json();
}

export async function deleteBookProject(id) {
  const res = await fetch(`${DEFAULT_API_URL}/api/book-project/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Failed to delete project");
  return true;
}
