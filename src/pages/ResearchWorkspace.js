import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/research-workspace.css";

import {
  getSemanticContext,
  saveResearchSource,
} from "../core/intelligence/hybridAI.js";

const STORAGE_KEY = "astramind_research_memory";

function loadLocalResearch() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalResearch(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.warn("Research persistence unavailable:", error.message);
    return false;
  }
}

export default function ResearchWorkspace() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("all");
  const [topic, setTopic] = useState("");
  const [entries, setEntries] = useState(() => loadLocalResearch());
  const [loading, setLoading] = useState(false);
  const [compiledPack, setCompiledPack] = useState("");
  const [editingNotes, setEditingNotes] = useState({});
  const [status, setStatus] = useState("Research Workspace ready.");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const categoryMatch = category === "all" || entry.category === category;
      const topicMatch =
        !topic.trim() ||
        String(entry.topic || "")
          .toLowerCase()
          .includes(topic.toLowerCase()) ||
        String(entry.title || "")
          .toLowerCase()
          .includes(topic.toLowerCase()) ||
        String(entry.snippet || "")
          .toLowerCase()
          .includes(topic.toLowerCase());

      return categoryMatch && topicMatch;
    });
  }, [entries, category, topic]);

  useEffect(() => {
    const noteMap = {};
    entries.forEach((entry) => {
      noteMap[entry.id] = entry.notes || "";
    });
    setEditingNotes(noteMap);
  }, [entries]);

  // ============================
  // 🔥 CHAT → RESEARCH HANDOFF
  // ============================
  useEffect(() => {
    try {
      const saved = localStorage.getItem("astramind_handoff");
      if (!saved) return;

      const handoff = JSON.parse(saved);

      const isResearchHandoff =
        handoff.route === "Research Workspace" ||
        handoff.path === "/research";

      if (!isResearchHandoff) return;

      const newEntry = {
        id: `research_${Date.now()}`,
        category: "news",
        topic: handoff.prompt || "Chat research handoff",
        title: handoff.prompt || "Research Brief",
        sourceName: "AstraMind Chat",
        snippet: handoff.reply || "",
        notes: "",
        createdAt: handoff.createdAt || new Date().toISOString(),
      };

      const nextEntries = [newEntry, ...loadLocalResearch()];
      setEntries(nextEntries);
      saveLocalResearch(nextEntries);

      setTopic(handoff.prompt || "");
      setCategory("news");
      setCompiledPack(handoff.reply || "");
      setStatus("✅ Research handoff loaded from Chat.");

      localStorage.setItem(
        "astramind_research_seed",
        JSON.stringify({
          topic: handoff.prompt || "",
          brief: handoff.reply || "",
          route: handoff.route || "Research Workspace",
          createdAt: handoff.createdAt || new Date().toISOString(),
          source: "chat_handoff",
        })
      );

      localStorage.removeItem("astramind_handoff");
    } catch (err) {
      console.error("Research handoff load failed:", err);
      localStorage.removeItem("astramind_handoff");
    }
  }, []);

  const handleSaveManualEntry = async () => {
    if (!topic.trim() && !compiledPack.trim()) {
      alert("Add a topic or research text first.");
      return;
    }

    const newEntry = {
      id: `research_${Date.now()}`,
      category: category === "all" ? "general" : category,
      topic: topic || "Untitled research",
      title: topic || "Untitled research",
      sourceName: "Manual / AstraMind",
      snippet: compiledPack || topic,
      notes: "",
      createdAt: new Date().toISOString(),
    };

    const nextEntries = [newEntry, ...entries];
    setEntries(nextEntries);
    saveLocalResearch(nextEntries);

    try {
      await saveResearchSource?.({
        topic: newEntry.topic,
        category: newEntry.category,
        source: {
          title: newEntry.title,
          sourceName: newEntry.sourceName,
          snippet: newEntry.snippet,
        },
        notes: newEntry.notes,
      });
    } catch (err) {
      console.warn("Cloud research save skipped:", err.message);
    }

    setStatus("✅ Research saved.");
  };

  const handleSemanticSearch = async () => {
    if (!topic.trim()) {
      alert("Enter a topic first.");
      return;
    }

    setLoading(true);
    setStatus("Searching semantic memory...");

    try {
      const data = await getSemanticContext?.({ topic });

      const semanticText =
        typeof data === "string"
          ? data
          : data?.context ||
            data?.reply ||
            data?.result ||
            JSON.stringify(data || {}, null, 2);

      setCompiledPack(semanticText || "No semantic context found.");
      setStatus("✅ Semantic context loaded.");
    } catch (err) {
      console.error(err);
      setCompiledPack("Unable to load semantic context right now.");
      setStatus("⚠️ Semantic search failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = (entry) => {
    const nextEntries = entries.map((item) =>
      item.id === entry.id
        ? {
            ...item,
            notes: editingNotes[entry.id] || "",
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    setEntries(nextEntries);
    saveLocalResearch(nextEntries);
    setStatus("✅ Notes saved.");
  };

  const handleDelete = (id) => {
    const ok = window.confirm("Delete this research item?");
    if (!ok) return;

    const nextEntries = entries.filter((entry) => entry.id !== id);
    setEntries(nextEntries);
    saveLocalResearch(nextEntries);
    setStatus("Research item deleted.");
  };

  const handleCompileBookPack = () => {
    const pack = filteredEntries
      .map((entry, index) => {
        return [
          `SOURCE ${index + 1}: ${entry.title}`,
          `Category: ${entry.category}`,
          `Topic: ${entry.topic}`,
          `Source: ${entry.sourceName}`,
          `Research: ${entry.snippet}`,
          `Notes: ${entry.notes || "No notes yet."}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    setCompiledPack(
      pack || "No research entries match this topic/category yet."
    );
    setStatus("✅ Book research pack compiled.");
  };

  const sendToBookWriter = () => {
    const payload = {
      from: "research",
      prompt: topic || "Research-based book project",
      reply: compiledPack,
      route: "Book Writer",
      path: "/content/book",
      outputMode: "GENERATOR",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("astramind_handoff", JSON.stringify(payload));
    navigate("/content/book");
  };

  const sendToContentCreator = () => {
    const payload = {
      from: "research",
      prompt: topic || "Research-based content project",
      reply: compiledPack,
      route: "content_creation",
      path: "/content",
      outputMode: "GENERATOR",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("astramind_handoff", JSON.stringify(payload));
    navigate("/content");
  };

  return (
    <div className="research-page os-panel os-page-enter os-breathe text-white">
      <div className="research-header">
        <div>
          <h1>📚 Research Workspace</h1>
          <p>
            Organize intelligence briefs, research notes, semantic memory, and
            book-ready source packs.
          </p>
          <small>{status}</small>
        </div>
      </div>

      <div className="research-toolbar">
        <select
          className="research-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="book">Book</option>
          <option value="news">News</option>
          <option value="creator">Creator</option>
          <option value="finance">Finance</option>
          <option value="general">General</option>
        </select>

        <input
          className="research-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Research topic, book subject, news issue, or content angle..."
        />

        <button
          className="research-btn"
          onClick={handleSemanticSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Semantic Search"}
        </button>

        <button className="research-btn" onClick={handleSaveManualEntry}>
          Save Research
        </button>

        <button
          className="research-btn research-btn-primary"
          onClick={handleCompileBookPack}
        >
          Build Book Pack
        </button>
      </div>

      <div className="research-grid">
        <div className="research-column">
          <h2>Saved Research</h2>

          {filteredEntries.length === 0 ? (
            <div className="research-empty">No saved research sources yet.</div>
          ) : (
            <div className="research-list">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="research-card">
                  <div className="research-card-top">
                    <span className="research-badge">{entry.category}</span>

                    <button
                      className="research-delete-btn"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <h3>{entry.title || "Untitled Source"}</h3>

                  <div className="research-domain">
                    {entry.sourceName || "AstraMind source"}
                  </div>

                  <p>{entry.snippet}</p>

                  <div className="research-topic">
                    <strong>Topic:</strong> {entry.topic || "Untitled Topic"}
                  </div>

                  <textarea
                    className="research-notes-input"
                    value={editingNotes[entry.id] || ""}
                    onChange={(e) =>
                      setEditingNotes((prev) => ({
                        ...prev,
                        [entry.id]: e.target.value,
                      }))
                    }
                    placeholder="Add notes for scenes, ideas, conflict, themes, dialogue angles..."
                  />

                  <div className="research-card-actions">
                    <button
                      className="research-btn"
                      onClick={() => handleSaveNotes(entry)}
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="research-column">
          <h2>Compiled / Live Intelligence Pack</h2>

          <textarea
            className="research-notes-input"
            style={{ minHeight: 180 }}
            value={compiledPack}
            onChange={(e) => setCompiledPack(e.target.value)}
            placeholder="Research brief, semantic context, or compiled book pack will appear here..."
          />

          <div className="research-card-actions" style={{ marginTop: 12 }}>
            <button
              className="research-btn research-btn-primary"
              onClick={sendToBookWriter}
              disabled={!compiledPack.trim()}
            >
              Send to Book Writer
            </button>

            <button
              className="research-btn"
              onClick={sendToContentCreator}
              disabled={!compiledPack.trim()}
            >
              Send to Content Creator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
