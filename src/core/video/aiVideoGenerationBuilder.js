// src/core/video/aiVideoGenerationBuilder.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import dotenv from "dotenv";
import RunwayML, { TaskFailedError } from "@runwayml/sdk";
import mime from "mime";
import { validateVideoArtifact } from "./videoArtifactValidator.js";

dotenv.config();

const OUTPUT_DIR = path.resolve("server-renders");
const AI_VIDEO_DIR = path.join(OUTPUT_DIR, "ai-video-clips");

const RUNWAY_API_KEY =
  process.env.RUNWAY_API_KEY ||
  process.env.RUNWAYML_API_SECRET ||
  process.env.RUNWAY_API_SECRET;

const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

const AI_VIDEO_PROVIDER =
  process.env.AI_VIDEO_PROVIDER ||
  process.env.ASTRAMIND_VIDEO_PROVIDER ||
  "fallback-motion";

const RUNWAY_MODEL =
  process.env.RUNWAY_MODEL ||
  process.env.AI_VIDEO_MODEL ||
  "gen4.5";

const VEO_MODEL =
  process.env.VEO_MODEL ||
  process.env.GOOGLE_VIDEO_MODEL ||
  "veo-3.1-generate-preview";

const PROVIDER_TIMEOUT_MS = Math.max(30000, Number(process.env.VIDEO_PROVIDER_TIMEOUT_MS || 300000));
const inFlightRequests = new Map();

function withTimeout(promise, timeoutMs, label) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limitPrompt(value = "", max = 950) {
  const text = clean(value);
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "").trim();
}

function safeSlug(value = "ai-video-scene") {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 90) || "ai-video-scene"
  );
}

function makeId() {
  return crypto.randomBytes(6).toString("hex");
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, stderr });
      else reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

function normalizeScene(scene = {}, index = 0) {
  return {
    id: scene.id || `scene_${index + 1}`,
    title: clean(scene.title || `Scene ${index + 1}`),
    duration: Math.max(5, Math.min(Number(scene.duration || 5), 10)),
    visual: clean(scene.visual || ""),
    voiceover: clean(scene.voiceover || ""),
    caption: clean(scene.caption || ""),
    imagePrompt: clean(scene.imagePrompt || scene.visual || scene.caption || ""),
    cameraNote: clean(scene.cameraNote || ""),
    editNote: clean(scene.editNote || ""),
    retentionBeat: clean(scene.retentionBeat || ""),
    continuityNote: clean(scene.continuityNote || ""),
    providerPromptBoost: clean(scene.providerPromptBoost || ""),
  };
}

function imageToDataUri(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  const contentType = mime.getType(imagePath) || "image/png";
  const imageBuffer = fs.readFileSync(imagePath);
  return `data:${contentType};base64,${imageBuffer.toString("base64")}`;
}

function getVisualPath(visual = {}) {
  return (
    visual?.imagePath ||
    visual?.outputPath ||
    visual?.path ||
    visual?.filePath ||
    null
  );
}

function getRunwayRatio(platform = "TikTok") {
  const p = String(platform || "").toLowerCase();

  if (
    p.includes("tiktok") ||
    p.includes("reel") ||
    p.includes("short") ||
    p.includes("vertical")
  ) {
    return "720:1280";
  }

  return "1280:720";
}

function normalizeProvider(provider = "") {
  return clean(provider || "fallback-motion").toLowerCase();
}

