// src/components/Sidebar.js
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const navLinks = [
    { to: "/", label: "🏠 Home" },
    { to: "/chat", label: "💬 AI Chat" },
    { to: "/finance", label: "💰 Finance" },
    { to: "/content", label: "🎨 Content" },
    { to: "/settings", label: "⚙️ Settings" },
  ];

  return (
    <aside className="w-full md:w-64 bg-gradient-to-br from-gray-900 to-blue-800 text-white shadow-lg min-h-screen p-6">
      <h2 className="text-2xl font-extrabold mb-8 text-center tracking-wide">🚀 AstraMind</h2>
      <nav className="flex flex-col gap-4">
        {navLinks.map((link, index) => (
          <NavLink
            key={index}
            to={link.to}
            className={({ isActive }) =>
              `transition duration-300 px-4 py-2 rounded-lg hover:bg-blue-700 ${
                isActive ? "bg-blue-600 font-bold" : "bg-gray-800"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

