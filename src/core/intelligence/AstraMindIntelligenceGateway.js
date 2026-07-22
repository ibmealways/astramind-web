import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const allowedRoles = new Set(["user", "assistant", "system", "developer"]);

function normalizedMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => allowedRoles.has(message?.role) && String(message?.content || "").trim())
    .slice(-20)
    .map((message) => ({ role: message.role, content: String(message.content).slice(0, 12000) }));
}

function providerOrder() {
  return String(process.env.ASTRAMIND_AI_PROVIDERS || "openai,gemini,ollama")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
}

async function runOpenAI({ messages, systemPrompt }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await client.responses.create({
    model,
    instructions: systemPrompt,
    input: messages.filter(({ role }) => role !== "system").map(({ role, content }) => ({ role, content })),
    max_output_tokens: Math.min(Math.max(Number(process.env.ASTRAMIND_MAX_OUTPUT_TOKENS) || 1800, 256), 8000),
  });
  if (!response.output_text?.trim()) throw new Error("OpenAI returned an empty response.");
  return { text: response.output_text.trim(), provider: "openai", model, responseId: response.id || null };
}

async function runGemini({ messages, systemPrompt }) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const transcript = messages
    .filter(({ role }) => role !== "system")
    .map(({ role, content }) => `${role === "assistant" ? "AstraMind" : "User"}: ${content}`)
    .join("\n\n");
  const response = await ai.models.generateContent({
    model,
    contents: transcript,
    config: { systemInstruction: systemPrompt },
  });
  if (!response.text?.trim()) throw new Error("Gemini returned an empty response.");
  return { text: response.text.trim(), provider: "gemini", model, responseId: response.responseId || null };
}

async function runOllama({ messages, systemPrompt }) {
  const baseUrl = String(process.env.OLLAMA_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("OLLAMA_BASE_URL is not configured.");
  const model = process.env.OLLAMA_MODEL || "gpt-oss:20b";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: systemPrompt }, ...messages.filter(({ role }) => role !== "system")] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Ollama failed with status ${response.status}.`);
  const text = String(data?.message?.content || "").trim();
  if (!text) throw new Error("Ollama returned an empty response.");
  return { text, provider: "ollama", model, responseId: null };
}

const runners = { openai: runOpenAI, gemini: runGemini, ollama: runOllama };

export async function generateAstraMindResponse({ messages = [], systemPrompt = "You are AstraMind." } = {}) {
  const cleanMessages = normalizedMessages(messages);
  if (!cleanMessages.some(({ role }) => role === "user")) throw new Error("AstraMind Intelligence Gateway requires a user message.");
  const attempts = [];
  for (const provider of providerOrder()) {
    const runner = runners[provider];
    if (!runner) { attempts.push({ provider, ok: false, error: "Unsupported provider." }); continue; }
    try {
      const result = await runner({ messages: cleanMessages, systemPrompt: String(systemPrompt || "You are AstraMind.").slice(0, 12000) });
      return { ...result, attempts, gateway: "astramind-intelligence-v1" };
    } catch (error) {
      attempts.push({ provider, ok: false, error: error.message });
      console.warn("[AstraMind Intelligence] provider failed", { provider, error: error.message });
    }
  }
  const error = new Error("All configured AstraMind intelligence providers are unavailable.");
  error.code = "INTELLIGENCE_PROVIDERS_EXHAUSTED";
  error.attempts = attempts;
  throw error;
}

export default generateAstraMindResponse;
