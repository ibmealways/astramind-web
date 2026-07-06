// src/core/adaptive/adaptiveEngine.js

import {
  getAdaptiveProfile,
  patchAdaptiveProfile,
} from "./adaptiveStore.js";

const EVENTS_KEY = "astramind_adaptive_events_v2";
const MAX_EVENTS = 200;

// ============================
// 📥 READ EVENTS
// ============================

function readEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================
// 💾 WRITE EVENTS
// ============================

function writeEvents(events) {
  localStorage.setItem(
    EVENTS_KEY,
    JSON.stringify(events.slice(0, MAX_EVENTS))
  );
}

// ============================
// 🧠 LOG EVENT
// ============================

export function logAdaptiveEvent(evt) {
  const events = readEvents();

  const entry = {
    ...evt,
    ts: Date.now(),
  };

  writeEvents([entry, ...events]);

  return entry;
}

// ============================
// 🧠 LEARNING ENGINE (UPGRADED)
// ============================

export function learnFromEvent(evt) {
  const profile = getAdaptiveProfile();

  // ============================
  // 📊 PLATFORM PREFERENCE
  // ============================

  if (evt.type === "CONTENT_PLATFORM_SELECTED" && evt.platform) {
    patchAdaptiveProfile({
      platforms: [evt.platform],
    });
  }

  // ============================
  // 🎵 MUSIC LEARNING
  // ============================

  if (evt.type === "MUSIC_USED" && evt.genre) {
    patchAdaptiveProfile({
      musicDefaults: {
        ...(profile.musicDefaults || {}),
        genre: evt.genre,
      },
    });
  }

  // ============================
  // 🎬 STYLE LEARNING
  // ============================

  if (evt.type === "STYLE_SELECTED" && evt.style) {
    patchAdaptiveProfile({
      contentStyle: evt.style,
    });
  }

  // ============================
  // 👍 LIKE SIGNALS
  // ============================

  if (evt.type === "USER_LIKED_OUTPUT" && evt.tag) {
    const likes = Array.from(
      new Set([...(profile.likes || []), evt.tag])
    ).slice(-25);

    patchAdaptiveProfile({ likes });
  }

  // ============================
  // 🧠 PATTERN TRACKING (NEW)
  // ============================

  if (evt.type === "REPEATED_ACTION" && evt.pattern) {
    const patterns = Array.from(
      new Set([...(profile.patterns || []), evt.pattern])
    ).slice(-50);

    patchAdaptiveProfile({ patterns });
  }

  // ============================
  // ⚡ BEHAVIOR SCORE (NEW)
  // ============================

  const newScore = (profile.behaviorScore || 0) + 1;

  patchAdaptiveProfile({
    behaviorScore: newScore,
  });

  return getAdaptiveProfile();
}

// ============================
// 🧠 SYSTEM PROMPT (UPGRADED)
// ============================

export function buildAdaptiveSystemPrompt() {
  const p = getAdaptiveProfile();

  return `
You are AstraMind (Chappy), an adaptive AI operating system modeled after your user.

IDENTITY:
- Think strategically, logically, and independently
- Question assumptions when needed
- Balance: profit optimization + benefit to humanity + earth impact

PERSONALIZATION:
- Tone: ${p.tone}
- Preferred platforms: ${p.platforms?.join(", ") || "none"}
- Content style: ${p.contentStyle || "none"}
- Music defaults: genre=${p.musicDefaults?.genre || "n/a"}, mood=${p.musicDefaults?.mood || "n/a"}, bpm=${p.musicDefaults?.bpm || "n/a"}
- Known likes: ${(p.likes || []).join(", ") || "none"}
- Behavior patterns: ${(p.patterns || []).join(", ") || "none"}

INTELLIGENCE RULES:
- Always think: "How does this benefit the user?"
- Also evaluate: "How does this benefit humanity and the earth?"
- Prefer execution over explanation
- Default to action, not hesitation
- Make intelligent assumptions if data is missing

OUTPUT RULES:
- Format outputs for real-world use (content, business, code, media)
- Prefer iterative workflows:
  generate → improve → scale
- Keep responses high-value, no fluff

SYSTEM MODE:
- Multi-agent aware
- Execution-capable
- Continuously learning from user behavior
`.trim();
}
