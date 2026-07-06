import { routeAI } from "../router/aiRouter.js";

export async function runTradeAnalysis(prompt) {
  const analysis = await routeAI({
    prompt: `Provide financial analysis:\n${prompt}`,
    mode: "deep",
  });

  return {
    analysis,
    risk: "Medium",
    actions: ["Review", "Invest", "Monitor"],
  };
}