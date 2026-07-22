import fetch from "node-fetch";

export const RUNWAY_API_ORIGIN = "https://api.dev.runwayml.com";
export const RUNWAY_API_VERSION = "2024-11-06";
export const RUNWAY_TEXT_TO_VIDEO_PATH = "/v1/text_to_video";

export function buildRunwayTextToVideoRequest(prompt, { model = process.env.RUNWAY_MODEL || "gen4.5", duration = 5, ratio = "1280:720" } = {}) {
  return { model, promptText: String(prompt || "").trim().slice(0, 1000), duration, ratio };
}

function logRunwayFailure(label, details) {
  console.error(`${label}:`, JSON.stringify(details, null, 2));
}

function headers(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Runway-Version": RUNWAY_API_VERSION };
}

function failureResult(details = {}) {
  const message = String(details?.error || details?.message || "Runway request failed.");
  const code = /not enough credits|insufficient credits/i.test(message) ? "insufficient_credits" : "provider_error";
  return { ok: false, provider: "runway", code, message, retryable: code !== "insufficient_credits", details };
}

export async function generateRunwayVideo(prompt, { fetchImpl = fetch, pollIntervalMs = 5000, maxPolls = 120, includeDiagnostics = false } = {}) {
  try {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) { console.warn("Missing RUNWAY_API_KEY"); return includeDiagnostics ? failureResult({ error: "Runway is not configured." }) : null; }

    const createRes = await fetchImpl(`${RUNWAY_API_ORIGIN}${RUNWAY_TEXT_TO_VIDEO_PATH}`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(buildRunwayTextToVideoRequest(prompt)),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      logRunwayFailure("Runway task creation failed", createData);
      return includeDiagnostics ? failureResult(createData) : null;
    }

    for (let attempt = 0; attempt < maxPolls; attempt++) {
      if (attempt > 0 || pollIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      const statusRes = await fetchImpl(`${RUNWAY_API_ORIGIN}/v1/tasks/${createData.id}`, { headers: headers(apiKey) });
      const task = await statusRes.json();
      if (!statusRes.ok) { logRunwayFailure("Runway task polling failed", task); return includeDiagnostics ? failureResult(task) : null; }
      if (task.status === "SUCCEEDED") {
        const videoUrl = Array.isArray(task.output) ? task.output[0] || null : null;
        return includeDiagnostics ? { ok: true, provider: "runway", videoUrl, taskId: createData.id } : videoUrl;
      }
      if (["FAILED", "CANCELED"].includes(task.status)) { logRunwayFailure("Runway generation failed", task); return includeDiagnostics ? failureResult(task) : null; }
    }
    console.error("Runway generation timed out.");
    return includeDiagnostics ? failureResult({ error: "Runway generation timed out." }) : null;
  } catch (error) {
    console.error("Runway Engine Error:", error.message);
    return includeDiagnostics ? failureResult({ error: error.message }) : null;
  }
}
