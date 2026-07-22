export async function routeTool({ type, prompt }) {
  console.log("🧠 TOOL ROUTER:", type);

  if (type === "video") {
    return {
      type: "video",
      script: `🎬 Video Script:\n\n${prompt}`,
      platformPack: {
        tiktok: {
          caption: "🔥 Viral content",
          hashtags: ["#fyp", "#viral", "#pressurewashing"]
        },
        instagram: {
          caption: "Clean transformation 🔥",
          hashtags: ["#reels", "#cleaning"]
        }
      }
    };
  }

  if (type === "music") {
    return {
      type: "music",
      lyrics: "🎵 Generated song...",
    };
  }

  if (type === "design") {
    return {
      type: "design",
      concept: "🎨 Design concept generated",
    };
  }

  if (type === "finance") {
    return {
      type: "finance",
      analysis: "📊 Market insight generated",
    };
  }

  return {
    type: "general",
    content: "Default response",
  };
}
