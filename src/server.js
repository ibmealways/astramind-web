import dotenv from "dotenv";
dotenv.config();

console.log("ELEVENLABS LOADED:", process.env.ELEVENLABS_API_KEY ? "YES" : "NO");
console.log("🔑 API KEY LOADED:", process.env.OPENAI_API_KEY ? "YES" : "NO");
console.log("STRIPE KEY LOADED:", process.env.STRIPE_SECRET_KEY ? "YES" : "NO");
console.log("WEBHOOK KEY LOADED:", process.env.STRIPE_WEBHOOK_SECRET ? "YES" : "NO");

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import platformRoutes from "./server/routes/platformRoutes.js";
import authRoutes from "./server/routes/authRoutes.js";
import chatRoutes from "./server/routes/chatRoutes.js";
import financeRoutes from "./server/routes/financeRoutes.js";
import billingRoutes from "./server/routes/billingRoutes.js";
import aiImageRoutes from "./server/routes/aiImageRoutes.js";
import developerApiRoutes from "./server/routes/developerApiRoutes.js";

import { initPlatformCoreTables } from "./server/db/initPlatformCore.js";
import {
  createPersistentProject,
  updatePersistentProject,
  saveWorkflowRun,
  saveResearchSource,
  saveBookChapter,
} from "./services/projectPersistenceService.js";
import schedulerRoutes from "./core/scheduler/schedulerRoutes.js";
import { startExecutionEngine } from "./core/scheduler/executionEngine.js";
import tradePilotRoutes from "./server/routes/tradePilotRoutes.js";
import videoRenderRoutes from "./server/routes/videorenderRoutes.js";
import cinematicVideoRoutes from "./server/routes/cinematicVideoRoutes.js";

startExecutionEngine();

const app = express();

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  })
);

// Stripe webhook needs raw body, so billing mounts before express.json()
app.use("/api/billing", billingRoutes);

app.use(express.json());
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/tradepilot", tradePilotRoutes);
app.use("/api/video", videoRenderRoutes);
app.use("/api/cinematic-video", cinematicVideoRoutes);
app.use("/api/ai-image", aiImageRoutes);
app.use("/api/developer", developerApiRoutes);

import path from "path";
import fs from "fs";

app.use(
  "/server-renders",
  express.static(
    path.resolve("server-renders")
  )
);

/*
  Serve generated visual frames from public/renders first.
  CRA serves this folder on localhost:3000, but the backend response
  also returns URLs used from localhost:5000. Keeping both mounts means
  /renders/vision-v2/*.png and /renders/final/* remain reachable.
*/
app.use(
  "/renders",
  express.static(
    path.resolve("public", "renders")
  )
);

app.use(
  "/renders",
  express.static(
    path.resolve("renders")
  )
);

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5000);

/* ===============================
   IN-MEMORY STORE
=============================== */
const bookProjectStore = new Map();

/* ===============================
   OPENAI CALL WRAPPER
=============================== */
async function callOpenAIChat(messages, temperature = 0.7) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.3",
      messages,
      temperature,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  return data?.choices?.[0]?.message?.content || "";
}

/* ===============================
   LIGHT RESEARCH SEARCH
   - Safe fallback if no real search provider wired yet
=============================== */
async function runLightResearchSearch(input = "") {
  try {
    const trimmed = String(input || "").trim();

    if (!trimmed) {
      return { results: [] };
    }

    return {
      results: [],
    };
  } catch (error) {
    console.error("🔥 LIGHT RESEARCH SEARCH ERROR:", error);
    return { results: [] };
  }
}

