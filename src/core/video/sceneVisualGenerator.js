// src/core/video/sceneVisualGenerator.js
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const OPENAI_API_KEY = 
  process.env.OPENAI_API_KEY ||
  process.env.REACT_APP_OPENAI_API_KEY ||
  null;

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const VISUAL_PROVIDER =
  process.env.VISUAL_PROVIDER ||
  "local";

console.log(
  "VISUAL PROVIDER:",
  VISUAL_PROVIDER
);
console.log(
  "🔥 SCENE VISUAL GENERATOR LOADED"
);

console.log(
  "OPENAI KEY EXISTS:",
  !!OPENAI_API_KEY
);

console.log(
  "IMAGE MODEL:",
  IMAGE_MODEL
);

const ROOT = process.cwd();

const PUBLIC_DIR = path.join(ROOT, "public");
const RENDERS_DIR = path.join(PUBLIC_DIR, "renders");
const VISION_DIR = path.join(RENDERS_DIR, "vision-v2");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value = "vision-scene") {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 90) || "vision-scene"
  );
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

function normalizeScene(scene = {}, index = 0) {
  return {
    id: scene.id || `scene_${index + 1}`,
    title: clean(scene.title || `Scene ${index + 1}`),
    duration: Number(scene.duration || 5),
    purpose: clean(scene.purpose || ""),
    visual: clean(scene.visual || ""),
    voiceover: clean(scene.voiceover || ""),
    caption: clean(scene.caption || ""),
    imagePrompt: clean(
      scene.imagePrompt ||
        scene.prompt ||
        scene.visual ||
        scene.caption ||
        `Cinematic scene ${index + 1}`
    ),
    cameraNote: clean(scene.cameraNote || ""),
    editNote: clean(scene.editNote || ""),
    retentionBeat: clean(scene.retentionBeat || ""),
  };
}

function detectVisualCategory({ topic = "", scene = {} } = {}) {
  const text = `${topic} ${scene.title} ${scene.visual} ${scene.voiceover} ${scene.caption}`.toLowerCase();

  if (text.includes("soulmate") || text.includes("love") || text.includes("relationship")) return "relationship";
  if (text.includes("ufo") || text.includes("uap") || text.includes("classified") || text.includes("alien")) return "ufo";
  if (text.includes("hood cleaning") || text.includes("grease") || text.includes("restaurant")) return "hood_cleaning";
  if (text.includes("power washing") || text.includes("pressure washing")) return "power_washing";
  if (text.includes("astramind") || text.includes("ai") || text.includes("automation")) return "ai_technology";
  if (text.includes("war") || text.includes("iran") || text.includes("conflict")) return "geo_conflict";
  if (text.includes("health") || text.includes("longevity") || text.includes("smoothie")) return "wellness";

  return "general";
}



function getDirectorSceneDirection({ directorState = {}, scene = {}, index = 0 } = {}) {
  const sceneId = scene?.id || scene?.sceneId || `scene_${index + 1}`;

  return (
    directorState?.sceneDirectionMap?.[sceneId] ||
    directorState?.sceneDirections?.find?.(
      (direction) =>
        direction.sceneId === sceneId ||
        direction.sceneIndex === index
    ) ||
    null
  );
}

