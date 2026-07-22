const MEMORY_KEY = "astramind_memory";

export function loadMemory() {
  return JSON.parse(localStorage.getItem(MEMORY_KEY)) || [];
}

export function saveMemory(memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}
