// src/pages/modules/ContentVideo.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";
import { runVideoEngine } from "../../core/content/videoEngine.js";
import { checkVisionHealth } from "../../core/video/visionClient.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LAST_VIDEO_KEY = "astramind_last_video_url";
const LAST_RENDER_KEY = "astramind_last_video_render_response";
const LAST_ENGINE_KEY = "astramind_last_video_engine";

function buildBrowserUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function addCache(url) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cache=${Date.now()}`;
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function secondsToTimestamp(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);

  return `00:${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}.000`;
}

function buildVtt(captions = []) {
  const lines = ["WEBVTT", ""];

  captions.forEach((caption, index) => {
    lines.push(String(caption.index || index + 1));
    lines.push(
      `${secondsToTimestamp(caption.start)} --> ${secondsToTimestamp(
        caption.end
      )}`
    );
    lines.push(caption.text || caption.caption || "");
    lines.push("");
  });

  return lines.join("\n");
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeEngineResponse(response) {
  if (!response) return null;

  const artifact = response.artifact || null;
  const data =
    response.data ||
    response.videoData ||
    artifact?.metadata?.videoData ||
    artifact?.metadata ||
    null;

  if (data?.scenes?.length) {
    return { ok: true, artifact, data };
  }

  const fallbackTopic =
    artifact?.metadata?.topic ||
    artifact?.title ||
    response.topic ||
    "Aigenikz Video";

  const fallbackContent =
    artifact?.content || response.content || `Video Script:\n${fallbackTopic}`;

  return {
    ok: true,
    artifact: artifact || {
      title: fallbackTopic,
      content: fallbackContent,
    },
    data: {
      topic: fallbackTopic,
      platform: artifact?.metadata?.platform || "TikTok",
      style: artifact?.metadata?.style || "cinematic futuristic high-energy",
      totalDuration: 20,
      script: fallbackContent,
      scenes: [
        {
          id: "scene_1",
          title: "Hook",
          duration: 4,
          visual: "Cinematic hook visual introducing the idea.",
          voiceover: `Introducing ${fallbackTopic}`,
          caption: "This changes everything",
        },
        {
          id: "scene_2",
          title: "Problem",
          duration: 4,
          visual: "Show the problem or frustration the audience faces.",
          voiceover: "Most people are stuck doing everything manually.",
          caption: "Most people miss this",
        },
        {
          id: "scene_3",
          title: "Transformation",
          duration: 5,
          visual: "Show AI systems automating tasks and building workflows.",
          voiceover: "Aigenikz turns ideas into systems.",
          caption: "Ideas become systems",
        },
        {
          id: "scene_4",
          title: "Proof",
          duration: 4,
          visual:
            "Show dashboards, apps, content tools, finance tools, and automation.",
          voiceover:
            "One AI operating system for building, creating, and launching.",
          caption: "One AI operating system",
        },
        {
          id: "scene_5",
          title: "CTA",
          duration: 3,
          visual: "Final futuristic Aigenikz brand reveal.",
          voiceover: "Build smarter today.",
          caption: "Build smarter today",
        },
      ],
      captions: [],
      promptPack: [],
    },
  };
}

export default function ContentVideo() {
  const { setMode } = useOSMode();
  const resultRef = useRef(null);
  const videoRef = useRef(null);

  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [style, setStyle] = useState("cinematic futuristic high-energy");
  const [durationTarget, setDurationTarget] = useState(30);
  const [renderEngine, setRenderEngine] = useState(
    () => localStorage.getItem(LAST_ENGINE_KEY) || "vision"
  );

  const [voiceover, setVoiceover] = useState(true);
  const [voiceId, setVoiceId] = useState("");
  const [soundtrack, setSoundtrack] = useState(true);
  const [soundtrackMood, setSoundtrackMood] = useState("cinematic");
  const [subtitles, setSubtitles] = useState(true);
  const [useTransitions, setUseTransitions] = useState(true);
  const [transitionStyle, setTransitionStyle] = useState("cinematic");
  const [preferGPU, setPreferGPU] = useState(false);
  const [quality, setQuality] = useState("balanced");
  const [motionEffect, setMotionEffect] = useState("cinematic");
  const [avatarPresenter, setAvatarPresenter] = useState(false);
  const [avatarImagePath, setAvatarImagePath] = useState("");
  const [createSocialPackage, setCreateSocialPackage] = useState(true);

  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const [result, setResult] = useState(null);
  const [videoUrl, setVideoUrl] = useState(
    () => localStorage.getItem(LAST_VIDEO_KEY) || ""
  );
  const [renderResponse, setRenderResponse] = useState(
    () => loadJson(LAST_RENDER_KEY) || null
  );
  const [visionHealth, setVisionHealth] = useState(null);
  const [renderProgress, setRenderProgress] = useState(null);

  const [notice, setNotice] = useState(
    () =>
      localStorage.getItem(LAST_VIDEO_KEY)
        ? "✅ Last rendered MP4 restored. Preview, open, or download below."
        : ""
  );

  useEffect(() => {
    setMode(OS_MODES.CONTENT);
  }, [setMode]);

  useEffect(() => {
    localStorage.setItem(LAST_ENGINE_KEY, renderEngine);
  }, [renderEngine]);

  const videoData = result?.data || null;
  const artifact = result?.artifact || null;

  const totalDuration = useMemo(() => {
    if (videoData?.totalDuration) return videoData.totalDuration;

    if (Array.isArray(videoData?.scenes)) {
      return videoData.scenes.reduce(
        (sum, scene) => sum + Math.max(2, Number(scene.duration || 4)),
        0
      );
    }

    if (Array.isArray(renderResponse?.scenes)) {
      return renderResponse.scenes.reduce(
        (sum, scene) => sum + Math.max(2, Number(scene.duration || 4)),
        0
      );
    }

    return 0;
  }, [videoData, renderResponse]);

  const visuals = useMemo(() => {
    return Array.isArray(renderResponse?.visuals) ? renderResponse.visuals : [];
  }, [renderResponse]);

  const activeScenes = videoData?.scenes || renderResponse?.scenes || [];
  const restoredVideoOnly = videoUrl && !videoData;

  const scrollToResults = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);
  };

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    setNotice("🧪 Checking Aigenikz Vision Pipeline...");

    try {
      const health = await checkVisionHealth();
      setVisionHealth(health);
      setNotice("✅ Aigenikz Vision Pipeline is online and ready.");
    } catch (err) {
      console.error("Vision health check failed:", err);
      setVisionHealth(null);
      setNotice(`❌ Vision health check failed. ${err.message || ""}`);
    } finally {
      setCheckingHealth(false);
    }
  };

  const generateVideoPlan = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const cleanTopic = topic.trim();

    if (!cleanTopic) {
      setNotice("⚠️ Enter a video topic first.");
      return;
    }

    setLoading(true);
    setNotice("🧠 Generating video storyboard, scenes, captions, and prompts...");
    setVideoUrl("");
    setRenderResponse(null);
    setRenderProgress(null);
    localStorage.removeItem(LAST_VIDEO_KEY);
    localStorage.removeItem(LAST_RENDER_KEY);

    try {
      const response = await runVideoEngine({
        subtype: "storyboard",
        input: { topic: cleanTopic, platform, style },
      });

      const normalized = normalizeEngineResponse(response);

      if (!normalized?.ok || !normalized?.data?.scenes?.length) {
        throw new Error("Video engine did not return usable scene data.");
      }

      setResult(normalized);
      setNotice(
        renderEngine === "vision"
          ? "✅ Storyboard ready. Next: render with Aigenikz Vision Pipeline."
          : "✅ Storyboard ready. Next: render standard MP4."
      );

      scrollToResults();
    } catch (err) {
      console.error("Video generation failed:", err);
      setNotice(`❌ Video generation failed. ${err.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStandardMP4 = async () => {
    if (!videoData?.scenes?.length) {
      throw new Error("Generate video package first.");
    }

    const payload = {
      topic: topic.trim() || videoData.topic || "Aigenikz Video",
      platform: videoData.platform || platform,
      style: videoData.style || style,
      scenes: videoData.scenes,
      captions: videoData.captions || [],
      promptPack: videoData.promptPack || [],
    };

    const response = await fetch(`${API_URL}/api/video/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Standard video render failed.");
    }

    return data;
  };

  const renderVisionMP4 = async () => {
    const cleanTopic = topic.trim() || videoData?.topic || "Aigenikz Video";

    if (!cleanTopic) {
      throw new Error("Enter a video topic first.");
    }

    const response = await fetch(`${API_URL}/api/cinematic-video/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: cleanTopic,
        platform,
        style,
        durationTarget,
        voiceover,
        voiceId: voiceId.trim() || undefined,
        soundtrack,
        soundtrackMood,
        subtitles,
        avatarPresenter,
        avatarImagePath: avatarImagePath.trim(),
        useTransitions,
        transitionStyle,
        preferGPU,
        quality,
        motionEffect,
        createSocialPackage,
      }),
    });

    const data = await response.json();

    console.log("🔥 DIRECT VISION RESPONSE:", data);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Vision Pipeline render failed.");
    }

    return data;
  };

  const loadProgress = async (projectId) => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/cinematic-video/progress/${projectId}`
      );
      const data = await response.json();

      if (data?.ok) {
        setRenderProgress(data.progress);
      }
    } catch (err) {
      console.warn("Progress load failed:", err.message);
    }
  };

  const renderMP4 = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (renderEngine === "standard" && !videoData?.scenes?.length) {
      setNotice("⚠️ Generate video package first.");
      return;
    }

    if (renderEngine === "vision" && !topic.trim()) {
      setNotice("⚠️ Enter a topic before rendering Aigenikz Vision Pipeline.");
      return;
    }

    setRendering(true);
    setRenderProgress({
      status: "active",
      percent: 1,
      stage: "Starting",
      message: "Render started.",
    });

    setNotice(
      renderEngine === "vision"
        ? "🎬 Rendering with voiceover, soundtrack, subtitles, transitions, and cinematic motion..."
        : "🎬 Rendering standard MP4..."
    );

    setVideoUrl("");
    setRenderResponse(null);
    localStorage.removeItem(LAST_VIDEO_KEY);
    localStorage.removeItem(LAST_RENDER_KEY);

    try {
      const data =
        renderEngine === "vision"
          ? await renderVisionMP4()
          : await renderStandardMP4();

      console.log("🎬 VIDEO RENDER RESPONSE:", data);

/*
============================================
ADVANCED VIDEO URL EXTRACTION
============================================
*/

const rawVideoUrl =
  data?.videoUrl ||
  data?.downloadUrl ||
  data?.renderUrl ||
  data?.url ||
  data?.outputPath ||
  data?.render?.videoUrl ||
  data?.render?.downloadUrl ||
  data?.render?.outputPath ||
  data?.output?.videoUrl ||
  data?.output?.outputPath ||
  data?.pipeline?.videoUrl ||
  data?.pipeline?.outputPath ||
  data?.result?.videoUrl ||
  data?.result?.outputPath ||
  data?.data?.videoUrl ||
  data?.data?.outputPath ||
  data?.finalVideoUrl ||
  null;

console.log(
  "🎬 FULL BACKEND RESPONSE:",
  data
);

console.log(
  "🎬 EXTRACTED VIDEO URL:",
  rawVideoUrl
);

if (!rawVideoUrl) {
  throw new Error(
    "Backend did not return videoUrl."
  );
}

      const finalVideoUrl = addCache(buildBrowserUrl(rawVideoUrl));
      console.log(
  "🎬 FINAL BROWSER URL:",
  finalVideoUrl
);

      const normalizedRenderResponse = {
        ...data,
        videoUrl: finalVideoUrl,
        downloadUrl: finalVideoUrl,
      };

      localStorage.setItem(LAST_VIDEO_KEY, finalVideoUrl);
      localStorage.setItem(
        LAST_RENDER_KEY,
        JSON.stringify(normalizedRenderResponse)
      );

      setVideoUrl(finalVideoUrl);
      setRenderResponse(normalizedRenderResponse);

      // Force open completed MP4
      setTimeout(() => {
        const opened = window.open(finalVideoUrl, "_blank");

        if (!opened) {
          setNotice(
            "🔥 MP4 ready. Browser blocked auto-open. Click Open Video below."
          );
       }
     }, 120);

      if (data?.projectId) {
        await loadProgress(data.projectId);
      }

      if (renderEngine === "vision" && data?.storyboard?.scenes?.length) {
        setResult({
          ok: true,
          artifact: {
            title: data.topic,
            content: data.storyboard.scenes
              .map(
                (scene, index) =>
                  `${index + 1}. ${scene.title}\nVisual: ${
                    scene.visual
                  }\nVoiceover: ${scene.voiceover}\nCaption: ${scene.caption}`
              )
              .join("\n\n"),
          },
          data: {
            topic: data.topic,
            platform: data.platform,
            style: data.style,
            totalDuration: data.storyboard.totalDuration,
            scenes: data.storyboard.scenes,
            captions: data.captions || data.storyboard.captions || [],
            promptPack: data.promptPack || data.storyboard.promptPack || [],
            script:
              data.storyboard.script ||
              data.storyboard.scenes
                .map(
                  (scene, index) =>
                    `${index + 1}. ${scene.title}\nDuration: ${
                      scene.duration
                    }s\nVisual: ${scene.visual}\nVoiceover: ${
                      scene.voiceover
                    }\nCaption: ${scene.caption}`
                )
                .join("\n\n"),
          },
        });
      }

      setRenderProgress((prev) => ({
        ...(prev || {}),
        status: "complete",
        percent: 100,
        stage: "Complete",
        message: "Render complete.",
      }));

      setNotice("🔥 MP4 ready. Opening video now and previewing below.");
      scrollToResults();

      setTimeout(() => {
        try {
          videoRef.current?.load?.();
        } catch {
          // no-op
        }
      }, 350);
    } catch (err) {
      console.error("Video render failed:", err);
      setNotice(`❌ Video render failed. ${err.message || ""}`);
      setRenderProgress({
        status: "failed",
        percent: 0,
        stage: "Failed",
        message: err.message || "Render failed.",
      });
    } finally {
      setRendering(false);
    }
  };

  const exportScript = () => {
    if (!artifact?.content && !videoData?.script) return;

    downloadFile(
      "astramind-video-script.txt",
      artifact?.content || videoData?.script || ""
    );
  };

  const exportJson = () => {
    const exportPayload = {
      engine: renderEngine,
      videoData,
      renderResponse,
      visionHealth,
      renderProgress,
    };

    downloadFile(
      "astramind-video-package.json",
      JSON.stringify(exportPayload, null, 2),
      "application/json"
    );
  };

  const exportCaptions = () => {
    const captions =
      videoData?.captions || renderResponse?.captions || renderResponse?.storyboard?.captions;

    if (!captions?.length) {
      setNotice("⚠️ No captions found to export yet.");
      return;
    }

    downloadFile("astramind-captions.vtt", buildVtt(captions), "text/vtt");
  };

  const clearStudio = () => {
    setTopic("");
    setResult(null);
    setVideoUrl("");
    setRenderResponse(null);
    setRenderProgress(null);
    setNotice("");
    setVisionHealth(null);
    localStorage.removeItem(LAST_VIDEO_KEY);
    localStorage.removeItem(LAST_RENDER_KEY);
  };

  return (
    <div className="min-h-screen p-6 text-white bg-gradient-to-br from-[#050816] via-[#090d1f] to-[#140b2d]">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-purple-300 text-sm font-medium mb-4">
                🎞️ Aigenikz Video Studio
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight mb-3">
                Video Generation Studio
              </h1>

              <p className="text-gray-300 text-lg max-w-3xl">
                Generate storyboards, AI scene visuals, cinematic motion,
                ElevenLabs voiceover, procedural soundtrack, burned subtitles,
                transitions, avatar presenter options, and social export
                packages.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 min-w-[280px]">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                Render Status
              </p>

              <p
                className={`font-bold ${
                  rendering
                    ? "text-yellow-300"
                    : videoUrl
                    ? "text-green-300"
                    : activeScenes.length
                    ? "text-cyan-300"
                    : "text-purple-300"
                }`}
              >
                {rendering
                  ? "Rendering Vision Stack..."
                  : videoUrl
                  ? "MP4 Ready"
                  : activeScenes.length
                  ? "Storyboard Ready"
                  : "Ready"}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Engine:{" "}
                <span className="text-cyan-300 font-semibold">
                  {renderEngine === "vision"
                    ? "Aigenikz Vision Pipeline"
                    : "Standard Renderer"}
                </span>
              </p>

              {renderProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                    <span>{renderProgress.stage}</span>
                    <span>{renderProgress.percent || 0}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{ width: `${renderProgress.percent || 0}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    {renderProgress.message}
                  </p>
                </div>
              )}

              {visionHealth?.features && (
                <p className="text-xs text-green-300 mt-3">
                  Health: Vision v4 online
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <h2 className="text-2xl font-bold mb-4">🧠 Video Mission</h2>

            <label className="block text-sm text-gray-300 mb-2">
              Topic / Prompt
            </label>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full min-h-[160px] rounded-2xl border border-white/10 bg-black/35 p-4 text-white outline-none placeholder:text-gray-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
              placeholder="Example: Make me a cinematic video showing Aigenikz building apps, generating content, and automating business workflows..."
            />

            <label className="block text-sm text-gray-300 mt-4 mb-2">
              Platform
            </label>

            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-blue-400"
            >
              <option className="text-black">TikTok</option>
              <option className="text-black">Instagram Reels</option>
              <option className="text-black">YouTube Shorts</option>
              <option className="text-black">Facebook Reels</option>
              <option className="text-black">X Video</option>
            </select>

            <label className="block text-sm text-gray-300 mt-4 mb-2">
              Visual Style
            </label>

            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-purple-400"
            />

            <label className="block text-sm text-gray-300 mt-4 mb-2">
              Duration Target
            </label>

            <select
              value={durationTarget}
              onChange={(e) => setDurationTarget(Number(e.target.value))}
              className="bg-black/40 border border-cyan-500 text-white px-2 py-1 rounded"
            >
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
              <option value={120}>120 seconds</option>
              <option value={180}>3 minutes</option>
              <option value={300}>5 minutes</option>
            </select>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
              <p className="text-sm font-bold text-purple-200">
                Render Engine
              </p>

              <button
                type="button"
                onClick={() => setRenderEngine("vision")}
                className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                  renderEngine === "vision"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                🚀 Aigenikz Vision Pipeline
                <span className="block text-xs opacity-75">
                  Visuals + motion + voice + music + subtitles + transitions
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRenderEngine("standard")}
                className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                  renderEngine === "standard"
                    ? "bg-cyan-600 text-white"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                ⚙️ Standard Renderer
                <span className="block text-xs opacity-75">
                  Uses existing storyboard scene render route
                </span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
              <p className="text-sm font-bold text-cyan-200">
                Vision Stack Options
              </p>

              {[
                ["Voiceover", voiceover, setVoiceover],
                ["Soundtrack", soundtrack, setSoundtrack],
                ["Burn Subtitles", subtitles, setSubtitles],
                ["Cinematic Transitions", useTransitions, setUseTransitions],
                ["Social Export Package", createSocialPackage, setCreateSocialPackage],
                ["Prefer GPU", preferGPU, setPreferGPU],
                ["Avatar Presenter", avatarPresenter, setAvatarPresenter],
              ].map(([label, value, setter]) => (
                <label
                  key={label}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.target.checked)}
                  />
                </label>
              ))}

              <label className="block text-xs text-gray-400">Voice ID</label>
              <input
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
                placeholder="Leave blank for .env default"
              />

              <label className="block text-xs text-gray-400">
                Soundtrack Mood
              </label>
              <select
                value={soundtrackMood}
                onChange={(e) => setSoundtrackMood(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
              >
                <option className="text-black">cinematic</option>
                <option className="text-black">futuristic</option>
                <option className="text-black">emotional</option>
                <option className="text-black">intense</option>
                <option className="text-black">documentary</option>
                <option className="text-black">motivational</option>
              </select>

              <label className="block text-xs text-gray-400">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
              >
                <option className="text-black">fast</option>
                <option className="text-black">balanced</option>
                <option className="text-black">ultra</option>
              </select>

              <label className="block text-xs text-gray-400">
                Motion Effect
              </label>
              <select
                value={motionEffect}
                onChange={(e) => setMotionEffect(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
              >
                <option className="text-black">premium</option>
                <option className="text-black">cinematic</option>
                <option className="text-black">tech</option>
                <option className="text-black">soft</option>
              </select>

              <label className="block text-xs text-gray-400">
                Transition Style
              </label>
              <select
                value={transitionStyle}
                onChange={(e) => setTransitionStyle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
              >
                <option className="text-black">cinematic</option>
                <option className="text-black">tech glitch</option>
                <option className="text-black">documentary</option>
                <option className="text-black">intense</option>
              </select>

              <label className="block text-xs text-gray-400">
                Avatar Image Path
              </label>
              <input
                value={avatarImagePath}
                onChange={(e) => setAvatarImagePath(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
                placeholder="Example: C:\Users\...\avatar.png"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={generateVideoPlan}
                disabled={loading || rendering}
                className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 px-5 py-3 font-bold transition active:scale-95"
              >
                {loading ? "Generating..." : "Generate Video Package"}
              </button>

              <button
                type="button"
                onClick={renderMP4}
                disabled={loading || rendering}
                className="w-full rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50 px-5 py-3 font-bold transition active:scale-95"
              >
                {rendering ? "Rendering..." : "🚀 Render Aigenikz MP4"}
              </button>

              <button
                type="button"
                onClick={runHealthCheck}
                disabled={checkingHealth || rendering}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 font-bold transition active:scale-95"
              >
                {checkingHealth ? "Checking..." : "🧪 Check Vision Health"}
              </button>

              <button
                type="button"
                onClick={clearStudio}
                disabled={loading || rendering}
                className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 px-5 py-3 font-bold transition active:scale-95"
              >
                Clear Studio
              </button>
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                {notice}
              </div>
            )}
          </div>

          <div
            ref={resultRef}
            className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold">
                  🎬 Generated Video Package
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  {activeScenes.length
                    ? `${activeScenes.length} scenes • ${totalDuration}s total`
                    : restoredVideoOnly
                    ? "Last MP4 restored from local storage."
                    : "No video package generated yet."}
                </p>
              </div>

              {(activeScenes.length > 0 || videoUrl) && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={renderMP4}
                    disabled={rendering}
                    className="rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 px-4 py-2 font-semibold transition active:scale-95"
                  >
                    {rendering ? "Rendering..." : "🎬 Render MP4"}
                  </button>

                  <button
                    type="button"
                    onClick={exportScript}
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-700 px-4 py-2 font-semibold transition active:scale-95"
                  >
                    ⬇️ Script TXT
                  </button>

                  <button
                    type="button"
                    onClick={exportCaptions}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold transition active:scale-95"
                  >
                    🎞️ Captions VTT
                  </button>

                  <button
                    type="button"
                    onClick={exportJson}
                    disabled={!videoData && !renderResponse}
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 font-semibold transition active:scale-95"
                  >
                    📦 JSON
                  </button>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="mt-8 rounded-3xl border border-cyan-500/20 bg-black/40 p-6 mb-5">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-2xl font-black text-white">
                    🎬 MP4 Preview
                  </h3>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={videoUrl}
                      download
                      className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-black hover:bg-cyan-400 transition"
                    >
                      Download MP4
                    </a>

                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
                    >
                      Open Video
                    </a>
                  </div>
                </div>

                <video
                  ref={videoRef}
                  key={videoUrl}
                  controls
                  playsInline
                  preload="auto"
                  className="w-full max-w-[420px] rounded-2xl border border-white/10 shadow-2xl bg-black"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <p className="text-xs text-gray-400 break-all mt-4">
                  {videoUrl}
                </p>
              </div>
            )}

            {renderResponse && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4">
                  <h3 className="font-bold text-green-200 mb-2">
                    🎙️ Voiceover
                  </h3>
                  <p className="text-sm text-gray-300">
                    Source: {renderResponse.voiceover?.source || "none"}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {renderResponse.voiceover?.error || "No voiceover errors."}
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4">
                  <h3 className="font-bold text-purple-200 mb-2">
                    🎼 Soundtrack
                  </h3>
                  <p className="text-sm text-gray-300">
                    Mood: {renderResponse.soundtrack?.mood || "disabled"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                  <h3 className="font-bold text-blue-200 mb-2">
                    💬 Subtitles
                  </h3>
                  <p className="text-sm text-gray-300">
                    Burned: {renderResponse.subtitles?.ok ? "Yes" : "No"}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <h3 className="font-bold text-cyan-200 mb-2">
                    📦 Social Export
                  </h3>
                  <p className="text-sm text-gray-300">
                    {renderResponse.socialExport?.exportId || "Not created"}
                  </p>
                </div>
              </div>
            )}

            {visuals.length > 0 && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5 mb-5">
                <h3 className="text-xl font-bold mb-4 text-cyan-200">
                  🖼️ AI Scene Visuals
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visuals.map((visual, index) => {
                    const imageUrl = addCache(buildBrowserUrl(visual.publicUrl));

                    return (
                      <div
                        key={`${visual.sceneId || "scene"}-${index}`}
                        className="rounded-2xl overflow-hidden border border-white/10 bg-black/35"
                      >
                        <img
                          src={imageUrl}
                          alt={`AI visual scene ${index + 1}`}
                          className="w-full aspect-[9/16] object-cover bg-black"
                        />

                        <div className="p-3">
                          <p className="text-sm font-bold text-white">
                            Scene {index + 1}
                          </p>
                          <p className="text-xs text-cyan-300">
                            Source: {visual.source || "unknown"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!activeScenes.length ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-gray-400">
                Your video storyboard, captions, AI visual prompts, generated
                scene images, cinematic motion clips, voiceover, soundtrack,
                burned subtitles, and MP4 link will appear here.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                  <h3 className="text-xl font-bold mb-3">📜 Script</h3>

                  <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-100">
                    {videoData?.script ||
                      artifact?.content ||
                      renderResponse?.storyboard?.script ||
                      "No script found."}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeScenes.map((scene, index) => (
                    <div
                      key={scene.id || `${scene.title}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/30 p-5"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="text-lg font-bold">
                          Scene {index + 1}: {scene.title}
                        </h4>

                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                          {scene.duration || 4}s
                        </span>
                      </div>

                      <p className="text-sm text-gray-300 mb-3">
                        <strong className="text-purple-300">Visual:</strong>{" "}
                        {scene.visual}
                      </p>

                      <p className="text-sm text-gray-300 mb-3">
                        <strong className="text-green-300">Voiceover:</strong>{" "}
                        {scene.voiceover}
                      </p>

                      <p className="text-sm text-gray-300">
                        <strong className="text-yellow-300">Caption:</strong>{" "}
                        {scene.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}