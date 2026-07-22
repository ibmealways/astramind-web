const SERVER_MEMORY_LIMIT = 24;
let serverConversationMemory = [];

export function addToMemory(role, content) {
  if (!role || !content) return;

  serverConversationMemory.push({
    role,
    content: String(content),
    timestamp: Date.now(),
  });

  if (serverConversationMemory.length > SERVER_MEMORY_LIMIT) {
    serverConversationMemory = serverConversationMemory.slice(-SERVER_MEMORY_LIMIT);
  }
}

export function getMemoryContext() {
  return serverConversationMemory.map((item) => ({
    role: item.role,
    content: item.content,
  }));
}

export function clearMemory() {
  serverConversationMemory = [];
}