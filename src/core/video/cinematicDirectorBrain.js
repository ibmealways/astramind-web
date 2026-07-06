// src/core/video/cinematicDirectorBrain.js

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limit(value = "", max = 900) {
  const text = clean(value);
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "").trim();
}

function detectIPRisk(topic = "") {
  const t = topic.toLowerCase();

  const known = [
    "natsu",
    "fairy tail",
    "fairytail",
    "naruto",
    "goku",
    "dragon ball",
    "marvel",
    "dc comics",
    "batman",
    "superman",
    "spider-man",
    "spiderman",
    "disney",
    "pixar",
  ].some((name) => t.includes(name));
}

function makeIPSafeSubject(topic = "") {
  const text = clean(topic);

  if (!detectIPRisk(text)) return text;

  return text
    .replace(/natsu/gi, "an original fiery anime-inspired young hero")
    .replace(/fairy\s*tail/gi, "a magical adventure guild-inspired universe")
    .replace(/fairytail/gi, "a magical adventure guild-inspired universe")
    .replace(/naruto/gi, "an original determined ninja-inspired hero")
    .replace(/goku/gi, "an original super-powered martial arts hero")
    .replace(/dragon\s*ball/gi, "an original cosmic martial arts universe")
    .replace(/marvel/gi, "an original superhero-inspired universe")
    .replace(/dc comics/gi, "an original dark heroic universe")
    .replace(/batman/gi, "an original masked night detective")
    .replace(/superman/gi, "an original solar-powered protector")
    .replace(/spider-?man/gi, "an original agile masked wall-crawler")
    .replace(/disney/gi, "an original family-friendly fantasy world")
    .replace(/pixar/gi, "an original heartfelt animated adventure style");
}

function detectGenre(topic = "", category = "") {
  const t = `${topic} ${category}`.toLowerCase();

  if (t.includes("war") || t.includes("iran") || t.includes("conflict")) {
    return "geo_conflict_documentary";
  }

  if (t.includes("soulmate") || t.includes("love") || t.includes("relationship")) {
    return "emotional_romance";
  }

  if (t.includes("ai") || t.includes("astramind") || t.includes("technology")) {
    return "futuristic_tech_brand";
  }

  if (t.includes("business") || t.includes("entrepreneur") || t.includes("money")) {
    return "entrepreneurial_growth";
  }

  if (detectIPRisk(t)) {
    return "original_fantasy_action";
  }

  return "cinematic_social_story";
}

function buildVisualBible({ topic, category }) {
  const genre = detectGenre(topic, category);

  const map = {
    geo_conflict_documentary: {
      color: "smoky amber, steel blue, deep shadow, desaturated cinematic contrast",
      camera: "handheld documentary tension, slow push-ins, aerial establishing shots, urgent close-ups",
      lighting: "low natural light, smoke haze, emergency glow, dramatic contrast",
      texture: "news-documentary realism, dust, smoke, maps, satellite context",
    },
    emotional_romance: {
      color: "warm gold, soft blue, city-night bokeh, gentle skin tones",
      camera: "slow dolly, soft rack focus, intimate close-up, emotional pause",
      lighting: "warm practical lights, cinematic glow, shallow depth of field",
      texture: "romantic realism, subtle atmosphere, soft motion, emotional stillness",
    },
    futuristic_tech_brand: {
      color: "electric cyan, deep navy, violet glow, clean black glass",
      camera: "smooth orbital moves, interface reveal, confident push-in, premium product framing",
      lighting: "neon rim light, holographic glow, polished cinematic reflections",
      texture: "futuristic UI, glassmorphism, data streams, premium startup energy",
    },
    entrepreneurial_growth: {
      color: "cyan, gold, graphite black, clean white highlights",
      camera: "confident upward push, workspace tracking shot, dashboard close-ups",
      lighting: "high-end office glow, screen light, sunrise ambition",
      texture: "growth charts, planning boards, digital dashboards, team execution",
    },
    original_fantasy_action: {
      color: "ember orange, midnight blue, magic glow, smoky shadows",
      camera: "heroic low-angle push, energy-charged tracking shot, dramatic reveal",
      lighting: "fire glow, magical aura, stormy backlight",
      texture: "original anime-inspired energy, no copied costumes, no protected character likeness",
    },
    cinematic_social_story: {
      color: "cinematic teal, soft amber, deep contrast",
      camera: "premium social-video pacing, slow push, emotional reveal, clean close-ups",
      lighting: "dramatic but readable, polished social ad lighting",
      texture: "modern cinematic realism with strong visual metaphor",
    },
  };

  return {
    genre,
    ...(map[genre] || map.cinematic_social_story),
  };
}