function buildDirectorImagePrompt({ scene, topic, platform, style, index, storyboard, directorState } = {}) {
  const direction = getDirectorSceneDirection({ directorState, scene, index });

  if (!direction) return null;

  return `
Ultra realistic cinematic photography, vertical 9:16 frame.

PROJECT TOPIC:
${topic}

GLOBAL DIRECTOR LOOK:
Palette: ${directorState?.globalLook?.palette || direction.colorPalette}
Color grade: ${directorState?.globalLook?.colorGrade || direction.colorGrade}
Atmosphere: ${directorState?.globalLook?.atmosphere || direction.atmosphere}
Quality: ${directorState?.globalLook?.quality || "photorealistic commercial cinema"}

SCENE PURPOSE:
${scene.purpose || scene.title || `Scene ${index + 1}`}

FOCAL SUBJECT:
${direction.focalSubject || scene.visual}

ACTION AND EMOTION:
${direction.action || scene.voiceover || scene.caption}
Emotion: ${direction.emotion}

HOLLYWOOD DIRECTION:
Lens: ${direction.lens}
Camera angle: ${direction.cameraAngle}
Lighting: ${direction.lighting}
Composition: ${direction.composition}
Atmosphere: ${direction.atmosphere}
Color palette: ${direction.colorPalette}
Color grade: ${direction.colorGrade}
Particle FX: ${direction.particleFX}

CAMERA CHOREOGRAPHY:
Camera motion: ${direction.cameraMotion}
Camera path: ${direction.cameraPath}
Use strong depth, parallax-ready foreground elements, a clear midground subject, and cinematic background scale.

PLATFORM AND STYLE:
${platform} short-form commercial cinema.
${style}.
Premium Apple commercial quality. Photorealistic. Ray-traced reflections. Professional color grading. Shallow depth of field. Volumetric lighting. High dynamic range. Epic composition. 35mm cinematic detail. 8k look.

STRICT NEGATIVE REQUIREMENTS:
No text in the image. No captions. No subtitles. No logos. No UI labels. No poster typography. No placeholder graphics. No abstract cards. No circles or rectangles as a fake scene. No stock photo look. No watermarks. No distorted hands or faces. Avoid copyrighted characters and real brand logos.

FINAL INSTRUCTION:
Create a specific cinematic frame that visually tells this exact scene as if a Hollywood director staged and shot it. Leave clean lower-third space for captions that will be added later by the video engine.
`.trim();
}

function buildAdvancedImagePrompt({
  scene,
  topic,
  platform,
  style,
  index,
  storyboard,
  directorState,
}) {
  const directorPrompt = buildDirectorImagePrompt({
    scene,
    topic,
    platform,
    style,
    index,
    storyboard,
    directorState,
  });

  if (directorPrompt) {
    return directorPrompt;
  }

  const category = detectVisualCategory({ topic, scene });

  const categoryDirection = {
    relationship:
      "cinematic romance, natural human emotion, city lights, soft bokeh, believable people, eye contact, warm streetlights, rain on glass, intimate atmosphere",
    ufo:
      "dark skies, radar screens, military briefing room, declassified documents, desert horizon, cold blue light, investigative mystery, documentary tension",
    hood_cleaning:
      "commercial kitchen, stainless steel hood, grease buildup, exhaust filters, professional cleaner, fire prevention inspection, dramatic before-and-after",
    power_washing:
      "dirty siding, driveway grime, water spray, satisfying cleaning transformation, clean exterior reveal, local service business credibility",
    ai_technology:
      "AI command center, holographic dashboards, code panels, creator studio, finance intelligence, automation workflows, premium futuristic interface",
    geo_conflict:
      "cinematic geopolitics explainer, satellite maps, tense newsroom lighting, diplomatic rooms, regional map overlays, serious documentary tone",
    wellness:
      "sunrise wellness, smoothies, cellular vitality visuals, movement, hydration, clean health dashboard, longevity-focused cinematic glow",
    general:
      "cinematic real-world subject-specific imagery, emotional lighting, depth, realistic composition, visual storytelling",
  };

  return `
Create one vertical 9:16 cinematic video frame for a short-form video.

CRITICAL REQUIREMENTS:
- This must be a real scene that matches the script, not an Aigenikz template card.
- Do not create abstract blue dashboard art unless the scene itself is about AI or technology.
- Do not include large readable text, titles, subtitles, logos, UI labels, or poster typography.
- The image must visually match the scene's action, environment, and emotion.
- The frame must look like it belongs in a premium short film, ad, documentary, or music-video style edit.
- Leave clean lower-third space for subtitles.
- Avoid copyrighted characters, real brand logos, and protected designs.

PROJECT TOPIC:
${topic}

PLATFORM:
${platform}

STYLE:
${style}

STORYBOARD CATEGORY:
${storyboard?.category || category}

SCENE ${index + 1}:
Title: ${scene.title}
Purpose: ${scene.purpose}
Visual: ${scene.visual}
Voiceover: ${scene.voiceover}
Caption: ${scene.caption}
Camera note: ${scene.cameraNote}
Edit note: ${scene.editNote}
Retention beat: ${scene.retentionBeat}

CATEGORY VISUAL LANGUAGE:
${categoryDirection[category]}

FINAL IMAGE INSTRUCTION:
${scene.imagePrompt}

Render a specific cinematic frame with realistic subject matter, foreground/midground/background depth, dramatic lighting, natural composition, and clear emotional storytelling.
`.trim();
}

