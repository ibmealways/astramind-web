import React from "react";

export default function DashboardStatCard({ label, value, subtext }) {
  return (
    <div className="op-stat-card">
      <div className="op-stat-label">{label}</div>
      <div className="op-stat-value">{value}</div>
      {subtext ? <div className="op-stat-subtext">{subtext}</div> : null}
    </div>
  );
}