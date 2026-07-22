import fetch from "node-fetch";
import { extractLyricTheme, generateLocalLyrics } from "../core/audio/LocalLyricEngine.js";

const clean = (value, length = 500) => String(value || "").trim().slice(0, length);

function localResult(brief,warning){const generated=generateLocalLyrics(brief);return {...generated,source:generated.engine,provider:generated.engine,warning};}

export async function generateOriginalLyrics(input = {}) {
  const prompt = clean(input.prompt, 1200);
  if (!prompt) throw new Error("A lyric prompt is required.");
  const brief = {
    prompt,
    title: clean(input.title, 100), genre: clean(input.genre, 60) || "Pop", mood: clean(input.mood, 80) || "Uplifting",
    structure: clean(input.structure, 160) || "Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Final Chorus",
    perspective: clean(input.perspective, 30) || "first person", rhymeDensity: clean(input.rhymeDensity, 30) || "balanced",
    contentRating: clean(input.contentRating, 30) || "clean", notes: clean(input.notes, 500),
  };
  if (!process.env.OPENAI_API_KEY) return localResult(brief,"Cloud lyric provider is not configured; generated a local editable draft.");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.3", messages: [
      { role: "system", content: "You are AstraMind Lyric Architect. Write completely original song lyrics. Never quote, continue, paraphrase, or closely imitate an existing song or living artist. If the request names an artist, translate it into general musical qualities without copying their signature lyrics. Output lyrics only with bracketed section names." },
      { role: "user", content: `Create an original song lyric draft.\nTitle: ${brief.title || "Untitled"}\nConcept: ${brief.prompt}\nGenre: ${brief.genre}\nMood: ${brief.mood}\nStructure: ${brief.structure}\nPerspective: ${brief.perspective}\nRhyme density: ${brief.rhymeDensity}\nContent rating: ${brief.contentRating}\nAdditional notes: ${brief.notes || "none"}` },
    ] }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Lyric provider request failed.");
    const lyrics = clean(data.choices?.[0]?.message?.content, 30000);
    if (!lyrics) throw new Error("Lyric provider returned an empty draft.");
    const theme=extractLyricTheme(brief.prompt);return { lyrics, source: "openai-original-lyrics", provider:"openai-original-lyrics", theme:theme.theme, keywords:theme.keywords, suggestedTitle:theme.suggestedTitle };
  } catch (error) {
    return localResult(brief,`Cloud generation was unavailable: ${error.message}`);
  }
}