async function generateOpenAIImage({ prompt, outputPath }) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ Missing OPENAI_API_KEY");
    return null;
  }

  console.log(
  "🎨 REQUESTING OPENAI IMAGE..."
);

console.log(
  "MODEL:",
  IMAGE_MODEL
);

console.log(
  "PROMPT LENGTH:",
  prompt.length
);

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
  console.error(
    "🔥 OPENAI IMAGE FAILURE"
  );

  console.error(
    "STATUS:",
    response.status
  );

  console.error(
    "BODY:",
    JSON.stringify(data, null, 2)
  );

  throw new Error(
    JSON.stringify(data)
  );
}

  const imageBase64 = data?.data?.[0]?.b64_json;

  if (!imageBase64) {
    console.warn("⚠️ No image returned." );
    return null;
  }

  fs.writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));

  return outputPath;
}

function getFallbackPalette(category) {
  const palettes = {
    relationship: ["#1f1024", "#4c1d3f", "#f59e0b", "#fecdd3"],
    ufo: ["#020617", "#0f172a", "#22c55e", "#67e8f9"],
    hood_cleaning: ["#111827", "#334155", "#f97316", "#e5e7eb"],
    power_washing: ["#082f49", "#0e7490", "#38bdf8", "#f8fafc"],
    ai_technology: ["#020617", "#172554", "#7c3aed", "#22d3ee"],
    geo_conflict: ["#111827", "#7f1d1d", "#f59e0b", "#f8fafc"],
    wellness: ["#052e16", "#166534", "#facc15", "#dcfce7"],
    general: ["#020617", "#172554", "#581c87", "#67e8f9"],
  };

  return palettes[category] || palettes.general;
}

function buildFallbackSceneShapes(category) {
  if (category === "relationship") {
    return `
      <circle cx="365" cy="760" r="92" fill="rgba(255,255,255,0.16)"/>
      <circle cx="715" cy="760" r="92" fill="rgba(255,255,255,0.16)"/>
      <path d="M430 820 C510 900, 590 900, 670 820" fill="none" stroke="rgba(254,202,202,0.55)" stroke-width="8"/>
      <rect x="180" y="1060" width="720" height="210" rx="70" fill="rgba(255,255,255,0.08)" stroke="rgba(254,202,202,0.25)" stroke-width="2"/>
      <circle cx="540" cy="1165" r="54" fill="rgba(251,191,36,0.35)"/>
    `;
  }

  if (category === "ufo") {
    return `
      <ellipse cx="540" cy="560" rx="260" ry="44" fill="rgba(148,163,184,0.5)"/>
      <ellipse cx="540" cy="548" rx="190" ry="22" fill="rgba(255,255,255,0.22)"/>
      <path d="M180 1180 C320 930, 770 930, 940 1180" fill="rgba(15,23,42,0.78)" stroke="rgba(34,197,94,0.25)" stroke-width="3"/>
      <g stroke="rgba(34,197,94,0.42)" stroke-width="2">
        <circle cx="540" cy="960" r="180" fill="none"/>
        <circle cx="540" cy="960" r="90" fill="none"/>
        <line x1="540" y1="780" x2="540" y2="1140"/>
        <line x1="360" y1="960" x2="720" y2="960"/>
      </g>
    `;
  }

  if (category === "hood_cleaning") {
    return `
      <rect x="130" y="460" width="820" height="210" rx="28" fill="rgba(229,231,235,0.18)" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
      <rect x="190" y="680" width="700" height="80" rx="18" fill="rgba(249,115,22,0.28)"/>
      <rect x="240" y="830" width="600" height="340" rx="42" fill="rgba(15,23,42,0.66)" stroke="rgba(248,250,252,0.28)" stroke-width="3"/>
      <path d="M280 970 C380 900, 515 1055, 650 940 S780 970, 820 920" fill="none" stroke="rgba(249,115,22,0.75)" stroke-width="10"/>
    `;
  }

  if (category === "power_washing") {
    return `
      <rect x="150" y="480" width="780" height="650" rx="44" fill="rgba(15,23,42,0.48)" stroke="rgba(125,211,252,0.3)" stroke-width="3"/>
      <path d="M180 890 C330 790, 560 970, 910 780" fill="none" stroke="rgba(125,211,252,0.95)" stroke-width="16"/>
      <path d="M220 980 C400 870, 610 1090, 900 930" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="8"/>
      <rect x="240" y="560" width="250" height="430" fill="rgba(71,85,105,0.65)"/>
      <rect x="520" y="560" width="320" height="430" fill="rgba(226,232,240,0.72)"/>
    `;
  }

  return `
    <rect x="120" y="480" width="840" height="680" rx="54" fill="rgba(15,23,42,0.52)" stroke="rgba(103,232,249,0.3)" stroke-width="3"/>
    <circle cx="540" cy="740" r="180" fill="rgba(34,211,238,0.22)" stroke="rgba(103,232,249,0.42)" stroke-width="3"/>
    <circle cx="540" cy="740" r="82" fill="rgba(167,139,250,0.45)"/>
    <path d="M220 1110 C390 950, 650 1240, 880 1020" fill="none" stroke="rgba(103,232,249,0.45)" stroke-width="8"/>
  `;
}

