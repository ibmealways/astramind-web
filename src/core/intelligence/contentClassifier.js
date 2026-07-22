const ENGINE_NAME =
  "AstraMind Unified Content Classifier v2 Autonomous Research Intent";

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return clean(value).toLowerCase();
}

function detectPlatform(text = "", fallback = "TikTok") {
  const t = lower(text);

  if (/youtube shorts|shorts|youtube/.test(t)) return "YouTube Shorts";
  if (/instagram|reels|ig reels|instagram reels/.test(t)) return "Instagram Reels";
  if (/tiktok|tik tok/.test(t)) return "TikTok";
  if (/facebook|meta/.test(t)) return "Facebook";
  if (/rumble/.test(t)) return "Rumble";
  if (/x\.com|twitter/.test(t)) return "X";

  return fallback || "TikTok";
}

function detectNarrativeMode(text = "") {
  const t = lower(text);

  if (
    /war|iran|military|government|classified|investigation|evidence|antarctica|documentary|underwater|ancient|discovery|news|headline|current event|breaking/.test(t)
  ) {
    return "documentary";
  }

  if (/meme|viral|funny|reaction|trend|chaos|internet|tiktok/.test(t)) {
    return "viral";
  }

  if (/astramind|ai|future|robot|technology|automation|neural/.test(t)) {
    return "futuristic";
  }

  if (/motivation|cinematic|emotional|healing|inspirational/.test(t)) {
    return "cinematic";
  }

  return "standard";
}

function detectResearchIntent({ topic = "", style = "", platform = "" } = {}) {
  // Defaults such as style="viral" and platform="TikTok" describe the output,
  // not the user's evidence needs. Only the mission text can require research.
  const text = lower(topic);
  const requestedPlatform = detectPlatform(text, platform || "TikTok");

  const asksForVideo =
    /generate|create|make|render|produce|build/.test(text) &&
    /video|short|tiktok|reel|youtube|clip|content/.test(text);

  const liveWords =
    /current|latest|today|right now|now|breaking|new|recent|trending|viral|hot|fresh|this week|this morning|this afternoon|tonight/.test(text);

  const explicitResearch =
    /research|search|internet|web|online|look up|find out|sources|articles|news|headlines|weather|forecast|trend|viral|tiktok/.test(text);

  let type = "none";
  let freshness = "evergreen";

  if (/weather|forecast|rain|snow|temperature|storm|humid|wind/.test(text)) {
    type = "weather";
    freshness = "live";
  } else if (/stock|stocks|crypto|market|markets|finance|price|earnings|fed|inflation|bitcoin|ethereum/.test(text)) {
    type = "finance";
    freshness = liveWords ? "live" : "recent";
  } else if (/tiktok|viral|trend|trending|meme|creator trend|sound trend|hashtag/.test(text)) {
    type = "trend";
    freshness = "live";
  } else if (/news|headline|breaking|latest|current event|today/.test(text)) {
    type = "news";
    freshness = "live";
  } else if (/near me|local|in my area|around me|in ct|connecticut|manchester/.test(text)) {
    type = "local";
    freshness = liveWords ? "live" : "recent";
  } else if (/how to|guide|tutorial|repair|replace|install|steps|instructions/.test(text)) {
    type = "how_to";
    freshness = liveWords ? "recent" : "evergreen";
  } else if (explicitResearch || liveWords) {
    type = "general_web";
    freshness = liveWords ? "live" : "recent";
  }

  const required = type !== "none" && (explicitResearch || liveWords || asksForVideo);

  return {
    required,
    type,
    freshness,
    platform: requestedPlatform,
    outputGoal: asksForVideo ? "video" : "answer",
    reason: required
      ? `Detected autonomous research intent: ${type}/${freshness}.`
      : "No autonomous research required.",
    searchDepth: freshness === "live" ? "advanced" : "basic",
    maxResults: type === "trend" || type === "news" ? 8 : 5,
  };
}

function buildPacingProfile(mode = "standard") {
  switch (mode) {
    case "viral":
      return { pacing: "fast", hookWindow: 2.5, energyCurve: "explosive" };
    case "documentary":
      return { pacing: "measured", hookWindow: 5, energyCurve: "investigative" };
    case "futuristic":
      return { pacing: "progressive", hookWindow: 4, energyCurve: "evolving" };
    case "cinematic":
      return { pacing: "emotional", hookWindow: 4, energyCurve: "immersive" };
    default:
      return { pacing: "balanced", hookWindow: 3, energyCurve: "standard" };
  }
}

function buildVisualProfile(mode = "standard") {
  switch (mode) {
    case "viral":
      return { motionStyle: "kinetic", transitionStyle: "impact", cameraStyle: "aggressive" };
    case "documentary":
      return { motionStyle: "stable", transitionStyle: "cinematic-fade", cameraStyle: "investigative" };
    case "futuristic":
      return { motionStyle: "floating", transitionStyle: "neural", cameraStyle: "holographic" };
    case "cinematic":
      return { motionStyle: "immersive", transitionStyle: "cinematic", cameraStyle: "emotional" };
    default:
      return { motionStyle: "balanced", transitionStyle: "standard", cameraStyle: "standard" };
  }
}

export function classifyContent({ topic = "", style = "", platform = "" } = {}) {
  const combined = `${topic} ${style} ${platform}`;
  const narrativeMode = detectNarrativeMode(combined);
  const researchIntent = detectResearchIntent({ topic, style, platform });
  const resolvedPlatform = detectPlatform(combined, platform || researchIntent.platform || "TikTok");

  return {
    ok: true,
    engine: ENGINE_NAME,
    topic,
    platform: resolvedPlatform,
    style,
    narrativeMode,
    researchIntent,
    pacingProfile: buildPacingProfile(narrativeMode),
    visualProfile: buildVisualProfile(narrativeMode),
    autonomousResearchReady: true,
  };
}

export default {
  classifyContent,
};
