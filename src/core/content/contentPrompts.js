// src/core/content/contentPrompts.js

export const CONTENT_TOOLS = [
  {
    key: "tiktok_script",
    name: "TikTok Script",
    hint: "30–90s script with hooks + beat markers + on-screen text",
  },
  {
    key: "hooks",
    name: "Hooks",
    hint: "10–20 hooks (short + punchy) + pattern interrupts",
  },
  {
    key: "captions_hashtags",
    name: "Captions + Hashtags",
    hint: "Multiple caption styles + hashtag packs + CTA variants",
  },
  {
    key: "storyboard",
    name: "Storyboard",
    hint: "Shot-by-shot plan with B-roll + overlay text + pacing",
  },
  {
    key: "edit_plan",
    name: "Edit Plan (CapCut-style)",
    hint: "Timeline notes: cuts, zooms, captions, SFX, beat drops",
  },
  {
    key: "canva_copy",
    name: "Canva Copy Blocks",
    hint: "Headline/subhead/body + layout notes + icon suggestions",
  },
];

export function buildContentRequest({
  toolKey,
  topic,
  platform,
  tone,
  length,
  styleNotes,
  extras,
}) {
  const base = [
    `MODE: CONTENT_CREATION`,
    `TOOL: ${toolKey}`,
    `PLATFORM: ${platform || "TikTok"}`,
    `TOPIC: ${topic || "(none)"}`,
    `TONE: ${tone || "futuristic, confident, punchy"}`,
    `LENGTH: ${length || "45–60 seconds"}`,
    styleNotes ? `STYLE_NOTES: ${styleNotes}` : "",
    extras ? `EXTRAS: ${extras}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const toolDirectives = {
    tiktok_script: `
OUTPUT FORMAT:
1) TITLE
2) HOOK (0–2s)
3) SCRIPT (with timestamps like [0:03], [0:12] etc)
4) ON-SCREEN TEXT (per beat)
5) B-ROLL SUGGESTIONS
6) CTA
7) CAPCUT EDIT NOTES (cuts/zooms/sfx)
`,
    hooks: `
OUTPUT FORMAT:
- 20 hooks max
- each <= 12 words
- include 5 "pattern interrupt" hooks
- include 5 curiosity hooks
- include 5 authority hooks
- include 5 controversy-safe hooks
`,
    captions_hashtags: `
OUTPUT FORMAT:
- 5 short captions
- 5 medium captions
- 3 long captions
- 3 CTA lines
- 3 hashtag packs (broad / niche / ultra-niche)
`,
    storyboard: `
OUTPUT FORMAT:
- Shot list 1..N
For each shot:
  - camera/angle
  - scene action
  - on-screen text
  - b-roll
  - timing (seconds)
`,
    edit_plan: `
OUTPUT FORMAT:
- TIMELINE PLAN
  [0:00-0:03] ...
- CAPTION STYLING NOTES
- SFX + MUSIC CUES
- TRANSITIONS
- EXPORT SETTINGS (TikTok-ready)
`,
    canva_copy: `
OUTPUT FORMAT:
- Canva Page 1: Headline / Subhead / Body / CTA
- Page 2..(optional): Layout blocks
- Typography + icon suggestions (generic)
- Color vibes (match AstraMind futuristic)
`,
  };

  return `${base}\n\n${toolDirectives[toolKey] || ""}`.trim();
}

export function buildLabRequest({
  topic,
  platform,
  goal,
  audience,
  postingCadence,
  competitors,
  constraints,
}) {
  return [
    `MODE: CONTENT_LAB`,
    `TOPIC: ${topic || "(none)"}`,
    `PLATFORM: ${platform || "TikTok"}`,
    `GOAL: ${goal || "growth + engagement"}`,
    `AUDIENCE: ${audience || "general"}`,
    `CADENCE: ${postingCadence || "1/day"}`,
    competitors ? `COMPETITORS/REFERENCES: ${competitors}` : "",
    constraints ? `CONSTRAINTS: ${constraints}` : "",
    `
OUTPUT FORMAT:
1) POSITIONING (what makes this content win)
2) 10 VIDEO IDEAS (each with hook + angle + payoff)
3) 3 PILLARS (recurring themes)
4) 7-DAY PLAN (titles + hooks + CTA)
5) HASHTAG + SEO KEYWORDS
6) A/B TESTS (hooks + thumbnails + caption tests)
7) REPURPOSE MAP (TikTok -> IG Reels -> YT Shorts)
`,
  ]
    .filter(Boolean)
    .join("\n");
}
