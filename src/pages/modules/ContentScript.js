// src/pages/modules/ContentScript.js
import React, { useEffect } from "react";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";

export default function ContentScript() {
  const { setMode } = useOSMode();
  useEffect(() => setMode(OS_MODES.CONTENT), [setMode]);

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full p-6 text-white">
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-extrabold text-purple-200 mb-2">📝 Script Generator</h1>
        <p className="text-sm text-gray-300">Active placeholder — wire prompt templates next.</p>
      </div>
    </div>
  );
}
