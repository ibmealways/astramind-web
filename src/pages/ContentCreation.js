import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";

import { useSubscription } from "../context/SubscriptionContext.js";

import { runVideoEngine } from "../core/content/videoEngine.js";
import { runDesignEngine } from "../core/content/designEngine.js";
import { runMusicEngine } from "../core/content/musicEngine.js";
import { runWritingEngine } from "../core/content/writingEngine.js";
import { runCodeEngine } from "../core/content/codeEngine.js";

import { routeTool } from "../core/router/toolRouter.js";

import { generatePlatformPack } from "../core/content/contentPackager.js";

import { canAccess } from "../core/subscription/accessControl.js";
import { apiUrl, resolveApiAssetUrl } from "../config/api.js";

const TOOL_ORDER = [
  "video",
  "design",
  "music",
  "writing",
  "code",
];

const TOOL_META = {
  video: {
    title: "🎥 Video",
  },

  design: {
    title: "🎨 Design",
  },

  music: {
    title: "🎵 Music",
  },

  writing: {
    title: "✍️ Writing",
  },

  code: {
    title: "💻 Code",
  },
};

export default function ContentCreation() {
  const navigate = useNavigate();

  const { currentMode } =
    useOSMode();

  const { tier } =
    useSubscription();

  const [
    prompt,
    setPrompt,
  ] = useState("");

  const [
    selectedTool,
    setSelectedTool,
  ] = useState("video");

  const [
    selectedPlatform,
    setSelectedPlatform,
  ] = useState("TikTok");

  const [
    visualStyle,
    setVisualStyle,
  ] = useState(
    "cinematic futuristic emotional"
  );

  const [
    durationTarget,
    setDurationTarget,
  ] = useState(30);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    generationError,
    setGenerationError,
  ] = useState(null);

  const [
    generatedPackage,
    setGeneratedPackage,
  ] = useState(null);

  const [
    generatedVideoUrl,
    setGeneratedVideoUrl,
  ] = useState(null);

  const [
    renderHealth,
    setRenderHealth,
  ] = useState(null);

  const availableTools =
    useMemo(() => {
      return TOOL_ORDER.filter(
        (tool) =>
          canAccess(
            tier,
            `content.${tool}`
          )
      );
    }, [tier]);

  useEffect(() => {
    if (
      availableTools.length > 0 &&
      !availableTools.includes(
        selectedTool
      )
    ) {
      setSelectedTool(
        availableTools[0]
      );
    }
  }, [
    availableTools,
    selectedTool,
  ]);

  async function renderMP4() {
    try {
      setLoading(true);

      setGenerationError(
        null
      );

      setGeneratedVideoUrl(
        null
      );

      const payload = {
        topic: prompt,
        style: visualStyle,
        platform:
          selectedPlatform,
        durationTarget:
          Number(
            durationTarget
          ) || 30,
        options: {
          mode: "local-test",
          allowFallback: true,
          voiceover: false,
          soundtrack: false,
          subtitles: true,
          transitions: true,
          exportFormat: "mp4",
          idempotencyKey: crypto.randomUUID(),
        },
      };

      console.log(
        "🎬 Aigenikz Render Payload:",
        payload
      );

      const response =
        await fetch(
          apiUrl("/api/cinematic-video/render"),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}`,
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const responseText =
  await response.text();

console.log(
  "🎬 RAW RESPONSE:",
  responseText
);

let data;

try {
  data =
    JSON.parse(responseText);
} catch (err) {
  throw new Error(
    `Backend returned non-JSON response: ${responseText}`
  );
}

      console.log(
        "🎬 VIDEO RENDER RESPONSE:",
        data
      );

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
        data?.render
          ?.videoUrl ||
        data?.render
          ?.downloadUrl ||
        data?.output
          ?.videoUrl ||
        data?.pipeline
          ?.videoUrl ||
        data?.result
          ?.videoUrl ||
        data?.data
          ?.videoUrl ||
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

      if (
        !rawVideoUrl
      ) {
        throw new Error(
          "Backend did not return videoUrl."
        );
      }

      const normalizedVideoUrl =
        rawVideoUrl.startsWith(
          "http"
        )
          ? rawVideoUrl
          : resolveApiAssetUrl(rawVideoUrl);

      setGeneratedVideoUrl(
        normalizedVideoUrl
      );

      setGeneratedPackage({
        ...data,
        videoUrl:
          normalizedVideoUrl,
      });

      console.log(
        "✅ Aigenikz Video Ready:",
        normalizedVideoUrl
      );
    } catch (error) {
      console.error(
        "❌ Aigenikz Render Failure:",
        error
      );

      setGenerationError(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkVisionHealth() {
    try {
      const response =
        await fetch(
          apiUrl("/api/cinematic-video/render-queue"),
          { headers: { Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` } }
        );

      const responseText =
  await response.text();

console.log(
  "🎬 RAW RESPONSE:",
  responseText
);

let data;

