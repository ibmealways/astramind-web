import fs from "fs";
import path from "path";

function clean(value = "") {
  return String(value || "").trim();
}

function fillTemplate(template, filename, projectId) {
  return clean(template)
    .replaceAll("{filename}", encodeURIComponent(filename))
    .replaceAll("{projectId}", encodeURIComponent(projectId || "video"));
}

export async function deliverVideoArtifact({ filePath, projectId, localPublicUrl, env = process.env } = {}) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Cannot deliver a missing video artifact.");
  const uploadTemplate = clean(env.OBJECT_STORAGE_UPLOAD_URL);
  const cdnTemplate = clean(env.CDN_PUBLIC_URL_TEMPLATE);

  if (!uploadTemplate) {
    return { ok: true, storage: "local-ephemeral", durable: false, videoUrl: localPublicUrl };
  }
  if (!cdnTemplate) throw new Error("OBJECT_STORAGE_UPLOAD_URL requires CDN_PUBLIC_URL_TEMPLATE.");

  const filename = path.basename(filePath);
  const uploadUrl = fillTemplate(uploadTemplate, filename, projectId);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: fs.createReadStream(filePath),
    duplex: "half",
  });
  if (!response.ok) throw new Error(`Object storage upload failed with HTTP ${response.status}.`);

  return {
    ok: true,
    storage: "object-storage",
    durable: true,
    videoUrl: fillTemplate(cdnTemplate, filename, projectId),
  };
}

export default { deliverVideoArtifact };
