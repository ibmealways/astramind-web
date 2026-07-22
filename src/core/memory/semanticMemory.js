import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory vector DB (we’ll upgrade to SQLite later)
let vectorMemory = [];

/**
 * 🧠 Generate embedding
 */
export async function createEmbedding(text) {
  if (!text || typeof text !== "string") return null;

  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return res.data[0].embedding;
}

/**
 * 🧠 Cosine similarity
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 🧠 Store semantic memory
 */
export async function storeSemanticMemory(content) {
  const embedding = await createEmbedding(content);

  if (!embedding) return;

  vectorMemory.push({
    content,
    embedding,
    timestamp: Date.now(),
  });

  // limit memory size
  if (vectorMemory.length > 500) {
    vectorMemory = vectorMemory.slice(-500);
  }
}

/**
 * 🧠 Search semantic memory
 */
export async function searchSemanticMemory(query) {
  const queryEmbedding = await createEmbedding(query);

  if (!queryEmbedding) return [];

  const scored = vectorMemory.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}