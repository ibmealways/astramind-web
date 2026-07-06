// src/core/content/musicPrompts.js

export const MUSIC_PRESETS = [
  { id: "dark_trap", label: "Dark Trap", genre: "Trap", mood: "Dark", bpm: 140 },
  { id: "uplifting_pop", label: "Uplifting Pop", genre: "Pop", mood: "Uplifting", bpm: 120 },
  { id: "drill", label: "Drill", genre: "Drill", mood: "Aggressive", bpm: 145 },
  { id: "rnb_smooth", label: "Smooth R&B", genre: "R&B", mood: "Smooth", bpm: 92 },
  { id: "afro", label: "Afrobeat", genre: "Afrobeat", mood: "Warm", bpm: 108 },
];

export function buildMusicBlueprint({ mood, genre, bpm, useCase }) {
  const safeMood = mood?.trim() || "Confident";
  const safeGenre = genre?.trim() || "Hip-Hop";
  const safeBpm = Number(bpm) || 120;
  const safeUse = useCase?.trim() || "TikTok Hook";

  return {
    mood: safeMood,
    genre: safeGenre,
    bpm: safeBpm,
    useCase: safeUse,
    structure: [
      "Intro (2–4 bars)",
      "Hook (4–8 bars)",
      "Drop / Main (8–16 bars)",
      "Break (4–8 bars)",
      "Hook Repeat (4–8 bars)",
      "Outro (2–4 bars)",
    ],
    soundPalette: [
      "808 with controlled glide",
      "tight punchy kick",
      "snare/clap with short tail",
      "airy pad or bell lead",
      "simple counter-melody",
    ],
  };
}


