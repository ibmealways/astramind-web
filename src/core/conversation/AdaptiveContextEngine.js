const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

function normalizeMessage(message) {
  if (!message || !ALLOWED_ROLES.has(message.role)) return null;
  const content = String(message.content || "").replace(/\s+/g, " ").trim();
  if (!content) return null;
  return { role: message.role, content: content.slice(0, 4000) };
}

function summarizeMessages(messages, maxCharacters) {
  if (!messages.length) return "";
  const summary = messages
    .map(({ role, content }) => `${role === "assistant" ? "AstraMind" : role}: ${content}`)
    .join("\n");
  return summary.length > maxCharacters
    ? `${summary.slice(0, Math.max(0, maxCharacters - 3))}...`
    : summary;
}

export function prepareAdaptiveContext({
  message = "",
  history = [],
  creator = null,
  systemPrompt = "",
  recalledMemories = [],
  recentTurnLimit = 8,
  summaryCharacterLimit = 1600,
} = {}) {
  const normalized = (Array.isArray(history) ? history : [])
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-40);

  const prompt = String(message || "").replace(/\s+/g, " ").trim();
  if (normalized.at(-1)?.role === "user" && normalized.at(-1)?.content === prompt) {
    normalized.pop();
  }

  const keep = Math.min(Math.max(Number(recentTurnLimit) || 8, 2), 16);
  const recentHistory = normalized.slice(-keep);
  const compressedMessages = normalized.slice(0, -keep);
  const summary = summarizeMessages(compressedMessages, summaryCharacterLimit);
  const preparedHistory = [];

  if (summary) {
    preparedHistory.push({
      role: "system",
      content: `Earlier conversation summary:\n${summary}`,
    });
  }

  const memories = (Array.isArray(recalledMemories) ? recalledMemories : [])
    .slice(0, 8)
    .map(({ role, content }) => `${role}: ${String(content || "").slice(0, 1000)}`);
  if (memories.length) {
    preparedHistory.push({
      role: "system",
      content: `Relevant persistent conversation memory:\n${memories.join("\n")}`,
    });
  }

  const creatorContext = creator
    ? JSON.stringify(creator).slice(0, 1200)
    : "";
  if (creatorContext) {
    preparedHistory.push({ role: "system", content: `Creator context: ${creatorContext}` });
  }
  if (systemPrompt) {
    preparedHistory.push({ role: "system", content: String(systemPrompt).slice(0, 1600) });
  }
  preparedHistory.push(...recentHistory);

  return {
    history: preparedHistory,
    summary,
    stats: {
      receivedMessages: Array.isArray(history) ? history.length : 0,
      normalizedMessages: normalized.length,
      recentMessages: recentHistory.length,
      compressedMessages: compressedMessages.length,
      summaryCharacters: summary.length,
      includedCreatorContext: Boolean(creatorContext),
      retrievedMemories: memories.length,
    },
    strategy: "bounded-recency-v1",
    preparedAt: new Date().toISOString(),
  };
}

export default prepareAdaptiveContext;
