// src/core/content/writingEngine.js
import { createArtifact } from "./artifacts.js";

export async function runWritingEngine({ subtype = "script", input = {} }) {
  const topic = (input.topic || "").trim() || "Untitled Topic";
  const platform = (input.platform || "TikTok").trim();
  const tone = (input.tone || "Direct").trim();

  const content = [
    `PLATFORM: ${platform}`,
    `TONE: ${tone}`,
    ``,
    `HOOK (0–2s):`,
    `- "Most people get THIS wrong about ${topic}…"`,
    ``,
    `SCRIPT (30–45s):`,
    `1) Problem: What’s misunderstood about ${topic}`,
    `2) Proof: A quick example or stat`,
    `3) Fix: 2–3 steps`,
    `4) CTA: Follow + comment keyword`,
    ``,
    `CAPTION:`,
    `- ${topic} — do this today 👇`,
  ].join("\n");

  await new Promise((r) => setTimeout(r, 200));

  return {
    ok: true,
    artifact: createArtifact({
      type: "writing",
      subtype,
      title: `${topic} (${platform})`,
      description: "Script + hook + caption (local engine).",
      content,
      metadata: { topic, platform, tone },
      source: "WRITING_ENGINE_LOCAL",
    }),
  };
}
