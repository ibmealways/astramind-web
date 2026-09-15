import express from "express";
import db from "../db/sqlite.js";

const router = express.Router();

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProfileRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    displayName: row.display_name || "",
    primaryIdentity: row.primary_identity || "",
    mission: row.mission || "",
    writingTone: row.writing_tone || "",
    preferredPlatforms: safeJsonParse(row.preferred_platforms, []),
    businesses: safeJsonParse(row.businesses, []),
    activeGoals: safeJsonParse(row.active_goals, []),
    preferences: safeJsonParse(row.preferences, {}),
    updatedAt: row.updated_at || "",
  };
}

function normalizeProjectRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "",
    status: row.status || "active",
    summary: row.summary || "",
    metadata: safeJsonParse(row.metadata, {}),
    updatedAt: row.updated_at || "",
    createdAt: row.created_at || "",
  };
}

function normalizeMemoryRow(row) {
  return {
    id: row.id,
    category: row.category || "",
    title: row.title || "",
    content: row.content || "",
    tags: safeJsonParse(row.tags, []),
    linkedProjectId: row.linked_project_id || "",
    importance: row.importance ?? 3,
    updatedAt: row.updated_at || "",
    createdAt: row.created_at || "",
  };
}

router.get("/profile", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM creator_profile WHERE id = 1").get();
    res.json({ ok: true, profile: normalizeProfileRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch("/profile", (req, res) => {
  try {
    const {
      displayName = "",
      primaryIdentity = "",
      mission = "",
      writingTone = "",
      preferredPlatforms = [],
      businesses = [],
      activeGoals = [],
      preferences = {},
    } = req.body || {};

    db.prepare(`
      UPDATE creator_profile
      SET
        display_name = ?,
        primary_identity = ?,
        mission = ?,
        writing_tone = ?,
        preferred_platforms = ?,
        businesses = ?,
        active_goals = ?,
        preferences = ?,
        updated_at = ?
      WHERE id = 1
    `).run(
      displayName,
      primaryIdentity,
      mission,
      writingTone,
      JSON.stringify(preferredPlatforms || []),
      JSON.stringify(businesses || []),
      JSON.stringify(activeGoals || []),
      JSON.stringify(preferences || {}),
      nowIso()
    );

    const row = db.prepare("SELECT * FROM creator_profile WHERE id = 1").get();
    res.json({ ok: true, profile: normalizeProfileRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/projects", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM creator_projects ORDER BY datetime(updated_at) DESC"
      )
      .all();

    res.json({
      ok: true,
      count: rows.length,
      projects: rows.map(normalizeProjectRow),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/projects", (req, res) => {
  try {
    const {
      id,
      title,
      type = "",
      status = "active",
      summary = "",
      metadata = {},
    } = req.body || {};

    if (!id || !title) {
      return res.status(400).json({
        ok: false,
        error: "Project id and title are required.",
      });
    }

    const now = nowIso();

    db.prepare(`
      INSERT INTO creator_projects (
        id, title, type, status, summary, metadata, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      type,
      status,
      summary,
      JSON.stringify(metadata || {}),
      now,
      now
    );

    const row = db
      .prepare("SELECT * FROM creator_projects WHERE id = ?")
      .get(id);

    res.json({ ok: true, project: normalizeProjectRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch("/projects/:id", (req, res) => {
  try {
    const existing = db
      .prepare("SELECT * FROM creator_projects WHERE id = ?")
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({ ok: false, error: "Project not found." });
    }

    const {
      title = existing.title,
      type = existing.type,
      status = existing.status,
      summary = existing.summary,
      metadata = safeJsonParse(existing.metadata, {}),
    } = req.body || {};

    db.prepare(`
      UPDATE creator_projects
      SET title = ?, type = ?, status = ?, summary = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title,
      type,
      status,
      summary,
      JSON.stringify(metadata || {}),
      nowIso(),
      req.params.id
    );

    const row = db
      .prepare("SELECT * FROM creator_projects WHERE id = ?")
      .get(req.params.id);

    res.json({ ok: true, project: normalizeProjectRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete("/projects/:id", (req, res) => {
  try {
    const result = db
      .prepare("DELETE FROM creator_projects WHERE id = ?")
      .run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({ ok: false, error: "Project not found." });
    }

    res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/memory", (req, res) => {
  try {
    const category = String(req.query.category || "").trim();
    const linkedProjectId = String(req.query.linkedProjectId || "").trim();

    let rows;

    if (category && linkedProjectId) {
      rows = db
        .prepare(`
          SELECT * FROM creator_memory_entries
          WHERE category = ? AND linked_project_id = ?
          ORDER BY importance DESC, datetime(updated_at) DESC
        `)
        .all(category, linkedProjectId);
    } else if (category) {
      rows = db
        .prepare(`
          SELECT * FROM creator_memory_entries
          WHERE category = ?
          ORDER BY importance DESC, datetime(updated_at) DESC
        `)
        .all(category);
    } else if (linkedProjectId) {
      rows = db
        .prepare(`
          SELECT * FROM creator_memory_entries
          WHERE linked_project_id = ?
          ORDER BY importance DESC, datetime(updated_at) DESC
        `)
        .all(linkedProjectId);
    } else {
      rows = db
        .prepare(`
          SELECT * FROM creator_memory_entries
          ORDER BY importance DESC, datetime(updated_at) DESC
        `)
        .all();
    }

    res.json({
      ok: true,
      count: rows.length,
      entries: rows.map(normalizeMemoryRow),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/memory", (req, res) => {
  try {
    const {
      id,
      category,
      title = "",
      content,
      tags = [],
      linkedProjectId = "",
      importance = 3,
    } = req.body || {};

    if (!id || !category || !content) {
      return res.status(400).json({
        ok: false,
        error: "id, category, and content are required.",
      });
    }

    const now = nowIso();

    db.prepare(`
      INSERT INTO creator_memory_entries (
        id, category, title, content, tags, linked_project_id, importance, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      category,
      title,
      content,
      JSON.stringify(tags || []),
      linkedProjectId,
      Number(importance) || 3,
      now,
      now
    );

    const row = db
      .prepare("SELECT * FROM creator_memory_entries WHERE id = ?")
      .get(id);

    res.json({ ok: true, entry: normalizeMemoryRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch("/memory/:id", (req, res) => {
  try {
    const existing = db
      .prepare("SELECT * FROM creator_memory_entries WHERE id = ?")
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({ ok: false, error: "Memory entry not found." });
    }

    const {
      category = existing.category,
      title = existing.title,
      content = existing.content,
      tags = safeJsonParse(existing.tags, []),
      linkedProjectId = existing.linked_project_id,
      importance = existing.importance,
    } = req.body || {};

    db.prepare(`
      UPDATE creator_memory_entries
      SET
        category = ?,
        title = ?,
        content = ?,
        tags = ?,
        linked_project_id = ?,
        importance = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      category,
      title,
      content,
      JSON.stringify(tags || []),
      linkedProjectId,
      Number(importance) || 3,
      nowIso(),
      req.params.id
    );

    const row = db
      .prepare("SELECT * FROM creator_memory_entries WHERE id = ?")
      .get(req.params.id);

    res.json({ ok: true, entry: normalizeMemoryRow(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete("/memory/:id", (req, res) => {
  try {
    const result = db
      .prepare("DELETE FROM creator_memory_entries WHERE id = ?")
      .run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({ ok: false, error: "Memory entry not found." });
    }

    res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/dashboard", (req, res) => {
  try {
    const profileRow = db.prepare("SELECT * FROM creator_profile WHERE id = 1").get();
    const projects = db
      .prepare("SELECT * FROM creator_projects ORDER BY datetime(updated_at) DESC LIMIT 8")
      .all()
      .map(normalizeProjectRow);

    const recentMemory = db
      .prepare(`
        SELECT * FROM creator_memory_entries
        ORDER BY importance DESC, datetime(updated_at) DESC
        LIMIT 12
      `)
      .all()
      .map(normalizeMemoryRow);

    const suggestions = [];

    if (!projects.length) {
      suggestions.push("Create your first tracked project so Aigenikz can start building persistent context.");
    }

    if (!(profileRow?.mission || "").trim()) {
      suggestions.push("Add your mission inside Creator Brain so Chappy can align its suggestions to your long-term direction.");
    }

    if (!recentMemory.length) {
      suggestions.push("Save research and strategic notes into memory so Aigenikz can recommend stronger next moves.");
    }

    if (!suggestions.length) {
      suggestions.push("Continue your highest-priority active project and let Aigenikz route the next actions from memory.");
    }

    res.json({
      ok: true,
      dashboard: {
        profile: normalizeProfileRow(profileRow),
        activeProjects: projects,
        recentMemory,
        suggestions,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;