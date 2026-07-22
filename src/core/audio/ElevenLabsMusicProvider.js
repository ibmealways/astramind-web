import fs from "node:fs";
import path from "node:path";

const API_URL = "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192";
const SECTION_WEIGHT = { intro:4, verse:16, prechorus:8, chorus:16, bridge:8, outro:4 };

function safeName(value) {
  return String(value || "astramind-song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "astramind-song";
}

function normalizeSection(value) {
  return String(value || "section").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function splitLyricsIntoSections(lyrics = "") {
  const blocks = [];
  let current = null;
  for (const rawLine of String(lyrics).replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[([^\]]+)]$/);
    if (heading) {
      if (current) blocks.push(current);
      current = { name: heading[1].trim(), lines: [] };
    } else if (line) {
      if (!current) current = { name: "Verse", lines: [] };
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks.filter((block) => block.lines.length);
}

function weightForSection(name) {
  const normalized = normalizeSection(name).replace(/\d+$/, "");
  return Object.entries(SECTION_WEIGHT).find(([key]) => normalized.includes(key))?.[1] || 8;
}

export function buildElevenLabsCompositionPlan(session, { vocalStyle = "warm expressive lead vocalist" } = {}) {
  const blocks = splitLyricsIntoSections(session?.lyrics?.text);
  if (!blocks.length) throw new Error("Save lyrics before generating a vocal song.");
  const totalMs = Math.min(Math.max(Number(session.durationSeconds) || 150, 3), 600) * 1000;
  const weights = blocks.map((block) => weightForSection(block.name));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let assigned = 0;
  const instruments = (session.tracks || []).filter((track) => track.type !== "vocal").map((track) => track.name).slice(0, 10);
  const baseStyles = [session.genre, `${session.mood} mood`, `${session.bpm} BPM`, session.key, vocalStyle, instruments.join(", "), "polished studio production", "clear intelligible original lyrics"].filter(Boolean);
  const chunks = blocks.map((block, index) => {
    const isLast = index === blocks.length - 1;
    const proposed = isLast ? totalMs - assigned : Math.round((totalMs * weights[index]) / weightTotal);
    const durationMs = Math.min(120000, Math.max(3000, proposed));
    assigned += durationMs;
    const sectionName = normalizeSection(block.name);
    const sectionStyles = sectionName.includes("chorus")
      ? ["memorable melodic hook", "full confident vocals", "strong rhythmic lift"]
      : sectionName.includes("bridge")
        ? ["contrasting emotional bridge", "dynamic vocal development"]
        : ["natural phrasing", "story-forward vocal delivery"];
    return {
      text: `[${block.name}]\n${block.lines.join("\n")}`,
      duration_ms: durationMs,
      positive_styles: index === 0 ? [...baseStyles, ...sectionStyles].slice(0, 50) : sectionStyles,
      negative_styles: ["spoken word", "voiceover", "unintelligible vocals", "artist imitation", "copyrighted melody"],
      context_adherence: "high",
    };
  });
  return { chunks };
}

function providerError(status, body) {
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.detail?.message || parsed?.detail || parsed?.message || body;
    if (typeof detail !== "string") detail = JSON.stringify(detail);
  } catch {}
  if (status === 401 || status === 403) return "ElevenLabs Music rejected this API key or plan. Music API access requires an eligible paid ElevenLabs subscription.";
  if (status === 402 || status === 429) return "ElevenLabs Music credits or rate capacity are unavailable. Add provider credits or wait, then try again.";
  return `ElevenLabs Music failed (${status}): ${String(detail).slice(0, 500)}`;
}

export async function renderElevenLabsVocalSong(session, {
  apiKey = process.env.ELEVENLABS_API_KEY,
  vocalStyle,
  outputDir = path.resolve("public", "renders", "audio"),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  if (typeof fetchImpl !== "function") throw new Error("Music provider transport is unavailable.");
  const compositionPlan = buildElevenLabsCompositionPlan(session, { vocalStyle });
  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ composition_plan: compositionPlan, model_id: "music_v2" }),
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok) throw new Error(providerError(response.status, await response.text()));
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) throw new Error("ElevenLabs Music returned an empty audio file.");
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `${safeName(session.title)}-${session.id.slice(0, 8)}-vocal.mp3`;
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, audio);
  return {
    provider: "elevenlabs-music-v2",
    model: "music_v2",
    songId: response.headers.get("song-id") || null,
    format: "mp3",
    durationSeconds: session.durationSeconds,
    vocalStyle: vocalStyle || "warm expressive lead vocalist",
    publicUrl: `/renders/audio/${fileName}`,
    outputPath,
    bytes: audio.length,
    createdAt: new Date().toISOString(),
  };
}

export function getElevenLabsMusicStatus() {
  return { provider: "elevenlabs-music-v2", configured: Boolean(process.env.ELEVENLABS_API_KEY), requiresPaidProviderPlan: true };
}

export default renderElevenLabsVocalSong;
