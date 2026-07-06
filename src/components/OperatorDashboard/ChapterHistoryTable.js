import React from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function truncate(text = "", max = 100) {
  const value = String(text || "");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export default function ChapterHistoryTable({ chapters }) {
  if (!chapters.length) {
    return (
      <div className="op-empty-state">
        No chapters stored for this project yet.
      </div>
    );
  }

  return (
    <div className="op-table-wrap">
      <table className="op-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Purpose</th>
            <th>Tone</th>
            <th>Intensity</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((chapter) => (
            <tr key={`${chapter.projectId}-${chapter.chapterNumber}`}>
              <td>{chapter.chapterNumber}</td>
              <td>{chapter.title || "Untitled Chapter"}</td>
              <td>{truncate(chapter.purpose || "—")}</td>
              <td>{chapter.tone || "—"}</td>
              <td>{chapter.intensity || "—"}</td>
              <td>{formatDateTime(chapter.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}