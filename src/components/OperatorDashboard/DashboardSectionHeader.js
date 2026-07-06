import React from "react";

export default function DashboardSectionHeader({ title, subtitle, actions }) {
  return (
    <div className="op-section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="op-section-actions">{actions}</div> : null}
    </div>
  );
}