/* ===============================
   UTIL FUNCTIONS
=============================== */
function extractJsonObject(text = "") {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function extractChapterSummary(text = "") {
  const parts = text.split("Chapter Summary:");
  return parts[1]?.trim() || "";
}

function stripChapterSummary(text = "") {
  return text.split("Chapter Summary:")[0].trim();
}

function safeStringify(value, fallback = "") {
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

/* ===============================
   TONE ENGINE
=============================== */
function getToneStyleRules(tone = "") {
  const value = tone.toLowerCase();

  const base = {
    bold: [
      "Write assertively and directly.",
      "Avoid weak or hesitant phrasing.",
      "End on decisive, strong beats.",
    ],
    cinematic: [
      "Write visually with scene-based action.",
      "Use movement, imagery, and transitions.",
      "Avoid exposition-heavy narration.",
    ],
    suspenseful: [
      "Maintain tension and uncertainty.",
      "Withhold key info to build pressure.",
      "End with cliffhangers or danger.",
    ],
    dark: [
      "Use heavy emotional tone.",
      "Lean into consequence and moral tension.",
    ],
    inspirational: [
      "Focus on growth, resilience, purpose.",
      "Avoid cheesy motivational tone.",
    ],
    educational: [
      "Be clear, structured, informative.",
      "Avoid drama-heavy storytelling.",
    ],
    direct: [
      "Be sharp, efficient, and clear.",
      "Avoid fluff and filler.",
      "Prioritize strong conclusions.",
    ],
  };

  return {
    toneLabel: tone,
    rules: base[value] || ["Maintain consistent tone."],
  };
}

/* ===============================
   INTENSITY ENGINE
=============================== */
function getIntensityRules(level = "medium") {
  const map = {
    low: [
      "Slow pacing, more reflection.",
      "Less conflict, more setup.",
    ],
    medium: [
      "Balanced pacing with moderate tension.",
      "Blend action and reflection.",
    ],
    high: [
      "Fast pacing, strong tension.",
      "Frequent conflict and escalation.",
    ],
    explosive: [
      "Relentless pacing.",
      "Constant tension, conflict, and high stakes.",
      "Minimal downtime.",
    ],
  };

  return map[level] || map.medium;
}

/* ===============================
   STORY BIBLE
=============================== */
function buildStoryBiblePrompt({
  topic,
  genre,
  tone,
  audience,
  chapterCount,
}) {
  return [
    {
      role: "system",
      content:
        "You are Aigenikz Story Bible Architect. Return JSON only.",
    },
    {
      role: "user",
      content:
        `Topic: ${topic}\nGenre: ${genre}\nTone: ${tone}\nAudience: ${audience}\nChapters: ${chapterCount}`,
    },
  ];
}

/* ===============================
   CHAPTER PROMPT ENGINE
=============================== */
function buildChapterDraftPrompt({
  project,
  chapterNumber,
  chapterTitle,
  chapterPurpose,
  previousChapters,
}) {
  const toneRules = getToneStyleRules(project.tone);
  const intensityRules = getIntensityRules(project.intensity);

  const previousContext = previousChapters.length
    ? previousChapters
        .map(
          (ch) =>
            `Chapter ${ch.chapterNumber}: ${ch.title}\nSummary: ${ch.summary || ""}`
        )
        .join("\n\n")
    : "No previous chapters yet.";

  return [
    {
      role: "system",
      content:
        "You are Aigenikz Chapter Engine.\n" +
        `Tone: ${toneRules.toneLabel}\n` +
        `Tone Rules: ${toneRules.rules.join(" ")}\n` +
        `Intensity Rules: ${intensityRules.join(" ")}\n\n` +
        "Avoid generic openings and endings.\n" +
        "Start inside action.\n" +
        "End with impact.\n" +
        "Maintain continuity.\n",
    },
    {
      role: "user",
      content:
        `Project Title: ${project.title}\n` +
        `Topic: ${project.topic}\n` +
        `Genre: ${project.genre}\n` +
        `Audience: ${project.audience}\n` +
        `Chapter ${chapterNumber}: ${chapterTitle}\n` +
        `Purpose: ${chapterPurpose}\n\n` +
        `Previous Chapter Context:\n${previousContext}\n\n` +
        "Write the full chapter, then add:\nChapter Summary: <summary>",
    },
  ];
}

/* ===============================
   POLISH ENGINE
=============================== */
async function polishChapterDraft({
  project,
  chapterNumber,
  chapterTitle,
  rawChapter,
}) {
  const toneRules = getToneStyleRules(project.tone);

  return callOpenAIChat(
    [
      {
        role: "system",
        content:
          "You are Aigenikz Polish Engine.\n" +
          "Rewrite weak openings and endings.\n" +
          "Tighten pacing, improve impact, remove generic phrasing.\n" +
          `Tone: ${toneRules.toneLabel}\n` +
          `Rules: ${toneRules.rules.join(" ")}`,
      },
      {
        role: "user",
        content:
          `Polish Chapter ${chapterNumber}: ${chapterTitle}\n\n${rawChapter}`,
      },
    ],
    0.4
  );
}

/* ===============================
   HELPERS
=============================== */
function createProjectId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeProjectPayload(body = {}) {
  return {
    topic: String(body.topic || "").trim(),
    genre: String(body.genre || "Fiction").trim(),
    tone: String(body.tone || "Bold").trim(),
    audience: String(body.audience || "General readers").trim(),
    chapterCount: Number(body.chapterCount || 10),
    includeResearch: Boolean(body.includeResearch),
    intensity: String(body.intensity || "medium").trim().toLowerCase(),
  };
}

function sanitizeIntensity(value = "") {
  const allowed = ["low", "medium", "high", "explosive"];
  const clean = String(value || "").trim().toLowerCase();
  return allowed.includes(clean) ? clean : "medium";
}

function makeFallbackStoryBible({
  topic,
  genre,
  tone,
  audience,
  chapterCount,
  intensity,
}) {
  const toneRules = getToneStyleRules(tone);
  const intensityRules = getIntensityRules(intensity);

  return {
    title: topic,
    premise: topic,
    tone,
    audience,
    genre,
    intensity,
    worldRules: [],
    mainCharacters: [],
    supportingCharacters: [],
    locations: [],
    themes: [],
    centralConflicts: [],
    chapterPlan: Array.from({ length: chapterCount }, (_, i) => ({
      chapterNumber: i + 1,
      chapterTitle: `Chapter ${i + 1}`,
      purpose: `Advance the story in chapter ${i + 1}.`,
      mainConflict: "",
      keyBeat: "",
    })),
    continuityRules: [
      "Maintain continuity with previous chapters.",
      "Do not repeat major reveals unless necessary.",
    ],
    unresolvedThreads: [],
    styleRules: toneRules.rules,
    intensityRules,
  };
}

function makeFallbackOutline({
  topic,
  genre,
  tone,
  audience,
  chapterCount,
  intensity,
}) {
  return [
    `Title: ${topic}`,
    `Genre: ${genre}`,
    `Tone: ${tone}`,
    `Audience: ${audience}`,
    `Intensity: ${intensity}`,
    "",
    "Table of Contents:",
    ...Array.from(
      { length: chapterCount },
      (_, i) => `${i + 1}. Chapter ${i + 1}`
    ),
  ].join("\n");
}

/* ===============================
   PERSISTENCE HELPERS
=============================== */
async function persistProjectCreation(project) {
  try {
    await createPersistentProject({
      id: project.id,
      type: "book",
      title: project.title,
      summary: `Book project for ${project.topic}`,
      topic: project.topic,
      tone: project.tone,
      audience: project.audience,
      intensity: project.intensity,
      metadata: {
        source: "book-writer-os",
      },
      book: {
        genre: project.genre,
        chapterCount: project.chapterCount,
        includeResearch: project.includeResearch,
        outline: project.outline,
        storyBible: project.storyBible,
      },
    });
  } catch (error) {
    console.error("🔥 PERSIST PROJECT CREATION ERROR:", error);
  }
}

async function persistProjectUpdate(project, summary = "Book project updated.") {
  try {
    await updatePersistentProject(project.id, {
      title: project.title,
      summary,
      topic: project.topic,
      tone: project.tone,
      audience: project.audience,
      intensity: project.intensity,
      metadata: {
        source: "book-writer-os",
      },
    });
  } catch (error) {
    console.error("🔥 PERSIST PROJECT UPDATE ERROR:", error);
  }
}

async function persistBookChapterAndWorkflow(project, chapterRecord) {
  try {
    await saveBookChapter({
      projectId: project.id,
      chapterNumber: chapterRecord.chapterNumber,
      title: chapterRecord.title,
      purpose: chapterRecord.purpose,
      tone: chapterRecord.tone,
      intensity: chapterRecord.intensity,
      content: chapterRecord.content,
      summary: chapterRecord.summary,
    });
  } catch (error) {
    console.error("🔥 SAVE BOOK CHAPTER ERROR:", error);
  }

  try {
    await updatePersistentProject(project.id, {
      title: project.title,
      summary: `Book project updated through chapter ${chapterRecord.chapterNumber}`,
      topic: project.topic,
      tone: project.tone,
      audience: project.audience,
      intensity: project.intensity,
      metadata: {
        source: "book-writer-os",
        lastDraftedChapter: chapterRecord.chapterNumber,
      },
    });
  } catch (error) {
    console.error("🔥 UPDATE PERSISTENT PROJECT AFTER CHAPTER ERROR:", error);
  }

  try {
    await saveWorkflowRun({
      projectId: project.id,
      workflowKey: "book_chapter_draft",
      primaryAgent: "book",
      inputText: `${chapterRecord.title} | ${chapterRecord.purpose}`,
      resultText:
        chapterRecord.summary ||
        String(chapterRecord.content || "").slice(0, 1200),
      structuredOutput: {
        chapterNumber: chapterRecord.chapterNumber,
        tone: chapterRecord.tone,
        intensity: chapterRecord.intensity,
      },
      sources: [],
    });
  } catch (error) {
    console.error("🔥 SAVE BOOK CHAPTER WORKFLOW ERROR:", error);
  }
}

/* ===============================
   INTERNAL PROJECT CREATION
=============================== */
async function createBookProjectInternal(body = {}) {
  const {
    topic,
    genre,
    tone,
    audience,
    chapterCount,
    includeResearch,
    intensity,
  } = normalizeProjectPayload(body);

  const finalIntensity = sanitizeIntensity(intensity);

  if (!topic) {
    throw new Error("Book topic is required.");
  }

  let storyBible;
  let outline;

  try {
    const storyBibleRaw = await callOpenAIChat(
      buildStoryBiblePrompt({
        topic,
        genre,
        tone,
        audience,
        chapterCount,
      }),
      0.5
    );

    const parsedBible = extractJsonObject(storyBibleRaw);

    storyBible =
      parsedBible ||
      makeFallbackStoryBible({
        topic,
        genre,
        tone,
        audience,
        chapterCount,
        intensity: finalIntensity,
      });

    storyBible.tone = tone;
    storyBible.genre = genre;
    storyBible.audience = audience;
    storyBible.intensity = finalIntensity;
    storyBible.styleRules = getToneStyleRules(tone).rules;
    storyBible.intensityRules = getIntensityRules(finalIntensity);

    outline = makeFallbackOutline({
      topic,
      genre,
      tone,
      audience,
      chapterCount,
      intensity: finalIntensity,
    });
  } catch (error) {
    console.error("🔥 STORY BIBLE GENERATION ERROR:", error);

    storyBible = makeFallbackStoryBible({
      topic,
      genre,
      tone,
      audience,
      chapterCount,
      intensity: finalIntensity,
    });

    outline = makeFallbackOutline({
      topic,
      genre,
      tone,
      audience,
      chapterCount,
      intensity: finalIntensity,
    });
  }

  const projectId = createProjectId();

  const project = {
    id: projectId,
    topic,
    title: storyBible.title || topic,
    genre,
    tone,
    audience,
    chapterCount,
    includeResearch,
    intensity: finalIntensity,
    outline,
    storyBible,
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  bookProjectStore.set(projectId, project);
  await persistProjectCreation(project);

  return project;
}

/* ===============================
   PLATFORM ROUTES
=============================== */
app.use("/api/platform", platformRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/finance", financeRoutes); // ✅ ADD THIS

/* ===============================
   PROJECT CREATION
=============================== */
app.post("/api/book-project/create", async (req, res) => {
  try {
    const project = await createBookProjectInternal(req.body);

    return res.json({
      ok: true,
      project,
    });
  } catch (error) {
    console.error("🔥 CREATE BOOK PROJECT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to create book project.",
    });
  }
});

/* ===============================
   LIST PROJECTS
=============================== */
app.get("/api/book-projects", async (req, res) => {
  try {
    const projects = Array.from(bookProjectStore.values()).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return res.json({
      ok: true,
      projects,
    });
  } catch (error) {
    console.error("🔥 GET BOOK PROJECTS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch book projects.",
    });
  }
});

/* ===============================
   GET SINGLE PROJECT
=============================== */
app.get("/api/book-project/:id", async (req, res) => {
  try {
    const project = bookProjectStore.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        ok: false,
        error: "Book project not found.",
      });
    }

    return res.json({
      ok: true,
      project,
    });
  } catch (error) {
    console.error("🔥 GET BOOK PROJECT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch book project.",
    });
  }
});

