// src/core/video/socialPublisherEngine.js
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const EXPORTS_DIR = path.join(
  ROOT,
  "server-renders",
  "social-exports"
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function assertFile(filePath, label = "file") {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath}`);
  }
}

function safeSlug(value = "social-post") {
  return (
    String(value || "social-post")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100) || "social-post"
  );
}

function nowIso() {
  return new Date().toISOString();
}

function buildDefaultCaption({
  topic = "",
  platform = "",
} = {}) {
  return [
    `🚀 ${topic}`,
    ``,
    `Built with AstraMind Vision Pipeline`,
    ``,
    `#AI #Automation #ContentCreation #AstraMind #${platform.replace(
      /\s+/g,
      ""
    )}`,
  ].join("\n");
}

async function fakeUploadDelay(ms = 1500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/*
  TikTok
*/
export async function publishToTikTok({
  videoPath,
  title,
  caption,
  accessToken = process.env.TIKTOK_ACCESS_TOKEN,
} = {}) {
  assertFile(videoPath, "TikTok video");

  console.log("📲 TIKTOK PUBLISH START");

  /*
    Placeholder for official TikTok Content Posting API
  */

  if (!accessToken) {
    console.warn(
      "⚠️ Missing TIKTOK_ACCESS_TOKEN. Returning queued export."
    );

    return {
      ok: false,
      queued: true,
      platform: "TikTok",
      error: "Missing TikTok access token.",
      createdAt: nowIso(),
    };
  }

  await fakeUploadDelay();

  console.log("✅ TikTok publish simulated");

  return {
    ok: true,
    platform: "TikTok",
    title,
    caption,
    simulated: true,
    createdAt: nowIso(),
  };
}

/*
  Instagram / Meta
*/
export async function publishToInstagram({
  videoPath,
  caption,
  accessToken = process.env.META_ACCESS_TOKEN,
  instagramUserId = process.env.INSTAGRAM_USER_ID,
} = {}) {
  assertFile(videoPath, "Instagram video");

  console.log("📸 INSTAGRAM PUBLISH START");

  if (!accessToken || !instagramUserId) {
    console.warn(
      "⚠️ Missing Meta/Instagram credentials."
    );

    return {
      ok: false,
      queued: true,
      platform: "Instagram",
      error: "Missing Instagram credentials.",
      createdAt: nowIso(),
    };
  }

  await fakeUploadDelay();

  console.log("✅ Instagram publish simulated");

  return {
    ok: true,
    platform: "Instagram",
    caption,
    simulated: true,
    createdAt: nowIso(),
  };
}

/*
  Rumble
*/
export async function publishToRumble({
  videoPath,
  title,
  description,
  apiKey = process.env.RUMBLE_API_KEY,
} = {}) {
  assertFile(videoPath, "Rumble video");

  console.log("📺 RUMBLE PUBLISH START");

  if (!apiKey) {
    console.warn(
      "⚠️ Missing RUMBLE_API_KEY."
    );

    return {
      ok: false,
      queued: true,
      platform: "Rumble",
      error: "Missing Rumble API key.",
      createdAt: nowIso(),
    };
  }

  await fakeUploadDelay();

  console.log("✅ Rumble publish simulated");

  return {
    ok: true,
    platform: "Rumble",
    title,
    description,
    simulated: true,
    createdAt: nowIso(),
  };
}

/*
  YouTube Shorts
*/
export async function publishToYouTubeShorts({
  videoPath,
  title,
  description,
  accessToken = process.env.YOUTUBE_ACCESS_TOKEN,
} = {}) {
  assertFile(videoPath, "YouTube Shorts video");

  console.log("▶️ YOUTUBE SHORTS PUBLISH START");

  if (!accessToken) {
    console.warn(
      "⚠️ Missing YOUTUBE_ACCESS_TOKEN."
    );

    return {
      ok: false,
      queued: true,
      platform: "YouTube Shorts",
      error: "Missing YouTube access token.",
      createdAt: nowIso(),
    };
  }

  await fakeUploadDelay();

  console.log("✅ YouTube Shorts publish simulated");

  return {
    ok: true,
    platform: "YouTube Shorts",
    title,
    description,
    simulated: true,
    createdAt: nowIso(),
  };
}

/*
  Universal Export Package
*/
export async function createSocialExportPackage({
  videoPath,
  topic = "AstraMind Video",
  platforms = [
    "TikTok",
    "Instagram",
    "Rumble",
    "YouTube Shorts",
  ],
} = {}) {
  assertFile(videoPath, "Social export video");

  ensureDir(EXPORTS_DIR);

  const exportId = `${safeSlug(topic)}_${Date.now()}`;

  const exportFolder = path.join(
    EXPORTS_DIR,
    exportId
  );

  ensureDir(exportFolder);

  const captionMap = {};

  platforms.forEach((platform) => {
    captionMap[platform] = buildDefaultCaption({
      topic,
      platform,
    });
  });

  const metadata = {
    exportId,
    topic,
    platforms,
    videoPath,
    captions: captionMap,
    createdAt: nowIso(),
  };

  const metadataPath = path.join(
    exportFolder,
    "social-package.json"
  );

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(metadata, null, 2)
  );

  console.log("📦 Social export package created");

  return {
    ok: true,
    exportId,
    exportFolder,
    metadataPath,
    captions: captionMap,
    createdAt: metadata.createdAt,
  };
}

/*
  Universal Multi-Platform Publisher
*/
export async function publishEverywhere({
  videoPath,
  topic = "AstraMind Video",
  platforms = [
    "TikTok",
    "Instagram",
    "Rumble",
    "YouTube Shorts",
  ],
} = {}) {
  assertFile(videoPath, "Publish video");

  const caption = buildDefaultCaption({
    topic,
    platform: "AstraMind",
  });

  const results = [];

  if (platforms.includes("TikTok")) {
    results.push(
      await publishToTikTok({
        videoPath,
        title: topic,
        caption,
      })
    );
  }

  if (platforms.includes("Instagram")) {
    results.push(
      await publishToInstagram({
        videoPath,
        caption,
      })
    );
  }

  if (platforms.includes("Rumble")) {
    results.push(
      await publishToRumble({
        videoPath,
        title: topic,
        description: caption,
      })
    );
  }

  if (platforms.includes("YouTube Shorts")) {
    results.push(
      await publishToYouTubeShorts({
        videoPath,
        title: topic,
        description: caption,
      })
    );
  }

  console.log("🌍 MULTI-PLATFORM PUBLISH COMPLETE");

  return {
    ok: true,
    topic,
    results,
    createdAt: nowIso(),
  };
}

export default {
  publishToTikTok,
  publishToInstagram,
  publishToRumble,
  publishToYouTubeShorts,
  createSocialExportPackage,
  publishEverywhere,
};