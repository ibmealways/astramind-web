import React from "react";

export default function DashboardFilterBar({
  agentOptions,
  workflowOptions,
  selectedAgent,
  selectedWorkflowKey,
  onAgentChange,
  onWorkflowKeyChange,
  onApply,
  onReset,
  applying,
}) {
  return (
    <div className="op-filter-bar">
      <div className="op-filter-group">
        <label className="op-label" htmlFor="agent-filter">
          Agent Filter
        </label>
        <select
          id="agent-filter"
          className="op-input"
          value={selectedAgent}
          onChange={(e) => onAgentChange(e.target.value)}
        >
          <option value="">All agents</option>
          {agentOptions.map((item) => (
            <option key={item.agent} value={item.agent}>
              {item.agent} ({item.count})
            </option>
          ))}
        </select>
      </div>

      <div className="op-filter-group">
        <label className="op-label" htmlFor="workflow-filter">
          Workflow Filter
        </label>
        <select
          id="workflow-filter"
          className="op-input"
          value={selectedWorkflowKey}
          onChange={(e) => onWorkflowKeyChange(e.target.value)}
        >
          <option value="">All workflows</option>
          {workflowOptions.map((item) => (
            <option key={item.workflowKey} value={item.workflowKey}>
              {item.workflowKey} ({item.count})
            </option>
          ))}
        </select>
      </div>

      <div className="op-filter-actions">
        <button
          className="op-btn op-btn-primary"
          onClick={onApply}
          disabled={applying}
        >
          {applying ? "Applying..." : "Apply Filters"}
        </button>

        <button className="op-btn op-btn-ghost" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}