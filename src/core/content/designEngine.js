// src/core/content/designEngine.js
import { createArtifact } from "./artifacts.js";

export async function runDesignEngine({ subtype = "thumbnail", input = {} }) {
  const topic = (input.topic || "").trim() || "Untitled";
  const style = (input.style || "Futuristic OS").trim();

  const content = [
    `STYLE: ${style}`,
    `TOPIC: ${topic}`,
    ``,
    `THUMBNAIL TEXT OPTIONS:`,
    `1) "STOP Doing This"`,
    `2) "The Real Fix"`,
    `3) "Most People Miss This"`,
    ``,
    `LAYOUT:`,
    `- Big 3–4 word headline`,
    `- One focal icon/photo`,
    `- High contrast border glow`,
  ].join("\n");

  await new Promise((r) => setTimeout(r, 200));

  return {
    ok: true,
    artifact: createArtifact({
      type: "design",
      subtype,
      title: `${topic} (${style})`,
      description: "Thumbnail/poster blueprint (local engine).",
      content,
      metadata: { topic, style },
      source: "DESIGN_ENGINE_LOCAL",
    }),
  };
}