/* ===============================
   UPDATE PROJECT
=============================== */
app.patch("/api/book-project/:id", async (req, res) => {
  try {
    const project = bookProjectStore.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        ok: false,
        error: "Book project not found.",
      });
    }

    const updates = req.body || {};

    const nextTone = String(updates.tone || project.tone).trim();
    const nextIntensity = sanitizeIntensity(
      updates.intensity || project.intensity
    );

    const updatedProject = {
      ...project,
      title: String(updates.title || project.title).trim(),
      topic: String(updates.topic || project.topic).trim(),
      genre: String(updates.genre || project.genre).trim(),
      tone: nextTone,
      audience: String(updates.audience || project.audience).trim(),
      chapterCount: Number(updates.chapterCount || project.chapterCount),
      includeResearch:
        typeof updates.includeResearch === "boolean"
          ? updates.includeResearch
          : project.includeResearch,
      intensity: nextIntensity,
      updatedAt: new Date().toISOString(),
    };

    updatedProject.storyBible = {
      ...(project.storyBible || {}),
      title: updatedProject.title,
      premise: updatedProject.topic,
      genre: updatedProject.genre,
      tone: updatedProject.tone,
      audience: updatedProject.audience,
      intensity: updatedProject.intensity,
      styleRules: getToneStyleRules(updatedProject.tone).rules,
      intensityRules: getIntensityRules(updatedProject.intensity),
    };

    bookProjectStore.set(project.id, updatedProject);

    await persistProjectUpdate(
      updatedProject,
      `Book project "${updatedProject.title}" was updated.`
    );

    return res.json({
      ok: true,
      project: updatedProject,
    });
  } catch (error) {
    console.error("🔥 UPDATE BOOK PROJECT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to update book project.",
    });
  }
});

