import fs from "fs";
import path from "path";
import { generateDynamicSoundtrack } from "./soundtrackEngine.js";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadLicensedTrack(url, outputPath) {
  const response = await fetch(url, { headers: { Accept: "audio/*" } });
  if (!response.ok) throw new Error(`Licensed music download failed with HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("audio/") && !contentType.includes("octet-stream")) {
    throw new Error(`Licensed music URL returned unsupported content type: ${contentType || "unknown"}.`);
  }
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
  return outputPath;
}

export async function resolveSoundtrack({
  enabled = false,
  projectId,
  mood = "cinematic",
  duration = 30,
  source = "procedural",
  env = process.env,
} = {}) {
  if (!enabled) return { ok: true, enabled: false, source: "none", soundtrackPath: null };

  if (source === "licensed") {
    const licensedUrl = String(env.LICENSED_MUSIC_URL || "").trim();
    if (!licensedUrl) throw new Error("Licensed soundtrack mode requires LICENSED_MUSIC_URL.");
    const outputDir = path.join(process.cwd(), "server-renders", "soundtracks");
    ensureDir(outputDir);
    const outputPath = path.join(outputDir, `${projectId}-licensed.mp3`);
    await downloadLicensedTrack(licensedUrl, outputPath);
    return { ok: true, enabled: true, source: "licensed-library", soundtrackPath: outputPath, licenseReference: env.LICENSED_MUSIC_LICENSE || null };
  }

  const generated = await generateDynamicSoundtrack({ projectId, mood, duration });
  return { ...generated, enabled: true, source: "procedural" };
}

export default { resolveSoundtrack };