try {
  data =
    JSON.parse(responseText);
} catch (err) {
  throw new Error(
    `Backend returned non-JSON response: ${responseText}`
  );
}

      setRenderHealth(
        data
      );

      console.log(
        "🧠 Vision Health:",
        data
      );
    } catch (error) {
      console.error(
        error
      );
    }
  }

  async function generateContent() {
    try {
      setLoading(true);

      setGenerationError(
        null
      );

      const routing =
        routeTool({
          tool:
            selectedTool,
          mode:
            currentMode ||
            OS_MODES.CREATOR,
        });

      console.log(
        "🧠 Tool Routing:",
        routing
      );

      let result = null;

      switch (
        selectedTool
      ) {
        case "video":
          await renderMP4();
          return;

        case "design":
          result =
            await runDesignEngine(
              {
                prompt,
                platform:
                  selectedPlatform,
              }
            );
          break;

        case "music":
          result =
            await runMusicEngine(
              {
                prompt,
              }
            );
          break;

        case "writing":
          result =
            await runWritingEngine(
              {
                prompt,
              }
            );
          break;

        case "code":
          result =
            await runCodeEngine(
              {
                prompt,
              }
            );
          break;

        default:
          result =
            await runVideoEngine(
              {
                prompt,
              }
            );
      }

      const packaged =
        generatePlatformPack(
          {
            tool:
              selectedTool,
            result,
            platform:
              selectedPlatform,
          }
        );

      setGeneratedPackage(
        packaged
      );
    } catch (error) {
      console.error(
        error
      );

      setGenerationError(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen text-white p-6"
      style={{
        background:
          "radial-gradient(circle at top, #09111f 0%, #050816 45%, #02030a 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-5xl font-black">
              🚀 Aigenikz
              Creator Studio
            </h1>

            <p className="text-gray-400 mt-2">
              Adaptive
              cinematic AI
              operating system
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/")
            }
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500"
          >
            Back Home
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-black/30 border border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-bold mb-6">
              🧠 Mission
              Control
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm text-gray-300">
                  Prompt
                </label>

                <textarea
                  value={
                    prompt
                  }
                  onChange={(
                    e
                  ) =>
                    setPrompt(
                      e
                        .target
                        .value
                    )
                  }
                  rows={6}
                  placeholder="Describe the content you want Aigenikz to create..."
                  className="w-full rounded-2xl bg-black/40 border border-cyan-500/20 p-4"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-gray-300">
                  Tool
                </label>

                <select
                  value={
                    selectedTool
                  }
                  onChange={(
                    e
                  ) =>
                    setSelectedTool(
                      e
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-xl bg-black/40 border border-cyan-500/20 p-3"
                >
                  {availableTools.map(
                    (
                      tool
                    ) => (
                      <option
                        key={
                          tool
                        }
                        value={
                          tool
                        }
                      >
                        {
                          TOOL_META[
                            tool
                          ]
                            ?.title
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm text-gray-300">
                  Platform
                </label>

                <select
                  value={
                    selectedPlatform
                  }
                  onChange={(
                    e
                  ) =>
                    setSelectedPlatform(
                      e
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-xl bg-black/40 border border-cyan-500/20 p-3"
                >
                  <option>
                    TikTok
                  </option>
                  <option>
                    Instagram
                  </option>
                  <option>
                    YouTube
                  </option>
                  <option>
                    Facebook
                  </option>
                  <option>
                    X
                  </option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm text-gray-300">
                  Visual Style
                </label>

                <input
                  value={
                    visualStyle
                  }
                  onChange={(
                    e
                  ) =>
                    setVisualStyle(
                      e
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-xl bg-black/40 border border-cyan-500/20 p-3"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-gray-300">
                  Duration
                  Target
                </label>

                <input
                  type="number"
                  min="5"
                  max="30"
                  value={
                    durationTarget
                  }
                  onChange={(
                    e
                  ) =>
                    setDurationTarget(
                      e
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-xl bg-black/40 border border-cyan-500/20 p-3"
                />
              </div>

              <button
                onClick={
                  generateContent
                }
                disabled={
                  loading
                }
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-lg"
              >
                {loading
                  ? "Generating..."
                  : "Generate Content"}
              </button>

              <button
                onClick={
                  checkVisionHealth
                }
                className="w-full py-3 rounded-2xl border border-cyan-500/30"
              >
                Check Vision
                Health
              </button>

              {generationError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl">
                  {
                    generationError
                  }
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-black/30 border border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-black mb-6">
              🎬 Generated
              Package
            </h2>

            {generatedVideoUrl && (
              <video
                controls
                autoPlay
                className="w-full rounded-3xl mb-6"
                src={
                  generatedVideoUrl
                }
              />
            )}

            {generatedPackage && (
              <pre className="overflow-auto text-sm bg-black/40 p-4 rounded-2xl border border-cyan-500/10">
                {JSON.stringify(
                  generatedPackage,
                  null,
                  2
                )}
              </pre>
            )}

            {!generatedPackage &&
              !generatedVideoUrl && (
                <div className="text-gray-500 text-lg">
                  No package
                  generated yet.
                </div>
              )}

            {renderHealth && (
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-3">
                  🧠 Vision
                  Health
                </h3>

                <pre className="overflow-auto text-sm bg-black/40 p-4 rounded-2xl border border-cyan-500/10">
                  {JSON.stringify(
                    renderHealth,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