/* ===============================
   DELETE PROJECT
=============================== */
app.delete("/api/book-project/:id", async (req, res) => {
  try {
    const exists = bookProjectStore.has(req.params.id);

    if (!exists) {
      return res.status(404).json({
        ok: false,
        error: "Book project not found.",
      });
    }

    bookProjectStore.delete(req.params.id);

    return res.json({
      ok: true,
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error("🔥 DELETE BOOK PROJECT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to delete book project.",
    });
  }
});

/* ===============================
   DRAFT CHAPTER
=============================== */
app.post("/api/book-project/:id/chapter-draft", async (req, res) => {
  try {
    const project = bookProjectStore.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        ok: false,
        error: "Book project not found.",
      });
    }

    const {
      chapterNumber,
      chapterTitle = "",
      chapterPurpose = "",
      intensity,
    } = req.body || {};

    if (!chapterNumber || Number.isNaN(Number(chapterNumber))) {
      return res.status(400).json({
        ok: false,
        error: "Valid chapterNumber is required.",
      });
    }

    const numericChapter = Number(chapterNumber);
    const chapterIntensity = sanitizeIntensity(intensity || project.intensity);

    const previousChapters = project.chapters
      .filter((ch) => Number(ch.chapterNumber) < numericChapter)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    let resolvedTitle = chapterTitle;
    let resolvedPurpose = chapterPurpose;

    if (project.storyBible?.chapterPlan?.length) {
      const planMatch = project.storyBible.chapterPlan.find(
        (p) => Number(p.chapterNumber) === numericChapter
      );

      if (planMatch) {
        resolvedTitle =
          resolvedTitle || planMatch.chapterTitle || planMatch.title || "";
        resolvedPurpose =
          resolvedPurpose ||
          planMatch.purpose ||
          planMatch.mainConflict ||
          planMatch.keyBeat ||
          "";
      }
    }

    const draftProject = {
      ...project,
      intensity: chapterIntensity,
      storyBible: {
        ...(project.storyBible || {}),
        intensity: chapterIntensity,
        intensityRules: getIntensityRules(chapterIntensity),
      },
    };

    const prompt = buildChapterDraftPrompt({
      project: draftProject,
      chapterNumber: numericChapter,
      chapterTitle: resolvedTitle,
      chapterPurpose: resolvedPurpose,
      previousChapters,
    });

    const rawDraft = await callOpenAIChat(prompt, 0.72);

    const polishedDraft = await polishChapterDraft({
      project: draftProject,
      chapterNumber: numericChapter,
      chapterTitle: resolvedTitle,
      rawChapter: rawDraft,
    });

    const summary = extractChapterSummary(polishedDraft);
    const content = stripChapterSummary(polishedDraft);

    const existingIndex = project.chapters.findIndex(
      (ch) => Number(ch.chapterNumber) === numericChapter
    );

    const chapterRecord = {
      chapterNumber: numericChapter,
      title: resolvedTitle || `Chapter ${numericChapter}`,
      purpose: resolvedPurpose,
      tone: project?.tone || project?.storyBible?.tone || "",
      intensity: chapterIntensity,
      content,
      summary,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      project.chapters[existingIndex] = chapterRecord;
    } else {
      project.chapters.push(chapterRecord);
      project.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    project.updatedAt = new Date().toISOString();
    project.intensity = chapterIntensity;

    if (project.storyBible) {
      project.storyBible.intensity = chapterIntensity;
      project.storyBible.intensityRules = getIntensityRules(chapterIntensity);
    }

    bookProjectStore.set(project.id, project);

    await persistBookChapterAndWorkflow(project, chapterRecord);

    return res.json({
      ok: true,
      chapter: chapterRecord,
      project,
    });
  } catch (error) {
    console.error("🔥 CHAPTER DRAFT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ===============================
   AGENT WORKFLOW: RESEARCH SUMMARY
=============================== */
app.post("/api/agent-workflow/research-summary", async (req, res) => {
  try {
    const input = String(req.body?.input || "").trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: "Input is required.",
      });
    }

    const search = await runLightResearchSearch(input);

    const sourcesText = (search.results || []).length
      ? (search.results || [])
          .map(
            (source, index) =>
              `${index + 1}. ${source.title || "Untitled"}\n` +
              `Source: ${source.sourceName || "Unknown"}\n` +
              `Snippet: ${source.snippet || "No snippet"}\n` +
              `URL: ${source.url || "N/A"}`
          )
          .join("\n\n")
      : "No external sources were returned by the current search provider.";

    const reply = await callOpenAIChat(
      [
        {
          role: "system",
          content:
            "You are Aigenikz Research Engine. Build a sharp research summary with key findings, opportunity zones, warnings, and next-step recommendations.",
        },
        {
          role: "user",
          content:
            `Research Topic: ${input}\n\n` +
            `Available Source Data:\n${sourcesText}`,
        },
      ],
      0.55
    );

    await Promise.all(
      (search.results || []).map((source) =>
        saveResearchSource({
          category: "research",
          topic: input,
          title: source.title || "",
          url: source.url || "",
          sourceName: source.sourceName || "",
          snippet: source.snippet || "",
          notes: "Saved from research-summary workflow",
        }).catch((error) => {
          console.error("🔥 SAVE RESEARCH SOURCE ERROR:", error);
        })
      )
    );

    try {
      await saveWorkflowRun({
        workflowKey: "research_summary",
        primaryAgent: "research",
        inputText: input,
        resultText: reply,
        structuredOutput: {
          workflow: "research_summary",
        },
        sources: search.results || [],
      });
    } catch (error) {
      console.error("🔥 SAVE RESEARCH SUMMARY WORKFLOW ERROR:", error);
    }

    return res.json({
      ok: true,
      reply,
      sources: search.results || [],
    });
  } catch (error) {
    console.error("🔥 RESEARCH SUMMARY ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to run research summary.",
    });
  }
});

