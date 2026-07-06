import React from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ProjectDetailPanel({ project }) {
  if (!project) {
    return <div className="op-empty-state">No persistent project selected.</div>;
  }

  return (
    <div className="op-project-detail">
      <div className="op-detail-grid">
        <div className="op-detail-item">
          <span className="op-detail-label">Title</span>
          <span className="op-detail-value">{project.title || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Type</span>
          <span className="op-detail-value">{project.type || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Topic</span>
          <span className="op-detail-value">{project.topic || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Tone</span>
          <span className="op-detail-value">{project.tone || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Audience</span>
          <span className="op-detail-value">{project.audience || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Intensity</span>
          <span className="op-detail-value">{project.intensity || "—"}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Created</span>
          <span className="op-detail-value">{formatDateTime(project.createdAt)}</span>
        </div>
        <div className="op-detail-item">
          <span className="op-detail-label">Updated</span>
          <span className="op-detail-value">{formatDateTime(project.updatedAt)}</span>
        </div>
      </div>

      <div className="op-summary-block">
        <div className="op-detail-label">Summary</div>
        <div className="op-summary-text">
          {project.summary || "No summary available."}
        </div>
      </div>
    </div>
  );
}