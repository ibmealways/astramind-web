// src/pages/modules/FinanceExpenses.js
import React, { useEffect } from "react";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";

export default function FinanceExpenses() {
  const { setMode } = useOSMode();
  useEffect(() => setMode(OS_MODES.FINANCE), [setMode]);

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full p-6 text-white">
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-extrabold text-red-200 mb-2">📉 Expenses Module</h1>
        <p className="text-sm text-gray-300">Active placeholder — ready to wire real data today.</p>
      </div>
    </div>
  );
}
