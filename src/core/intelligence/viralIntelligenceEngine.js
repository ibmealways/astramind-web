// src/core/intelligence/viralIntelligenceEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MEMORY_DIR = path.resolve(
  "server-renders/astramind-intelligence"
);

const PROFILE_FILE = path.join(
  MEMORY_DIR,
  "creator-intelligence-profiles.json"
);

const EVENT_FILE = path.join(
  MEMORY_DIR,
  "viral-learning-events.json"
);

const GLOBAL_TREND_FILE = path.join(
  MEMORY_DIR,
  "global-pattern-memory.json"
);

const INTELLIGENCE_VERSION =
  "Aigenikz Viral Intelligence Engine v1";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function now() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomBytes(8).toString("hex");
}

function readJson(filePath, fallback) {
  try {
    ensureDir(path.dirname(filePath));

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify(fallback, null, 2)
      );

      return fallback;
    }

    return JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function scoreClamp(value) {
  return Math.max(
    0,
    Math.min(100, Number(value) || 0)
  );
}

function average(values = []) {
  if (!values.length) return 0;

  return (
    values.reduce((a, b) => a + b, 0) /
    values.length
  );
}

function dominantCategory(categories = {}) {
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}

function emotionalProfileFromTopic(topic = "") {
  const text = normalize(topic);

  const emotions = {
    anger: 0,
    excitement: 0,
    fear: 0,
    inspiration: 0,
    curiosity: 0,
    controversy: 0,
    urgency: 0,
  };

  const angerWords = [
    "corrupt",
    "fake",
    "lies",
    "destroy",
    "attack",
    "betray",
    "fraud",
  ];

  const excitementWords = [
    "massive",
    "insane",
    "crazy",
    "breakthrough",
    "unbelievable",
    "historic",
  ];

  const fearWords = [
    "danger",
    "collapse",
    "warning",
    "crisis",
    "threat",
  ];

  const inspirationWords = [
    "dream",
    "future",
    "believe",
    "transform",
    "success",
    "powerful",
  ];

  const curiosityWords = [
    "secret",
    "truth",
    "hidden",
    "exposed",
    "why",
    "how",
  ];

  const controversyWords = [
    "trump",
    "biden",
    "maga",
    "woke",
    "leftist",
    "democrat",
    "liberal",
  ];

  for (const word of angerWords) {
    if (text.includes(word)) emotions.anger += 15;
  }

  for (const word of excitementWords) {
    if (text.includes(word))
      emotions.excitement += 15;
  }

  for (const word of fearWords) {
    if (text.includes(word)) emotions.fear += 15;
  }

  for (const word of inspirationWords) {
    if (text.includes(word))
      emotions.inspiration += 15;
  }

  for (const word of curiosityWords) {
    if (text.includes(word))
      emotions.curiosity += 15;
  }

  for (const word of controversyWords) {
    if (text.includes(word))
      emotions.controversy += 20;
  }

  emotions.urgency =
    emotions.fear +
    emotions.controversy +
    emotions.excitement;

  return emotions;
}

function detectContentCategory(topic = "") {
  const text = normalize(topic);

  const categories = {
    politics: [
      "trump",
      "maga",
      "president",
      "democrat",
      "liberal",
      "election",
      "administration",
    ],

    finance: [
      "stock",
      "crypto",
      "money",
      "invest",
      "market",
      "wealth",
      "tesla",
    ],

    motivation: [
      "success",
      "dream",
      "mindset",
      "discipline",
      "motivation",
    ],

    ai: [
      "ai",
      "artificial intelligence",
      "automation",
      "robot",
      "future tech",
    ],

    conspiracy: [
      "hidden",
      "truth",
      "secret",
      "exposed",
      "they don't want you to know",
    ],

    spirituality: [
      "frequency",
      "energy",
      "vibration",
      "consciousness",
      "awakening",
    ],
  };

  const scores = {};

  for (const [category, words] of Object.entries(
    categories
  )) {
    scores[category] = 0;

    for (const word of words) {
      if (text.includes(word)) {
        scores[category] += 10;
      }
    }
  }

  return (
    Object.entries(scores).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "general"
  );
}

function getProfilesDb() {
  return readJson(PROFILE_FILE, {
    version: 1,
    profiles: {},
  });
}

function saveProfilesDb(db) {
  writeJson(PROFILE_FILE, db);
}

function getEventsDb() {
  return readJson(EVENT_FILE, {
    version: 1,
    events: [],
  });
}

function saveEventsDb(db) {
  writeJson(EVENT_FILE, db);
}

function getGlobalMemory() {
  return readJson(GLOBAL_TREND_FILE, {
    version: 1,
    trends: {},
    hooks: {},
    captions: {},
    pacing: {},
  });
}

function saveGlobalMemory(db) {
  writeJson(GLOBAL_TREND_FILE, db);
}

