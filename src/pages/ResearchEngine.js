import React, { useState } from "react";
import "./ResearchEngine.css";

export default function ResearchEngine() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");

  const handleResearch = async () => {
    if (!query.trim()) {
      setError("Please enter a research topic.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");
    setSources([]);

    try {
      const response = await fetch("http://localhost:5000/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          mode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Research request failed.");
      }

      setSummary(data.summary || "");
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message || "Something went wrong while researching.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="research-page">
      <div className="research-shell">
        <div className="research-header">
          <h1>🔎 Aigenikz Research Engine v2</h1>
          <p>
            Live web research, source-backed intelligence, and AI synthesis.
          </p>
        </div>

        <div className="research-controls">
          <textarea
            className="research-textarea"
            placeholder="Ask Aigenikz to research anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="research-toolbar">
            <select
              className="research-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="balanced">Balanced</option>
              <option value="deep">Deep Research</option>
              <option value="fast">Fast Scan</option>
              <option value="news">News Mode</option>
            </select>

            <button
              className="research-button"
              onClick={handleResearch}
              disabled={loading}
            >
              {loading ? "Researching..." : "Run Research"}
            </button>
          </div>
        </div>

        {error && <div className="research-error">{error}</div>}

        {summary && (
          <div className="research-results">
            <div className="research-summary-card">
              <h2>AI Research Summary</h2>
              <div className="research-summary-text">
                {summary.split("\n").map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div className="research-sources-card">
              <h2>Sources</h2>
              <div className="research-sources-list">
                {sources.map((source) => (
                  <div className="research-source-item" key={source.id}>
                    <div className="research-source-top">
                      <span className="source-badge">Source {source.id}</span>
                      {source.score !== null && (
                        <span className="source-score">
                          Score: {source.score.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="research-source-title"
                    >
                      {source.title}
                    </a>

                    {source.published_date && (
                      <div className="research-source-date">
                        Published: {source.published_date}
                      </div>
                    )}

                    <p className="research-source-content">{source.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
