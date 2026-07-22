import { getPlatformDb } from "../server/db/platformDb.js";

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function createProjectId(prefix = "proj") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPersistentProject(payload = {}) {
  const db = await getPlatformDb();

  const id = String(payload.id || createProjectId("proj")).trim();
  const type = String(payload.type || "generic").trim();
  const title = String(payload.title || "Untitled Project").trim();
  const summary = String(payload.summary || "").trim();
  const topic = String(payload.topic || "").trim();
  const tone = String(payload.tone || "").trim();
  const audience = String(payload.audience || "").trim();
  const intensity = String(payload.intensity || "medium").trim();
  const metadata = payload.metadata || {};
  const userId = String(payload.userId || "system");
  const book = payload.book || {};
  const createdAt = nowIso();
  const updatedAt = createdAt;

  await db.run(
    `
      INSERT INTO platform_projects (
        id,
        type,
        title,
        summary,
        topic,
        tone,
        audience,
        intensity,
        metadata_json,
        book_json,
        created_at,
        updated_at,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      type,
      title,
      summary,
      topic,
      tone,
      audience,
      intensity,
      safeJson(metadata, {}),
      safeJson(book, {}),
      createdAt,
      updatedAt,
      userId,
    ]
  );

  return {
    id,
    type,
    title,
    summary,
    topic,
    tone,
    audience,
    intensity,
    metadata,
    book,
    createdAt,
    updatedAt,
  };
}

export async function updatePersistentProject(projectId, updates = {}) {
  const db = await getPlatformDb();

  const existing = await db.get(
    `SELECT * FROM platform_projects WHERE id = ?`,
    [projectId]
  );

  if (!existing) {
    throw new Error(`Persistent project not found: ${projectId}`);
  }

  const nextRecord = {
    id: existing.id,
    type: String(updates.type || existing.type || "generic").trim(),
    title: String(updates.title || existing.title || "Untitled Project").trim(),
    summary: String(updates.summary || existing.summary || "").trim(),
    topic: String(updates.topic || existing.topic || "").trim(),
    tone: String(updates.tone || existing.tone || "").trim(),
    audience: String(updates.audience || existing.audience || "").trim(),
    intensity: String(updates.intensity || existing.intensity || "medium").trim(),
    metadata:
      typeof updates.metadata !== "undefined"
        ? updates.metadata || {}
        : JSON.parse(existing.metadata_json || "{}"),
    book:
      typeof updates.book !== "undefined"
        ? updates.book || {}
        : JSON.parse(existing.book_json || "{}"),
    updatedAt: nowIso(),
  };

  await db.run(
    `
      UPDATE platform_projects
      SET
        type = ?,
        title = ?,
        summary = ?,
        topic = ?,
        tone = ?,
        audience = ?,
        intensity = ?,
        metadata_json = ?,
        book_json = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      nextRecord.type,
      nextRecord.title,
      nextRecord.summary,
      nextRecord.topic,
      nextRecord.tone,
      nextRecord.audience,
      nextRecord.intensity,
      safeJson(nextRecord.metadata, {}),
      safeJson(nextRecord.book, {}),
      nextRecord.updatedAt,
      projectId,
    ]
  );

  return {
    id: projectId,
    ...nextRecord,
  };
}

export async function saveBookChapter(payload = {}) {
  const db = await getPlatformDb();

  const projectId = String(payload.projectId || "").trim();

  if (!projectId) {
    throw new Error("saveBookChapter requires projectId.");
  }

  const chapterNumber = Number(payload.chapterNumber);

  if (!chapterNumber || Number.isNaN(chapterNumber)) {
    throw new Error("saveBookChapter requires a valid chapterNumber.");
  }

  const title = String(payload.title || `Chapter ${chapterNumber}`).trim();
  const purpose = String(payload.purpose || "").trim();
  const tone = String(payload.tone || "").trim();
  const intensity = String(payload.intensity || "medium").trim();
  const content = String(payload.content || "");
  const summary = String(payload.summary || "");
  const timestamp = nowIso();

  await db.run(
    `
      INSERT INTO book_chapters (
        project_id,
        chapter_number,
        title,
        purpose,
        tone,
        intensity,
        content,
        summary,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, chapter_number)
      DO UPDATE SET
        title = excluded.title,
        purpose = excluded.purpose,
        tone = excluded.tone,
        intensity = excluded.intensity,
        content = excluded.content,
        summary = excluded.summary,
        updated_at = excluded.updated_at
    `,
    [
      projectId,
      chapterNumber,
      title,
      purpose,
      tone,
      intensity,
      content,
      summary,
      timestamp,
      timestamp,
    ]
  );

  return {
    ok: true,
    projectId,
    chapterNumber,
    title,
    purpose,
    tone,
    intensity,
    summary,
    updatedAt: timestamp,
  };
}

