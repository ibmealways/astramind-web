import { API_URL as DEFAULT_API_URL } from "../config/api.js";
import React, { useEffect, useMemo, useState } from "react";
import "../styles/operator-dashboard.css";

import DashboardStatCard from "../components/OperatorDashboard/DashboardStatCard.js";
import DashboardSectionHeader from "../components/OperatorDashboard/DashboardSectionHeader.js";
import DashboardFilterBar from "../components/OperatorDashboard/DashboardFilterBar.js";
import WorkflowFeed from "../components/OperatorDashboard/WorkflowFeed.js";
import ProjectList from "../components/OperatorDashboard/ProjectList.js";
import ProjectDetailPanel from "../components/OperatorDashboard/ProjectDetailPanel.js";
import ChapterHistoryTable from "../components/OperatorDashboard/ChapterHistoryTable.js";
import SourceFeed from "../components/OperatorDashboard/SourceFeed.js";

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

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function OperatorDashboard() {
  const apiUrl = useMemo(() => getApiUrl(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [error, setError] = useState("");

  const [platformHealth, setPlatformHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [workflowsByAgent, setWorkflowsByAgent] = useState([]);
  const [workflowsByKey, setWorkflowsByKey] = useState([]);

  const [projects, setProjects] = useState([]);
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [sources, setSources] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectChapters, setSelectedProjectChapters] = useState([]);
  const [selectedProjectWorkflows, setSelectedProjectWorkflows] = useState([]);

  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedWorkflowKey, setSelectedWorkflowKey] = useState("");

  async function fetchProjectDetail(projectId) {
    if (!projectId) {
      setSelectedProject(null);
      setSelectedProjectChapters([]);
      setSelectedProjectWorkflows([]);
      return;
    }

    const response = await fetch(`${apiUrl}/api/platform/projects/${projectId}`);
    const data = await readJson(response);

    setSelectedProject(data?.project || null);
    setSelectedProjectChapters(Array.isArray(data?.chapters) ? data.chapters : []);
    setSelectedProjectWorkflows(
      Array.isArray(data?.workflowRuns) ? data.workflowRuns : []
    );
  }

  async function fetchDashboardData() {
    const [
      healthRes,
      summaryRes,
      projectsRes,
      workflowsRes,
      sourcesRes,
    ] = await Promise.all([
      fetch(`${apiUrl}/api/platform/health`),
      fetch(`${apiUrl}/api/platform/summary`),
      fetch(`${apiUrl}/api/platform/projects?limit=20`),
      fetch(`${apiUrl}/api/platform/workflows/recent?limit=20`),
      fetch(`${apiUrl}/api/platform/sources/recent?limit=20`),
    ]);

    const [
      healthData,
      summaryData,
      projectsData,
      workflowsData,
      sourcesData,
    ] = await Promise.all([
      readJson(healthRes),
      readJson(summaryRes),
      readJson(projectsRes),
      readJson(workflowsRes),
      readJson(sourcesRes),
    ]);

    setPlatformHealth(healthData);
    setSummary(summaryData?.summary || null);
    setWorkflowsByAgent(
      Array.isArray(summaryData?.workflowsByAgent)
        ? summaryData.workflowsByAgent
        : []
    );
    setWorkflowsByKey(
      Array.isArray(summaryData?.workflowsByKey)
        ? summaryData.workflowsByKey
        : []
    );
    setProjects(Array.isArray(projectsData?.projects) ? projectsData.projects : []);
    setWorkflowRuns(
      Array.isArray(workflowsData?.workflowRuns) ? workflowsData.workflowRuns : []
    );
    setSources(Array.isArray(sourcesData?.sources) ? sourcesData.sources : []);

    return {
      projects: Array.isArray(projectsData?.projects) ? projectsData.projects : [],
    };
  }

  async function applyFilters() {
    setApplyingFilters(true);
    setError("");

    try {
      const workflowUrl = new URL(`${apiUrl}/api/platform/workflows/filter`);
      workflowUrl.searchParams.set("limit", "20");
      if (selectedAgent) workflowUrl.searchParams.set("agent", selectedAgent);
      if (selectedWorkflowKey) {
        workflowUrl.searchParams.set("workflowKey", selectedWorkflowKey);
      }

      const response = await fetch(workflowUrl.toString());
      const data = await readJson(response);

      setWorkflowRuns(Array.isArray(data?.workflowRuns) ? data.workflowRuns : []);
    } catch (err) {
      setError(err.message || "Failed to apply filters.");
    } finally {
      setApplyingFilters(false);
    }
  }

  async function resetFilters() {
    setSelectedAgent("");
    setSelectedWorkflowKey("");
    setApplyingFilters(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/api/platform/workflows/recent?limit=20`);
      const data = await readJson(response);
      setWorkflowRuns(Array.isArray(data?.workflowRuns) ? data.workflowRuns : []);
    } catch (err) {
      setError(err.message || "Failed to reset filters.");
    } finally {
      setApplyingFilters(false);
    }
  }

  async function handleInitialLoad() {
    setLoading(true);
    setError("");

    try {
      const result = await fetchDashboardData();

      if (!selectedProjectId && result.projects.length > 0) {
        const firstId = result.projects[0].id;
        setSelectedProjectId(firstId);
        await fetchProjectDetail(firstId);
      }
    } catch (err) {
      setError(err.message || "Failed to load Operator Dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");

    try {
      await fetchDashboardData();

      if (selectedProjectId) {
        await fetchProjectDetail(selectedProjectId);
      }
    } catch (err) {
      setError(err.message || "Failed to refresh dashboard.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleProjectSelect(projectId) {
    setSelectedProjectId(projectId);
    setError("");

    try {
      await fetchProjectDetail(projectId);
    } catch (err) {
      setError(err.message || "Failed to load project.");
    }
  }

  useEffect(() => {
    handleInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="operator-dashboard-page os-panel os-page-enter os-breathe">
        <div className="op-loading-shell">
          <div className="op-loading-title">Operator Dashboard v3</div>
          <div className="op-loading-text">Loading Aigenikz platform intelligence...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="operator-dashboard-page os-panel os-page-enter os-breathe text-white">
      <div className="operator-dashboard-header">
        <div>
          <h1>🧠 Aigenikz Operator Dashboard v3</h1>
          <p>
            Full operational visibility across agents, workflows, projects,
            chapters, and source intelligence.
          </p>
        </div>

        <div className="operator-dashboard-header-actions">
          <button
            className="op-btn op-btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Dashboard"}
          </button>
        </div>
      </div>

      {error ? <div className="op-error-banner">{error}</div> : null}

      <div className="op-stats-grid">
        <DashboardStatCard
          label="Platform Health"
          value={platformHealth?.ok ? "ONLINE" : "OFFLINE"}
          subtext={platformHealth?.service || "Unknown service"}
        />
        <DashboardStatCard
          label="Total Projects"
          value={summary?.totalProjects ?? 0}
          subtext={`Latest update: ${formatDateTime(summary?.latestProjectUpdatedAt)}`}
        />
        <DashboardStatCard
          label="Total Workflow Runs"
          value={summary?.totalWorkflowRuns ?? 0}
          subtext={`Latest run: ${formatDateTime(summary?.latestWorkflowAt)}`}
        />
        <DashboardStatCard
          label="Research Sources"
          value={summary?.totalResearchSources ?? 0}
          subtext="Persisted source records"
        />
        <DashboardStatCard
          label="Book Chapters"
          value={summary?.totalBookChapters ?? 0}
          subtext={selectedProject?.title || "Platform-wide chapter count"}
        />
      </div>

      <div className="op-main-grid">
        <section className="op-panel-card op-panel-card-wide">
          <DashboardSectionHeader
            title="Workflow Intelligence Filters"
            subtitle="Filter global workflow telemetry by agent and workflow type."
          />

          <DashboardFilterBar
            agentOptions={workflowsByAgent}
            workflowOptions={workflowsByKey}
            selectedAgent={selectedAgent}
            selectedWorkflowKey={selectedWorkflowKey}
            onAgentChange={setSelectedAgent}
            onWorkflowKeyChange={setSelectedWorkflowKey}
            onApply={applyFilters}
            onReset={resetFilters}
            applying={applyingFilters}
          />

          <div className="op-summary-chips">
            {workflowsByAgent.map((item) => (
              <span key={item.agent} className="op-chip">
                {item.agent}: {item.count}
              </span>
            ))}
            {workflowsByKey.map((item) => (
              <span key={item.workflowKey} className="op-chip op-chip-secondary">
                {item.workflowKey}: {item.count}
              </span>
            ))}
          </div>
        </section>

        <section className="op-panel-card">
          <DashboardSectionHeader
            title="Project Control"
            subtitle="Persistent platform project inspection."
          />
          <ProjectDetailPanel project={selectedProject} />
        </section>

        <section className="op-panel-card">
          <DashboardSectionHeader
            title="Recent Projects"
            subtitle="Select a project to inspect chapters and workflow history."
          />
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={handleProjectSelect}
          />
        </section>

        <section className="op-panel-card op-panel-card-wide">
          <DashboardSectionHeader
            title="Selected Project Chapter History"
            subtitle="Drafted chapter records saved to persistence."
          />
          <ChapterHistoryTable chapters={selectedProjectChapters} />
        </section>

        <section className="op-panel-card op-panel-card-wide">
          <DashboardSectionHeader
            title="Selected Project Workflow History"
            subtitle="Workflow runs linked to the selected project."
          />
          <WorkflowFeed
            items={selectedProjectWorkflows}
            emptyText="No workflow runs found for the selected project."
          />
        </section>

        <section className="op-panel-card">
          <DashboardSectionHeader
            title="Global Workflow Feed"
            subtitle="Filtered or recent platform-wide workflow activity."
          />
          <WorkflowFeed items={workflowRuns} />
        </section>

        <section className="op-panel-card">
          <DashboardSectionHeader
            title="Recent Research Sources"
            subtitle="Latest saved research artifacts."
          />
          <SourceFeed items={sources} />
        </section>
      </div>
    </div>
  );
}