// src/core/content/musicEngine.js
import { createArtifact } from "./artifacts.js";
import { buildMusicBlueprint } from "./musicPrompts.js";

function pickTitle({ mood, genre }) {
  const m = (mood || "Cosmic").trim();
  const g = (genre || "Wave").trim();
  return `${m} ${g} Pack`;
}

export async function runMusicEngine({
  subtype = "beat", // "beat" | "hook" | "song" | "template"
  input = {},       // { mood, genre, bpm, useCase }
}) {
  // Local engine (safe): generates a “music plan” artifact.
  const blueprint = buildMusicBlueprint(input);

  const title = input.title?.trim() || pickTitle(blueprint);

  const content = [
    `TITLE: ${title}`,
    `TYPE: ${subtype.toUpperCase()}`,
    `GENRE: ${blueprint.genre}`,
    `MOOD: ${blueprint.mood}`,
    `BPM: ${blueprint.bpm}`,
    `USE CASE: ${blueprint.useCase}`,
    ``,
    `STRUCTURE:`,
    ...blueprint.structure.map((s) => `- ${s}`),
    ``,
    `SOUND PALETTE:`,
    ...blueprint.soundPalette.map((s) => `- ${s}`),
    ``,
    `NEXT MOVES (Suno-style):`,
    `1) Remix: change mood (darker/brighter)`,
    `2) Extend: double the drop section`,
    `3) Add hook lyrics: 1–2 lines repeated`,
  ].join("\n");

  const artifact = createArtifact({
    type: "music",
    subtype,
    title,
    description: "Generated music blueprint + structure (local engine).",
    content,
    metadata: blueprint,
    source: "MUSIC_ENGINE_LOCAL",
  });

  // mimic async
  await new Promise((r) => setTimeout(r, 250));

  return {
    ok: true,
    artifact,
  };
}