async function createLocalSceneFrame({
  outputPath,
  scene,
  topic,
  platform,
  style,
  index,
  storyboard,
}) {
  const category = detectVisualCategory({ topic, scene });
  const [c1, c2, c3, c4] = getFallbackPalette(category);

  const visual = clean(scene.visual || topic);
  const caption = clean(scene.caption || scene.title);

  const svg = `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="45%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
      <radialGradient id="glow" cx="48%" cy="36%" r="70%">
        <stop offset="0%" stop-color="${c4}" stop-opacity="0.35"/>
        <stop offset="55%" stop-color="${c3}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>

    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="540" cy="640" r="720" fill="url(#glow)"/>

    <g opacity="0.16" stroke="${c4}" stroke-width="3">
      <path d="M80 390 C260 230, 440 490, 660 320 S930 300, 1020 470"/>
      <path d="M70 1400 C280 1220, 470 1500, 710 1290 S940 1280, 1020 1435"/>
    </g>

    <g filter="url(#shadow)">
      ${buildFallbackSceneShapes(category)}
    </g>

    <text x="78" y="130" fill="${c4}" font-size="34" font-weight="900" font-family="Arial">
      ASTRAMIND SCENE ${index + 1}
    </text>

    <text x="78" y="190" fill="rgba(255,255,255,0.78)" font-size="25" font-weight="800" font-family="Arial">
      ${escapeXml(scene.title)}
    </text>

    <foreignObject x="84" y="1320" width="912" height="210">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif;
        color: white;
        font-size: 56px;
        font-weight: 950;
        line-height: 1.04;
        text-shadow: 0 12px 44px rgba(0,0,0,0.75);
      ">
        ${escapeXml(caption).slice(0, 88)}
      </div>
    </foreignObject>

    <foreignObject x="84" y="1565" width="912" height="190">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif;
        color: rgba(255,255,255,0.72);
        font-size: 25px;
        font-weight: 700;
        line-height: 1.25;
      ">
        ${escapeXml(visual).slice(0, 240)}
      </div>
    </foreignObject>

    <text x="80" y="1842" fill="rgba(255,255,255,0.42)" font-size="22" font-family="Arial">
      Fallback visual • ${escapeXml(platform)} • ${escapeXml(style)}
    </text>
  </svg>
  `;

  console.log("📁 Writing image:", outputPath);

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log("✅ Image successfully written.");
console.log("File exists:", fs.existsSync(outputPath));

return {
    outputPath,
    category,
};
}

