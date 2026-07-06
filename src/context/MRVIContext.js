import React, { createContext, useContext, useState, useEffect } from "react";

/*
  MRVI = Mode-Reactive Visual Intelligence
  This controls global UI intensity, glow, focus, and system “aliveness”
*/

const MRVIContext = createContext(null);

export function MRVIProvider({ children }) {
  const [mrvi, setMRVI] = useState({
    intensity: 0.6,      // 0 → 1 (visual strength)
    glow: true,          // UI glow on/off
    motion: true,        // subtle animations
    focusBoost: false,   // raised focus mode
    lastMode: null
  });

  /* 🔁 Persist MRVI state */
  useEffect(() => {
    const saved = localStorage.getItem("astramind_mrvi");
    if (saved) {
      try {
        setMRVI(JSON.parse(saved));
      } catch {
        /* ignore corrupt storage */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("astramind_mrvi", JSON.stringify(mrvi));
  }, [mrvi]);

  /* 🔷 Public API */
  const value = {
    mrvi,

    setIntensity: (v) =>
      setMRVI((s) => ({ ...s, intensity: Math.min(1, Math.max(0, v)) })),

    toggleGlow: () =>
      setMRVI((s) => ({ ...s, glow: !s.glow })),

    toggleMotion: () =>
      setMRVI((s) => ({ ...s, motion: !s.motion })),

    setFocusBoost: (v) =>
      setMRVI((s) => ({ ...s, focusBoost: v })),

    syncMode: (mode) =>
      setMRVI((s) => ({ ...s, lastMode: mode }))
  };

  return (
    <MRVIContext.Provider value={value}>
      {children}
    </MRVIContext.Provider>
  );
}

/* 🔷 Hook */
export function useMRVI() {
  const ctx = useContext(MRVIContext);
  if (!ctx) {
    throw new Error("useMRVI must be used inside MRVIProvider");
  }
  return ctx;
}