/* ===============================
   AGENT WORKFLOW: BUSINESS STRATEGY SCAN
=============================== */
app.post("/api/agent-workflow/business-strategy-scan", async (req, res) => {
  try {
    const input = String(req.body?.input || "").trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: "Input is required.",
      });
    }

    const search = await runLightResearchSearch(input);

    const reply = await callOpenAIChat(
      [
        {
          role: "system",
          content:
            "You are Aigenikz Strategy Engine. Produce a business strategy scan with market angle, monetization routes, differentiation, risk review, and recommended launch steps.",
        },
        {
          role: "user",
          content:
            `Business Concept: ${input}\n\n` +
            `Supporting Search Results:\n${safeStringify(search.results, "[]")}`,
        },
      ],
      0.6
    );

    try {
      await saveWorkflowRun({
        workflowKey: "business_strategy_scan",
        primaryAgent: "strategy",
        inputText: input,
        resultText: reply,
        structuredOutput: {
          workflow: "business_strategy_scan",
        },
        sources: search.results || [],
      });
    } catch (error) {
      console.error("🔥 SAVE BUSINESS STRATEGY WORKFLOW ERROR:", error);
    }

    return res.json({
      ok: true,
      reply,
      sources: search.results || [],
    });
  } catch (error) {
    console.error("🔥 BUSINESS STRATEGY SCAN ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to run business strategy scan.",
    });
  }
});

