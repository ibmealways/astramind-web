export function resolveCinematicRenderResponse(data, responseOk = true) {
  if (!data || typeof data !== "object") throw new Error("Cinematic backend returned an invalid response.");
  if (!responseOk || data.ok === false) {
    const stage = data?.diagnostics?.failedStage || data?.renderOutput?.diagnostics?.failedStage;
    const detail = data.error || data?.renderOutput?.error || "Cinematic render failed.";
    throw new Error(stage ? `${detail} (stage: ${stage})` : detail);
  }
  const videoUrl = data.videoUrl || data.downloadUrl || data.renderUrl || data.url
    || data.render?.videoUrl || data.render?.downloadUrl || data.output?.videoUrl
    || data.pipeline?.videoUrl || data.result?.videoUrl || data.data?.videoUrl
    || data.finalVideoUrl || data.renderOutput?.videoUrl || data.renderOutput?.downloadUrl;
  if (!videoUrl) throw new Error("Render finished without a playable video URL.");
  return { ...data, videoUrl };
}

export function normalizeBackendMediaUrl(url, apiOrigin = "http://localhost:5000") {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${apiOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
}
