// src/core/video/aiFrameGenerator.js

import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

console.log(
  "🔥 AI FRAME GENERATOR LOADED"
);

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;

const IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL ||
  "gpt-image-1";

console.log(
  "OPENAI KEY EXISTS:",
  !!OPENAI_API_KEY
);

console.log(
  "IMAGE MODEL:",
  IMAGE_MODEL
);

const PROJECT_ROOT =
  process.cwd();

const RENDERS_DIR =
  path.join(
    PROJECT_ROOT,
    "server-renders"
  );

const FRAMES_DIR =
  path.join(
    RENDERS_DIR,
    "vision-v2",
    "frames"
  );

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function safeSlug(
  value = "ai-frame"
) {
  return (
    String(value || "ai-frame")
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /(^-|-$)/g,
        ""
      )
      .slice(0, 80) ||
    "ai-frame"
  );
}

function makeId() {
  return crypto
    .randomBytes(8)
    .toString("hex");
}

function escapeXml(
  value = ""
) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function generateOpenAIFrame({
  prompt,
  outputPath,
}) {
  if (!OPENAI_API_KEY) {
    console.warn(
      "⚠️ Missing OPENAI_API_KEY"
    );
    return null;
  }

  const response = await fetch(
  "https://api.openai.com/v1/images/generations",
  {
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
  }
);

const data = await response.json();

console.log("=================================");
console.log("OPENAI IMAGE RESPONSE");
console.log("STATUS:", response.status);
console.log("BODY:", JSON.stringify(data, null, 2));
console.log("=================================");

if (!response.ok) {
  console.error("🔥 AI FRAME FAILURE");
  return null;
}

    console.error(
      "STATUS:",
      response.status
    );

    console.error(
      "MODEL:",
      IMAGE_MODEL
    );

    console.error(
      "BODY:",
      JSON.stringify(
        data,
        null,
        2
      )
    );

    throw new Error(
      JSON.stringify(data)
    );
  }

  const base64 =
    data?.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error(
      "OpenAI returned no image."
    );
  }

  fs.writeFileSync(
    outputPath,
    Buffer.from(
      base64,
      "base64"
    )
  );

  return outputPath;
}

