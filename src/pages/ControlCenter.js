import { API_URL as DEFAULT_API_URL } from "../config/api.js";
import React, { useState } from "react";
import "../styles/control-center.css";

function getApiUrl() {
  return localStorage.getItem("astramind_api_url") || DEFAULT_API_URL;
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }
  return data;
}

export default function ControlCenter() {
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("Fiction");
  const [tone, setTone] = useState("Bold");
  const [audience, setAudience] = useState("General audience");
  const [chapterCount, setChapterCount] = useState(10);

  const [loadingAction, setLoadingAction] = useState("");
  const [resultTitle, setResultTitle] = useState("No workflow run yet");
  const [resultText, setResultText] = useState("");
  const [sources, setSources] = useState([]);
  const [orchestration, setOrchestration] = useState(null);

  const canRun = topic.trim().length > 0;

  const resetResult = (title) => {
    setResultTitle(title);
    setResultText("");
    setSources([]);
    setOrchestration(null);
  };

  const runResearchBrief = async () => {
    if (!canRun) return;
    setLoadingAction("research");
    resetResult("Running Research Brief...");

    try {
      const response = await fetch(
        `${getApiUrl()}/api/agent-workflow/research-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: topic }),
        }
      );

      const data = await readJson(response);

      setResultTitle("Research Brief Complete");
      setResultText(data?.reply || "No research summary returned.");
      setSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (error) {
      setResultTitle("Research Brief Failed");
      setResultText(error.message);
      setSources([]);
    } finally {
      setLoadingAction("");
    }
  };

  const runBusinessScan = async () => {
    if (!canRun) return;
    setLoadingAction("strategy");
    resetResult("Running Business Strategy Scan...");

    try {
      const response = await fetch(
        `${getApiUrl()}/api/agent-workflow/business-strategy-scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: topic }),
        }
      );

      const data = await readJson(response);

      setResultTitle("Business Strategy Scan Complete");
      setResultText(data?.reply || "No strategy scan returned.");
      setSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (error) {
      setResultTitle("Business Strategy Scan Failed");
      setResultText(error.message);
      setSources([]);
    } finally {
      setLoadingAction("");
    }
  };

  const runBookBootstrap = async () => {
    if (!canRun) return;
    setLoadingAction("book");
    resetResult("Building Full Book Package...");

    try {
      const response = await fetch(`${getApiUrl()}/api/content/book-full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          genre,
          tone,
          audience,
          chapterCount,
          includeResearch: true,
        }),
      });

      const data = await readJson(response);

      setResultTitle("Book Bootstrap Complete");
      setResultText(data?.result || "No book package returned.");
      setSources([]);
    } catch (error) {
      setResultTitle("Book Bootstrap Failed");
      setResultText(error.message);
      setSources([]);
    } finally {
      setLoadingAction("");
    }
  };

  const runContentCampaign = async () => {
    if (!canRun) return;
    setLoadingAction("content");
    resetResult("Building Content Campaign...");

    try {
      const response = await fetch(`${getApiUrl()}/api/content/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign-plan",
          topic,
          audience,
          goal: "engagement and conversion",
          tone,
          platform: "TikTok / YouTube / Instagram",
        }),
      });

      const data = await readJson(response);

      setResultTitle("Content Campaign Complete");
      setResultText(data?.result || "No content campaign returned.");
      setSources([]);
    } catch (error) {
      setResultTitle("Content Campaign Failed");
      setResultText(error.message);
      setSources([]);
    } finally {
      setLoadingAction("");
    }
  };

  const runSaasBuilder = async () => {
    if (!canRun) return;
    setLoadingAction("saas");
    resetResult("Building AI SaaS Blueprint...");

    try {
      const response = await fetch(`${getApiUrl()}/api/agent-workflow/saas-builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: topic,
          audience,
          tone,
        }),
      });

      const data = await readJson(response);

      setResultTitle("AI SaaS Builder Complete");
      setResultText(data?.reply || "No SaaS blueprint returned.");
      setSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (error) {
      setResultTitle("AI SaaS Builder Failed");
      setResultText(error.message);
      setSources([]);
    } finally {
      setLoadingAction("");
    }
  };

  const runMultiAgentOrchestration = async () => {
    if (!canRun) return;
    setLoadingAction("orchestration");
    resetResult("Running Multi-Agent Orchestration...");

    try {
      const response = await fetch(`${getApiUrl()}/api/agent-orchestrator/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: topic,
          genre,
          tone,
          audience,
          chapterCount,
        }),
      });

      const data = await readJson(response);

      setResultTitle("Multi-Agent Orchestration Complete");
      setResultText(
        data?.masterSummary ||
          "Orchestration completed, but no master summary was returned."
      );
      setSources(Array.isArray(data?.sources) ? data.sources : []);
      setOrchestration(data?.orchestration || null);
    } catch (error) {
      setResultTitle("Multi-Agent Orchestration Failed");
      setResultText(error.message);
      setSources([]);
      setOrchestration(null);
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="control-center-page os-panel os-page-enter os-breathe text-white">
      <div className="control-center-header">
        <h1>⚡ Aigenikz Control Center</h1>
        <p>
          Run autonomous workflows across research, strategy, books, content,
          AI SaaS building, and full multi-agent orchestration.
        </p>
      </div>

      <div className="control-center-layout">
        <section className="control-card">
          <h2>Mission Input</h2>

          <textarea
            className="control-input control-textarea"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter the mission, topic, business idea, product angle, AI SaaS concept, or book concept..."
          />

          <div className="control-grid">
            <select
              className="control-input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option>Fiction</option>
              <option>Thriller</option>
              <option>Sci-Fi</option>
              <option>Drama</option>
              <option>Business</option>
              <option>Self-Help</option>
              <option>Memoir</option>
            </select>

            <select
              className="control-input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option>Bold</option>
              <option>Cinematic</option>
              <option>Educational</option>
              <option>Dark</option>
              <option>Inspirational</option>
              <option>Direct</option>
            </select>

            <input
              className="control-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Target audience"
            />

            <input
              className="control-input"
              type="number"
              min="3"
              max="30"
              value={chapterCount}
              onChange={(e) => setChapterCount(Number(e.target.value))}
              placeholder="Chapter count"
            />
          </div>
        </section>

        <section className="control-card">
          <h2>Autonomous Workflow Actions</h2>

          <div className="control-actions">
            <button
              className="control-btn"
              onClick={runResearchBrief}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "research"
                ? "Running Research Brief..."
                : "Run Research Brief"}
            </button>

            <button
              className="control-btn"
              onClick={runBusinessScan}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "strategy"
                ? "Running Business Scan..."
                : "Run Business Strategy Scan"}
            </button>

            <button
              className="control-btn"
              onClick={runBookBootstrap}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "book"
                ? "Building Book Package..."
                : "Run Full Book Bootstrap"}
            </button>

            <button
              className="control-btn"
              onClick={runContentCampaign}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "content"
                ? "Building Campaign..."
                : "Run Content Campaign"}
            </button>

            <button
              className="control-btn"
              onClick={runSaasBuilder}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "saas"
                ? "Building AI SaaS..."
                : "Run AI SaaS Builder"}
            </button>

            <button
              className="control-btn control-btn-orchestrate"
              onClick={runMultiAgentOrchestration}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "orchestration"
                ? "Running Multi-Agent System..."
                : "Run Multi-Agent Orchestration"}
            </button>
          </div>
        </section>

        <section className="control-card control-card-wide">
          <h2>{resultTitle}</h2>

          {resultText ? (
            <pre className="control-result">{resultText}</pre>
          ) : (
            <div className="control-placeholder">
              Workflow output will appear here.
            </div>
          )}
        </section>

        {orchestration ? (
          <section className="control-card control-card-wide">
            <h2>Agent Breakdown</h2>

            <div className="control-orchestration-grid">
              <div className="control-agent-block">
                <h3>Research Agent</h3>
                <pre className="control-result">
                  {orchestration?.research?.reply || "No research output."}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Strategy Agent</h3>
                <pre className="control-result">
                  {orchestration?.strategy?.reply || "No strategy output."}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Content Agent</h3>
                <pre className="control-result">
                  {orchestration?.content?.result || "No content output."}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Book Agent</h3>
                <pre className="control-result">
                  {orchestration?.book?.result || "No book output."}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>AI SaaS Builder Agent</h3>
                <pre className="control-result">
                  {orchestration?.saas?.reply || "No SaaS output."}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        <section className="control-card control-card-wide">
          <h2>Source Feed</h2>

          {sources.length ? (
            <div className="control-source-list">
              {sources.map((source, index) => (
                <div key={source.id || index} className="control-source-item">
                  <div className="control-source-title">
                    {source.title || "Untitled Source"}
                  </div>
                  <div className="control-source-meta">
                    {source.sourceName || "Unknown source"}
                  </div>
                  <div className="control-source-snippet">
                    {source.snippet || "No snippet."}
                  </div>
                  {source.url ? (
                    <a
                      className="control-source-link"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="control-placeholder">
              No sources attached to the latest workflow.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}