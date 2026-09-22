import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

const navGroups = [
  {
    title: "Core",
    items: [
      { to: "/", label: "Home", icon: "🏠" },
      { to: "/chat", label: "Aigenikz Chat", icon: "💬" },
      { to: "/control-center", label: "Control Center", icon: "⚡" },
      { to: "/research", label: "Research Workspace", icon: "📚" },
      { to: "/setup", label: "Creator Setup", icon: "🛠️" },
      { to: "/creator-dashboard", label: "Creator Dashboard", icon: "🧠" },
      { to: "/operator-dashboard", label: "Operator Dashboard", icon: "🧬" },
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
      { to: "/project-library", label: "Project Library", icon: "\u{1F5C2}" },
      { to: "/project-library", label: "Project Library", icon: "\u{1F5C2}" },
      { to: "/content", label: "Content Creator", icon: "🎬" },
      { to: "/content-lab/latest", label: "Content Lab", icon: "🧪" },
      { to: "/content/script", label: "Script Writer", icon: "✍️" },
      { to: "/content/image", label: "Image Studio", icon: "🖼️" },
      { to: "/content/video", label: "Video Studio", icon: "🎥" },
      { to: "/content/audio", label: "Audio / Music", icon: "🎵" },
      { to: "/content/book", label: "Book Writer", icon: "📖" },
    ],
  },
  {
    title: "System",
    items: [{ to: "/settings", label: "Settings", icon: "⚙️" }],
  },
];

function SidebarLink({ to, label, icon, collapsed }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      title={collapsed ? label : ""}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
      }
    >
      <span className="sidebar-link-icon">{icon}</span>
      {!collapsed && <span className="sidebar-link-text">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches
  );

  useEffect(() => {
    if (window.matchMedia("(max-width: 980px)").matches) {
      setCollapsed(true);
    }
  }, [location.pathname]);

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

  const handleLogout = () => {
    logout?.();
    navigate("/login");
  };

  return (
    <>
    {!collapsed && (
      <button
        type="button"
        className="sidebar-backdrop"
        onClick={() => setCollapsed(true)}
        aria-label="Close navigation menu"
      />
    )}
    <aside className={`sidebar-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-glow" />

      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-orb">
            <span>✦</span>
          </div>

          {!collapsed && (
            <div className="sidebar-brand-copy">
              <h2>Aigenikz</h2>
              <p>Adaptive Creator OS</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-status-card">
            <span className="sidebar-status-dot" />
            <div>
              <strong>System Online</strong>
              <p>Chat • Content • Finance • Research</p>
            </div>
          </div>
        )}
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
                <SidebarLink
                  key={item.to}
                  {...item}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sidebar-footer">
        {!collapsed ? (
          <>
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">
                {(user?.name || "I").slice(0, 1).toUpperCase()}
              </div>

              <div className="sidebar-user-info">
                <strong>{user?.name || "Ivan Perez"}</strong>
                <span>{user?.plan || "starter"} plan</span>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-logout-btn"
              >
                Logout
              </button>
            ) : (
              <div className="sidebar-footer-pill">
                Hybrid AI • Voice • Memory • Agents
              </div>
            )}
          </>
        ) : (
          <div className="sidebar-user-avatar sidebar-user-avatar-small">
            {(user?.name || "I").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

