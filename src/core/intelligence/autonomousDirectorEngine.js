// src/core/intelligence/autonomousDirectorEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const MEMORY_DIR = path.join(ROOT, "server-renders", "astramind-intelligence");
const DIRECTOR_MEMORY_FILE = path.join(MEMORY_DIR, "autonomous-director-memory.json");

const ENGINE_VERSION = "Aigenikz Autonomous Director Engine v1";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function id(prefix = "director") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function readJson(filePath, fallback) {
  try {
    ensureDir(path.dirname(filePath));
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return clean(value).toLowerCase();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function detectIntent(topic = "") {
  const t = lower(topic);

  const intent = {
    category: "general",
    emotionalCharge: 45,
    controversy: 0,
    urgency: 40,
    education: 40,
    inspiration: 45,
    productPromo: 0,
    documentary: 0,
  };

  if (/(trump|maga|biden|democrat|liberal|leftist|republican|election|administration)/i.test(t)) {
    intent.category = "political_commentary";
    intent.controversy = 80;
    intent.urgency = 75;
    intent.emotionalCharge = 78;
    intent.documentary = 55;
  }

  if (/(ai|astramind|automation|app|software|technology|robot|creator)/i.test(t)) {
    intent.category = "ai_technology";
    intent.productPromo = 72;
    intent.inspiration = 76;
    intent.education = 68;
  }

  if (/(finance|money|invest|trading|crypto|stock|tesla|wealth)/i.test(t)) {
    intent.category = "finance";
    intent.urgency = 65;
    intent.education = 72;
  }

  if (/(documentary|history|timeline|truth|exposed|evidence|investigation)/i.test(t)) {
    intent.documentary = 85;
    intent.education = 78;
    intent.urgency = 65;
  }

  if (/(motivational|success|legacy|dream|discipline|future|greatness)/i.test(t)) {
    intent.category = "motivation";
    intent.inspiration = 86;
    intent.emotionalCharge = 70;
  }

  return intent;
}

function buildHookStrategy(intent, platform = "TikTok") {
  const fastPlatform = /tiktok|shorts|reels/i.test(platform);

  if (intent.controversy > 70) {
    return {
      hookType: "shock_context_hook",
      openingSeconds: fastPlatform ? 2.0 : 4.0,
      firstLineStyle: "direct, provocative, but fact-framed",
      visualOpen: "hard contrast opening with evidence-style imagery",
      retentionTrigger: "promise a reveal before second 5",
    };
  }

  if (intent.productPromo > 65) {
    return {
      hookType: "future_vision_hook",
      openingSeconds: fastPlatform ? 2.5 : 5.0,
      firstLineStyle: "imagine-this transformation",
      visualOpen: "glowing product intelligence core or workflow transformation",
      retentionTrigger: "show outcome before explaining process",
    };
  }

  if (intent.documentary > 70) {
    return {
      hookType: "mystery_evidence_hook",
      openingSeconds: fastPlatform ? 3.0 : 6.0,
      firstLineStyle: "investigative question",
      visualOpen: "documents, timelines, shadows, data, archival framing",
      retentionTrigger: "open a question loop",
    };
  }

  return {
    hookType: "curiosity_hook",
    openingSeconds: fastPlatform ? 2.5 : 5.0,
    firstLineStyle: "clear curiosity statement",
    visualOpen: "strong cinematic symbolic opener",
    retentionTrigger: "state the transformation quickly",
  };
}

function buildPacingPlan({ durationTarget = 30, platform = "TikTok", intent }) {
  const duration = Math.max(15, Math.min(Number(durationTarget || 30), 180));
  const fastPlatform = /tiktok|shorts|reels/i.test(platform);

  const cutSpeed =
    intent.controversy > 70 || intent.urgency > 70
      ? "fast"
      : duration > 75
      ? "documentary-build"
      : fastPlatform
      ? "viral-fast"
      : "balanced";

  const sceneCount =
    duration <= 30 ? 5 : duration <= 60 ? 7 : duration <= 120 ? 10 : 14;

  return {
    duration,
    sceneCount,
    cutSpeed,
    beatPattern:
      cutSpeed === "fast"
        ? "hook-hit-proof-hit-cta"
        : cutSpeed === "documentary-build"
        ? "hook-context-pattern-proof-resolution"
        : "hook-problem-transformation-proof-cta",
    averageSceneDuration: Math.round(duration / sceneCount),
    recommendedBrollDensity:
      duration > 60 ? "high" : intent.documentary > 70 ? "medium-high" : "medium",
  };
}

function buildNarrationPlan(intent) {
  return {
    voiceEnergy:
      intent.controversy > 70
        ? "authoritative-intense"
        : intent.inspiration > 75
        ? "inspiring-cinematic"
        : intent.documentary > 70
        ? "calm-investigative"
        : "clear-cinematic",
    pauseStyle:
      intent.documentary > 70 ? "measured pauses" : "short viral pauses",
    emphasis:
      intent.controversy > 70
        ? ["truth", "pattern", "proof", "consequence"]
        : intent.productPromo > 65
        ? ["future", "workflow", "create", "launch"]
        : ["why", "how", "what changes"],
    targetWordsPerMinute:
      intent.controversy > 70 ? 155 : intent.documentary > 70 ? 135 : 145,
  };
}

function buildVisualPlan(intent) {
  return {
    cameraLanguage:
      intent.controversy > 70
        ? "push-ins, hard cuts, evidence zooms, tension pans"
        : intent.productPromo > 65
        ? "smooth orbit, holographic reveals, premium product motion"
        : intent.documentary > 70
        ? "slow push, archival pans, data overlays"
        : "cinematic push-ins and parallax drift",
    colorGrade:
      intent.controversy > 70
        ? "high contrast documentary blue/amber"
        : intent.productPromo > 65
        ? "premium neon cyan/violet"
        : "cinematic teal-blue",
    overlayStyle:
      intent.documentary > 70
        ? "clean lower-third evidence labels"
        : "minimal floating kinetic captions",
    motionIntensity: clamp(
      55 + intent.urgency * 0.25 + intent.controversy * 0.2,
      45,
      90
    ),
  };
}

function buildThumbnailPlan(topic, intent) {
  return {
    thumbnailFrame:
      intent.controversy > 70
        ? "highest tension evidence frame"
        : intent.productPromo > 65
        ? "glowing product/result reveal frame"
        : "strongest transformation frame",
    textOverlay:
      intent.controversy > 70
        ? "THE PATTERN?"
        : intent.productPromo > 65
        ? "THE FUTURE IS HERE"
        : "LOOK CLOSER",
    contrast: "high",
    faceOrObjectFocus:
      intent.productPromo > 65 ? "product/interface core" : "main subject or symbol",
    topic: clean(topic),
  };
}

export function createAutonomousDirection({
  creatorId = "default_creator",
  topic = "",
  platform = "TikTok",
  style = "cinematic",
  durationTarget = 30,
  previousPerformance = {},
} = {}) {
  const intent = detectIntent(topic);
  const hookStrategy = buildHookStrategy(intent, platform);
  const pacingPlan = buildPacingPlan({ durationTarget, platform, intent });
  const narrationPlan = buildNarrationPlan(intent);
  const visualPlan = buildVisualPlan(intent);
  const thumbnailPlan = buildThumbnailPlan(topic, intent);

  const retentionScore = clamp(
    35 +
      intent.urgency * 0.18 +
      intent.emotionalCharge * 0.18 +
      intent.education * 0.12 +
      intent.inspiration * 0.1 +
      (previousPerformance.retentionScore || 0) * 0.12,
    0,
    100
  );

  const viralScore = clamp(
    30 +
      intent.controversy * 0.2 +
      intent.urgency * 0.2 +
      intent.inspiration * 0.12 +
      intent.productPromo * 0.12,
    0,
    100
  );

  return {
    ok: true,
    engine: ENGINE_VERSION,
    directionId: id("direction"),
    creatorId,
    topic: clean(topic),
    platform,
    style,
    intent,
    hookStrategy,
    pacingPlan,
    narrationPlan,
    visualPlan,
    thumbnailPlan,
    predictions: {
      retentionScore,
      viralScore,
      riskOfDropoff:
        pacingPlan.duration > 90 && intent.documentary < 60 ? "medium-high" : "medium",
      recommendedImprovement:
        retentionScore < 60
          ? "increase hook tension and shorten first scene"
          : "keep pacing tight and emphasize transformation",
    },
    createdAt: now(),
  };
}

export function rememberDirectorOutcome({
  creatorId = "default_creator",
  direction = {},
  renderResult = {},
  feedback = {},
  analytics = {},
} = {}) {
  const db = readJson(DIRECTOR_MEMORY_FILE, {
    version: 1,
    engine: ENGINE_VERSION,
    outcomes: [],
    creatorStats: {},
  });

  const outcome = {
    id: id("outcome"),
    creatorId,
    direction,
    renderResult,
    feedback,
    analytics,
    createdAt: now(),
  };

  db.outcomes.unshift(outcome);
  db.outcomes = db.outcomes.slice(0, 1000);

  db.creatorStats[creatorId] = db.creatorStats[creatorId] || {
    total: 0,
    avgRetention: 0,
    avgViral: 0,
  };

  const stat = db.creatorStats[creatorId];
  stat.total += 1;
  stat.avgRetention =
    (stat.avgRetention * (stat.total - 1) + Number(analytics.retentionScore || 50)) /
    stat.total;
  stat.avgViral =
    (stat.avgViral * (stat.total - 1) + Number(analytics.viralScore || 50)) /
    stat.total;
  stat.updatedAt = now();

  writeJson(DIRECTOR_MEMORY_FILE, db);

  return {
    ok: true,
    outcome,
    stats: stat,
  };
}

export function getAutonomousDirectorHealth() {
  const db = readJson(DIRECTOR_MEMORY_FILE, {
    version: 1,
    outcomes: [],
    creatorStats: {},
  });

  return {
    ok: true,
    engine: ENGINE_VERSION,
    memoryFile: DIRECTOR_MEMORY_FILE,
    totalOutcomes: db.outcomes.length,
    totalCreators: Object.keys(db.creatorStats || {}).length,
    supports: {
      intentDetection: true,
      hookStrategy: true,
      pacingPlan: true,
      narrationPlan: true,
      visualDirection: true,
      thumbnailPlanning: true,
      retentionPrediction: true,
      viralPrediction: true,
      learningFromOutcomes: true,
    },
  };
}

export default {
  createAutonomousDirection,
  rememberDirectorOutcome,
  getAutonomousDirectorHealth,
};