// src/core/content/aiVisualEngine.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const RENDERS_DIR = path.join(PUBLIC_DIR, "renders");
const VISUALS_DIR = path.join(RENDERS_DIR, "visuals");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeSlug(value = "astramind-visual") {
  return String(value || "astramind-visual")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}

function escapeXml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildSceneVisualPrompt({
  scene = {},
  topic = "",
  platform = "TikTok",
  style = "",
}) {
  return `
Create a vertical 9:16 cinematic image for a short-form video.

TOPIC:
${topic}

PLATFORM:
${platform}

STYLE:
${style || "cinematic futuristic high-energy"}

SCENE TITLE:
${scene.title || "Scene"}

VISUAL CONTEXT:
${scene.visual || scene.caption || scene.voiceover || topic}

VOICEOVER:
${scene.voiceover || ""}

CAPTION THEME:
${scene.caption || ""}

Direction:
Premium futuristic AI brand, cinematic lighting, realistic detail, strong depth, clean space for captions, no real company logos, no unreadable text.
`.trim();
}

async function generateOpenAIImage({ prompt, outputPath }) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ Missing OPENAI_API_KEY. Using fallback scene visual.");
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1536",
      n: 1,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("🔥 OpenAI Image API error:", data);
    return null;
  }

  const imageBase64 = data?.data?.[0]?.b64_json;

  if (!imageBase64) {
    console.warn("⚠️ Image API returned no image. Using fallback.");
    return null;
  }

  fs.writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));
  return outputPath;
}

export async function createFallbackSceneImage({
  outputPath,
  scene = {},
  topic = "AstraMind",
  index = 0,
}) {
  const title = scene.title || `Scene ${index + 1}`;
  const caption = scene.caption || scene.voiceover || "Build smarter today";

  const svg = `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#050816"/>
        <stop offset="45%" stop-color="#172554"/>
        <stop offset="100%" stop-color="#581c87"/>
      </linearGradient>
      <radialGradient id="orb" cx="50%" cy="42%" r="50%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95"/>
        <stop offset="45%" stop-color="#6366f1" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#111827" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="540" cy="720" r="360" fill="url(#orb)" opacity="0.9"/>
    <circle cx="540" cy="720" r="220" fill="#38bdf8" opacity="0.22"/>
    <circle cx="540" cy="720" r="120" fill="#67e8f9" opacity="0.35"/>

    <text x="90" y="150" fill="#67e8f9" font-size="46" font-weight="800" font-family="Arial">
      ASTRAMIND
    </text>

    <text x="90" y="240" fill="#ffffff" font-size="34" font-weight="700" font-family="Arial">
      ${escapeXml(title)}
    </text>

    <foreignObject x="90" y="820" width="900" height="500">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial;
        color: white;
        font-size: 66px;
        font-weight: 900;
        line-height: 1.1;
        text-shadow: 0 10px 35px rgba(0,0,0,0.55);
      ">
        ${escapeXml(caption)}
      </div>
    </foreignObject>

    <foreignObject x="90" y="1650" width="900" height="120">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial;
        color: rgba(255,255,255,0.72);
        font-size: 28px;
        font-weight: 600;
      ">
        ${escapeXml(topic)}
      </div>
    </foreignObject>

    <text x="90" y="1825" fill="rgba(255,255,255,0.55)" font-size="24" font-family="Arial">
      Powered by AstraMind Video Studio
    </text>
  </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}

export async function generateSceneVisuals({
  scenes = [],
  evolvedScenes = [],
  topic = "AstraMind Video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  projectId = `visual_${Date.now()}`,
}) {
  ensureDir(RENDERS_DIR);
  ensureDir(VISUALS_DIR);

  const visualResults = [];
  const sourceScenes =
  Array.isArray(evolvedScenes) &&
  evolvedScenes.length > 0
    ? evolvedScenes
    : scenes;

  for (let index = 0; index < sourceScenes.length; index += 1) {
  const scene = sourceScenes[index] || {};

    const baseName = `${safeSlug(projectId)}-scene-${String(index + 1).padStart(
      2,
      "0"
    )}.png`;

    const outputPath = path.join(VISUALS_DIR, baseName);
    const publicUrl = `/renders/visuals/${baseName}`;

    const prompt = buildSceneVisualPrompt({
      scene,
      topic,
      platform,
      style,
    });

    let imagePath = null;
    let source = "fallback";

    try {
      imagePath = await generateOpenAIImage({
        prompt,
        outputPath,
      });

      if (imagePath && fs.existsSync(imagePath)) {
        source = "openai-image";
        console.log(`✅ AI visual generated for scene ${index + 1}:`, imagePath);
      }
    } catch (error) {
      console.warn(`⚠️ AI visual error for scene ${index + 1}:`, error.message);
      imagePath = null;
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      imagePath = await createFallbackSceneImage({
        outputPath,
        scene,
        topic,
        index,
      });

      source = "fallback";
      console.log(`✅ Fallback visual created for scene ${index + 1}:`, imagePath);
    }

    if (
  Array.isArray(scene.shots) &&
  scene.shots.length > 0
) {
  scene.shots.forEach((shot, shotIndex) => {
    visualResults.push({
      sceneId:
        scene.sceneId ||
        scene.id ||
        `scene_${index + 1}`,

      shotId:
        shot.id ||
        `${scene.sceneId}_shot_${shotIndex + 1}`,

      shotIndex,

      sceneIndex: index,

      imagePath,
      publicUrl,

      prompt:
        shot.imagePrompt ||
        shot.visualPrompt ||
        prompt,

      source,
    });
  });
} else {
  visualResults.push({
    sceneId:
      scene.id ||
      `scene_${index + 1}`,

    sceneIndex: index,

    imagePath,
    publicUrl,

    prompt,
    source,
  });
}
  }

  return visualResults;
}