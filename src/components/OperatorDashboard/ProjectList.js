import React from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function truncate(text = "", max = 120) {
  const value = String(text || "");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export default function ProjectList({
  projects,
  selectedProjectId,
  onSelect,
}) {
  if (!projects.length) {
    return <div className="op-empty-state">No projects found.</div>;
  }

  return (
    <div className="op-list">
      {projects.map((project) => (
        <button
          key={project.id}
          className={`op-list-item ${
            selectedProjectId === project.id ? "is-active" : ""
          }`}
          onClick={() => onSelect(project.id)}
        >
          <div className="op-list-item-top">
            <span className="op-chip">{project.type || "project"}</span>
            <span className="op-time">{formatDateTime(project.updatedAt)}</span>
          </div>
          <div className="op-list-item-title">
            {project.title || "Untitled Project"}
          </div>
          <div className="op-list-item-text">
            {truncate(project.summary || project.topic || "No summary.")}
          </div>
        </button>
      ))}
    </div>
  );
}