export function getOrCreateCreatorProfile(
  creatorId = "default_creator"
) {
  const db = getProfilesDb();

  if (!db.profiles[creatorId]) {
    db.profiles[creatorId] = {
      creatorId,

      createdAt: now(),
      updatedAt: now(),

      totalVideos: 0,

      dominantCategory: "general",

      emotionalProfile: {},

      categoryScores: {},

      hookPatterns: {},

      pacingPreferences: {
        fastCuts: 50,
        emotionalBuilds: 50,
        aggressiveHooks: 50,
        cinematicIntensity: 50,
      },

      preferredStyles: {},

      subtitleBehavior: {
        fontSize: 34,
        maxCharsPerLine: 30,
        emphasisStrength: 50,
      },

      soundtrackBehavior: {
        bassPreference: 50,
        cinematicPreference: 50,
        aggressiveEnergy: 50,
      },

      platformPerformance: {},

      engagementSignals: {
        estimatedRetention: 50,
        estimatedVirality: 50,
        controversyPerformance: 50,
      },

      learnedPatterns: [],
    };

    saveProfilesDb(db);
  }

  return db.profiles[creatorId];
}

export function updateCreatorIntelligence({
  creatorId = "default_creator",
  topic = "",
  platform = "TikTok",
  style = "cinematic",
  metrics = {},
} = {}) {
  const db = getProfilesDb();

  const profile =
    getOrCreateCreatorProfile(creatorId);

  profile.totalVideos += 1;
  profile.updatedAt = now();

  const category =
    detectContentCategory(topic);

  profile.categoryScores[category] =
    (profile.categoryScores[category] || 0) + 1;

  profile.dominantCategory =
    dominantCategory(profile.categoryScores);

  const emotions =
    emotionalProfileFromTopic(topic);

  for (const [emotion, value] of Object.entries(
    emotions
  )) {
    profile.emotionalProfile[emotion] =
      average([
        profile.emotionalProfile[emotion] || 0,
        value,
      ]);
  }

  profile.preferredStyles[style] =
    (profile.preferredStyles[style] || 0) + 1;

  profile.platformPerformance[platform] =
    average([
      profile.platformPerformance[platform] || 50,
      metrics.retentionScore || 50,
    ]);

  profile.engagementSignals.estimatedRetention =
    average([
      profile.engagementSignals
        .estimatedRetention || 50,
      metrics.retentionScore || 50,
    ]);

  profile.engagementSignals.estimatedVirality =
    average([
      profile.engagementSignals
        .estimatedVirality || 50,
      metrics.viralityScore || 50,
    ]);

  profile.engagementSignals.controversyPerformance =
    average([
      profile.engagementSignals
        .controversyPerformance || 50,
      emotions.controversy || 50,
    ]);

  profile.learnedPatterns.unshift({
    learnedAt: now(),
    topic,
    category,
    style,
    platform,
    metrics,
  });

  profile.learnedPatterns =
    profile.learnedPatterns.slice(0, 250);

  db.profiles[creatorId] = profile;

  saveProfilesDb(db);

  return {
    ok: true,
    profile,
  };
}

export function generateViralStrategy({
  creatorId = "default_creator",
  topic = "",
  platform = "TikTok",
  durationTarget = 30,
} = {}) {
  const profile =
    getOrCreateCreatorProfile(creatorId);

  const category =
    detectContentCategory(topic);

  const emotions =
    emotionalProfileFromTopic(topic);

  const aggressiveHook =
    emotions.controversy > 40 ||
    emotions.anger > 40;

  const pacing =
    aggressiveHook
      ? "hyper-fast"
      : emotions.inspiration > 40
      ? "cinematic-build"
      : "balanced-viral";

  const captionStyle =
    aggressiveHook
      ? "bold-kinetic"
      : "cinematic-clean";

  const soundtrackMood =
    aggressiveHook
      ? "epic-aggressive"
      : emotions.inspiration > 40
      ? "inspirational-cinematic"
      : "modern-cinematic";

  const retentionPrediction =
    scoreClamp(
      average([
        emotions.controversy,
        emotions.curiosity,
        emotions.excitement,
        profile.engagementSignals
          .estimatedRetention || 50,
      ])
    );

  const viralityPrediction =
    scoreClamp(
      average([
        emotions.controversy,
        emotions.urgency,
        emotions.curiosity,
        profile.engagementSignals
          .estimatedVirality || 50,
      ])
    );

  return {
    ok: true,

    engine: INTELLIGENCE_VERSION,

    creatorId,

    detectedCategory: category,

    emotionalProfile: emotions,

    strategy: {
      pacing,
      captionStyle,
      soundtrackMood,

      aggressiveHook,

      preferredDuration:
        retentionPrediction > 70
          ? Math.min(durationTarget, 45)
          : Math.min(durationTarget, 30),

      subtitleIntensity:
        aggressiveHook ? 90 : 65,

      motionIntensity:
        aggressiveHook ? 90 : 70,

      transitionIntensity:
        aggressiveHook ? 85 : 60,

      cameraMovement:
        aggressiveHook
          ? "aggressive-handheld"
          : "cinematic-float",

      hookStyle:
        aggressiveHook
          ? "shock-hook"
          : "curiosity-hook",
    },

    predictions: {
      retentionPrediction,
      viralityPrediction,
    },
  };
}

