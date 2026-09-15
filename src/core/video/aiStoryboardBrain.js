// src/core/video/aiStoryboardBrain.js
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.REACT_APP_OPENAI_API_KEY ||
  process.env.OPENAI_KEY;
  
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MEMORY_DIR = path.resolve("server-renders", "astramind-memory");
const MEMORY_FILE = path.join(MEMORY_DIR, "storyboard-learning.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripPromptCommand(topic = "") {
  return clean(topic)
    .replace(/^make me an?\s+/i, "")
    .replace(/^create an?\s+/i, "")
    .replace(/^generate an?\s+/i, "")
    .replace(/^produce an?\s+/i, "")
    .replace(/^build an?\s+/i, "")
    .replace(/^video about\s+/i, "")
    .replace(/^a video about\s+/i, "")
    .replace(/^cinematic\s+/i, "")
    .replace(/^viral\s+/i, "")
    .trim();
}

function clampDuration(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(15, Math.min(n, 90));
}

function clampSceneDuration(value, fallback = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3, Math.min(n, 12));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadMemory() {
  try {
    ensureDir(MEMORY_DIR);

    if (!fs.existsSync(MEMORY_FILE)) {
      return {
        engine: "Aigenikz Storyboard Learning Memory",
        version: 1,
        runs: [],
        winningPatterns: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch {
    return {
      engine: "Aigenikz Storyboard Learning Memory",
      version: 1,
      runs: [],
      winningPatterns: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

function saveMemory(memory) {
  try {
    ensureDir(MEMORY_DIR);
    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify(
        {
          ...memory,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.warn("⚠️ Storyboard memory save failed:", error.message);
  }
}

function detectCategory(topic = "") {
  const text = topic.toLowerCase();

  if (
    text.includes("hood cleaning") ||
    text.includes("kitchen exhaust") ||
    text.includes("grease") ||
    text.includes("fire prevention") ||
    text.includes("restaurant")
  ) {
    return "restaurant_hood_cleaning";
  }

  if (
    text.includes("power washing") ||
    text.includes("pressure washing") ||
    text.includes("exterior cleaning") ||
    text.includes("cleaning business")
  ) {
    return "service_business_cleaning";
  }

  if (
    text.includes("ufo") ||
    text.includes("uap") ||
    text.includes("alien") ||
    text.includes("classified") ||
    text.includes("government secrecy") ||
    text.includes("disclosure")
  ) {
    return "ufo_disclosure";
  }

  if (
    text.includes("soulmate") ||
    text.includes("love") ||
    text.includes("relationship") ||
    text.includes("romance")
  ) {
    return "relationship_emotional";
  }

  if (
    text.includes("astramind") ||
    text.includes("ai") ||
    text.includes("automation") ||
    text.includes("app") ||
    text.includes("technology")
  ) {
    return "astramind_technology";
  }

  if (
    text.includes("health") ||
    text.includes("longevity") ||
    text.includes("smoothie") ||
    text.includes("healing") ||
    text.includes("wellness")
  ) {
    return "health_longevity";
  }

  if (
    text.includes("war") ||
    text.includes("conflict") ||
    text.includes("iran") ||
    text.includes("politics")
  ) {
    return "geo_conflict_explainer";
  }

  return "general_cinematic";
}

function inferAudience(category) {
  const map = {
    restaurant_hood_cleaning:
      "restaurant owners, kitchen managers, franchise operators, food-service decision makers",
    service_business_cleaning:
      "homeowners, property managers, local business owners, people who value clean curb appeal",
    ufo_disclosure:
      "curious viewers, truth seekers, independent researchers, documentary fans, people questioning official narratives",
    relationship_emotional:
      "people who believe in fate, healing, timing, love, emotional connection, and second chances",
    astramind_technology:
      "entrepreneurs, creators, app builders, small business owners, solo founders, and digital operators",
    health_longevity:
      "health-conscious adults, people rebuilding their body, longevity seekers, and wellness creators",
    geo_conflict_explainer:
      "news-aware viewers, independent thinkers, geopolitics watchers, and people seeking context beyond headlines",
    general_cinematic:
      "curious viewers, short-form video audiences, creators, and independent thinkers",
  };

  return map[category] || map.general_cinematic;
}

function inferEmotionalAngle(category) {
  const map = {
    restaurant_hood_cleaning: "urgent, trust-building, prevention-focused",
    service_business_cleaning: "satisfying, practical, transformation-driven",
    ufo_disclosure: "mysterious, tense, investigative, cinematic",
    relationship_emotional: "intimate, emotional, magnetic, hopeful",
    astramind_technology: "futuristic, ambitious, founder-driven, premium",
    health_longevity: "hopeful, disciplined, awakening, restorative",
    geo_conflict_explainer: "serious, urgent, analytical, tension-driven",
    general_cinematic: "clear, cinematic, curiosity-driven",
  };

  return map[category] || map.general_cinematic;
}

function inferVisualWorld(category) {
  const map = {
    restaurant_hood_cleaning:
      "commercial kitchens, grease filters, exhaust ducts, stainless steel, fire inspection tags, before-and-after cleaning, professional crews, documented safety checks",
    service_business_cleaning:
      "dirty siding, driveways, storefronts, water spray, before-and-after reveals, clean surfaces, satisfying transformation shots",
    ufo_disclosure:
      "night skies, radar screens, military pilots, redacted files, declassified documents, hearing rooms, satellite maps, encrypted archives",
    relationship_emotional:
      "city lights, soft closeups, eye contact, slow motion crowds, rain on glass, text messages, fate-like coincidences, warm cinematic glow",
    astramind_technology:
      "AI dashboards, holographic interfaces, code panels, creator tools, finance intelligence, automation systems, glowing command centers",
    health_longevity:
      "sunrise movement, smoothies, cellular visuals, hydration, mobility, healthy meals, wearable tracking, clean wellness dashboards",
    geo_conflict_explainer:
      "maps, tense headlines, satellite imagery, smoke-lit skylines, diplomatic rooms, oil routes, military silhouettes, split-screen context",
    general_cinematic:
      "real-world cinematic scenes, symbolic visuals, digital overlays, clean motion, emotional lighting, transformation moments",
  };

  return map[category] || map.general_cinematic;
}

function fallbackSceneSet({ subject, category, platform, style }) {
  const categoryScenes = {
    restaurant_hood_cleaning: [
      {
        title: "Hook",
        visual:
          "Close-up of thick grease hidden inside a commercial kitchen exhaust hood while a cook line runs in the background.",
        voiceover:
          "The most dangerous part of a restaurant is often the part customers never see.",
        caption: "Hidden grease is hidden risk.",
      },
      {
        title: "Problem",
        visual:
          "A tense inspection-style shot of buildup inside vents, filters, and ductwork with warning light reflections.",
        voiceover:
          "Grease buildup does not just look bad. It can become a fire hazard, a failed inspection, and a business liability.",
        caption: "This can shut kitchens down.",
      },
      {
        title: "Process",
        visual:
          "A professional cleaning crew covers equipment, sprays degreaser, and starts restoring the hood system.",
        voiceover:
          "Professional hood cleaning attacks the risk at the source: filters, ducts, fans, and the full exhaust path.",
        caption: "Clean the whole system.",
      },
      {
        title: "Proof",
        visual:
          "Before-and-after split shot: blackened grease residue transforms into clean stainless steel.",
        voiceover:
          "The proof is visible: cleaner metal, safer airflow, documented service, and a kitchen ready for inspection.",
        caption: "Clean protects business.",
      },
      {
        title: "CTA",
        visual:
          "Final confident shot of a clean commercial hood with a service checklist and restaurant lights turning on.",
        voiceover:
          "Do not wait for buildup to become the emergency. Schedule the cleaning before the risk grows.",
        caption: "Schedule before buildup.",
      },
    ],

    service_business_cleaning: [
      {
        title: "Hook",
        visual:
          "A dirty home exterior shown in dramatic side light with green buildup visible around siding and trim.",
        voiceover:
          "Your home can look tired long before anything is actually broken.",
        caption: "Your exterior is talking.",
      },
      {
        title: "Problem",
        visual:
          "Close-up of mildew, dirt, and stained surfaces that make a property look neglected.",
        voiceover:
          "Dirt, algae, and buildup quietly drag down curb appeal and make the whole property feel older.",
        caption: "Buildup changes everything.",
      },
      {
        title: "Transformation",
        visual:
          "Satisfying pressure-washing pass revealing a clean bright surface underneath grime.",
        voiceover:
          "A proper wash does more than clean. It resets the first impression.",
        caption: "Clean changes the feeling.",
      },
      {
        title: "Proof",
        visual:
          "Before-and-after view of siding, walkway, or storefront with strong contrast.",
        voiceover:
          "The difference is immediate: brighter surfaces, cleaner lines, and a property that looks cared for.",
        caption: "Results you can see.",
      },
      {
        title: "CTA",
        visual:
          "Wide clean exterior shot at golden hour with water droplets glowing in the sunlight.",
        voiceover:
          "Refresh the outside before buildup becomes the first thing people notice.",
        caption: "Restore the curb appeal.",
      },
    ],

    relationship_emotional: [
      {
        title: "Hook",
        visual:
          "Two strangers briefly lock eyes across a crowded room while the background slows into soft motion blur.",
        voiceover:
          "Sometimes one look feels louder than an entire conversation.",
        caption: "One look can shift everything.",
      },
      {
        title: "Tension",
        visual:
          "A person walks alone under city lights, replaying a moment they cannot explain.",
        voiceover:
          "You try to move on, but something about that person keeps echoing in your chest.",
        caption: "Why can’t you forget them?",
      },
      {
        title: "Signal",
        visual:
          "Split scenes of repeated coincidences: same street, same song, same timing, same unspoken pull.",
        voiceover:
          "Maybe it is not magic. Maybe it is timing, attention, and the part of you that already recognized something real.",
        caption: "Some timing feels designed.",
      },
      {
        title: "Choice",
        visual:
          "A phone screen hesitates over an unsent message while rain streaks across a window.",
        voiceover:
          "The question is not whether fate exists. The question is whether you are brave enough to answer when it knocks.",
        caption: "Would you answer?",
      },
      {
        title: "CTA",
        visual:
          "A cinematic final shot of two silhouettes walking toward each other under warm streetlights.",
        voiceover:
          "When the moment feels different, do not treat it like every other moment.",
        caption: "Some moments deserve courage.",
      },
    ],

    ufo_disclosure: [
      {
        title: "Hook",
        visual:
          "A silent metallic object crosses a dark desert sky while radar lines flicker across the frame.",
        voiceover:
          "For decades, people reported objects moving in ways our normal explanations could not easily hold.",
        caption: "What are they not telling us?",
      },
      {
        title: "Silence",
        visual:
          "A classified briefing room with redacted folders, blurred aerial footage, and officials behind frosted glass.",
        voiceover:
          "The public gets fragments: edited clips, careful denials, redacted files, and statements that say everything except the answer.",
        caption: "The silence is the signal.",
      },
      {
        title: "Pattern",
        visual:
          "Pilot testimony, radar tracks, satellite paths, and hearing-room silhouettes connect on an investigation wall.",
        voiceover:
          "One sighting can be dismissed. A pattern across pilots, sensors, documents, and witnesses is harder to ignore.",
        caption: "Patterns matter.",
      },
      {
        title: "Evidence",
        visual:
          "A split-screen of a pilot helmet, radar lock, congressional microphone, and stamped declassified document.",
        voiceover:
          "The evidence is not one clip. It is the repetition of details from people who were trained to observe.",
        caption: "Follow the evidence.",
      },
      {
        title: "Question",
        visual:
          "A lone viewer stands beneath a massive night sky as file fragments fade into darkness.",
        voiceover:
          "Maybe the biggest question is not what they saw. Maybe it is who benefits when the truth stays buried.",
        caption: "Question everything.",
      },
    ],

    astramind_technology: [
      {
        title: "Hook",
        visual:
          "A glowing AI command center opens with modules for video, finance, content, research, travel, and automation.",
        voiceover:
          "What if one AI system could help you think, create, build, automate, and launch from one place?",
        caption: "One system. Endless output.",
      },
      {
        title: "Problem",
        visual:
          "A creator jumps between scattered tabs, apps, dashboards, and tools while ideas get lost.",
        voiceover:
          "Most entrepreneurs do not lack ideas. They lose time because every tool works alone.",
        caption: "Too many tools. Not enough time.",
      },
      {
        title: "Transformation",
        visual:
          "Aigenikz connects content, finance, automation, travel, media, and business intelligence into one living system.",
        voiceover:
          "Aigenikz turns scattered work into an adaptive operating system that learns how you build.",
        caption: "Chaos becomes command.",
      },
      {
        title: "Proof",
        visual:
          "A dashboard generates videos, writes scripts, studies markets, builds apps, and organizes launch assets.",
        voiceover:
          "Create, analyze, automate, publish, and refine — all through one intelligent workflow.",
        caption: "Create. Analyze. Automate.",
      },
      {
        title: "CTA",
        visual:
          "Final Aigenikz brand reveal with electric blue and violet intelligence streams forming a living digital brain.",
        voiceover:
          "Build smarter. Move faster. Let Aigenikz become the system behind your next breakthrough.",
        caption: "Build smarter today.",
      },
    ],
  };

  const scenes =
    categoryScenes[category] ||
    [
      {
        title: "Hook",
        visual: `A cinematic opening directly showing the strongest emotional or visual idea behind ${subject}.`,
        voiceover: `There is a reason ${subject} grabs attention before people fully understand it.`,
        caption: "Look closer.",
      },
      {
        title: "Problem",
        visual: `A close-up scene showing the main tension, risk, question, or conflict surrounding ${subject}.`,
        voiceover:
          "The surface story is usually simple. The real story begins when the details start connecting.",
        caption: "The surface is not enough.",
      },
      {
        title: "Pattern",
        visual: `A visual sequence connecting multiple details, causes, consequences, or hidden patterns around ${subject}.`,
        voiceover:
          "Once the pattern appears, the entire subject starts to look different.",
        caption: "The pattern matters.",
      },
      {
        title: "Proof",
        visual: `A grounded proof-style scene showing why ${subject} deserves attention.`,
        voiceover:
          "The strongest proof is not always loud. Sometimes it is the detail that keeps repeating.",
        caption: "Follow the signal.",
      },
      {
        title: "CTA",
        visual: `A strong closing frame that leaves the viewer with a clear question or action connected to ${subject}.`,
        voiceover:
          "Do not just watch the story. Ask what it is trying to show you.",
        caption: "Question the pattern.",
      },
    ];

  return scenes.map((scene, index) => ({
    id: `scene_${index + 1}`,
    title: scene.title,
    duration: index === 0 ? 4 : index === 2 ? 7 : 6,
    purpose:
      index === 0
        ? "Stop the scroll with a specific topic-driven hook."
        : index === 1
        ? "Expose the core tension."
        : index === 2
        ? "Connect the pattern."
        : index === 3
        ? "Show proof and consequence."
        : "End with a strong action, question, or emotional release.",
    visual: scene.visual,
    voiceover: scene.voiceover,
    caption: scene.caption,
    imagePrompt: `Vertical 9:16 cinematic ${scene.title} scene for ${platform}. Subject: ${subject}. Style: ${style}. Show: ${scene.visual}. Do not create a generic poster. Create a specific cinematic frame with depth, lighting, environment, subject detail, and clean space for captions.`,
    cameraNote:
      index === 0
        ? "fast cinematic push-in"
        : index === 1
        ? "slow tension scan"
        : index === 2
        ? "pattern-building pan"
        : index === 3
        ? "proof lock-in zoom"
        : "emotional final pullback",
    editNote:
      index === 0
        ? "open with immediate impact"
        : index === 1
        ? "increase tension"
        : index === 2
        ? "build momentum"
        : index === 3
        ? "hold for credibility"
        : "resolve with emotional weight",
  }));
}

function buildScriptFromScenes(scenes = []) {
  return scenes
    .map(
      (scene, index) =>
        `${index + 1}. ${scene.title}
Duration: ${scene.duration}s
Visual: ${scene.visual}
Voiceover: ${scene.voiceover}
Caption: ${scene.caption}`
    )
    .join("\n\n");
}

function buildCaptionsFromScenes(scenes = []) {
  let cursor = 0;

  return scenes.map((scene, index) => {
    const start = cursor;
    const end = cursor + scene.duration;
    cursor = end;

    return {
      index: index + 1,
      sceneId: scene.id,
      start,
      end,
      text: scene.caption,
    };
  });
}

function buildPromptPack(scenes = []) {
  return scenes.map((scene) => ({
    sceneId: scene.id,
    title: scene.title,
    imagePrompt: scene.imagePrompt,
    visual: scene.visual,
    caption: scene.caption,
    cameraNote: scene.cameraNote,
    editNote: scene.editNote,
  }));
}

function normalizeAIStoryboard(data = {}, request = {}) {
  const topic = clean(request.topic);
  const subject = stripPromptCommand(topic) || topic;
  const category = data.category || detectCategory(topic);

  let scenes = safeArray(data.scenes)
    .map((scene, index) => ({
      id: scene.id || `scene_${index + 1}`,
      title: clean(scene.title || `Scene ${index + 1}`),
      duration: clampSceneDuration(scene.duration, index === 0 ? 4 : 6),
      purpose: clean(scene.purpose || ""),
      visual: clean(scene.visual || ""),
      voiceover: clean(scene.voiceover || ""),
      caption: clean(scene.caption || ""),
      imagePrompt: clean(scene.imagePrompt || scene.prompt || ""),
      cameraNote: clean(scene.cameraNote || ""),
      editNote: clean(scene.editNote || ""),
      retentionBeat: clean(scene.retentionBeat || ""),
    }))
    .filter(
      (scene) =>
        scene.title && scene.visual && scene.voiceover && scene.caption
    )
    .slice(0, 7);

  if (scenes.length < 5) {
    scenes = fallbackSceneSet({
      subject,
      category,
      platform: request.platform,
      style: request.style,
    });
  }

  scenes = scenes.map((scene, index) => ({
    ...scene,
    id: scene.id || `scene_${index + 1}`,
    duration: clampSceneDuration(scene.duration, index === 0 ? 4 : 6),
    imagePrompt:
      scene.imagePrompt ||
      `Vertical 9:16 cinematic frame. Subject: ${subject}. Scene: ${scene.title}. Visual: ${scene.visual}. Style: ${request.style}. Create a specific cinematic shot, not a generic poster. Minimal text. Clean lower-third caption space.`,
  }));

  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const captions = buildCaptionsFromScenes(scenes);
  const script = buildScriptFromScenes(scenes);

  return {
    ok: true,
    source: data.source || "openai-autonomous-v7",
    pipeline: "ASTRAMIND_AUTONOMOUS_STORY_INTELLIGENCE_V7",
    topic,
    subject,
    platform: request.platform,
    style: request.style,
    durationTarget: request.durationTarget,
    totalDuration,
    category,
    audience: data.audience || inferAudience(category),
    emotionalAngle: data.emotionalAngle || inferEmotionalAngle(category),
    visualWorld: data.visualWorld || inferVisualWorld(category),
    storyPromise:
      data.storyPromise ||
      `Make ${subject} feel specific, visual, emotionally clear, and impossible to ignore.`,
    retentionStrategy:
      data.retentionStrategy ||
      "Open with a specific visual hook, escalate tension, reveal pattern, prove the point, and close with a memorable action or question.",
    emotionalCurve:
      data.emotionalCurve || ["curiosity", "tension", "pattern", "proof", "resolution"],
    scenes,
    captions,
    script,
    promptPack: buildPromptPack(scenes),
    editorPackage: {
      editable: true,
      timelineMode: "Aigenikz-native",
      canEditScript: true,
      canEditScenes: true,
      canEditCaptions: true,
      canEditVoiceover: true,
      canEditImagePrompts: true,
      canEditMusicMood: true,
      canEditMotion: true,
      canPublish: true,
    },
    uploadPlan: {
      enabled: true,
      platforms: ["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook Reels", "X Video", "Rumble"],
      suggestedTitle: data.suggestedTitle || subject,
      suggestedDescription:
        data.suggestedDescription ||
        `A cinematic short-form video about ${subject}.`,
      hashtags:
        data.hashtags ||
        [
          `#${subject.replace(/[^a-z0-9]/gi, "").slice(0, 28)}`,
          "#Aigenikz",
          "#Shorts",
          "#ViralVideo",
          "#ContentCreation",
        ],
    },
  };
}

async function callOpenAIStoryboard({
  topic,
  platform,
  style,
  durationTarget,
  category,
  memory,
} = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const subject = stripPromptCommand(topic);
  const audience = inferAudience(category);
  const emotionalAngle = inferEmotionalAngle(category);
  const visualWorld = inferVisualWorld(category);

  const systemPrompt = `
You are Aigenikz Autonomous Story Intelligence V7.

You are not a template writer.
You are a cinematic director, editor, social strategist, scriptwriter, and visual prompt engineer.

Create a complete short-form video plan from a simple user command.

Rules:
- Never repeat the user's prompt literally as narration.
- Never use generic lines like "Most people are missing the real story behind..."
- Every scene must be specific to the subject.
- Every hook must feel human, scroll-stopping, and platform-native.
- Every visual must describe an actual shot, environment, object, action, or cinematic moment.
- Every caption must be short, strong, and usable as burned subtitle text.
- Generate a complete editor-ready package.
- Avoid copyrighted characters, brand logos, protected assets, or copied styles.
- Do not claim facts unless the user requested factual/news content.
- For sensitive topics, frame as commentary, question, narrative, or explainer unless verified facts are provided.

Return strict JSON only.
`.trim();

  const userPrompt = `
Create a complete Aigenikz video package.

USER COMMAND:
${topic}

SUBJECT:
${subject}

CATEGORY:
${category}

AUDIENCE:
${audience}

EMOTIONAL ANGLE:
${emotionalAngle}

VISUAL WORLD:
${visualWorld}

PLATFORM:
${platform}

STYLE:
${style}

DURATION TARGET:
${durationTarget} seconds

LEARNING MEMORY SUMMARY:
${JSON.stringify(memory?.winningPatterns || {}, null, 2)}

Return JSON with this structure:
{
  "category": "",
  "audience": "",
  "emotionalAngle": "",
  "visualWorld": "",
  "storyPromise": "",
  "retentionStrategy": "",
  "emotionalCurve": ["", "", "", "", ""],
  "suggestedTitle": "",
  "suggestedDescription": "",
  "hashtags": ["", "", "", ""],
  "scenes": [
    {
      "id": "scene_1",
      "title": "Hook",
      "duration": 4,
      "purpose": "",
      "visual": "",
      "voiceover": "",
      "caption": "",
      "imagePrompt": "",
      "cameraNote": "",
      "editNote": "",
      "retentionBeat": ""
    }
  ]
}

Create 5 scenes unless the topic needs 6.
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.82,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "OpenAI storyboard generation failed."
    );
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty storyboard content.");
  }

  return JSON.parse(content);
}

export async function generateAIStoryboard({
  topic = "Aigenikz cinematic video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  durationTarget = 30,
  allowFallback = true,
} = {}) {
  const cleanTopic = clean(topic);
  const cleanPlatform = clean(platform) || "TikTok";
  const cleanStyle = clean(style) || "cinematic futuristic high-energy";
  const finalDuration = clampDuration(durationTarget, 30);
  const category = detectCategory(cleanTopic);
  const memory = loadMemory();

  const request = {
    topic: cleanTopic,
    platform: cleanPlatform,
    style: cleanStyle,
    durationTarget: finalDuration,
    category,
  };

  try {
    const aiData = await callOpenAIStoryboard({
      ...request,
      memory,
    });

    const normalized = normalizeAIStoryboard(
      {
        ...aiData,
        source: "openai-autonomous-v7",
      },
      request
    );

    memory.runs = [
      {
        topic: cleanTopic,
        category,
        platform: cleanPlatform,
        style: cleanStyle,
        source: normalized.source,
        sceneCount: normalized.scenes.length,
        createdAt: new Date().toISOString(),
      },
      ...safeArray(memory.runs).slice(0, 99),
    ];

    memory.winningPatterns[category] = {
      lastAudience: normalized.audience,
      lastEmotionalAngle: normalized.emotionalAngle,
      lastRetentionStrategy: normalized.retentionStrategy,
      lastCaptions: normalized.captions.map((caption) => caption.text),
      updatedAt: new Date().toISOString(),
    };

    saveMemory(memory);

    return normalized;
  } catch (error) {
    console.warn("⚠️ Autonomous AI storyboard failed:", error.message);

    if (!allowFallback) {
      throw error;
    }

    const subject = stripPromptCommand(cleanTopic) || cleanTopic;
    const scenes = fallbackSceneSet({
      subject,
      category,
      platform: cleanPlatform,
      style: cleanStyle,
    });

    const fallback = normalizeAIStoryboard(
      {
        source: "prompt-aware-local-v7",
        category,
        audience: inferAudience(category),
        emotionalAngle: inferEmotionalAngle(category),
        visualWorld: inferVisualWorld(category),
        scenes,
      },
      request
    );

    memory.runs = [
      {
        topic: cleanTopic,
        category,
        platform: cleanPlatform,
        style: cleanStyle,
        source: fallback.source,
        sceneCount: fallback.scenes.length,
        error: error.message,
        createdAt: new Date().toISOString(),
      },
      ...safeArray(memory.runs).slice(0, 99),
    ];

    saveMemory(memory);

    return fallback;
  }
}

export default generateAIStoryboard;