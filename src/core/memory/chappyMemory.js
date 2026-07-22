// src/core/memory/chappyMemory.js

const KEY_PREFIX = "astramind_chat_session_v1";
const MAX_MESSAGES = 200;

const safeParse = (s, fallback) => {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export function getChatKey({ creator, scope = "default" } = {}) {
  const niche = creator?.niche ? String(creator.niche).toLowerCase() : "general";
  const platform = creator?.platform ? String(creator.platform).toLowerCase() : "any";
  return `${KEY_PREFIX}:${scope}:${platform}:${niche}`;
}

export function loadChatSession({ creator, scope } = {}) {
  const key = getChatKey({ creator, scope });
  const raw = localStorage.getItem(key);
  const data = raw ? safeParse(raw, null) : null;

  if (!data || !Array.isArray(data.messages)) {
    return { key, messages: [] };
  }

  return {
    key,
    messages: data.messages.slice(-MAX_MESSAGES),
  };
}

export function saveChatSession({ key, messages }) {
  if (!key) return;

  const safeMessages = Array.isArray(messages)
    ? messages.slice(-MAX_MESSAGES)
    : [];

  localStorage.setItem(
    key,
    JSON.stringify({
      messages: safeMessages,
      updatedAt: Date.now(),
    })
  );
}

export function clearChatSession({ creator, scope } = {}) {
  const key = getChatKey({ creator, scope });
  localStorage.removeItem(key);
}

function sanitizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(msg => msg && typeof msg === "object")
    .map(msg => ({
      role: msg.role || "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : msg.content != null
          ? String(msg.content)
          : "",
    }))
    .filter(msg => msg.content.trim() !== "");
}