export function learnFromRenderResult({
  creatorId = "default_creator",
  topic = "",
  renderResult = {},
  analytics = {},
} = {}) {
  const eventsDb = getEventsDb();

  const event = {
    id: randomId(),
    creatorId,
    topic,
    renderResult: {
      provider:
        renderResult.provider || null,
      platform:
        renderResult.platform || null,
      style:
        renderResult.style || null,
    },
    analytics,
    createdAt: now(),
  };

  eventsDb.events.unshift(event);

  eventsDb.events =
    eventsDb.events.slice(0, 10000);

  saveEventsDb(eventsDb);

  return updateCreatorIntelligence({
    creatorId,
    topic,
    platform:
      renderResult.platform || "TikTok",
    style:
      renderResult.style || "cinematic",
    metrics: analytics,
  });
}


export function buildViralAngleFromResearch({
  researchBrief = null,
  classification = {},
  platform = "TikTok",
  topic = "",
} = {}) {
  const brief = researchBrief?.brief || {};
  const facts = Array.isArray(brief.keyFacts) ? brief.keyFacts : [];
  const topFact = facts[0] || {};
  const researchType = researchBrief?.researchType || classification?.researchIntent?.type || "general_web";

  const baseHook =
    brief.hook ||
    topFact.title ||
    `Here is what people need to know about ${topic}.`;

  const typeStrategy = {
    trend: {
      angle: "trend-explainer-with-a-strong-pattern-interrupt",
      hookStyle: "viral-curiosity-hook",
      pacing: "fast",
      emotionalArc: "curiosity-to-urgency-to-payoff",
      captionStyle: "bold-short-captions",
    },
    news: {
      angle: "breaking-context-explainer",
      hookStyle: "urgent-context-hook",
      pacing: "measured-fast",
      emotionalArc: "urgency-to-clarity-to-implication",
      captionStyle: "documentary-impact-captions",
    },
    weather: {
      angle: "useful-local-weather-brief",
      hookStyle: "direct-practical-hook",
      pacing: "clear",
      emotionalArc: "attention-to-usefulness-to-action",
      captionStyle: "clean-readable-captions",
    },
    finance: {
      angle: "market-move-explainer",
      hookStyle: "why-it-moved-hook",
      pacing: "analytical",
      emotionalArc: "confusion-to-clarity-to-watch-next",
      captionStyle: "precision-finance-captions",
    },
    how_to: {
      angle: "problem-solution-tutorial",
      hookStyle: "pain-point-hook",
      pacing: "stepwise",
      emotionalArc: "problem-to-process-to-confidence",
      captionStyle: "instructional-captions",
    },
    general_web: {
      angle: "research-backed-short-form-explainer",
      hookStyle: "curiosity-hook",
      pacing: "balanced",
      emotionalArc: "curiosity-to-proof-to-payoff",
      captionStyle: "cinematic-explainer-captions",
    },
  };

  const strategy = typeStrategy[researchType] || typeStrategy.general_web;

  return {
    ok: true,
    engine: `${INTELLIGENCE_VERSION} Research Angle Adapter`,
    researchType,
    platform,
    angle: strategy.angle,
    hook: baseHook,
    hookStyle: strategy.hookStyle,
    pacing: strategy.pacing,
    emotionalArc: strategy.emotionalArc,
    captionStyle: strategy.captionStyle,
    viewerPromise: brief.viewerPromise || "Give the viewer a clear, useful, source-backed story.",
    sourceCount: researchBrief?.results?.length || 0,
    suggestedTitle: brief.suggestedTitle || topFact.title || topic,
    keyFacts: facts.slice(0, 6),
    diagnostics: {
      researchBacked: Boolean(researchBrief?.ok),
      viralAngleSelected: true,
      storyboardReady: true,
    },
  };
}

export function getViralIntelligenceHealth() {
  const profilesDb = getProfilesDb();
  const eventsDb = getEventsDb();

  return {
    ok: true,

    engine: INTELLIGENCE_VERSION,

    totalProfiles: Object.keys(
      profilesDb.profiles || {}
    ).length,

    totalLearningEvents:
      eventsDb.events.length,

    supports: {
      creatorLearning: true,
      emotionalDetection: true,
      politicalDetection: true,
      viralPrediction: true,
      retentionPrediction: true,
      adaptivePacing: true,
      adaptiveCaptions: true,
      soundtrackIntelligence: true,
      creatorStyleMemory: true,
      controversyScoring: true,
      multicategoryLearning: true,
    },
  };
}

export default {
  getOrCreateCreatorProfile,
  updateCreatorIntelligence,
  generateViralStrategy,
  learnFromRenderResult,
  buildViralAngleFromResearch,
  getViralIntelligenceHealth,
};