// src/core/content/remixEngine.js
import { bumpVersion } from "./artifacts.js";
import { buildMusicBlueprint } from "./musicPrompts.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toInt(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : fallback;
}

function remixMusic(base, action, opts = {}) {
  const md = base.metadata || {};
  const mood = (opts.mood || md.mood || "Confident").trim();
  const genre = (opts.genre || md.genre || "Hip-Hop").trim();
  const bpm = clamp(toInt(opts.bpm ?? md.bpm, 120), 60, 200);
  const useCase = (opts.useCase || md.useCase || "TikTok Hook").trim();

  const blueprint = buildMusicBlueprint({ mood, genre, bpm, useCase });

  let title = base.title;
  let extra = [];
  if (action === "remix") {
    title = `${base.title} (Remix)`;
    extra = ["REMIX MOVE: changed mood/genre/bpm + palette refresh"];
  } else if (action === "extend") {
    title = `${base.title} (Extended)`;
    blueprint.structure = [
      "Intro (2–4 bars)",
      "Hook (4–8 bars)",
      "Drop / Main (16–32 bars)  ✅ extended",
      "Break (4–8 bars)",
      "Hook Repeat (8–16 bars) ✅ extended",
      "Outro (2–4 bars)",
    ];
    extra = ["EXTEND MOVE: doubled the main sections"];
  } else if (action === "v2") {
    title = `${base.title} (V2)`;
    extra = ["V2 MOVE: cleaner structure + sharper next actions"];
  }

  const content = [
    `TITLE: ${title}`,
    `TYPE: ${String(base.subtype || "beat").toUpperCase()}`,
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
    `UPGRADE NOTES:`,
    ...extra.map((x) => `- ${x}`),
    ``,
    `NEXT MOVES (Suno-style):`,
    `1) "Add Hook Lyrics" (1–2 lines repeated)`,
    `2) "Alt BPM" (+/- 8 bpm)`,
    `3) "Alt Genre" (Drill / R&B / Pop)`,
  ].join("\n");

  return { title, content, metadata: blueprint };
}

function remixWriting(base, action, opts = {}) {
  const md = base.metadata || {};
  const topic = (opts.topic || md.topic || base.title || "Topic").trim();
  const platform = (opts.platform || md.platform || "TikTok").trim();
  const tone = (opts.tone || md.tone || "Direct").trim();

  let title = base.title;
  let note = "";

  if (action === "remix") {
    title = `${base.title} (Remix Tone)`;
    note = `Tone shifted to: ${tone}`;
  } else if (action === "extend") {
    title = `${base.title} (Extended)`;
    note = `Added more detail + second example`;
  } else {
    title = `${base.title} (V2)`;
    note = `Stronger hook + tighter structure`;
  }

  const content = [
    `PLATFORM: ${platform}`,
    `TONE: ${tone}`,
    `TOPIC: ${topic}`,
    ``,
    `HOOK (0–2s):`,
    `- "If you do ${topic} like THIS, you're losing time/money."`,
    ``,
    `SCRIPT (30–45s):`,
    `1) Problem: the common mistake`,
    `2) Proof: quick example (1 sentence)`,
    `3) Fix: Step 1 / Step 2 / Step 3`,
    `4) CTA: follow + comment keyword`,
    ``,
    action === "extend"
      ? `BONUS (extended):\n- Example #2 + what to avoid\n- Quick checklist recap`
      : `UPGRADE NOTE:\n- ${note}`,
    ``,
    `CAPTION:`,
    `- ${topic} — do this today 👇`,
  ].join("\n");

  return { title, content, metadata: { topic, platform, tone } };
}

function remixVideo(base, action, opts = {}) {
  const md = base.metadata || {};
  const topic = (opts.topic || md.topic || base.title || "Topic").trim();
  const platform = (opts.platform || md.platform || "TikTok").trim();

  let title = base.title;
  if (action === "extend") title = `${base.title} (Longer Cut)`;
  else if (action === "remix") title = `${base.title} (Alt Hook)`;
  else title = `${base.title} (V2)`;

  const content = [
    `PLATFORM: ${platform}`,
    `TOPIC: ${topic}`,
    ``,
    `SHOTLIST:`,
    `- Shot 1: Hook facecam (0–2s)`,
    `- Shot 2: B-roll proof (2–8s)`,
    `- Shot 3: Steps overlay (8–35s)`,
    action === "extend" ? `- Shot 4: Extra example (35–50s)` : `- Shot 4: CTA (last 3s)`,
    ``,
    `CAPTION RULES:`,
    `- 4–7 words per line`,
    `- Highlight 1 keyword repeatedly`,
    ``,
    `UPGRADE MOVE:`,
    `- ${action === "remix" ? "Alternate hook angle" : action === "extend" ? "Added extra segment" : "Tighter pacing"}`,
  ].join("\n");

  return { title, content, metadata: { topic, platform } };
}

