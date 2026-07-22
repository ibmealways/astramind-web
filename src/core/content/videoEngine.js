// src/core/content/videoEngine.js
import { createArtifact } from "./artifacts.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function postJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `AstraMind backend request failed: ${endpoint}`
    );
  }

  return data;
}

function buildScriptFromScenes(scenes = []) {
  return scenes
    .map(
      (scene, index) => `${index + 1}. ${scene.title || `Scene ${index + 1}`}
Duration: ${scene.duration || 5}s
Visual: ${scene.visual || ""}
Voiceover: ${scene.voiceover || ""}
Caption: ${scene.caption || ""}`
    )
    .join("\n\n");
}

function normalizeStoryboardPayload(data = {}, input = {}) {
  const storyboard = data.storyboard || data;
  const scenes = storyboard.scenes || data.scenes || [];

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error(
      "AstraMind Story Brain returned no usable scenes. Check /api/cinematic-video/storyboard."
    );
  }

  const captions = storyboard.captions || data.captions || [];
  const promptPack = storyboard.promptPack || data.promptPack || [];
  const script =
    storyboard.script || data.script || buildScriptFromScenes(scenes);

  return {
    ok: true,
    topic: storyboard.topic || data.topic || input.topic,
    subject: storyboard.subject || data.subject || input.topic,
    platform: storyboard.platform || data.platform || input.platform || "TikTok",
    style:
      storyboard.style ||
      data.style ||
      input.style ||
      "cinematic futuristic high-energy",
    durationTarget:
      storyboard.durationTarget || data.durationTarget || input.durationTarget || 30,
    totalDuration:
      storyboard.totalDuration ||
      data.totalDuration ||
      scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0),
    source:
      storyboard.source ||
      data.source ||
      "ASTRAMIND_BACKEND_AUTONOMOUS_AI_STORY_BRAIN",
    pipeline:
      storyboard.pipeline ||
      data.pipeline ||
      "ASTRAMIND_VISION_PIPELINE_AUTONOMOUS_AI_DIRECTOR",
    category: storyboard.category || data.category || "",
    storyAngle: storyboard.storyAngle || data.storyAngle || "",
    audience: storyboard.audience || data.audience || "",
    emotionalArc: storyboard.emotionalArc || data.emotionalArc || "",
    retentionStrategy:
      storyboard.retentionStrategy || data.retentionStrategy || "",
    performancePrediction:
      storyboard.performancePrediction || data.performancePrediction || "",
    scenes,
    captions,
    promptPack,
    script,
    storyboard,
    learning: storyboard.learning || data.learning || null,
  };
}

function normalizeRenderPayload(data = {}, input = {}) {
  const storyboard = data.storyboard || {};
  const scenes = data.scenes || storyboard.scenes || [];

  const rawVideoUrl =
    data.videoUrl || data.downloadUrl || data.renderUrl || data.url;

  if (!rawVideoUrl) {
    throw new Error("Render completed but backend did not return a video URL.");
  }

  const captions = data.captions || storyboard.captions || [];
  const promptPack = data.promptPack || storyboard.promptPack || [];
  const script =
    storyboard.script || data.script || buildScriptFromScenes(scenes);

  return {
    ok: true,
    topic: data.topic || storyboard.topic || input.topic,
    subject: storyboard.subject || data.subject || input.topic,
    platform: data.platform || storyboard.platform || input.platform || "TikTok",
    style:
      data.style ||
      storyboard.style ||
      input.style ||
      "cinematic futuristic high-energy",
    durationTarget:
      data.durationTarget ||
      storyboard.durationTarget ||
      input.durationTarget ||
      30,
    totalDuration:
      data.totalDuration ||
      data.duration ||
      storyboard.totalDuration ||
      scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0),
    videoUrl: rawVideoUrl,
    downloadUrl: data.downloadUrl || rawVideoUrl,
    projectId: data.projectId,
    source:
      storyboard.source ||
      data.source ||
      "ASTRAMIND_BACKEND_FULL_VIDEO_CREATION",
    pipeline:
      storyboard.pipeline ||
      data.pipeline ||
      "ASTRAMIND_FULL_VIDEO_CREATION_PIPELINE",
    scenes,
    captions,
    promptPack,
    script,
    storyboard,
    visuals: data.visuals || [],
    clips: data.clips || [],
    voiceover: data.voiceover || null,
    soundtrack: data.soundtrack || null,
    subtitles: data.subtitles || null,
    avatar: data.avatar || null,
    socialExport: data.socialExport || null,
    benchmark: data.benchmark || data.gpu || null,
    raw: data,
  };
}

