import React, { useState } from "react";
import "../styles/control-center.css";
import { persistContentLabExperiment } from "../services/contentLabExperimentService.js";

const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function getApiUrl() {
  return localStorage.getItem("astramind_api_url") || DEFAULT_API_URL;
}
function requestHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` };
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }
  return data;
}

function formatOutput(value, fallback = "No output.") {
  if (value === null || value === undefined || value === "") return fallback;
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function compactText(value, limit = 360) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
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
  const [autonomousMission, setAutonomousMission] = useState(null);

  const canRun = topic.trim().length > 0;
  const budgetPercent = (used, limit) => Math.min(100, Math.round((Number(used || 0) / Math.max(Number(limit || 1), 1)) * 100));

  const resetResult = (title) => {
    setResultTitle(title);
    setResultText("");
    setSources([]);
    setOrchestration(null);
    setAutonomousMission(null);
  };

  const applyAutonomousResult = (data) => {
    setAutonomousMission(data);
    if (data.awaitingApproval) {
      setResultTitle("Autonomous Research Awaiting Approval");
      setResultText(`AstraMind planned and checkpointed the mission. Approve ${data.approval?.capability || "the guarded step"} to continue external source collection.`);
      return;
    }
    const research = data?.result?.research;
    if (data?.result?.contentLabExperiment) persistContentLabExperiment(data.result.contentLabExperiment);
    setResultTitle(data.status === "completed" ? "Bounded Research Mission Complete" : `Autonomous Mission: ${data.status}`);
    setResultText(data?.result?.reply || research?.synthesis || "The autonomous mission completed without a displayable brief.");
    setSources((research?.sources || []).filter((source) => source.validation?.valid !== false).map((source) => ({ ...source, sourceName: source.publisher, snippet: source.summary })));
  };

  const runBoundedResearch = async () => {
    if (!canRun) return;
    setLoadingAction("autonomous-research");
    resetResult("Planning Bounded Research Mission...");
    try {
      const response = await fetch(`${getApiUrl()}/api/chat/autonomy/research`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ objective: topic, conversationId: "mission-control-autonomy" }),
      });
      applyAutonomousResult(await readJson(response));
    } catch (error) {
      setResultTitle("Bounded Research Mission Failed");
      setResultText(error.message);
    } finally {
      setLoadingAction("");
    }
  };

  const decideAutonomousMission = async (decision) => {
    if (!autonomousMission?.missionId) return;
    setLoadingAction(`autonomy-${decision}`);
    try {
      const response = await fetch(`${getApiUrl()}/api/chat/autonomy/missions/${autonomousMission.missionId}/${decision}`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ approvalId: autonomousMission.approval?.id }),
      });
      const data = await readJson(response);
      if (decision === "cancel") {
        setAutonomousMission((current) => ({ ...current, status: "cancelled", awaitingApproval: false }));
        setResultTitle("Autonomous Mission Cancelled");
        setResultText("The checkpointed mission was cancelled. No external collection was performed.");
      } else applyAutonomousResult(data);
    } catch (error) {
      setResultTitle("Autonomous Mission Decision Failed");
      setResultText(error.message);
    } finally {
      setLoadingAction("");
    }
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
          headers: requestHeaders(),
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
          headers: requestHeaders(),
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
        headers: requestHeaders(),
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
        headers: requestHeaders(),
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
      const response = await fetch(`${getApiUrl()}/api/saas-builder/blueprint`, {
        method: "POST",
        headers: requestHeaders(),
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
      const response = await fetch(`${getApiUrl()}/api/workflows/run`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({
          mission: "promotional_campaign",
          input: { topic, genre, tone, audience, chapterCount, durationTarget: 60 },
          timeoutMs: 180000,
        }),
      });

      const data = await readJson(response);

      const campaign = data?.result || {};
      setResultTitle("Promotional Campaign Orchestration Complete");
      setResultText(
        campaign?.masterSummary || campaign?.reply ||
          "Orchestration completed, but no master summary was returned."
      );
      setSources(Array.isArray(campaign?.sources) ? campaign.sources : []);
      setOrchestration(campaign?.orchestration ? {
        ...campaign.orchestration,
        stages: campaign.stages || [],
        readiness: campaign.readiness || null,
        render: campaign.render || null,
      } : null);
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
        <h1>⚡ AstraMind Control Center</h1>
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
              className="control-btn control-btn-orchestrate"
              onClick={runBoundedResearch}
              disabled={!canRun || !!loadingAction}
            >
              {loadingAction === "autonomous-research" ? "Planning Bounded Mission..." : "Run Bounded Autonomous Research"}
            </button>

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

        {autonomousMission ? (
          <section className="control-card control-card-wide">
            <div className="control-runtime-heading">
              <div><span>Supervised autonomy</span><h2>Bounded Mission Runtime</h2></div>
              <strong className={`control-runtime-status status-${autonomousMission.status}`}>{String(autonomousMission.status || "unknown").replaceAll("_", " ")}</strong>
            </div>
            <div className="control-runtime-summary">
              <div><span>Mission</span><strong>{autonomousMission.missionId?.slice(0, 8)}</strong></div>
              <div><span>Checkpoint</span><strong>{autonomousMission.checkpoint?.nextStepIndex || 0}/{autonomousMission.plan?.length || 0}</strong></div>
              <div><span>Last completed</span><strong>{autonomousMission.checkpoint?.completedStepId || "Planning"}</strong></div>
              <div><span>Elapsed</span><strong>{((autonomousMission.usage?.elapsedMs || 0) / 1000).toFixed(1)}s</strong></div>
            </div>
            <div className="control-budget-grid">
              {[
                ["Steps", autonomousMission.usage?.steps, autonomousMission.bounds?.maxSteps],
                ["Tool calls", autonomousMission.usage?.toolCalls, autonomousMission.bounds?.maxToolCalls],
                ["Provider queries", autonomousMission.usage?.providerQueries, autonomousMission.bounds?.maxProviderQueries],
                ["Credits", autonomousMission.usage?.credits, autonomousMission.bounds?.maxCredits],
              ].map(([label, used, limit]) => (
                <div className="control-budget" key={label}><div><span>{label}</span><strong>{used || 0} / {limit || 0}</strong></div><i><b style={{ width: `${budgetPercent(used, limit)}%` }} /></i></div>
              ))}
            </div>
            <div className="control-mission-timeline">
              {(autonomousMission.plan || []).map((step, index) => (
                <div key={step.id} className={`control-mission-step step-${step.status}`}>
                  <span>{step.status === "completed" ? "✓" : step.status === "awaiting_approval" ? "!" : index + 1}</span>
                  <div><strong>{step.id.replaceAll("-", " ")}</strong><small>{step.capability} · {step.status.replaceAll("_", " ")}</small></div>
                </div>
              ))}
            </div>
            {autonomousMission.awaitingApproval ? (
              <div className="control-actions">
                <button className="control-btn control-btn-orchestrate" onClick={() => decideAutonomousMission("approve")} disabled={!!loadingAction}>
                  {loadingAction === "autonomy-approve" ? "Resuming from checkpoint..." : "Approve source collection & resume"}
                </button>
                <button className="control-btn" onClick={() => decideAutonomousMission("cancel")} disabled={!!loadingAction}>Cancel mission</button>
              </div>
            ) : null}
          </section>
        ) : null}

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
            <h2>Mission Stages &amp; Production Artifacts</h2>

            <div className="control-orchestration-grid">
              <div className="control-agent-block">
                <h3>Mission Telemetry</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.stages, "No stage telemetry returned.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Readiness Agent</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.readiness, "No readiness output.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Research Agent</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.research, "No research output.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Campaign &amp; Script Agent</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.content?.result, "No campaign output.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Storyboard Agent</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.storyboard, "No storyboard output.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Image Prompt Agent</h3>
                <pre className="control-result">
                  {formatOutput(orchestration?.imagePrompts, "No image prompts returned.")}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Audio &amp; Distribution Agents</h3>
                <pre className="control-result">
                  {formatOutput({ audio: orchestration?.audio, distribution: orchestration?.distribution })}
                </pre>
              </div>

              <div className="control-agent-block">
                <h3>Provider Preflight Gate</h3>
                <pre className="control-result">
                  {formatOutput({ preflight: orchestration?.preflight, render: orchestration?.render })}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        <section className="control-card control-card-wide">
          <h2>Source Feed</h2>

          {autonomousMission?.result?.research ? (
            <div className="control-evidence-summary">
              <div>
                <span>Governed evidence</span>
                <strong>{autonomousMission.result.research.report?.evidenceStrength?.level || "unrated"}</strong>
              </div>
              <div><span>Accepted</span><strong>{autonomousMission.result.research.validSourceCount || 0}</strong></div>
              <div><span>Rejected</span><strong>{autonomousMission.result.research.rejectedSourceCount || 0}</strong></div>
              {(autonomousMission.result.research.rejectedSources || []).length ? (
                <details className="control-rejection-audit">
                  <summary>Review rejection audit</summary>
                  {(autonomousMission.result.research.rejectedSources || []).map((source, index) => (
                    <div key={source.id || index}>
                      <strong>{source.title || "Untitled source"}</strong>
                      <span>{(source.validation?.rejectionReasons || ["Not accepted for governed claims"]).join(" · ")}</span>
                    </div>
                  ))}
                </details>
              ) : null}
            </div>
          ) : null}

          {sources.length ? (
            <div className="control-source-list">
              {sources.map((source, index) => (
                <div key={source.id || index} className="control-source-item">
                  <div className="control-source-title">
                    {source.title || "Untitled Source"}
                  </div>
                  <div className="control-source-meta">
                    {source.sourceName || "Unknown source"}
                    {source.sourceType ? ` · ${source.sourceType}` : ""}
                    {source.evidenceLane ? ` · ${source.evidenceLane}` : ""}
                    {Number.isFinite(source.validation?.evidenceScore) ? ` · score ${Math.round(source.validation.evidenceScore * 100)}` : ""}
                  </div>
                  <div className="control-source-snippet">
                    {compactText(source.snippet || "No snippet.")}
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