function remixDesign(base, action, opts = {}) {
  const md = base.metadata || {};
  const topic = (opts.topic || md.topic || base.title || "Topic").trim();
  const style = (opts.style || md.style || "Futuristic OS").trim();

  let title = base.title;
  if (action === "extend") title = `${base.title} (More Variations)`;
  else if (action === "remix") title = `${base.title} (Alt Layout)`;
  else title = `${base.title} (V2)`;

  const content = [
    `STYLE: ${style}`,
    `TOPIC: ${topic}`,
    ``,
    `THUMBNAIL TEXT OPTIONS:`,
    `1) "STOP Doing This"`,
    `2) "The Real Fix"`,
    `3) "Most People Miss This"`,
    action === "extend" ? `4) "Do THIS Instead"` : "",
    ``,
    `LAYOUT:`,
    `- Big 3–4 word headline`,
    `- One focal icon/photo`,
    `- Glow border + depth shadow`,
    ``,
    `UPGRADE MOVE:`,
    `- ${action === "remix" ? "Alternative layout + hierarchy" : action === "extend" ? "Extra variants added" : "Cleaner contrast + readability"}`,
  ].filter(Boolean).join("\n");

  return { title, content, metadata: { topic, style } };
}

function remixCode(base, action, opts = {}) {
  const md = base.metadata || {};
  const task = (opts.task || md.task || base.title || "Task").trim();
  const language = (opts.language || md.language || "JavaScript").trim();

  let title = base.title;
  if (action === "extend") title = `${base.title} (More Robust)`;
  else if (action === "remix") title = `${base.title} (Refactor)`;
  else title = `${base.title} (V2)`;

  const content = [
    `TASK: ${task}`,
    `LANGUAGE: ${language}`,
    ``,
    `SNIPPET:`,
    `// Improved versioning-safe snippet`,
    `export function helper(input = {}) {`,
    `  try {`,
    `    // TODO: replace with your real logic`,
    `    return { ok: true, input };`,
    `  } catch (e) {`,
    `    return { ok: false, error: String(e?.message || e) };`,
    `  }`,
    `}`,
    ``,
    `UPGRADE MOVE:`,
    `- ${action === "extend" ? "Added try/catch + structured return" : action === "remix" ? "Refactored for clarity" : "Cleaned up API + safer defaults"}`,
  ].join("\n");

  return { title, content, metadata: { task, language } };
}

export async function runRemixEngine({ baseArtifact, action = "v2", options = {} }) {
  if (!baseArtifact?.id) {
    return { ok: false, error: "Missing baseArtifact" };
  }

  let result;
  if (baseArtifact.type === "music") result = remixMusic(baseArtifact, action, options);
  else if (baseArtifact.type === "writing") result = remixWriting(baseArtifact, action, options);
  else if (baseArtifact.type === "video") result = remixVideo(baseArtifact, action, options);
  else if (baseArtifact.type === "design") result = remixDesign(baseArtifact, action, options);
  else if (baseArtifact.type === "code") result = remixCode(baseArtifact, action, options);
  else {
    // fallback
    result = {
      title: `${baseArtifact.title} (V2)`,
      content: baseArtifact.content,
      metadata: baseArtifact.metadata || {},
    };
  }

  const next = bumpVersion(baseArtifact, {
    title: result.title,
    content: result.content,
    metadata: result.metadata,
    source: `REMIX_ENGINE_LOCAL:${action.toUpperCase()}`,
    tags: Array.from(new Set([...(baseArtifact.tags || []), action])),
    description: `Generated via Remix Engine (${action}).`,
  });

  await new Promise((r) => setTimeout(r, 250));

  return { ok: true, artifact: next };
}
