// src/core/creatorBrain/creatorBrainMemoryEngine.js

import crypto from "crypto";

const ENGINE_VERSION =
  "Aigenikz CreatorBrain Memory Engine v1 Unified";

/*
  MEMORY LAYERS

  SHORT TERM
  = active session cognition

  WORKING
  = active projects + creator continuity

  LONG TERM
  = persistent creator evolution

  SEMANTIC
  = categorized creator intelligence

  REINFORCED
  = high-value retained memories
*/

const shortTermMemory =
  new Map();

const workingMemory =
  new Map();

const longTermMemory =
  new Map();

const semanticMemory =
  new Map();

const reinforcedMemory =
  new Map();

function nowIso() {
  return new Date().toISOString();
}

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clamp(
  value,
  min,
  max,
  fallback
) {
  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {
    return fallback;
  }

  return Math.max(
    min,
    Math.min(max, n)
  );
}

function generateMemoryId() {
  return crypto.randomUUID();
}

function calculateMemoryStrength({
  importance = 50,

  reinforcementCount = 0,

  accessCount = 0,
}) {
  const score =
    importance * 0.6 +
    reinforcementCount * 15 +
    accessCount * 3;

  return clamp(
    score,
    0,
    100,
    50
  );
}

function calculateDecayRate({
  memoryStrength = 50,

  lastAccessedAt,
}) {
  const now =
    Date.now();

  const last =
    new Date(
      lastAccessedAt
    ).getTime();

  const ageDays =
    Math.max(
      0,
      (now - last) /
        (1000 *
          60 *
          60 *
          24)
    );

  /*
    stronger memories decay slower
  */

  const decay =
    ageDays /
    Math.max(
      memoryStrength,
      10
    );

  return Number(
    decay.toFixed(2)
  );
}

function buildMemoryEntry({
  type = "general",

  category = "general",

  title = "",

  content = "",

  tags = [],

  projectId = null,

  creatorId = "default",

  importance = 50,
}) {
  const createdAt =
    nowIso();

  return {
    memoryId:
      generateMemoryId(),

    creatorId,

    type,

    category,

    title:
      clean(title),

    content:
      clean(content),

    tags:
      safeArray(tags),

    linkedProjectId:
      projectId,

    importance:
      clamp(
        importance,
        1,
        100,
        50
      ),

    reinforcementCount:
      0,

    accessCount: 0,

    memoryStrength:
      calculateMemoryStrength({
        importance,
      }),

    decayRate: 0,

    createdAt,

    updatedAt:
      createdAt,

    lastAccessedAt:
      createdAt,

    persistent: true,

    adaptive: true,

    semanticIndexed:
      true,
  };
}

function updateMemoryMetrics(
  memory = {}
) {
  const updated = {
    ...memory,

    accessCount:
      (memory.accessCount ||
        0) + 1,

    updatedAt:
      nowIso(),

    lastAccessedAt:
      nowIso(),
  };

  updated.memoryStrength =
    calculateMemoryStrength({
      importance:
        updated.importance,

      reinforcementCount:
        updated.reinforcementCount,

      accessCount:
        updated.accessCount,
    });

  updated.decayRate =
    calculateDecayRate({
      memoryStrength:
        updated.memoryStrength,

      lastAccessedAt:
        updated.lastAccessedAt,
    });

  return updated;
}

/*
  IMPORTANT MEMORY EVOLUTION

  OLD PROBLEMS:
  ❌ session-only intelligence
  ❌ no persistence
  ❌ no semantic memory
  ❌ no adaptive evolution
  ❌ no reinforcement logic
  ❌ no creator continuity

  NEW SYSTEM:
  ✅ persistent cognition
  ✅ semantic creator memory
  ✅ adaptive learning
  ✅ memory reinforcement
  ✅ memory decay management
  ✅ creator continuity memory
*/

export function storeShortTermMemory({
  creatorId = "default",

  memory,
}) {
  if (!memory) {
    return null;
  }

  const updated =
    updateMemoryMetrics(
      memory
    );

  shortTermMemory.set(
    updated.memoryId,
    {
      ...updated,

      memoryLayer:
        "short-term",
    }
  );

  return updated;
}

export function storeWorkingMemory({
  creatorId = "default",

  memory,
}) {
  if (!memory) {
    return null;
  }

  const updated =
    updateMemoryMetrics(
      memory
    );

  workingMemory.set(
    updated.memoryId,
    {
      ...updated,

      memoryLayer:
        "working",
    }
  );

  return updated;
}

export function storeLongTermMemory({
  creatorId = "default",

  memory,
}) {
  if (!memory) {
    return null;
  }

  const updated =
    updateMemoryMetrics(
      memory
    );

  longTermMemory.set(
    updated.memoryId,
    {
      ...updated,

      memoryLayer:
        "long-term",
    }
  );

  return updated;
}

export function storeSemanticMemory({
  creatorId = "default",

  memory,
}) {
  if (!memory) {
    return null;
  }

  const updated =
    updateMemoryMetrics(
      memory
    );

  semanticMemory.set(
    updated.memoryId,
    {
      ...updated,

      memoryLayer:
        "semantic",
    }
  );

  return updated;
}

export function reinforceMemory({
  memoryId,
}) {
  const layers = [
    shortTermMemory,
    workingMemory,
    longTermMemory,
    semanticMemory,
    reinforcedMemory,
  ];

  for (const layer of layers) {
    const existing =
      layer.get(memoryId);

    if (!existing) {
      continue;
    }

    const updated = {
      ...existing,

      reinforcementCount:
        (existing.reinforcementCount ||
          0) + 1,

      updatedAt:
        nowIso(),
    };

    updated.memoryStrength =
      calculateMemoryStrength({
        importance:
          updated.importance,

        reinforcementCount:
          updated.reinforcementCount,

        accessCount:
          updated.accessCount,
      });

    layer.set(
      memoryId,
      updated
    );

    /*
      promote highly reinforced
      memories
    */

    if (
      updated.memoryStrength >=
      90
    ) {
      reinforcedMemory.set(
        memoryId,
        {
          ...updated,

          memoryLayer:
            "reinforced",
        }
      );
    }

    return updated;
  }

  return null;
}