/* ===============================
   SAAS BUILDER
=============================== */
app.post("/api/saas-builder/blueprint", async (req, res) => {
  try {
    const input = String(req.body?.input || "").trim();
    const audience = String(req.body?.audience || "General audience").trim();
    const tone = String(req.body?.tone || "Bold").trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: "Input is required.",
      });
    }

    const search = await runLightResearchSearch(input);

    const reply = await callOpenAIChat(
      [
        {
          role: "system",
          content:
            "You are Aigenikz SaaS Builder. Generate a SaaS blueprint with problem, ICP, feature stack, pricing, GTM, retention strategy, and MVP roadmap.",
        },
        {
          role: "user",
          content:
            `SaaS Idea: ${input}\nAudience: ${audience}\nTone: ${tone}\n\n` +
            `Supporting Search Results:\n${safeStringify(search.results, "[]")}`,
        },
      ],
      0.65
    );

    let saasProject = null;

    try {
      saasProject = await createPersistentProject({
        type: "saas-blueprint",
        title: input,
        summary: "AI SaaS blueprint generated by Aigenikz",
        topic: input,
        tone,
        audience,
        intensity: "high",
        metadata: {
          source: "saas-builder",
        },
      });
    } catch (error) {
      console.error("🔥 CREATE SAAS PERSISTENT PROJECT ERROR:", error);
    }

    try {
      await saveWorkflowRun({
        projectId: saasProject?.id,
        workflowKey: "saas_builder",
        primaryAgent: "saas",
        inputText: input,
        resultText: reply,
        structuredOutput: {
          workflow: "saas_builder",
          audience,
          tone,
        },
        sources: search.results || [],
      });
    } catch (error) {
      console.error("🔥 SAVE SAAS BUILDER WORKFLOW ERROR:", error);
    }

    return res.json({
      ok: true,
      reply,
      projectId: saasProject?.id || null,
      sources: search.results || [],
    });
  } catch (error) {
    console.error("🔥 SAAS BUILDER ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate SaaS blueprint.",
    });
  }
});