async function requestLocalVideoClip({ prompt, outputPath, referenceImagePath = null }) {
  const baseUrl = String(process.env.AIGENIKZ_VIDEO_WORKER_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.AIGENIKZ_VIDEO_WORKER_TOKEN || "").trim();
  if (!baseUrl || !token) throw new Error("Aigenikz local video worker is not configured.");
  const referenceImage = referenceImagePath ? imageToDataUri(referenceImagePath) : null;
  if (referenceImagePath && !referenceImage) throw new Error("Character reference image is unavailable.");
  const auth = { Authorization: `Bearer ${token}` };
  const start = await fetch(`${baseUrl}/v1/video/generations`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: referenceImagePath ? "LTX-Video-2B-I2V" : "CogVideoX-2B",
      ...(referenceImage ? { reference_image: referenceImage } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const submitted = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(submitted.error || `Local video worker rejected the request (${start.status}).`);
  const jobId = submitted.job_id;
  if (!jobId) throw new Error("Local video worker returned no job ID.");
  const deadline = Date.now() + 25 * 60 * 1000;
  let job = submitted;
  while (job.status === "queued" || job.status === "running") {
    if (Date.now() > deadline) throw new Error("Local video generation timed out after 25 minutes.");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await fetch(`${baseUrl}/v1/video/generations/${encodeURIComponent(jobId)}`, { headers: auth, signal: AbortSignal.timeout(30000) });
    job = await status.json().catch(() => ({}));
    if (!status.ok) throw new Error(job.error || `Local video status failed (${status.status}).`);
  }
  if (job.status !== "completed") throw new Error(job.error || "Local video generation failed.");
  const response = await fetch(`${baseUrl}/v1/video/generations/${encodeURIComponent(jobId)}/file`, { headers: auth, signal: AbortSignal.timeout(120000) });
  if (!response.ok || !(response.headers.get("content-type") || "").includes("video/")) throw new Error(`Local worker did not return an MP4 (${response.status}).`);
  const video = Buffer.from(await response.arrayBuffer());
  if (video.length < 10000) throw new Error("Local worker returned an empty or invalid video.");
  fs.writeFileSync(outputPath, video);
  const artifactValidation = await validateVideoArtifact({ filePath: outputPath, source: "aigenikz-local", rejectStatic: true });
  return { outputPath, artifactValidation };
}

function buildRunwayPrompt({
  scene,
  topic,
  platform,
  style,
  storyboard,
  directorPlan = null,
}) {
  const prompt = `
Live-action cinematic vertical video.

Topic: ${directorPlan?.safeTopic || topic}
Scene: ${scene.title}
Action: ${scene.visual}
Continuity: ${
    scene.continuityNote ||
    directorPlan?.character?.mainCharacter ||
    storyboard?.characterBible ||
    ""
  }
Visual Bible: ${directorPlan?.visual?.color || ""}; ${
    directorPlan?.visual?.lighting || ""
  }
Character: ${directorPlan?.character?.mainCharacter || ""}
Camera: ${
    scene.cameraNote ||
    directorPlan?.visual?.camera ||
    "slow cinematic dolly with natural subject motion"
  }
Motion: real human movement, real environmental movement, moving light, moving atmosphere, moving camera.
Style: ${style}
Platform: ${platform}

Rules: no logos, no watermarks, no copied characters, no protected franchise designs, no fake UI. Leave lower-third room for subtitles.
`.trim();

  return limitPrompt(prompt, 950);
}

function buildVeoPrompt({
  scene,
  topic,
  platform,
  style,
  storyboard,
  directorPlan = null,
}) {
  const prompt = `
Create a cinematic AI video clip.

Subject: ${directorPlan?.safeTopic || topic}
Scene: ${scene.title}
Action: ${scene.visual}
Mood: ${storyboard?.emotionalAngle || storyboard?.category || "cinematic"}
Director continuity: ${
    scene.continuityNote ||
    directorPlan?.character?.mainCharacter ||
    "Maintain consistent cinematic subject identity and tone."
  }
Visual style: ${style}
Camera: ${
    scene.cameraNote ||
    directorPlan?.visual?.camera ||
    "slow cinematic camera movement"
  }
Lighting: ${directorPlan?.visual?.lighting || "cinematic natural lighting"}
Motion: natural character movement, environment movement, camera movement.
Format: ${platform}

Avoid logos, watermarks, copyrighted characters, protected likenesses, and fake UI.
`.trim();

  return limitPrompt(prompt, 950);
}

async function downloadRemoteVideo(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download AI video: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("video/")) {
    throw new Error(`AI provider returned non-video content: ${contentType || "unknown"}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
  return outputPath;
}

function extractRunwayOutputUrl(task) {
  if (!task) return null;

  if (Array.isArray(task.output) && task.output[0]) return task.output[0];
  if (typeof task.output === "string") return task.output;
  if (task.output?.url) return task.output.url;
  if (Array.isArray(task.outputs) && task.outputs[0]) return task.outputs[0];

  return null;
}

async function requestRunwayClip({
  prompt,
  scene,
  visual,
  outputPath,
  platform,
}) {
  if (!RUNWAY_API_KEY) {
    throw new Error("Missing RUNWAY_API_KEY or RUNWAYML_API_SECRET.");
  }

  const client = new RunwayML({
    apiKey: RUNWAY_API_KEY,
  });

  const visualPath = getVisualPath(visual);
  const promptImage = imageToDataUri(visualPath);
  const safePrompt = limitPrompt(prompt, 950);

  console.log("🎬 Runway prompt length:", safePrompt.length);

  const payload = {
    model: RUNWAY_MODEL,
    promptText: safePrompt,
    ratio: getRunwayRatio(platform),
    duration: Math.max(5, Math.min(Number(scene.duration || 5), 10)),
  };

  if (promptImage) {
    payload.promptImage = promptImage;
  }

  console.log("🎬 Runway generation started:", {
    model: payload.model,
    ratio: payload.ratio,
    duration: payload.duration,
    hasPromptImage: Boolean(payload.promptImage),
  });

  try {
    const requestKey = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    let request = inFlightRequests.get(requestKey);
    if (!request) {
      request = withTimeout(client.imageToVideo.create(payload).waitForTaskOutput(), PROVIDER_TIMEOUT_MS, "Runway generation")
        .finally(() => inFlightRequests.delete(requestKey));
      inFlightRequests.set(requestKey, request);
    }
    const task = await request;
    const videoUrl = extractRunwayOutputUrl(task);

    if (!videoUrl) {
      throw new Error("Runway completed but returned no video URL.");
    }

    await downloadRemoteVideo(videoUrl, outputPath);

    const artifactValidation = await validateVideoArtifact({
      filePath: outputPath,
      source: "runway",
      rejectStatic: true,
      expected: { minDuration: 1, maxDuration: Number(scene.duration || 10) + 1 },
    });

    console.log("✅ Runway live-action clip downloaded:", outputPath);

    return {
      outputPath,
      remoteUrl: videoUrl,
      task,
      artifactValidation,
    };
  } catch (error) {
    if (error instanceof TaskFailedError) {
      console.error("🔥 Runway task failed:", error.taskDetails);

      throw new Error(
        `Runway task failed: ${JSON.stringify(error.taskDetails)}`
      );
    }

    throw new Error(
      error?.message || "Runway generation failed before task creation."
    );
  }
}

/**
 * VEO placeholder:
 * This is structured so the project compiles before @google/genai is installed.
 * Once your disk space issue is solved and @google/genai is installed, we will replace this
 * with the real Google GenAI Veo call.
 */
async function requestVeoClip({
  prompt,
  scene,
  outputPath,
  platform,
}) {
  if (!GOOGLE_API_KEY) {
    throw new Error("Missing GOOGLE_API_KEY / GEMINI_API_KEY for Veo.");
  }

  throw new Error(
    `Veo provider is configured but not installed/wired yet. Install @google/genai, then enable real Veo request logic. Model: ${VEO_MODEL}, platform: ${platform}, duration: ${scene.duration}, prompt length: ${limitPrompt(
      prompt,
      950
    ).length}`
  );
}

async function createFallbackSceneClip({
  imagePath,
  outputPath,
  duration = 5,
  motion = "cinematic",
}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error("Fallback clip requires a valid imagePath.");
  }

  const frames = Math.round(duration * 30);

  const zoomExpr =
    motion === "tension"
      ? `zoom='1.04+0.0018*on'`
      : motion === "emotional"
      ? `zoom='1.02+0.0012*on'`
      : `zoom='1.03+0.0015*on'`;

  const xExpr = `x='iw/2-(iw/zoom/2)+sin(on/35)*18'`;
  const yExpr = `y='ih/2-(ih/zoom/2)+cos(on/42)*14'`;

  const vf = [
    "scale=1200:2134:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    `zoompan=${zoomExpr}:${xExpr}:${yExpr}:d=${frames}:s=1080x1920:fps=30`,
    "format=yuv420p",
  ].join(",");

  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-t",
    String(duration),
    "-vf",
    vf,
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

async function tryProvider({
  provider,
  scene,
  visual,
  topic,
  platform,
  style,
  storyboard,
  directorPlan,
  outputPath,
  referenceImagePath,
}) {
  const finalProvider = normalizeProvider(provider);

  if (finalProvider === "runway") {
    const prompt = buildRunwayPrompt({
      scene,
      topic,
      platform,
      style,
      storyboard,
      directorPlan,
    });

    const runwayResult = await requestRunwayClip({
      prompt,
      scene,
      visual,
      outputPath,
      platform,
    });

    return {
      provider: "runway",
      model: RUNWAY_MODEL,
      prompt,
      outputPath: runwayResult.outputPath,
      remoteUrl: runwayResult.remoteUrl,
      raw: runwayResult.task,
      artifactValidation: runwayResult.artifactValidation,
    };
  }

  if (finalProvider === "aigenikz-local") {
    const prompt = referenceImagePath
      ? limitPrompt(`Original cinematic anime fantasy video. Use the supplied character reference as the first frame. Preserve the same face, hair, outfit, and color design. Action: ${scene.visual}. Camera: ${scene.cameraNote || "steady medium shot"}. Visible subject and deliberate body movement throughout. No text or logos.`, 950)
      : buildRunwayPrompt({ scene, topic, platform, style, storyboard, directorPlan });
    const result = await requestLocalVideoClip({ prompt, outputPath, referenceImagePath });
    return { provider: "aigenikz-local", model: referenceImagePath ? "LTX-Video-2B-I2V" : "CogVideoX-2B", prompt, ...result };
  }

  if (finalProvider === "veo") {
    const prompt = buildVeoPrompt({
      scene,
      topic,
      platform,
      style,
      storyboard,
      directorPlan,
    });

    const veoResult = await requestVeoClip({
      prompt,
      scene,
      visual,
      outputPath,
      platform,
    });

    return {
      provider: "veo",
      model: VEO_MODEL,
      prompt,
      outputPath: veoResult.outputPath,
      remoteUrl: veoResult.remoteUrl,
      raw: veoResult.task,
    };
  }

  throw new Error(`Unsupported AI video provider: ${finalProvider}`);
}

function getAutoProviderOrder() {
  const order = [];

  if (GOOGLE_API_KEY) order.push("veo");
  if (RUNWAY_API_KEY) order.push("runway");

  if (!order.length) order.push("fallback-motion");

  return order;
}

export async function generateAIVideoClip({
  scene,
  visual,
  topic = "Aigenikz cinematic video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  storyboard = null,
  directorPlan = null,
  projectId = `ai_video_${Date.now()}`,
  index = 0,
  provider = AI_VIDEO_PROVIDER,
  allowFallback = true,
  referenceImagePath = null,
} = {}) {
  ensureDir(OUTPUT_DIR);
  ensureDir(AI_VIDEO_DIR);

  const normalized = normalizeScene(scene, index);
  const finalProvider = normalizeProvider(provider);

  const fileName = `${safeSlug(projectId)}-${String(index + 1).padStart(
    2,
    "0"
  )}-${safeSlug(normalized.title)}-${makeId()}.mp4`;

  const outputPath = path.join(AI_VIDEO_DIR, fileName);
  const publicUrl = `/server-renders/ai-video-clips/${fileName}`;

  const providerAttempts =
    finalProvider === "auto"
      ? getAutoProviderOrder()
      : [finalProvider];

  const errors = [];

  for (const providerName of providerAttempts) {
    try {
      if (providerName === "fallback-motion") {
        throw new Error("Provider is fallback-motion.");
      }

      const result = await tryProvider({
        provider: providerName,
        scene: normalized,
        visual,
        topic: directorPlan?.safeTopic || topic,
        platform,
        style,
        storyboard,
        directorPlan,
        outputPath,
        referenceImagePath,
      });

      return {
        ok: true,
        source: result.provider,
        model: result.model,
        sceneId: normalized.id,
        sceneIndex: index,
        title: normalized.title,
        outputPath: result.outputPath,
        publicUrl,
        prompt: result.prompt,
        duration: result.artifactValidation?.duration || normalized.duration,
        liveAction: true,
        fallbackUsed: false,
        remoteUrl: result.remoteUrl,
        artifactValidation: result.artifactValidation,
        providerAttempts,
      };
    } catch (error) {
      errors.push({
        provider: providerName,
        message: error.message,
      });

      console.warn(
        `⚠️ AI live-action provider failed for scene ${index + 1} (${providerName}):`,
        error.message
      );
    }
  }

  if (!allowFallback) {
    throw new Error(
      `All AI video providers failed: ${JSON.stringify(errors)}`
    );
  }

  const imagePath = getVisualPath(visual);

  const fallbackPath = await createFallbackSceneClip({
    imagePath,
    outputPath,
    duration: normalized.duration,
    motion: storyboard?.category || "cinematic",
  });

  const fallbackPrompt = buildRunwayPrompt({
    scene: normalized,
    topic: directorPlan?.safeTopic || topic,
    platform,
    style,
    storyboard,
    directorPlan,
  });

  return {
    ok: true,
    source: "fallback-motion",
    requestedProvider: finalProvider,
    model:
      finalProvider === "veo"
        ? VEO_MODEL
        : finalProvider === "runway"
        ? RUNWAY_MODEL
        : "fallback-motion",
    sceneId: normalized.id,
    sceneIndex: index,
    title: normalized.title,
    outputPath: fallbackPath,
    publicUrl,
    prompt: fallbackPrompt,
    duration: normalized.duration,
    liveAction: false,
    fallbackUsed: true,
    providerAttempts,
    errors,
  };
}

export async function generateAIVideoClips({
  scenes = [],
  visuals = [],
  storyboard = null,
  directorPlan = null,
  topic = "Aigenikz cinematic video",
  platform = "TikTok",
  style = "cinematic futuristic high-energy",
  projectId = `ai_video_${Date.now()}`,
  provider = AI_VIDEO_PROVIDER,
  allowFallback = true,
} = {}) {
  const finalScenes =
    Array.isArray(scenes) && scenes.length
      ? scenes
      : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : [];

  if (!finalScenes.length) {
    throw new Error("No scenes supplied to generateAIVideoClips.");
  }

  const clips = [];

  for (let index = 0; index < finalScenes.length; index += 1) {
    const clip = await generateAIVideoClip({
      scene: finalScenes[index],
      visual: visuals[index],
      topic: directorPlan?.safeTopic || topic || storyboard?.topic,
      platform: platform || storyboard?.platform,
      style: style || storyboard?.style,
      storyboard,
      directorPlan,
      projectId,
      index,
      provider,
      allowFallback,
    });

    clips.push(clip);
  }

  return {
    ok: true,
    engine: "Aigenikz AI Video Generation Builder v4 Director + Auto Provider Ready",
    provider,
    providerOrder: provider === "auto" ? getAutoProviderOrder() : [provider],
    runwayModel: RUNWAY_MODEL,
    veoModel: VEO_MODEL,
    runwayConfigured: Boolean(RUNWAY_API_KEY),
    veoConfigured: Boolean(GOOGLE_API_KEY),
    liveActionEnabled:
      (provider === "runway" && Boolean(RUNWAY_API_KEY)) ||
      (provider === "veo" && Boolean(GOOGLE_API_KEY)) ||
      provider === "auto",
    clipCount: clips.length,
    liveActionCount: clips.filter((clip) => clip.liveAction).length,
    fallbackCount: clips.filter((clip) => clip.fallbackUsed).length,
    clips,
  };
}

export function getAIVideoGenerationHealth() {
  return {
    ok: true,
    engine: "Aigenikz AI Video Generation Builder v4 Director + Auto Provider Ready",
    provider: AI_VIDEO_PROVIDER,
    providerOrder: AI_VIDEO_PROVIDER === "auto" ? getAutoProviderOrder() : [AI_VIDEO_PROVIDER],
    runwayModel: RUNWAY_MODEL,
    veoModel: VEO_MODEL,
    runwayKeyLoaded: Boolean(RUNWAY_API_KEY),
    googleKeyLoaded: Boolean(GOOGLE_API_KEY),
    providers: {
      auto: {
        configured: Boolean(RUNWAY_API_KEY || GOOGLE_API_KEY),
        enabled: AI_VIDEO_PROVIDER === "auto",
        order: getAutoProviderOrder(),
      },
      runway: {
        configured: Boolean(RUNWAY_API_KEY),
        enabled: AI_VIDEO_PROVIDER === "runway",
        model: RUNWAY_MODEL,
        supportedModes: ["image-to-video", "text-to-video"],
      },
      veo: {
        configured: Boolean(GOOGLE_API_KEY),
        enabled: AI_VIDEO_PROVIDER === "veo",
        model: VEO_MODEL,
        supportedModes: ["text-to-video", "image-to-video pending final SDK wiring"],
        status:
          "provider-ready; install @google/genai and wire requestVeoClip once disk space is cleared",
      },
      fallbackMotion: {
        configured: true,
        enabled: AI_VIDEO_PROVIDER === "fallback-motion",
      },
    },
  };
}

export default {
  generateAIVideoClip,
  generateAIVideoClips,
  getAIVideoGenerationHealth,
};