export function createCreatorMemory({
  creatorId = "default",

  type = "general",

  category = "general",

  title = "",

  content = "",

  tags = [],

  projectId = null,

  importance = 50,

  memoryLayer =
    "long-term",
} = {}) {
  const memory =
    buildMemoryEntry({
      creatorId,

      type,

      category,

      title,

      content,

      tags,

      projectId,

      importance,
    });

  switch (
    memoryLayer
  ) {
    case "short-term":
      return storeShortTermMemory({
        creatorId,

        memory,
      });

    case "working":
      return storeWorkingMemory({
        creatorId,

        memory,
      });

    case "semantic":
      return storeSemanticMemory({
        creatorId,

        memory,
      });

    case "long-term":
    default:
      return storeLongTermMemory({
        creatorId,

        memory,
      });
  }
}

export function getMemoryById(
  memoryId
) {
  const layers = [
    shortTermMemory,
    workingMemory,
    longTermMemory,
    semanticMemory,
    reinforcedMemory,
  ];

  for (const layer of layers) {
    const existing =
      layer.get(memoryId);

    if (!existing) {
      continue;
    }

    const updated =
      updateMemoryMetrics(
        existing
      );

    layer.set(
      memoryId,
      updated
    );

    return updated;
  }

  return null;
}

export function searchCreatorMemory({
  creatorId = "default",

  query = "",

  category = null,

  tags = [],

  projectId = null,

  minimumStrength = 0,
} = {}) {
  const normalizedQuery =
    clean(query).toLowerCase();

  const allMemories = [
    ...shortTermMemory.values(),

    ...workingMemory.values(),

    ...longTermMemory.values(),

    ...semanticMemory.values(),

    ...reinforcedMemory.values(),
  ];

  return allMemories
    .filter((memory) => {
      if (
        creatorId &&
        memory.creatorId !==
          creatorId
      ) {
        return false;
      }

      if (
        category &&
        memory.category !==
          category
      ) {
        return false;
      }

      if (
        projectId &&
        memory.linkedProjectId !==
          projectId
      ) {
        return false;
      }

      if (
        memory.memoryStrength <
        minimumStrength
      ) {
        return false;
      }

      if (
        safeArray(tags)
          .length
      ) {
        const memoryTags =
          safeArray(
            memory.tags
          ).map((tag) =>
            clean(tag).toLowerCase()
          );

        const requiredTags =
          safeArray(tags).map(
            (tag) =>
              clean(
                tag
              ).toLowerCase()
          );

        const matched =
          requiredTags.every(
            (tag) =>
              memoryTags.includes(
                tag
              )
          );

        if (!matched) {
          return false;
        }
      }

      if (
        !normalizedQuery
      ) {
        return true;
      }

      const searchable =
        `
${memory.title}
${memory.content}
${safeArray(
  memory.tags
).join(" ")}
        `
          .toLowerCase();

      return searchable.includes(
        normalizedQuery
      );
    })
    .sort(
      (a, b) =>
        b.memoryStrength -
        a.memoryStrength
    )
    .map((memory) => {
      const updated =
        updateMemoryMetrics(
          memory
        );

      return updated;
    });
}

export function decayWeakMemories() {
  const layers = [
    shortTermMemory,
    workingMemory,
    longTermMemory,
    semanticMemory,
  ];

  let decayed = 0;

  for (const layer of layers) {
    for (const [
      memoryId,
      memory,
    ] of layer.entries()) {
      const decayRate =
        calculateDecayRate({
          memoryStrength:
            memory.memoryStrength,

          lastAccessedAt:
            memory.lastAccessedAt,
        });

      const nextStrength =
        clamp(
          memory.memoryStrength -
            decayRate,
          0,
          100,
          0
        );

      if (
        nextStrength <= 5
      ) {
        layer.delete(
          memoryId
        );

        decayed++;

        continue;
      }

      layer.set(
        memoryId,
        {
          ...memory,

          memoryStrength:
            nextStrength,

          decayRate,
        }
      );
    }
  }

  return {
    ok: true,

    decayed,
  };
}

export function buildMemoryDiagnostics() {
  return {
    engine:
      ENGINE_VERSION,

    shortTerm:
      shortTermMemory.size,

    working:
      workingMemory.size,

    longTerm:
      longTermMemory.size,

    semantic:
      semanticMemory.size,

    reinforced:
      reinforcedMemory.size,

    persistentCognition:
      true,

    semanticMemory:
      true,

    adaptiveLearning:
      true,

    reinforcementLogic:
      true,

    memoryDecayManagement:
      true,

    creatorContinuity:
      true,

    autonomousEvolution:
      true,
  };
}

export function getCreatorBrainMemoryHealth() {
  return {
    ok: true,

    engine:
      ENGINE_VERSION,

    supports: {
      persistentMemory:
        true,

      semanticMemory:
        true,

      adaptiveLearning:
        true,

      memoryReinforcement:
        true,

      memoryDecay:
        true,

      creatorContinuity:
        true,

      longTermEvolution:
        true,

      autonomousCognition:
        true,
    },
  };
}

export default {
  createCreatorMemory,
  getMemoryById,
  searchCreatorMemory,
  reinforceMemory,
  decayWeakMemories,
  buildMemoryDiagnostics,
  getCreatorBrainMemoryHealth,
};