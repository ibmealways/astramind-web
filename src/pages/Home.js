// src/pages/Home.js
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { loadCreatorMemory } from "../core/memory/creatorMemory.js";
import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";

export default function Home() {
  const creator = loadCreatorMemory();
  const { setMode } = useOSMode();

  useEffect(() => {
    setMode(OS_MODES.HOME);
  }, [setMode]);

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-amber-400 drop-shadow-md">
            🚀 Welcome to Aigenikz
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Your Personal AI Operating System
          </p>

          {creator && (
            <p className="mt-2 text-xs text-emerald-400">
              OS Loaded · {creator.niche} · {creator.platform} · {creator.tone}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <OSCard to="/chat" title="🤖 AI Chat" desc="Talk to Aigenikz in real time." />
          <OSCard to="/finance" title="💰 Finance" desc="Track income, expenses, and insights." />
          <OSCard to="/content" title="🎨 Content" desc="Design, generate, and manage content." />
          <OSCard to="/content-lab" title="🧠 Content Lab" desc="Generate content strategies with intelligence." />
          <OSCard to="/settings" title="⚙️ Settings" desc="Customize Aigenikz behavior." />
        </div>

        <div className="mt-8 text-center text-[10px] text-gray-500">
          Aigenikz Intelligence OS · © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

function OSCard({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="os-tile os-hover os-focus bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl
                 shadow-[0_0_30px_rgba(99,102,241,0.10)] hover:shadow-[0_0_45px_rgba(99,102,241,0.18)]
                 transition-all duration-300"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-xs text-gray-300 mt-1">{desc}</div>
    </Link>
  );
}




