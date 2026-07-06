import React from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function truncate(text = "", max = 180) {
  const value = String(text || "");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export default function WorkflowFeed({ items, emptyText = "No workflow runs found." }) {
  if (!items.length) {
    return <div className="op-empty-state">{emptyText}</div>;
  }

  return (
    <div className="op-list">
      {items.map((run) => (
        <div key={run.id} className="op-feed-item">
          <div className="op-feed-top">
            <span className="op-chip">{run.workflowKey}</span>
            <span className="op-chip op-chip-secondary">
              {run.primaryAgent}
            </span>
            <span className="op-time">{formatDateTime(run.createdAt)}</span>
          </div>
          <div className="op-feed-title">
            {truncate(run.inputText || "No input text", 140)}
          </div>
          <div className="op-feed-text">
            {truncate(run.resultText || "No result text", 240)}
          </div>
        </div>
      ))}
    </div>
  );
}