function buildCharacterBible({ topic, storyboard }) {
  const genre = detectGenre(topic, storyboard?.category);

  if (genre === "original_fantasy_action") {
    return {
      enabled: true,
      mainCharacter:
        "original fiery young hero, spiky flame-colored hair, determined eyes, dark modern fantasy jacket, glowing ember energy, no copied costume, no franchise symbols",
      consistencyRules: [
        "Keep the same hair color, outfit tone, face age, and energy color across scenes.",
        "Do not copy any protected character design, logo, guild mark, costume, or exact likeness.",
        "Use original fantasy-action styling only.",
      ],
    };
  }

  if (genre === "emotional_romance") {
    return {
      enabled: true,
      mainCharacter:
        "realistic emotionally expressive adult protagonist, natural clothing, cinematic face lighting, consistent hairstyle and wardrobe through all scenes",
      consistencyRules: [
        "Keep the same protagonist visual identity across scenes.",
        "Preserve wardrobe color, hair, age range, and emotional tone.",
      ],
    };
  }

  return {
    enabled: true,
    mainCharacter:
      "consistent cinematic protagonist or subject style matching the video concept",
    consistencyRules: [
      "Preserve visual tone, lighting style, wardrobe logic, and scene atmosphere.",
      "Maintain continuity between scene clips.",
    ],
  };
}

function enrichScenes({ scenes = [], bible }) {
  return scenes.map((scene, index) => {
    const visual = clean(scene.visual);
    const caption = clean(scene.caption);

    return {
      ...scene,
      directorSceneId: `director_scene_${index + 1}`,
      cameraNote:
        scene.cameraNote ||
        `${bible.visual.camera}. Scene ${index + 1} should feel connected to the previous shot.`,
      editNote:
        scene.editNote ||
        "Use cinematic continuity, natural subject motion, premium short-form pacing, and a clear emotional beat.",
      continuityNote: limit(
        `Maintain ${bible.visual.color}. Character consistency: ${bible.character.mainCharacter}. Visual: ${visual}. Caption: ${caption}.`,
        700
      ),
      providerPromptBoost: limit(
        `${bible.character.mainCharacter}. ${bible.visual.texture}. ${bible.visual.lighting}. ${bible.visual.camera}. Maintain continuity. Avoid logos, watermarks, copyrighted characters, protected likenesses, and exact franchise references.`,
        850
      ),
    };
  });
}

export function buildCinematicDirectorPlan({
  topic = "",
  storyboard = null,
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
} = {}) {
  const originalTopic = clean(topic || storyboard?.topic || "AstraMind video");
  const ipRisk = detectIPRisk(originalTopic);
  const safeTopic = makeIPSafeSubject(originalTopic);
  const visual = buildVisualBible({
    topic: safeTopic,
    category: storyboard?.category || "",
  });

  const character = buildCharacterBible({
    topic: safeTopic,
    storyboard,
  });

  const scenes = enrichScenes({
    scenes: storyboard?.scenes || [],
    bible: {
      visual,
      character,
    },
  });

  return {
    ok: true,
    engine: "AstraMind Cinematic Director Brain v1",
    originalTopic,
    safeTopic,
    platform,
    style,
    ipRisk,
    legalSafety:
      ipRisk
        ? "Protected references transformed into original inspired concepts."
        : "No major protected-character risk detected.",
    visual,
    character,
    scenes,
    providerDirectives: {
      runway:
        "Use image-to-video when scene visual exists. Preserve character and mood continuity. Generate real motion.",
      veo:
        "Use text/video generation with continuity rules and cinematic motion.",
      fallback:
        "Use image-motion only when live provider fails.",
    },
  };
}

export default {
  buildCinematicDirectorPlan,
};