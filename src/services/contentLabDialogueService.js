const PREFIX = "astramind_content_lab_dialogue:";

function keyFor(experimentId) { return `${PREFIX}${String(experimentId || "unknown")}`; }

export function loadContentLabDialogue(experimentId) {
  try {
    const records = JSON.parse(localStorage.getItem(keyFor(experimentId)) || "[]");
    return Array.isArray(records) ? records : [];
  } catch { return []; }
}

export function saveContentLabDialogue(experimentId, messages = []) {
  const normalized = (Array.isArray(messages) ? messages : []).slice(-100).map((message) => ({
    id: message.id || globalThis.crypto?.randomUUID?.() || `lab_message_${Date.now()}_${Math.random()}`,
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || "").slice(0, 12000),
    createdAt: message.createdAt || new Date().toISOString(),
    provider: message.provider || null,
  }));
  localStorage.setItem(keyFor(experimentId), JSON.stringify(normalized));
  return normalized;
}

export function clearContentLabDialogue(experimentId) {
  localStorage.removeItem(keyFor(experimentId));
  return [];
}

