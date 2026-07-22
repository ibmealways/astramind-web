// src/core/memory/aiEngine.js

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeMode(mode) {
  const value = String(mode || "SYSTEM").toUpperCase().trim();

  // IMPORTANT: exact task modes first
  if (value === "CHAT") return "CHAT";
  if (value === "LAB") return "LAB";
  if (value === "CONTENT") return "CONTENT";
  if (value === "FINANCE") return "FINANCE";
  if (value === "SYSTEM") return "SYSTEM";

  if (value.includes("FINANCE") || value === "MONEY" || value === "BUDGET") {
    return "FINANCE";
  }

  if (
    value.includes("LAB") ||
    value.includes("REVIEW") ||
    value.includes("ANALYZE")
  ) {
    return "LAB";
  }

  if (
    value.includes("CONTENT") ||
    value.includes("CREATOR") ||
    value.includes("EXECUTION") ||
    value.includes("SCRIPT") ||
    value.includes("BOOK") ||
    value.includes("VIDEO") ||
    value.includes("AUDIO") ||
    value.includes("IMAGE")
  ) {
    return "CONTENT";
  }

  if (value.includes("CHAT")) {
    return "CHAT";
  }

  return "SYSTEM";
}

function scoreText(text) {
  const len = (text || "").length;
  const hasNumbers = /\d/.test(text);
  const hasBullets = /•|\n-|\n\d+\)/.test(text);
  const hasCTA = /follow|subscribe|comment|share|link|download|dm/i.test(text);

  let score = 55;
  score += clamp(Math.floor(len / 120) * 5, 0, 20);
  if (hasNumbers) score += 6;
  if (hasBullets) score += 8;
  if (hasCTA) score += 6;

  return clamp(score, 0, 100);
}

function buildChatReply(text) {
  const lower = text.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Yo, I’m here. Chappy local fallback is active right now, but I’m still with you. Tell me what you want to build, fix, write, or analyze.";
  }

  if (lower.includes("astramind")) {
    return "AstraMind OS is responding in local fallback mode right now. The UI shell is working, but cloud intelligence is not fully connected yet. Give me the exact module you want to wire next and I’ll help you finish it.";
  }

  return (
    `Chappy Local Response\n\n` +
    `I’m in local fallback mode right now, so this is a lighter offline-style response.\n\n` +
    `You said:\n"${text}"\n\n` +
    `Give me one of these and I’ll respond more precisely:\n` +
    `- what you want built\n` +
    `- what module you’re in\n` +
    `- what output you want back`
  );
}

function buildLabReply(text, score) {
  return (
    `AstraMind LAB Feedback (Local)\n` +
    `Score: ${score}/100\n\n` +
    `Upgrade moves:\n` +
    `1) Sharpen the first line into a stronger hook.\n` +
    `2) Keep the structure tighter: hook → value → CTA.\n` +
    `3) Add one proof element: stat, result, clip, or transformation.\n` +
    `4) Remove filler.\n\n` +
    `Submitted text:\n${text}`
  );
}

function buildContentReply(text, score) {
  return (
    `AstraMind CONTENT Feedback (Local)\n` +
    `Score: ${score}/100\n\n` +
    `Make it convert:\n` +
    `- Hook: use curiosity, urgency, or contradiction.\n` +
    `- Body: 2–3 tight points only.\n` +
    `- CTA: ask for one action.\n\n` +
    `Prompt/topic received:\n${text}`
  );
}

function buildFinanceReply(text, score) {
  return (
    `AstraMind FINANCE Feedback (Local)\n` +
    `Score: ${score}/100\n\n` +
    `Quick wins:\n` +
    `- Reduce one expense category by 10%.\n` +
    `- Add one weekly revenue action.\n` +
    `- Track income, fixed expenses, and variable expenses separately.\n\n` +
    `Finance input received:\n${text}`
  );
}

function buildSystemReply(text, score) {
  return (
    `AstraMind OS Feedback (Local)\n` +
    `Score: ${score}/100\n\n` +
    `Suggestion:\n` +
    `- make the objective more specific\n` +
    `- tighten the structure\n` +
    `- add one concrete example\n\n` +
    `Input received:\n${text}`
  );
}

function makeResponse({ mode, input }) {
  const text = String(input || "").trim();
  const normalizedMode = normalizeMode(mode);

  if (!text) {
    return {
      reply: "Give me something specific to analyze, build, or improve.",
      response: "Give me something specific to analyze, build, or improve.",
      meta: { mode: normalizedMode, score: 0, source: "LOCAL" },
    };
  }

  const score = scoreText(text);
  let reply = "";

  if (normalizedMode === "CHAT") {
    reply = buildChatReply(text);
  } else if (normalizedMode === "LAB") {
    reply = buildLabReply(text, score);
  } else if (normalizedMode === "CONTENT") {
    reply = buildContentReply(text, score);
  } else if (normalizedMode === "FINANCE") {
    reply = buildFinanceReply(text, score);
  } else {
    reply = buildSystemReply(text, score);
  }

  return {
    reply,
    response: reply,
    meta: { mode: normalizedMode, score, source: "LOCAL" },
  };
}

export function runLocalAI({ mode = "SYSTEM", input = "", message = "" }) {
  return makeResponse({
    mode,
    input: input || message || "",
  });
}

export function runAstraMindAI({ mode = "SYSTEM", input = "", message = "" }) {
  return makeResponse({
    mode,
    input: input || message || "",
  });
}