async function createFallbackFrame({
  outputPath,
  topic,
  scene = {},
  style,
  platform,
  frameLabel = "AI FRAME",
}) {
  const title = scene.title || frameLabel;
  const caption = scene.caption || scene.voiceover || "Build smarter today";
  const visual = scene.visual || topic || "Aigenikz Vision Pipeline";

  const svg = `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="45%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#581c87"/>
      </linearGradient>

      <radialGradient id="glow1" cx="45%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.9"/>
        <stop offset="42%" stop-color="#6366f1" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="glow2" cx="75%" cy="75%" r="52%">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.7"/>
        <stop offset="60%" stop-color="#1e1b4b" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>

      <filter id="softGlow">
        <feGaussianBlur stdDeviation="9" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="500" cy="620" r="560" fill="url(#glow1)"/>
    <circle cx="780" cy="1320" r="520" fill="url(#glow2)"/>

    <g opacity="0.2" stroke="#67e8f9" stroke-width="2">
      <path d="M80 410 C260 290, 430 520, 630 380 S900 360, 1010 520"/>
      <path d="M90 1160 C260 1015, 470 1220, 675 1065 S910 1035, 1010 1185"/>
      <path d="M120 1500 C320 1350, 500 1580, 730 1410 S925 1400, 1010 1520"/>
    </g>

    <g opacity="0.18">
      <rect x="105" y="430" width="870" height="650" rx="44" fill="#020617" stroke="#67e8f9"/>
      <rect x="155" y="500" width="330" height="34" rx="17" fill="#67e8f9"/>
      <rect x="155" y="575" width="720" height="24" rx="12" fill="#a78bfa"/>
      <rect x="155" y="640" width="620" height="24" rx="12" fill="#22d3ee"/>
      <rect x="155" y="705" width="690" height="24" rx="12" fill="#818cf8"/>
      <circle cx="540" cy="895" r="105" fill="#38bdf8" filter="url(#softGlow)"/>
    </g>

    <text x="80" y="145" fill="#67e8f9" font-size="44" font-weight="900" font-family="Arial">
      ASTRAMIND VISION V2
    </text>

    <text x="80" y="215" fill="#ffffff" font-size="34" font-weight="800" font-family="Arial">
      ${escapeXml(title)}
    </text>

    <foreignObject x="80" y="745" width="920" height="470">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif;
        color: white;
        font-size: 68px;
        font-weight: 950;
        line-height: 1.06;
        letter-spacing: -2px;
        text-shadow: 0 10px 40px rgba(0,0,0,0.68);
      ">
        ${escapeXml(caption)}
      </div>
    </foreignObject>

    <foreignObject x="80" y="1320" width="920" height="230">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif;
        color: rgba(255,255,255,0.75);
        font-size: 27px;
        font-weight: 700;
        line-height: 1.25;
      ">
        ${escapeXml(visual)}
      </div>
    </foreignObject>

    <foreignObject x="80" y="1620" width="920" height="100">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif;
        color: rgba(103,232,249,0.82);
        font-size: 23px;
        font-weight: 700;
      ">
        ${escapeXml(platform)} • ${escapeXml(style)}
      </div>
    </foreignObject>

    <text x="80" y="1815" fill="rgba(255,255,255,0.55)" font-size="24" font-family="Arial">
      ${escapeXml(topic)}
    </text>
  </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}

export async function generateAIFrame({
  prompt = "",
  topic = "Aigenikz Vision Video",
  scene = {},
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  projectId = `vision_${Date.now()}`,
  frameLabel = "frame",
  outputDir = FRAMES_DIR,
} = {}) {
  ensureDir(outputDir);

  const filename = `${safeSlug(projectId)}-${safeSlug(
    scene?.id || scene?.title || frameLabel
  )}-${makeId()}.png`;

  const outputPath = path.join(outputDir, filename);
  const publicUrl = `/renders/vision-v2/frames/${filename}`;

  const finalPrompt = normalizePrompt({
    prompt,
    topic,
    scene,
    platform,
    style,
  });

  let imagePath = null;
  let source = "fallback";

  try {
    imagePath = await generateOpenAIFrame({
      prompt: finalPrompt,
      outputPath,
    });

    if (imagePath && fs.existsSync(imagePath)) {
      source = "openai-image";
      console.log("✅ AI frame generated:", imagePath);
    }
  } catch (error) {
    console.warn("⚠️ AI frame generation failed:", error.message);
    imagePath = null;
  }

  if (!imagePath || !fs.existsSync(imagePath)) {
  imagePath = await createFallbackFrame({
    outputPath,
    topic,
    scene,
    style,
    platform,
    frameLabel,
  });

  source = "fallback-scene-specific";

  console.warn(
    "⚠️ Aigenikz Vision Engine entered fallback mode."
  );

  console.warn(
    "⚠️ Real AI visual generation failed."
  );
}

/*
====================================
FINAL RETURN
====================================
*/

return {
  ok: true,

  imagePath,

  publicUrl,

  source,

  prompt: finalPrompt,

  sceneId:
    scene?.id || null,

  frameLabel,
};
}

export async function generateSceneFrames({
  scene = {},
  topic = "Aigenikz Vision Video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  projectId = `vision_${Date.now()}`,
  frameCount = 1,
} = {}) {
  const count = Math.max(1, Math.min(Number(frameCount) || 1, 4));
  const frames = [];

  for (let i = 0; i < count; i += 1) {
    const frame = await generateAIFrame({
      topic,
      scene,
      platform,
      style,
      projectId,
      frameLabel: `frame_${i + 1}`,
      prompt:
        i === 0
          ? scene.imagePrompt || scene.visual || scene.caption || topic
          : `
Create a variation of this same scene for cinematic motion continuity.
Topic: ${topic}
Scene: ${scene.title}
Visual: ${scene.visual}
Caption: ${scene.caption}
Style: ${style}
Frame variation number: ${i + 1}
Keep the same mood and composition, but slightly change camera angle, lighting, or subject placement.
`.trim(),
    });

    frames.push(frame);
  }

  return frames;
}

export default {
  generateAIFrame,
  generateSceneFrames,
};