/* ===============================
   CONTENT GENERATOR
=============================== */
app.post("/api/content/generate", async (req, res) => {
  try {
    const type = String(req.body?.type || "campaign-plan").trim();
    const topic = String(req.body?.topic || "").trim();
    const audience = String(req.body?.audience || "General audience").trim();
    const goal = String(req.body?.goal || "engagement").trim();
    const tone = String(req.body?.tone || "Bold").trim();
    const platform = String(req.body?.platform || "TikTok").trim();

    if (!topic) {
      return res.status(400).json({
        ok: false,
        error: "Topic is required.",
      });
    }

    const result = await callOpenAIChat(
      [
        {
          role: "system",
          content:
            "You are Aigenikz Content Engine. Build high-conversion content systems, platform plans, messaging angles, hooks, content pillars, and call-to-action structures.",
        },
        {
          role: "user",
          content:
            `Type: ${type}\n` +
            `Topic: ${topic}\n` +
            `Audience: ${audience}\n` +
            `Goal: ${goal}\n` +
            `Tone: ${tone}\n` +
            `Platform: ${platform}`,
        },
      ],
      0.7
    );

    try {
      await saveWorkflowRun({
        workflowKey: "content_generate",
        primaryAgent: "content",
        inputText: topic,
        resultText: result,
        structuredOutput: {
          workflow: "content_generate",
          type,
          audience,
          goal,
          tone,
          platform,
        },
        sources: [],
      });
    } catch (error) {
      console.error("🔥 SAVE CONTENT GENERATE WORKFLOW ERROR:", error);
    }

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("🔥 CONTENT GENERATE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate content.",
    });
  }
});

