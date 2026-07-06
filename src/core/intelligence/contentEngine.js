import OpenAI from "openai";
import { loadCreatorMemory } from "../memory/creatorMemory.js";

/**
 * 🧠 INTELLIGENCE ENGINE
 */
export const generateContentPlan = ({ topic, platform }) => {
  const creator = loadCreatorMemory();

  if (!creator) {
    throw new Error("Creator memory not initialized");
  }

  const baseTone = creator.tone;
  const niche = creator.niche;

  return {
    platform: platform || creator.platform,
    niche,
    tone: baseTone,
    topic,
    hook: `Most ${niche} creators are missing THIS about ${topic}…`,
    talkingPoints: [
      `Why ${topic} matters in ${niche}`,
      `The mistake most people make`,
      `What to do differently`,
    ],
    cta:
      platform === "TikTok"
        ? "Follow for more"
        : platform === "Instagram"
        ? "Save & share"
        : platform === "YouTube"
        ? "Subscribe"
        : "Engage",
    format:
      platform === "TikTok"
        ? "Short vertical video"
        : platform === "Instagram"
        ? "Reel or carousel"
        : platform === "YouTube"
        ? "Short or long video"
        : "Short-form",
    generatedAt: new Date().toISOString(),
  };
};

/**
 * 🤖 AI CONTENT ENGINE (ONLY ONE DECLARATION)
 */
import { getCreatorProfile } from "../memory/creatorProfile.js";

export const generateFullContent = async ({
  idea,
  style = "viral",
  platform = "tiktok",
}) => {
  try {
    const profile = getCreatorProfile();

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are AstraMind — an adaptive AI creator.

USER PROFILE:
Niche: ${profile.niche}
Tone: ${profile.tone}
Platform: ${profile.platforms?.[0] || platform}

Create a COMPLETE viral content package.

IDEA:
${idea}

Return:
1. Title
2. Hook
3. Script
4. Scene Breakdown
5. Voiceover
6. Music Style
7. AI Video Prompt
8. Caption
9. Hashtags

Make it highly engaging and platform optimized.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return completion.choices?.[0]?.message?.content || "No content generated.";
  } catch (err) {
    console.error("🔥 CONTENT ENGINE ERROR:", err);
    return "⚠️ Failed to generate content.";
  }
};