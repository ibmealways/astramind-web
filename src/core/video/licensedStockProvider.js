import fs from "fs";
import path from "path";

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function clean(value = "") { return String(value || "").replace(/\s+/g, " ").trim(); }
function slug(value = "stock") { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "stock"; }

function chooseFile(video = {}) {
  const files = Array.isArray(video.video_files) ? video.video_files : [];
  return files
    .filter((item) => item?.link && item?.file_type === "video/mp4")
    .sort((a, b) => {
      const aVertical = Number(a.height || 0) >= Number(a.width || 0) ? 0 : 1;
      const bVertical = Number(b.height || 0) >= Number(b.width || 0) ? 0 : 1;
      return aVertical - bVertical || Number(a.width || 0) - Number(b.width || 0);
    })[0] || null;
}

export async function fetchLicensedStockClip({ scene = {}, index = 0, projectId, env = process.env } = {}) {
  const apiKey = clean(env.PEXELS_API_KEY);
  if (!apiKey) throw new Error("Licensed stock sourcing requires PEXELS_API_KEY.");
  const query = clean(scene.stockQuery || scene.visual || scene.caption || scene.title).slice(0, 180);
  const search = await fetch(`https://api.pexels.com/videos/search?orientation=portrait&per_page=8&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: apiKey },
  });
  if (!search.ok) throw new Error(`Pexels video search failed with HTTP ${search.status}.`);
  const payload = await search.json();
  const selected = (payload?.videos || []).find((video) => chooseFile(video));
  const file = chooseFile(selected);
  if (!selected || !file) throw new Error(`No licensed stock clip matched scene ${index + 1}.`);

  const response = await fetch(file.link);
  if (!response.ok) throw new Error(`Pexels clip download failed with HTTP ${response.status}.`);
  const outputDir = path.join(process.cwd(), "server-renders", "stock", slug(projectId));
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${String(index + 1).padStart(2, "0")}-${slug(scene.title)}.mp4`);
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));

  return {
    ok: true,
    sceneId: scene.id || `scene_${index + 1}`,
    sceneIndex: index,
    outputPath,
    videoPath: outputPath,
    source: "licensed-stock-pexels",
    liveAction: true,
    fallbackUsed: false,
    duration: Number(scene.duration || 5),
    attribution: { provider: "Pexels", creator: selected.user?.name || null, sourceUrl: selected.url || null, assetId: selected.id },
  };
}

export default { fetchLicensedStockClip };
