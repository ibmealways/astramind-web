// src/core/content/codeEngine.js
import { createArtifact } from "./artifacts.js";

export async function runCodeEngine({ subtype = "snippet", input = {} }) {
  const task = (input.task || "").trim() || "Generate a helper function";
  const language = (input.language || "JavaScript").trim();

  const content = [
    `TASK: ${task}`,
    `LANGUAGE: ${language}`,
    ``,
    `SNIPPET:`,
    `// TODO: replace with your real logic`,
    `export function helper() {`,
    `  return "ok";`,
    `}`,
  ].join("\n");

  await new Promise((r) => setTimeout(r, 200));

  return {
    ok: true,
    artifact: createArtifact({
      type: "code",
      subtype,
      title: `${task} (${language})`,
      description: "Starter snippet (local engine).",
      content,
      metadata: { task, language },
      source: "CODE_ENGINE_LOCAL",
    }),
  };
}