export async function saveWorkflowRun(payload = {}) {
  const db = await getPlatformDb();

  const projectId =
    typeof payload.projectId === "undefined" || payload.projectId === null
      ? null
      : String(payload.projectId).trim();

  const workflowKey = String(payload.workflowKey || "").trim();
  const primaryAgent = String(payload.primaryAgent || "").trim();
  const inputText = String(payload.inputText || "");
  const resultText = String(payload.resultText || "");
  const structuredOutput = payload.structuredOutput || {};
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const createdAt = nowIso();
  const userId = String(payload.userId || "system");

  if (!workflowKey) {
    throw new Error("saveWorkflowRun requires workflowKey.");
  }

  if (!primaryAgent) {
    throw new Error("saveWorkflowRun requires primaryAgent.");
  }

  const result = await db.run(
    `
      INSERT INTO workflow_runs (
        project_id,
        workflow_key,
        primary_agent,
        input_text,
        result_text,
        structured_output_json,
        sources_json,
        created_at,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      projectId,
      workflowKey,
      primaryAgent,
      inputText,
      resultText,
      safeJson(structuredOutput, {}),
      safeJson(sources, []),
      createdAt,
      userId,
    ]
  );

  return {
    id: result.lastID,
    projectId,
    workflowKey,
    primaryAgent,
    createdAt,
  };
}

export async function saveResearchSource(payload = {}) {
  const db = await getPlatformDb();

  const category = String(payload.category || "research").trim();
  const topic = String(payload.topic || "").trim();
  const title = String(payload.title || "").trim();
  const url = String(payload.url || "").trim();
  const sourceName = String(payload.sourceName || "").trim();
  const snippet = String(payload.snippet || "");
  const notes = String(payload.notes || "");
  const createdAt = nowIso();
  const userId = String(payload.userId || "system");

  const result = await db.run(
    `
      INSERT INTO research_sources (
        category,
        topic,
        title,
        url,
        source_name,
        snippet,
        notes,
        created_at,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [category, topic, title, url, sourceName, snippet, notes, createdAt, userId]
  );

  return {
    id: result.lastID,
    category,
    topic,
    title,
    url,
    sourceName,
    createdAt,
  };
}

export async function getPersistentProjects(limit = 25, userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(
    `
      SELECT *
      FROM platform_projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [userId, Number(limit) || 25]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    topic: row.topic,
    tone: row.tone,
    audience: row.audience,
    intensity: row.intensity,
    metadata: JSON.parse(row.metadata_json || "{}"),
    book: JSON.parse(row.book_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPersistentProjectById(projectId, userId = "system") {
  const db = await getPlatformDb();

  const row = await db.get(
    `
      SELECT *
      FROM platform_projects
      WHERE id = ? AND user_id = ?
    `,
    [projectId, userId]
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    topic: row.topic,
    tone: row.tone,
    audience: row.audience,
    intensity: row.intensity,
    metadata: JSON.parse(row.metadata_json || "{}"),
    book: JSON.parse(row.book_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProjectWorkflowRuns(projectId, limit = 20, userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(
    `
      SELECT *
      FROM workflow_runs
      WHERE project_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [projectId, userId, Number(limit) || 20]
  );

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workflowKey: row.workflow_key,
    primaryAgent: row.primary_agent,
    inputText: row.input_text,
    resultText: row.result_text,
    structuredOutput: JSON.parse(row.structured_output_json || "{}"),
    sources: JSON.parse(row.sources_json || "[]"),
    createdAt: row.created_at,
  }));
}

export async function getProjectChapters(projectId, userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(
    `
      SELECT *
      FROM book_chapters
      WHERE project_id = ? AND EXISTS (SELECT 1 FROM platform_projects p WHERE p.id=book_chapters.project_id AND p.user_id=?)
      ORDER BY chapter_number ASC
    `,
    [projectId, userId]
  );

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    chapterNumber: row.chapter_number,
    title: row.title,
    purpose: row.purpose,
    tone: row.tone,
    intensity: row.intensity,
    content: row.content,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getRecentWorkflowRuns(limit = 25, userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(
    `
      SELECT *
      FROM workflow_runs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [userId, Number(limit) || 25]
  );

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workflowKey: row.workflow_key,
    primaryAgent: row.primary_agent,
    inputText: row.input_text,
    resultText: row.result_text,
    structuredOutput: JSON.parse(row.structured_output_json || "{}"),
    sources: JSON.parse(row.sources_json || "[]"),
    createdAt: row.created_at,
  }));
}

export async function getRecentResearchSources(limit = 25, userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(
    `
      SELECT *
      FROM research_sources
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [userId, Number(limit) || 25]
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    topic: row.topic,
    title: row.title,
    url: row.url,
    sourceName: row.source_name,
    snippet: row.snippet,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function deletePersistentProject(projectId, userId = "system") {
  const db=await getPlatformDb();
  const result=await db.run("DELETE FROM platform_projects WHERE id=? AND user_id=?",[projectId,userId]);
  return Boolean(result.changes);
}
