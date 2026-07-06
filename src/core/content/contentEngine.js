import { routeTool } from "../router/toolRouter.js";
import { routeAI } from "../router/aiRouter.js";
import { generateContentPlan } from "../intelligence/contentEngine.js";
import { updateCreatorProfile } from "../memory/creatorProfile.js";
import { enhancePrompt } from "../intelligence/adaptiveLayer.js";

function detectType(text = "") {
  const t = text.toLowerCase();

  if (t.includes("video") || t.includes("tiktok") || t.includes("reel")) {
    return "video";
  }

  if (t.includes("song") || t.includes("music") || t.includes("beat")) {
    return "music";
  }

  if (t.includes("design") || t.includes("logo")) {
    return "design";
  }

  if (t.includes("stock") || t.includes("invest")) {
    return "finance";
  }

  return "general";
}

export async function generateFullContent({
  idea,
  style = "viral",
  platform = "tiktok",
}) {
  const prompt = `
Create ${style} content for ${platform}.

User idea:
${idea}

Return:
1. Hook
2. Short script
3. Caption
4. Hashtags
5. Call to action
`;

  return await routeAI({
    prompt,
    mode: "deep",
  });
}

export async function runContentPipeline({
  idea,
  style = "viral",
  platform = "tiktok",
}) {
  try {
    console.log("🎬 PIPELINE START:", idea);

    const type = detectType(idea);

    updateCreatorProfile({
      idea,
      type,
    });

    const enhanced = enhancePrompt({ idea, type });

    console.log("🧠 ADAPTIVE INPUT:", enhanced);

    let plan = null;

    try {
      plan = generateContentPlan({
        topic: idea,
        platform: enhanced.platform || platform,
      });
    } catch (err) {
      console.warn("⚠️ Plan skipped:", err.message);
    }

    const aiContent = await generateFullContent({
      idea: enhanced.idea || idea,
      style: enhanced.tone || style,
      platform: enhanced.platform || platform,
    });

    const toolResult = await routeTool({
      type,
      prompt: idea,
    });

    const result = {
      id: Date.now().toString(),
      type,
      idea,
      createdAt: new Date().toISOString(),
      plan,
      aiContent,
      ...toolResult,
      script: toolResult?.script || aiContent || null,
      platformPack: toolResult?.platformPack || {},
    };

    console.log("✅ PIPELINE RESULT:", result);

    return result;
  } catch (err) {
    console.error("🔥 PIPELINE ERROR:", err);

    return {
      error: "Pipeline failed",
      details: err.message,
    };
  }
}