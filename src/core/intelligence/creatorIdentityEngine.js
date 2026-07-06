// src/core/intelligence/creatorIdentityEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MEMORY_DIR = path.resolve("server-renders/astramind-intelligence");
const IDENTITY_FILE = path.join(MEMORY_DIR, "creator-identity-memory.json");
const STYLE_EVENTS_FILE = path.join(MEMORY_DIR, "creator-style-events.json");

const ENGINE_VERSION = "AstraMind Creator Identity Engine v1";

export const CREATOR_ARCHETYPES = {
  POLITICAL_COMMENTATOR: "political_commentator",
  DOCUMENTARY_CREATOR: "documentary_creator",
  BUSINESS_BUILDER: "business_builder",
  FINANCE_ANALYST: "finance_analyst",
  MOTIVATIONAL_SPEAKER: "motivational_speaker",
  AI_TECH_CREATOR: "ai_tech_creator",
  SPIRITUAL_WELLNESS: "spiritual_wellness",
  COMEDY_SATIRE: "comedy_satire",
  NEWS_EXPLAINER: "news_explainer",
  LIFESTYLE_CREATOR: "lifestyle_creator",
  GENERAL_CREATOR: "general_creator",
};

export const CREATOR_TONES = {
  CALM: "calm",
  CINEMATIC: "cinematic",
  AGGRESSIVE: "aggressive",
  INVESTIGATIVE: "investigative",
  HUMOROUS: "humorous",
  MOTIVATIONAL: "motivational",
  DOCUMENTARY: "documentary",
  EDUCATIONAL: "educational",
  LUXURY: "luxury",
  STREET_REAL: "street_real",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function id(prefix = "cid") {
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

function normalize(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function avg(a, b, weightNew = 0.35) {
  const oldValue = Number(a || 0);
  const newValue = Number(b || 0);
  return clamp(oldValue * (1 - weightNew) + newValue * weightNew);
}

function increment(map = {}, key = "unknown", amount = 1) {
  map[key] = Number(map[key] || 0) + amount;
  return map;
}

function topKey(map = {}, fallback = "unknown") {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function detectArchetype(topic = "", style = "") {
  const text = `${normalize(topic)} ${normalize(style)}`;

  const scores = {
    [CREATOR_ARCHETYPES.POLITICAL_COMMENTATOR]: 0,
    [CREATOR_ARCHETYPES.DOCUMENTARY_CREATOR]: 0,
    [CREATOR_ARCHETYPES.BUSINESS_BUILDER]: 0,
    [CREATOR_ARCHETYPES.FINANCE_ANALYST]: 0,
    [CREATOR_ARCHETYPES.MOTIVATIONAL_SPEAKER]: 0,
    [CREATOR_ARCHETYPES.AI_TECH_CREATOR]: 0,
    [CREATOR_ARCHETYPES.SPIRITUAL_WELLNESS]: 0,
    [CREATOR_ARCHETYPES.COMEDY_SATIRE]: 0,
    [CREATOR_ARCHETYPES.NEWS_EXPLAINER]: 0,
    [CREATOR_ARCHETYPES.LIFESTYLE_CREATOR]: 0,
    [CREATOR_ARCHETYPES.GENERAL_CREATOR]: 1,
  };

  const groups = [
    {
      archetype: CREATOR_ARCHETYPES.POLITICAL_COMMENTATOR,
      words: [
        "trump",
        "maga",
        "democrat",
        "liberal",
        "leftist",
        "conservative",
        "republican",
        "president",
        "administration",
        "election",
        "policy",
        "woke",
      ],
    },
    {
      archetype: CREATOR_ARCHETYPES.DOCUMENTARY_CREATOR,
      words: ["documentary", "history", "timeline", "truth", "explain", "deep dive", "investigation"],
    },
    {
      archetype: CREATOR_ARCHETYPES.BUSINESS_BUILDER,
      words: ["business", "startup", "entrepreneur", "brand", "sales", "client", "company"],
    },
    {
      archetype: CREATOR_ARCHETYPES.FINANCE_ANALYST,
      words: ["stocks", "crypto", "invest", "market", "trading", "tesla", "portfolio", "wealth"],
    },
    {
      archetype: CREATOR_ARCHETYPES.MOTIVATIONAL_SPEAKER,
      words: ["motivation", "discipline", "success", "dream", "mindset", "legacy", "greatness"],
    },
    {
      archetype: CREATOR_ARCHETYPES.AI_TECH_CREATOR,
      words: ["ai", "artificial intelligence", "technology", "automation", "robot", "app", "software"],
    },
    {
      archetype: CREATOR_ARCHETYPES.SPIRITUAL_WELLNESS,
      words: ["frequency", "vibration", "energy", "consciousness", "healing", "smoothie", "wellness"],
    },
    {
      archetype: CREATOR_ARCHETYPES.COMEDY_SATIRE,
      words: ["funny", "comedy", "satire", "parody", "joke", "skit"],
    },
    {
      archetype: CREATOR_ARCHETYPES.NEWS_EXPLAINER,
      words: ["breaking", "news", "headline", "report", "update", "current events"],
    },
    {
      archetype: CREATOR_ARCHETYPES.LIFESTYLE_CREATOR,
      words: ["daily", "family", "food", "travel", "vacation", "home", "routine"],
    },
  ];

  for (const group of groups) {
    for (const word of group.words) {
      if (text.includes(word)) scores[group.archetype] += 12;
    }
  }

  return topKey(scores, CREATOR_ARCHETYPES.GENERAL_CREATOR);
}

function detectTone(topic = "", style = "") {
  const text = `${normalize(topic)} ${normalize(style)}`;

  const scores = {
    [CREATOR_TONES.CALM]: 0,
    [CREATOR_TONES.CINEMATIC]: 0,
    [CREATOR_TONES.AGGRESSIVE]: 0,
    [CREATOR_TONES.INVESTIGATIVE]: 0,
    [CREATOR_TONES.HUMOROUS]: 0,
    [CREATOR_TONES.MOTIVATIONAL]: 0,
    [CREATOR_TONES.DOCUMENTARY]: 0,
    [CREATOR_TONES.EDUCATIONAL]: 0,
    [CREATOR_TONES.LUXURY]: 0,
    [CREATOR_TONES.STREET_REAL]: 0,
  };

  const groups = [
    {
      tone: CREATOR_TONES.CINEMATIC,
      words: ["cinematic", "epic", "dramatic", "movie", "trailer", "emotional"],
    },
    {
      tone: CREATOR_TONES.AGGRESSIVE,
      words: ["expose", "bullshit", "attack", "destroy", "fight", "lies", "fake", "corrupt"],
    },
    {
      tone: CREATOR_TONES.INVESTIGATIVE,
      words: ["investigate", "truth", "hidden", "evidence", "facts", "proof", "exposed"],
    },
    {
      tone: CREATOR_TONES.HUMOROUS,
      words: ["funny", "comedy", "joke", "satire", "parody"],
    },
    {
      tone: CREATOR_TONES.MOTIVATIONAL,
      words: ["success", "dream", "legacy", "discipline", "motivation", "greatness"],
    },
    {
      tone: CREATOR_TONES.DOCUMENTARY,
      words: ["documentary", "history", "timeline", "chapter", "story"],
    },
    {
      tone: CREATOR_TONES.EDUCATIONAL,
      words: ["teach", "explain", "learn", "breakdown", "guide"],
    },
    {
      tone: CREATOR_TONES.LUXURY,
      words: ["premium", "luxury", "elite", "exclusive", "high-end"],
    },
    {
      tone: CREATOR_TONES.STREET_REAL,
      words: ["real talk", "street", "raw", "uncut", "hood", "gritty"],
    },
  ];

  for (const group of groups) {
    for (const word of group.words) {
      if (text.includes(word)) scores[group.tone] += 12;
    }
  }

  scores[CREATOR_TONES.CINEMATIC] += 5;

  return topKey(scores, CREATOR_TONES.CINEMATIC);
}

function detectEditorialDirection(topic = "") {
  const text = normalize(topic);

  const direction = {
    politicalOrientation: "neutral_or_mixed",
    intensity: "moderate",
    contentMode: "commentary",
    allowStrongOpinion: true,
    harmBoundary: "block_physical_harm_or_targeted_threats",
  };

  const conservativeTerms = ["trump", "maga", "conservative", "republican", "anti woke", "woke", "leftist"];
  const progressiveTerms = ["democrat", "liberal", "progressive", "biden", "left wing"];

  let conservative = 0;
  let progressive = 0;

  conservativeTerms.forEach((term) => {
    if (text.includes(term)) conservative += 1;
  });

  progressiveTerms.forEach((term) => {
    if (text.includes(term)) progressive += 1;
  });

  if (conservative > progressive) direction.politicalOrientation = "conservative_or_maga_leaning";
  if (progressive > conservative) direction.politicalOrientation = "progressive_or_democrat_leaning";

  if (
    text.includes("bullshit") ||
    text.includes("corrupt") ||
    text.includes("exposed") ||
    text.includes("lies")
  ) {
    direction.intensity = "high";
  }

  if (text.includes("documentary") || text.includes("history") || text.includes("timeline")) {
    direction.contentMode = "documentary";
  }

  if (text.includes("satire") || text.includes("parody")) {
    direction.contentMode = "satire";
  }

  return direction;
}

function defaultIdentity(creatorId) {
  return {
    creatorId,
    engine: ENGINE_VERSION,
    createdAt: now(),
    updatedAt: now(),

    totalInteractions: 0,
    totalGeneratedProjects: 0,

    archetypeScores: {},
    toneScores: {},
    platformScores: {},
    topicClusters: {},

    currentIdentity: {
      archetype: CREATOR_ARCHETYPES.GENERAL_CREATOR,
      tone: CREATOR_TONES.CINEMATIC,
      editorialDirection: {
        politicalOrientation: "neutral_or_mixed",
        intensity: "moderate",
        contentMode: "commentary",
        allowStrongOpinion: true,
        harmBoundary: "block_physical_harm_or_targeted_threats",
      },
      confidence: 35,
    },

    productionPreferences: {
      pacing: "balanced-viral",
      captionStyle: "cinematic-clean",
      soundtrackMood: "modern-cinematic",
      transitionStyle: "cinematic",
      motionEffect: "cinematic",
      watermarkStyle: "bottom-right-standard",
      preferredPlatforms: ["TikTok", "YouTube Shorts", "Instagram Reels"],
    },

    visualDNA: {
      cinematicIntensity: 65,
      realism: 70,
      glowEffects: 60,
      documentaryStyle: 55,
      fastCuts: 60,
      politicalGraphics: 50,
      textOverlayIntensity: 55,
    },

    voiceDNA: {
      narrationStyle: "clear cinematic narrator",
      aggression: 45,
      warmth: 55,
      authority: 65,
      humor: 20,
      investigativeEnergy: 50,
    },

    safetyProfile: {
      viewpointNeutralPlatform: true,
      allowsPartisanCommentary: true,
      blocksPhysicalHarm: true,
      blocksTargetedThreats: true,
      requiresFactFramingForClaims: true,
      prefersDocumentaryOrOpinionLabeling: true,
    },

    memory: {
      repeatedThemes: [],
      preferredHooks: [],
      rejectedStyles: [],
      successfulStyles: [],
    },
  };
}

function loadIdentityDb() {
  return readJson(IDENTITY_FILE, {
    version: 1,
    engine: ENGINE_VERSION,
    creators: {},
  });
}

function saveIdentityDb(db) {
  writeJson(IDENTITY_FILE, db);
}

function loadEventsDb() {
  return readJson(STYLE_EVENTS_FILE, {
    version: 1,
    events: [],
  });
}

function saveEventsDb(db) {
  writeJson(STYLE_EVENTS_FILE, db);
}

export function getOrCreateCreatorIdentity(creatorId = "default_creator") {
  const db = loadIdentityDb();

  if (!db.creators[creatorId]) {
    db.creators[creatorId] = defaultIdentity(creatorId);
    saveIdentityDb(db);
  }

  return db.creators[creatorId];
}

export function analyzeCreatorIntent({
  creatorId = "default_creator",
  topic = "",
  platform = "TikTok",
  style = "",
  explicitPreferences = {},
} = {}) {
  const base = getOrCreateCreatorIdentity(creatorId);

  const detectedArchetype = detectArchetype(topic, style);
  const detectedTone = detectTone(topic, style);
  const editorialDirection = detectEditorialDirection(topic);

  const confidenceBoost =
    detectedArchetype === base.currentIdentity.archetype ? 12 : 6;

  return {
    ok: true,
    engine: ENGINE_VERSION,
    creatorId,
    topic,
    platform,
    detected: {
      archetype: detectedArchetype,
      tone: detectedTone,
      editorialDirection,
      confidence: clamp((base.currentIdentity.confidence || 35) + confidenceBoost),
    },
    explicitPreferences,
    recommendedProduction: buildProductionProfile({
      identity: base,
      archetype: detectedArchetype,
      tone: detectedTone,
      editorialDirection,
      platform,
    }),
  };
}

export function updateCreatorIdentity({
  creatorId = "default_creator",
  topic = "",
  platform = "TikTok",
  style = "",
  projectId = null,
  renderResult = null,
  userFeedback = null,
  analytics = {},
} = {}) {
  const db = loadIdentityDb();
  const identity = getOrCreateCreatorIdentity(creatorId);

  const archetype = detectArchetype(topic, style);
  const tone = detectTone(topic, style);
  const editorialDirection = detectEditorialDirection(topic);

  identity.totalInteractions += 1;
  if (projectId || renderResult?.projectId) identity.totalGeneratedProjects += 1;

  increment(identity.archetypeScores, archetype);
  increment(identity.toneScores, tone);
  increment(identity.platformScores, platform);

  const topicKey = normalize(topic).split(" ").slice(0, 6).join(" ");
  if (topicKey) increment(identity.topicClusters, topicKey);

  identity.currentIdentity = {
    archetype: topKey(identity.archetypeScores, archetype),
    tone: topKey(identity.toneScores, tone),
    editorialDirection,
    confidence: clamp((identity.currentIdentity.confidence || 35) + 3),
  };

  identity.productionPreferences = {
    ...identity.productionPreferences,
    ...buildProductionProfile({
      identity,
      archetype: identity.currentIdentity.archetype,
      tone: identity.currentIdentity.tone,
      editorialDirection,
      platform,
    }),
  };

  applyFeedback(identity, userFeedback, analytics);

  identity.updatedAt = now();

  db.creators[creatorId] = identity;
  saveIdentityDb(db);

  logCreatorStyleEvent({
    creatorId,
    type: "identity.updated",
    projectId: projectId || renderResult?.projectId || null,
    topic,
    platform,
    style,
    metadata: {
      archetype,
      tone,
      editorialDirection,
      analytics,
      feedback: userFeedback,
    },
  });

  return {
    ok: true,
    identity,
  };
}

function buildProductionProfile({
  identity,
  archetype,
  tone,
  editorialDirection,
  platform = "TikTok",
}) {
  const production = {
    pacing: identity.productionPreferences?.pacing || "balanced-viral",
    captionStyle: identity.productionPreferences?.captionStyle || "cinematic-clean",
    soundtrackMood: identity.productionPreferences?.soundtrackMood || "modern-cinematic",
    transitionStyle: identity.productionPreferences?.transitionStyle || "cinematic",
    motionEffect: identity.productionPreferences?.motionEffect || "cinematic",
    watermarkStyle: identity.productionPreferences?.watermarkStyle || "bottom-right-standard",
    platform,
  };

  if (tone === CREATOR_TONES.AGGRESSIVE || editorialDirection?.intensity === "high") {
    production.pacing = "hyper-fast";
    production.captionStyle = "bold-kinetic";
    production.soundtrackMood = "epic-aggressive";
    production.transitionStyle = "impact-cuts";
    production.motionEffect = "cinematic-punch";
  }

  if (tone === CREATOR_TONES.DOCUMENTARY || archetype === CREATOR_ARCHETYPES.DOCUMENTARY_CREATOR) {
    production.pacing = "documentary-build";
    production.captionStyle = "documentary-lower-third";
    production.soundtrackMood = "serious-cinematic";
    production.transitionStyle = "clean-documentary";
    production.motionEffect = "slow-cinematic";
  }

  if (archetype === CREATOR_ARCHETYPES.POLITICAL_COMMENTATOR) {
    production.captionStyle =
      editorialDirection?.intensity === "high" ? "bold-kinetic" : "news-documentary";
    production.soundtrackMood =
      editorialDirection?.intensity === "high" ? "epic-aggressive" : "serious-cinematic";
  }

  if (archetype === CREATOR_ARCHETYPES.AI_TECH_CREATOR) {
    production.pacing = "futuristic-fast";
    production.captionStyle = "neon-tech";
    production.soundtrackMood = "futuristic-cinematic";
    production.transitionStyle = "glitch-cinematic";
    production.motionEffect = "digital-cinematic";
  }

  if (platform.toLowerCase().includes("youtube")) {
    production.pacing =
      production.pacing === "hyper-fast" ? "fast-documentary" : production.pacing;
  }

  return production;
}

function applyFeedback(identity, feedback, analytics = {}) {
  if (!feedback && !analytics) return;

  const text = normalize(
    typeof feedback === "string" ? feedback : feedback?.message || ""
  );

  const positive =
    text.includes("good") ||
    text.includes("great") ||
    text.includes("beautiful") ||
    text.includes("awesome") ||
    text.includes("perfect") ||
    Number(analytics.retentionScore || 0) > 70;

  const negative =
    text.includes("bad") ||
    text.includes("wrong") ||
    text.includes("too much") ||
    text.includes("boring") ||
    Number(analytics.retentionScore || 100) < 35;

  if (positive) {
    identity.visualDNA.cinematicIntensity = avg(identity.visualDNA.cinematicIntensity, 80);
    identity.voiceDNA.authority = avg(identity.voiceDNA.authority, 75);
    identity.memory.successfulStyles.unshift({
      at: now(),
      style: identity.currentIdentity.tone,
      archetype: identity.currentIdentity.archetype,
    });
  }

  if (negative) {
    identity.visualDNA.textOverlayIntensity = avg(identity.visualDNA.textOverlayIntensity, 40);
    identity.memory.rejectedStyles.unshift({
      at: now(),
      feedback,
      style: identity.currentIdentity.tone,
    });
  }

  identity.memory.successfulStyles = identity.memory.successfulStyles.slice(0, 100);
  identity.memory.rejectedStyles = identity.memory.rejectedStyles.slice(0, 100);
}

export function logCreatorStyleEvent({
  creatorId = "default_creator",
  type = "style.event",
  projectId = null,
  topic = "",
  platform = "",
  style = "",
  metadata = {},
} = {}) {
  const db = loadEventsDb();

  const event = {
    eventId: id("style_evt"),
    creatorId,
    type,
    projectId,
    topic,
    platform,
    style,
    metadata,
    createdAt: now(),
  };

  db.events.unshift(event);
  db.events = db.events.slice(0, 10000);

  saveEventsDb(db);

  return {
    ok: true,
    event,
  };
}

export function getCreatorProductionProfile(creatorId = "default_creator") {
  const identity = getOrCreateCreatorIdentity(creatorId);

  return {
    ok: true,
    creatorId,
    currentIdentity: identity.currentIdentity,
    productionPreferences: identity.productionPreferences,
    visualDNA: identity.visualDNA,
    voiceDNA: identity.voiceDNA,
    safetyProfile: identity.safetyProfile,
  };
}

export function setCreatorPreference({
  creatorId = "default_creator",
  preferences = {},
} = {}) {
  const db = loadIdentityDb();
  const identity = getOrCreateCreatorIdentity(creatorId);

  identity.productionPreferences = {
    ...identity.productionPreferences,
    ...(preferences.productionPreferences || {}),
  };

  identity.visualDNA = {
    ...identity.visualDNA,
    ...(preferences.visualDNA || {}),
  };

  identity.voiceDNA = {
    ...identity.voiceDNA,
    ...(preferences.voiceDNA || {}),
  };

  identity.safetyProfile = {
    ...identity.safetyProfile,
    ...(preferences.safetyProfile || {}),
  };

  identity.updatedAt = now();

  db.creators[creatorId] = identity;
  saveIdentityDb(db);

  logCreatorStyleEvent({
    creatorId,
    type: "identity.preference_set",
    metadata: preferences,
  });

  return {
    ok: true,
    identity,
  };
}

export function listCreatorIdentities({ limit = 100 } = {}) {
  const db = loadIdentityDb();

  const creators = Object.values(db.creators || {})
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, Number(limit) || 100);

  return {
    ok: true,
    count: creators.length,
    creators,
  };
}

export function getCreatorStyleEvents({
  creatorId = null,
  limit = 100,
} = {}) {
  const db = loadEventsDb();

  let events = db.events || [];

  if (creatorId) {
    events = events.filter((event) => event.creatorId === creatorId);
  }

  return {
    ok: true,
    count: events.slice(0, Number(limit) || 100).length,
    events: events.slice(0, Number(limit) || 100),
  };
}

export function getCreatorIdentityHealth() {
  const db = loadIdentityDb();
  const events = loadEventsDb();

  return {
    ok: true,
    engine: ENGINE_VERSION,
    memoryDir: MEMORY_DIR,
    identityFile: IDENTITY_FILE,
    styleEventsFile: STYLE_EVENTS_FILE,
    totalCreators: Object.keys(db.creators || {}).length,
    totalStyleEvents: events.events.length,
    supports: {
      creatorArchetypeDetection: true,
      creatorToneDetection: true,
      editorialDirectionDetection: true,
      politicalContentAdaptation: true,
      subscriberPersonalization: true,
      productionPreferenceLearning: true,
      visualDNA: true,
      voiceDNA: true,
      safetyBoundaryMemory: true,
      creatorFeedbackLearning: true,
    },
  };
}

export default {
  CREATOR_ARCHETYPES,
  CREATOR_TONES,
  getOrCreateCreatorIdentity,
  analyzeCreatorIntent,
  updateCreatorIdentity,
  getCreatorProductionProfile,
  setCreatorPreference,
  listCreatorIdentities,
  getCreatorStyleEvents,
  getCreatorIdentityHealth,
};