function buildArtifactPayload(data, subtype = "full-video") {
  const content = [
    `🎬 AstraMind Video: ${data.topic}`,
    ``,
    `Pipeline: ${data.pipeline}`,
    `Source: ${data.source}`,
    `Platform: ${data.platform}`,
    `Style: ${data.style}`,
    `Duration: ${data.totalDuration || data.durationTarget}s`,
    data.videoUrl ? `Video URL: ${data.videoUrl}` : "",
    ``,
    `Script:`,
    data.script || "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    data,
    artifact: createArtifact({
      type: "video",
      subtype,
      title: `${data.topic} (${data.platform})`,
      description:
        subtype === "full-video"
          ? "AstraMind complete AI video package: storyboard, scenes, visuals, motion, audio, subtitles, and MP4."
          : "AstraMind autonomous AI storyboard package.",
      content,
      metadata: data,
      source: data.source || "ASTRAMIND_VIDEO_ENGINE",
    }),
  };
}

export async function generateStoryboardOnly(input = {}) {
  const payload = {
    topic: cleanText(input.topic || input.prompt || "AstraMind Video"),
    platform: cleanText(input.platform || "TikTok"),
    style: cleanText(input.style || "cinematic futuristic high-energy"),
    durationTarget: Number(input.durationTarget || 30),
    userTier: input.userTier || input.tier || "CREATOR",
  };

  const data = await postJson("/api/cinematic-video/storyboard", payload);
  const normalized = normalizeStoryboardPayload(data, payload);

  return buildArtifactPayload(normalized, "storyboard");
}

export async function generateCompleteVideo(input = {}) {
  const payload = {
    topic: cleanText(input.topic || input.prompt || "AstraMind Video"),
    platform: cleanText(input.platform || "TikTok"),
    style: cleanText(input.style || "cinematic futuristic high-energy"),
    durationTarget: Number(input.durationTarget || 30),
    voiceover: input.voiceover !== false,
    voiceId: cleanText(input.voiceId || ""),
    soundtrack: input.soundtrack !== false,
    soundtrackMood: cleanText(input.soundtrackMood || "cinematic"),
    subtitles: input.subtitles !== false,
    avatarPresenter: Boolean(input.avatarPresenter),
    avatarImagePath: cleanText(input.avatarImagePath || ""),
    useTransitions: input.useTransitions !== false,
    transitionStyle: cleanText(input.transitionStyle || "cinematic"),
    preferGPU: Boolean(input.preferGPU),
    quality: cleanText(input.quality || "balanced"),
    motionEffect: cleanText(input.motionEffect || "cinematic"),
    createSocialPackage: input.createSocialPackage !== false,
    userTier: input.userTier || input.tier || "CREATOR",
  };

  const data = await postJson("/api/cinematic-video/render", payload);
  const normalized = normalizeRenderPayload(data, payload);

  return buildArtifactPayload(normalized, "full-video");
}

export async function runVideoEngine({ subtype = "full-video", input = {} } = {}) {
  if (subtype === "storyboard" || subtype === "plan") {
    return generateStoryboardOnly(input);
  }

  return generateCompleteVideo(input);
}

// Legacy compatibility for old imports.
export async function generateVideoContent(prompt) {
  return generateCompleteVideo({
    topic: prompt,
    platform: "TikTok",
    style: "cinematic futuristic high-energy",
    durationTarget: 30,
  });
}

export default {
  runVideoEngine,
  generateStoryboardOnly,
  generateCompleteVideo,
  generateVideoContent,
};