export async function generateSceneVisual({
  scene,
  topic = "Aigenikz Vision Video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  projectId = `vision_${Date.now()}`,
  index = 0,
  storyboard = null,
  directorState = null,
  provider = VISUAL_PROVIDER,
} = {}) {
  ensureDir(RENDERS_DIR);
  ensureDir(VISION_DIR);

  const normalized = normalizeScene(scene, index);

  const filename = `${safeSlug(projectId)}-${String(index + 1).padStart(
    2,
    "0"
  )}.png`;

  const imagePath = path.join(VISION_DIR, filename);
  const publicUrl = `/renders/vision-v2/${filename}`;

  const prompt = buildAdvancedImagePrompt({
    scene: normalized,
    topic,
    platform,
    style,
    index,
    storyboard,
    directorState,
  });

  let finalPath = null;
  let source = "openai-image";
  let category = detectVisualCategory({ topic, scene: normalized });

  try {

  if (
    provider === "openai"
  ) {

    finalPath =
      await generateOpenAIImage({
        prompt,
        outputPath: imagePath,
      });

  } else {

    console.log(
      "⚡ Aigenikz Local Visual Mode Active"
    );

    const fallback =
      await createLocalSceneFrame({
        outputPath: imagePath,
        scene: normalized,
        topic,
        platform,
        style,
        index,
        storyboard,
      });

    finalPath =
      fallback.outputPath;

    category =
      fallback.category;

    source =
      "local-visual-engine";
  }

  if (
    finalPath &&
    fs.existsSync(finalPath)
  ) {

    console.log(
      `✅ Scene Visual Generated: ${filename}`
    );

  } else {

    throw new Error(
      "Visual generation returned no file."
    );

  }

} catch (error) {
    console.warn(`⚠️ Scene ${index + 1} AI visual failed:`, error.message);

    if (process.env.ALLOW_LOCAL_VISUAL_FALLBACK === "true") {
      const fallback = await createLocalSceneFrame({
        outputPath: imagePath,
        scene: normalized,
        topic,
        platform,
        style,
        index,
        storyboard,
      });

      finalPath = fallback.outputPath;
      category = fallback.category;
      source = "local-visual-engine";

      console.warn("⚠️ Local visual fallback used because ALLOW_LOCAL_VISUAL_FALLBACK=true.");
    } else {
      throw new Error(
        `Hollywood image generation failed and local placeholders are disabled: ${error.message}`
      );
    }
  }

  return {
    sceneId: normalized.id,
    sceneIndex: index,
    title: normalized.title,
    imagePath: finalPath,
    publicUrl,
    prompt,
    source,
    category,
    visual: normalized.visual,
    caption: normalized.caption,
    voiceover: normalized.voiceover,
    imagePrompt: normalized.imagePrompt,
    director: getDirectorSceneDirection({ directorState, scene: normalized, index }),
    cinematicDirection: getDirectorSceneDirection({ directorState, scene: normalized, index }),
  };
}

export async function generateSceneVisuals({
  topic = "Aigenikz Vision Video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  scenes = [],
  storyboard = null,
  projectId = `vision_${Date.now()}`,
  directorState = null,
  provider = VISUAL_PROVIDER,
} = {}) {
  const finalScenes =
    Array.isArray(scenes) && scenes.length
      ? scenes
      : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : Array.isArray(storyboard)
      ? storyboard
      : [];

  if (!finalScenes.length) {
    throw new Error("No scenes supplied to generateSceneVisuals.");
  }

  const visuals = [];

  for (let index = 0; index < finalScenes.length; index += 1) {
    const visual = await generateSceneVisual({
      scene: finalScenes[index],
      topic: topic || storyboard?.topic || "Aigenikz Vision Video",
      platform: platform || storyboard?.platform || "TikTok",
      style: style || storyboard?.style || "cinematic futuristic high-energy",
      projectId,
      index,
      storyboard,
      directorState,
      provider,
    });

    visuals.push(visual);
  }

  return visuals;
}

export const generateSceneVisualsV2 = generateSceneVisuals;

export const generateAIFrames = async ({
  storyboard,
  outputFolder,
  style,
  topic,
} = {}) => {
  const visuals = await generateSceneVisuals({
    storyboard,
    style,
    topic,
    projectId: path.basename(outputFolder || `vision_${Date.now()}`),
  });

  return visuals.map((visual) => ({
    ...visual,
    imageUrl: visual.publicUrl,
    duration: 5,
  }));
};

export default generateSceneVisuals;
