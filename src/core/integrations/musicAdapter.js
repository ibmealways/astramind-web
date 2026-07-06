export async function generateSong(prompt) {
  if (!process.env.SUNO_API_KEY) {
    console.warn("⚠️ Missing Suno API Key");
  }

  return {
    title: "Generated Track",
    lyrics: `🎵 ${prompt}`,
    audioUrl: null,
  };
}

export function routeBeatEngine(style) {
  if (style === "trap") return "Splice";
  if (style === "melodic") return "Arcade";
  if (style === "advanced") return "Reason";
  return "Default Engine";
}