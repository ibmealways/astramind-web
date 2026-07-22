import { getPlatformDb } from "../server/db/platformDb.js";

export async function getPlatformSummary(userId = "system") {
  const db = await getPlatformDb();

  const [
    totalProjectsRow,
    totalWorkflowRunsRow,
    totalResearchSourcesRow,
    totalBookChaptersRow,
    latestWorkflowRow,
    latestProjectRow,
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) AS count FROM platform_projects WHERE user_id=?`,userId),
    db.get(`SELECT COUNT(*) AS count FROM workflow_runs WHERE user_id=?`,userId),
    db.get(`SELECT COUNT(*) AS count FROM research_sources WHERE user_id=?`,userId),
    db.get(`SELECT COUNT(*) AS count FROM book_chapters c WHERE EXISTS (SELECT 1 FROM platform_projects p WHERE p.id=c.project_id AND p.user_id=?)`,userId),
    db.get(`
      SELECT created_at
      FROM workflow_runs
      WHERE user_id=?
      ORDER BY created_at DESC
      LIMIT 1
    `,userId),
    db.get(`
      SELECT updated_at
      FROM platform_projects
      WHERE user_id=?
      ORDER BY updated_at DESC
      LIMIT 1
    `,userId),
  ]);

  return {
    totalProjects: totalProjectsRow?.count || 0,
    totalWorkflowRuns: totalWorkflowRunsRow?.count || 0,
    totalResearchSources: totalResearchSourcesRow?.count || 0,
    totalBookChapters: totalBookChaptersRow?.count || 0,
    latestWorkflowAt: latestWorkflowRow?.created_at || null,
    latestProjectUpdatedAt: latestProjectRow?.updated_at || null,
  };
}

export async function getWorkflowCountsByAgent(userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(`
    SELECT
      primary_agent AS agent,
      COUNT(*) AS count
    FROM workflow_runs
    WHERE user_id=?
    GROUP BY primary_agent
    ORDER BY count DESC, agent ASC
  `,userId);

  return rows.map((row) => ({
    agent: row.agent,
    count: row.count,
  }));
}

export async function getWorkflowCountsByKey(userId = "system") {
  const db = await getPlatformDb();

  const rows = await db.all(`
    SELECT
      workflow_key AS workflowKey,
      COUNT(*) AS count
    FROM workflow_runs
    WHERE user_id=?
    GROUP BY workflow_key
    ORDER BY count DESC, workflowKey ASC
  `,userId);

  return rows.map((row) => ({
    workflowKey: row.workflowKey,
    count: row.count,
  }));
}

export async function getFilteredWorkflowRuns({
  limit = 25,
  agent = "",
  workflowKey = "",
  userId = "system",
} = {}) {
  const db = await getPlatformDb();

  const conditions = ["user_id = ?"];
  const params = [userId];

  if (agent) {
    conditions.push(`primary_agent = ?`);
    params.push(agent);
  }

  if (workflowKey) {
    conditions.push(`workflow_key = ?`);
    params.push(workflowKey);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const sql = `
    SELECT *
    FROM workflow_runs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  params.push(Number(limit) || 25);

  const rows = await db.all(sql, params);

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

export async function getFilteredResearchSources({
  limit = 25,
  topic = "",
  userId = "system",
} = {}) {
  const db = await getPlatformDb();

  const conditions = ["user_id = ?"];
  const params = [userId];

  if (topic) {
    conditions.push(`topic LIKE ?`);
    params.push(`%${topic}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const sql = `
    SELECT *
    FROM research_sources
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  params.push(Number(limit) || 25);

  const rows = await db.all(sql, params);

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
