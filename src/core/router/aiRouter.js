import { runChatGPT } from "../integrations/chatgptAdapter.js";
import { runGemini } from "../integrations/geminiAdapter.js";

export async function routeAI({ prompt, mode = "balanced" }) {
  try {
    if (mode === "fast") {
      return await runGemini(prompt);
    }

    if (mode === "deep") {
      return await runChatGPT(prompt);
    }

    // 🔥 Default hybrid
    const [gpt, gemini] = await Promise.all([
      runChatGPT(prompt),
      runGemini(prompt),
    ]);

    return `${gpt}\n\n---\n\n🔍 Gemini Insight:\n${gemini}`;
  } catch (err) {
    console.error("AI Router Error:", err);
    return "❌ AI processing failed";
  }
}