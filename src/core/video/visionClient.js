// src/core/video/visionClient.js

const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const CLIENT_VERSION =
  "AstraMind Vision Client v3 Unified";

function getApiUrl() {
  return (
    localStorage.getItem(
      "astramind_api_url"
    ) || DEFAULT_API_URL
  );
}
function authHeaders(extra = {}) { return { ...extra, Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` }; }

function clean(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

async function safeJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildCreatorContext({
  creatorProfile = {},

  creatorProjects = [],

  creatorMemory = [],

  creatorAnalytics = {},
}) {
  return {
    creatorIdentity: {
      displayName:
        creatorProfile
          ?.display_name ||
        "",

      primaryIdentity:
        creatorProfile
          ?.primary_identity ||
        "",

      mission:
        creatorProfile
          ?.mission || "",

      writingTone:
        creatorProfile
          ?.writing_tone ||
        "cinematic",

      businesses:
        safeArray(
          creatorProfile
            ?.businesses
        ),

      activeGoals:
        safeArray(
          creatorProfile
            ?.active_goals
        ),
    },

    creatorProjects:
      safeArray(
        creatorProjects
      ),

    creatorMemory:
      safeArray(
        creatorMemory
      ),

    creatorAnalytics:
      creatorAnalytics || {},

    persistentCognition:
      true,

    adaptiveLearning:
      true,

    creatorContinuity:
      true,
  };
}

function buildPipelineMetadata({
  topic,
  style,
  platform,
  durationTarget,
}) {
  return {
    topic:
      clean(topic),

    style:
      clean(style),

    platform:
      clean(platform),

    durationTarget,

    deterministicPipeline:
      true,

    centralizedOrchestration:
      true,

    creatorBrainIntegrated:
      true,

    renderQueueIntegrated:
      true,

    diagnosticsEnabled:
      true,

    renderRecoveryEnabled:
      true,

    generatedAt:
      new Date().toISOString(),
  };
}

/*
  IMPORTANT CLIENT EVOLUTION

  OLD PROBLEMS:
  ❌ generic render requests
  ❌ isolated frontend transport
  ❌ no creator awareness
  ❌ no adaptive learning injection
  ❌ no project continuity
  ❌ disconnected orchestration

  NEW SYSTEM:
  ✅ creator-aware requests
  ✅ persistent cognition injection
  ✅ adaptive learning injection
  ✅ orchestration-aware requests
  ✅ deterministic pipeline integration
  ✅ autonomous creator intelligence flow
*/

export async function renderVisionVideo({
  topic,

  platform = "TikTok",

  style =
    "cinematic futuristic high-energy",

  durationTarget = 30,

  storyboard = {},

  creatorProfile = {},

  creatorProjects = [],

  creatorMemory = [],

  creatorAnalytics = {},
} = {}) {
  const creatorContext =
    buildCreatorContext({
      creatorProfile,

      creatorProjects,

      creatorMemory,

      creatorAnalytics,
    });

  const pipelineMetadata =
    buildPipelineMetadata({
      topic,

      style,

      platform,

      durationTarget,
    });

  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/render`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}`,
        },

        body: JSON.stringify({
          topic:
            clean(topic),

          platform:
            clean(platform),

          style:
            clean(style),

          durationTarget,

          storyboard,

          creatorContext,

          pipelineMetadata,
        }),
      }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "AstraMind Vision render failed."
    );
  }

  const fixedVideoUrl =
    data.videoUrl?.startsWith(
      "http"
    )
      ? data.videoUrl
      : `${getApiUrl()}${data.videoUrl}`;

  return {
    ...data,

    client:
      CLIENT_VERSION,

    videoUrl:
      fixedVideoUrl,

    downloadUrl:
      fixedVideoUrl,

    creatorAware:
      true,

    persistentCognition:
      true,

    adaptiveLearning:
      true,

    deterministicPipeline:
      true,
  };
}

export async function getRenderDiagnostics(
  projectId
) {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/diagnostics/${projectId}`,
      { headers: authHeaders() }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Failed to fetch render diagnostics."
    );
  }

  return {
    ...data,

    diagnosticsEnabled:
      true,
  };
}

export async function getRenderQueueStatus() {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/render-queue`,
      { headers: authHeaders() }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Failed to fetch render queue."
    );
  }

  return {
    ...data,

    renderQueueIntegrated:
      true,
  };
}

export async function retryFailedRender(
  projectId
) {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/retry/${projectId}`,
      {
        method: "POST",
        headers: authHeaders(),
      }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Render retry failed."
    );
  }

  return {
    ...data,

    renderRecovery:
      true,
  };
}

export async function checkVisionHealth() {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/health`
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Vision health check failed."
    );
  }

  return {
    ...data,

    client:
      CLIENT_VERSION,

    deterministicPipeline:
      true,

    creatorBrainIntegrated:
      true,

    orchestrationEnabled:
      true,
  };
}

export async function getPipelineHealth() {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/pipeline-health`,
      { headers: authHeaders() }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Pipeline health check failed."
    );
  }

  return {
    ...data,

    pipelineDiagnostics:
      true,
  };
}

export async function getCreatorBrainHealth() {
  const response =
    await fetch(
      `${getApiUrl()}/api/creator-brain/health`,
      { headers: authHeaders() }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "CreatorBrain health check failed."
    );
  }

  return {
    ...data,

    persistentCognition:
      true,

    adaptiveLearning:
      true,
  };
}

export async function getProjectRenderStatus(
  projectId
) {
  const response =
    await fetch(
      `${getApiUrl()}/api/cinematic-video/status/${projectId}`,
      { headers: authHeaders() }
    );

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.error ||
        "Failed to fetch render status."
    );
  }

  return {
    ...data,

    renderTracking:
      true,

    deterministicPipeline:
      true,
  };
}

export default {
  renderVisionVideo,

  getRenderDiagnostics,

  getRenderQueueStatus,

  retryFailedRender,

  checkVisionHealth,

  getPipelineHealth,

  getCreatorBrainHealth,

  getProjectRenderStatus,
};
