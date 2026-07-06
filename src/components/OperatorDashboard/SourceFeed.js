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

export default function SourceFeed({ items }) {
  if (!items.length) {
    return <div className="op-empty-state">No research sources found.</div>;
  }

  return (
    <div className="op-list">
      {items.map((source) => (
        <div key={source.id} className="op-feed-item">
          <div className="op-feed-top">
            <span className="op-chip">{source.category || "research"}</span>
            <span className="op-time">{formatDateTime(source.createdAt)}</span>
          </div>
          <div className="op-feed-title">
            {source.title || "Untitled Source"}
          </div>
          <div className="op-feed-text">
            {truncate(source.snippet || "No snippet available.")}
          </div>
          <div className="op-link-row">
            <span className="op-meta-muted">
              {source.sourceName || "Unknown source"}
            </span>
            {source.url ? (
              <a
                className="op-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                Open source
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}