export function generatePlatformPack({ content, prompt }) {
  const baseText = content?.toString().slice(0, 500) || prompt;

  return {
    tiktok: buildTikTokPack(baseText),
    instagram: buildInstagramPack(baseText),
    twitter: buildTwitterPack(baseText),
    thumbnail: buildThumbnailPrompt(prompt),
  };
}

// 🎯 TIKTOK
function buildTikTokPack(text) {
  return {
    caption: `🔥 ${text.slice(0, 120)}...\n\nFollow for more 💯`,
    hashtags: [
      "#fyp",
      "#viral",
      "#trending",
      "#foryou",
      "#contentcreator",
      "#sidehustle",
    ],
    hook: "WAIT… you need to see this 👀",
    cta: "Follow for more 🔥",
  };
}

// 📸 INSTAGRAM
function buildInstagramPack(text) {
  return {
    caption: `${text.slice(0, 150)}...\n\n✨ Save this for later\n👇 Follow for more`,
    hashtags: [
      "#instagramreels",
      "#explorepage",
      "#viralreels",
      "#growthmindset",
      "#branding",
    ],
    hook: "This changes everything…",
    cta: "Save + Share 💾",
  };
}

// 🐦 TWITTER
function buildTwitterPack(text) {
  return {
    caption: `${text.slice(0, 200)}...`,
    hashtags: ["#AI", "#ContentCreation", "#Startup"],
    hook: "Quick insight:",
    cta: "RT if this helped",
  };
}

// 🎨 THUMBNAIL (CANVA / AI IMAGE READY)
function buildThumbnailPrompt(prompt) {
  return `High contrast viral thumbnail, bold text, dramatic lighting, subject: ${prompt}, cinematic, YouTube style, 4K, attention grabbing`;
}