/* ===============================
   FULL BOOK PACKAGE
=============================== */
app.post("/api/content/book-full", async (req, res) => {
  try {
    const payload = normalizeProjectPayload(req.body);

    if (!payload.topic) {
      return res.status(400).json({
        ok: false,
        error: "Topic is required.",
      });
    }

    const project = await createBookProjectInternal(payload);

    const result = await callOpenAIChat(
      [
        {
          role: "system",
          content:
            "You are Aigenikz Book Package Engine. Produce a full launch-ready book package with title logic, positioning, story/premise breakdown, audience angle, chapter arc overview, marketing angle, and next execution steps.",
        },
        {
          role: "user",
          content:
            `Topic: ${project.topic}\n` +
            `Genre: ${project.genre}\n` +
            `Tone: ${project.tone}\n` +
            `Audience: ${project.audience}\n` +
            `Chapter Count: ${project.chapterCount}\n` +
            `Intensity: ${project.intensity}\n\n` +
            `Outline:\n${project.outline}\n\n` +
            `Story Bible:\n${safeStringify(project.storyBible, "{}")}`,
        },
      ],
      0.68
    );

    try {
      await saveWorkflowRun({
        projectId: project.id,
        workflowKey: "book_full",
        primaryAgent: "book",
        inputText: project.topic,
        resultText: result,
        structuredOutput: {
          workflow: "book_full",
          genre: project.genre,
          tone: project.tone,
          audience: project.audience,
          chapterCount: project.chapterCount,
          intensity: project.intensity,
        },
        sources: [],
      });
    } catch (error) {
      console.error("🔥 SAVE BOOK FULL WORKFLOW ERROR:", error);
    }

    return res.json({
      ok: true,
      project,
      result,
    });
  } catch (error) {
    console.error("🔥 BOOK FULL ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate full book package.",
    });
  }
});

/* ===============================
   HEALTH CHECK
=============================== */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Aigenikz Book Writer OS",
    projects: bookProjectStore.size,
    timestamp: new Date().toISOString(),
  });
});

/* ===============================
   WEB APPLICATION
=============================== */
const buildDir = path.resolve("build");
const indexFile = path.join(buildDir, "index.html");

app.use(express.static(buildDir));

app.get("/", (req, res) => {
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.send("Aigenikz backend is live.");
});

/* ===============================
   OPTIONAL: CLEAR ALL PROJECTS (DEV TOOL)
=============================== */
app.delete("/api/book-projects/clear", (req, res, next) => {
  if (process.env.NODE_ENV === "production") return next();
  try {
    bookProjectStore.clear();

    return res.json({
      ok: true,
      message: "All projects cleared.",
    });
  } catch (error) {
    console.error("🔥 CLEAR PROJECTS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ===============================
   OPTIONAL: DEBUG VIEW (DEV TOOL)
=============================== */
app.get("/api/debug/store", (req, res, next) => {
  if (process.env.NODE_ENV === "production") return next();
  try {
    return res.json({
      ok: true,
      size: bookProjectStore.size,
      data: Array.from(bookProjectStore.entries()),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ===============================
   CLIENT-SIDE ROUTING
=============================== */
app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
  if (!fs.existsSync(indexFile)) return next();
  return res.sendFile(indexFile);
});
/* ===============================
   404 HANDLER
=============================== */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
  });
});

/* ===============================
   GLOBAL ERROR HANDLER
=============================== */
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);

  res.status(500).json({
    ok: false,
    error: "Internal server error",
    details: err.message,
  });
});

/* ===============================
   BOOTSTRAP + START SERVER
=============================== */
async function bootstrap() {
  try {
    await initPlatformCoreTables();

    app.listen(PORT, () => {
      console.log("======================================");
      console.log("🚀 Aigenikz FULL SYSTEM ONLINE");
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`📚 Projects Loaded: ${bookProjectStore.size}`);
      console.log("🔥 Tone Engine: ACTIVE");
      console.log("⚡ Intensity Engine: ACTIVE");
      console.log("🧠 Chapter Continuity: ACTIVE");
      console.log("✍️ Book Writer Engine: ACTIVE");
      console.log("🗄️ Platform Core DB: ACTIVE");
      console.log("🧭 Platform Routes: ACTIVE");
      console.log("======================================");
    });
  } catch (error) {
    console.error("🔥 BOOTSTRAP ERROR:", error);
    process.exit(1);
  }
}

bootstrap();

