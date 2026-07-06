import { routeAI } from "../router/aiRouter.js";

export async function generateVideoContent(prompt) {
  const script = await routeAI({
    prompt: `Create a viral TikTok script:\n${prompt}`,
    mode: "deep",
  });

  return {
    script,
    scenes: script.split("\n"),
    videoUrl: null, // plug Runway later
    exportReady: ["CapCut", "DaVinci"],
  };
}