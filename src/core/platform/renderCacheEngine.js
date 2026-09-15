// src/core/platform/renderCacheEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = path.resolve("server-renders/astramind-cache");
const CACHE_INDEX_FILE = path.join(CACHE_DIR, "render-cache-index.json");

const CACHE_TYPES = {
  STORYBOARD: "storyboard",
  DIRECTOR_PLAN: "director_plan",
  VISUAL: "visual",
  AI_VIDEO_CLIP: "ai_video_clip",
  VOICEOVER: "voiceover",
  SOUNDTRACK: "soundtrack",
  SUBTITLES: "subtitles",
  WATERMARK: "watermark",
  SOCIAL_EXPORT: "social_export",
  FINAL_RENDER: "final_render",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function now() {
  return new Date().toISOString();
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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function createCacheKey({
  type = CACHE_TYPES.FINAL_RENDER,
  topic = "",
  platform = "",
  style = "",
  provider = "",
  model = "",
  sceneId = "",
  voiceId = "",
  soundtrackMood = "",
  durationTarget = "",
  options = {},
} = {}) {
  const payload = {
    type,
    topic: normalize(topic),
    platform: normalize(platform),
    style: normalize(style),
    provider: normalize(provider),
    model: normalize(model),
    sceneId: normalize(sceneId),
    voiceId: normalize(voiceId),
    soundtrackMood: normalize(soundtrackMood),
    durationTarget: String(durationTarget || ""),
    options,
  };

  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}

function getCacheIndex() {
  return readJson(CACHE_INDEX_FILE, {
    version: 1,
    updatedAt: now(),
    entries: {},
    stats: {
      hits: 0,
      misses: 0,
      writes: 0,
      deletes: 0,
    },
  });
}

function saveCacheIndex(index) {
  index.updatedAt = now();
  writeJson(CACHE_INDEX_FILE, index);
}

function fileStillExists(entry) {
  if (!entry) return false;

  if (entry.filePath && !fs.existsSync(entry.filePath)) return false;

  if (Array.isArray(entry.files)) {
    return entry.files.every((file) => !file?.path || fs.existsSync(file.path));
  }

  return true;
}

export function getCachedRender(cacheKey) {
  const index = getCacheIndex();
  const entry = index.entries[cacheKey];

  if (!entry || !fileStillExists(entry)) {
    index.stats.misses += 1;
    saveCacheIndex(index);

    return {
      ok: false,
      hit: false,
      reason: entry ? "cached_files_missing" : "cache_miss",
      cacheKey,
    };
  }

  entry.hits = Number(entry.hits || 0) + 1;
  entry.lastHitAt = now();

  index.stats.hits += 1;
  index.entries[cacheKey] = entry;
  saveCacheIndex(index);

  return {
    ok: true,
    hit: true,
    cacheKey,
    entry,
  };
}

export function saveCachedRender({
  cacheKey,
  type = CACHE_TYPES.FINAL_RENDER,
  projectId = null,
  topic = "",
  platform = "",
  style = "",
  provider = "",
  filePath = null,
  publicUrl = null,
  files = [],
  data = {},
  metadata = {},
  ttlSeconds = null,
} = {}) {
  if (!cacheKey) {
    throw new Error("cacheKey is required for saveCachedRender.");
  }

  const index = getCacheIndex();

  const expiresAt =
    ttlSeconds && Number(ttlSeconds) > 0
      ? new Date(Date.now() + Number(ttlSeconds) * 1000).toISOString()
      : null;

  const entry = {
    cacheKey,
    type,
    projectId,
    topic,
    platform,
    style,
    provider,
    filePath,
    publicUrl,
    files,
    data,
    metadata,
    hits: index.entries[cacheKey]?.hits || 0,
    createdAt: index.entries[cacheKey]?.createdAt || now(),
    updatedAt: now(),
    lastHitAt: index.entries[cacheKey]?.lastHitAt || null,
    expiresAt,
  };

  index.entries[cacheKey] = entry;
  index.stats.writes += 1;

  saveCacheIndex(index);

  return {
    ok: true,
    cacheKey,
    entry,
  };
}

export function isCacheExpired(entry) {
  if (!entry?.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() < Date.now();
}

export function getOrCreateCache({
  keyInput,
  create,
  type = CACHE_TYPES.FINAL_RENDER,
  ttlSeconds = null,
} = {}) {
  const cacheKey =
    typeof keyInput === "string" ? keyInput : createCacheKey(keyInput);

  const cached = getCachedRender(cacheKey);

  if (cached.ok && !isCacheExpired(cached.entry)) {
    return Promise.resolve({
      ok: true,
      source: "cache",
      cacheKey,
      cached: true,
      entry: cached.entry,
      data: cached.entry.data,
    });
  }

  if (typeof create !== "function") {
    return Promise.resolve({
      ok: false,
      source: "cache",
      cached: false,
      cacheKey,
      reason: "create_function_missing",
    });
  }

  return Promise.resolve(create()).then((result) => {
    const saved = saveCachedRender({
      cacheKey,
      type,
      filePath: result?.filePath || result?.outputPath || result?.videoPath || null,
      publicUrl: result?.publicUrl || null,
      files: result?.files || [],
      data: result,
      metadata: result?.metadata || {},
      ttlSeconds,
    });

    return {
      ok: true,
      source: "fresh",
      cached: false,
      cacheKey,
      saved,
      data: result,
    };
  });
}

export function deleteCachedRender(cacheKey, { deleteFiles = false } = {}) {
  const index = getCacheIndex();
  const entry = index.entries[cacheKey];

  if (!entry) {
    return {
      ok: false,
      error: "Cache entry not found",
      cacheKey,
    };
  }

  const deletedFiles = [];

  if (deleteFiles) {
    const possibleFiles = [
      entry.filePath,
      ...(Array.isArray(entry.files) ? entry.files.map((file) => file.path) : []),
    ].filter(Boolean);

    for (const filePath of possibleFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedFiles.push(filePath);
        }
      } catch {
        // safe delete
      }
    }
  }

  delete index.entries[cacheKey];
  index.stats.deletes += 1;

  saveCacheIndex(index);

  return {
    ok: true,
    cacheKey,
    deletedFiles,
  };
}

export function clearExpiredCache({ deleteFiles = false } = {}) {
  const index = getCacheIndex();
  const keys = Object.keys(index.entries);
  const cleared = [];

  for (const key of keys) {
    const entry = index.entries[key];

    if (isCacheExpired(entry)) {
      const result = deleteCachedRender(key, { deleteFiles });
      cleared.push(result);
    }
  }

  return {
    ok: true,
    clearedCount: cleared.length,
    cleared,
  };
}

export function listCacheEntries({
  type,
  provider,
  topic,
  limit = 100,
} = {}) {
  const index = getCacheIndex();

  let entries = Object.values(index.entries || {});

  if (type) entries = entries.filter((entry) => entry.type === type);
  if (provider) entries = entries.filter((entry) => entry.provider === provider);

  if (topic) {
    const q = normalize(topic);
    entries = entries.filter((entry) => normalize(entry.topic).includes(q));
  }

  entries = entries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    ok: true,
    count: entries.length,
    entries: entries.slice(0, Number(limit) || 100),
  };
}

export function getRenderCacheHealth() {
  const index = getCacheIndex();
  const entries = Object.values(index.entries || {});

  const byType = entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {});

  return {
    ok: true,
    engine: "Aigenikz Render Cache Engine v1",
    cacheDir: CACHE_DIR,
    cacheIndexFile: CACHE_INDEX_FILE,
    totalEntries: entries.length,
    byType,
    stats: index.stats,
    supports: {
      storyboardCaching: true,
      visualCaching: true,
      aiVideoClipCaching: true,
      voiceoverCaching: true,
      soundtrackCaching: true,
      subtitleCaching: true,
      watermarkCaching: true,
      finalRenderCaching: true,
      ttlExpiration: true,
      cacheCleanup: true,
    },
  };
}

export { CACHE_TYPES };

export default {
  CACHE_TYPES,
  createCacheKey,
  getCachedRender,
  saveCachedRender,
  getOrCreateCache,
  deleteCachedRender,
  clearExpiredCache,
  listCacheEntries,
  getRenderCacheHealth,
};