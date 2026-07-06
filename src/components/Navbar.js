import React, { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navGroups = [
  {
    title: "Core",
    items: [
      { to: "/", label: "Home", icon: "🏠" },
      { to: "/setup", label: "Creator Setup", icon: "🛠️" },
      { to: "/chat", label: "Chat", icon: "💬" },
    ],
  },
  {
    title: "Finance OS",
    items: [
      { to: "/finance", label: "Finance Hub", icon: "💸" },
      { to: "/finance/income", label: "Income", icon: "📈" },
      { to: "/finance/expenses", label: "Expenses", icon: "📉" },
      { to: "/finance/savings", label: "Savings", icon: "🏦" },
    ],
  },
  {
    title: "Content Creation OS",
    items: [
      { to: "/content", label: "Content Creator", icon: "🎬" },
      { to: "/content-lab", label: "Content Lab", icon: "🧪" },
      { to: "/content/script", label: "Script Writer", icon: "✍️" },
      { to: "/content/image", label: "Image Studio", icon: "🖼️" },
      { to: "/content/video", label: "Video Studio", icon: "🎥" },
      { to: "/content/audio", label: "Audio / Music", icon: "🎵" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

function SidebarLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
      }
    >
      <span className="sidebar-link-icon">{icon}</span>
      <span className="sidebar-link-text">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const activeGroupTitles = useMemo(() => {
    return navGroups
      .filter((group) =>
        group.items.some((item) =>
          item.to === "/"
            ? location.pathname === "/"
            : location.pathname === item.to ||
              location.pathname.startsWith(`${item.to}/`)
        )
      )
      .map((group) => group.title);
  }, [location.pathname]);

  return (
    <aside className={`sidebar-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-top">
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-orb" />

          {!collapsed && (
            <div className="sidebar-brand-copy">
              <h2>AstraMind</h2>
              <p>Adaptive Creator OS</p>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-scroll">
        {navGroups.map((group) => (
          <section key={group.title} className="sidebar-group">
            {!collapsed && (
              <div
                className={`sidebar-group-title ${
                  activeGroupTitles.includes(group.title)
                    ? "sidebar-group-title-active"
                    : ""
                }`}
              >
                {group.title}
              </div>
            )}

            <div className="sidebar-group-links">
              {group.items.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-pill">
            Hybrid AI • Voice • Memory
          </div>
        </div>
      )}
    </aside>
  );
}
