// src/core/content/exportEngine.js

function safe(str = "") {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function defaultHashtags(topic) {
  const base = ["#AstraMind", "#ChappyAI", "#ContentCreator", "#Viral", "#Marketing"];
  const t = safe(topic)
    .split(" ")
    .slice(0, 3)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .map((w) => `#${w}`);
  return [...new Set([...t, ...base])].slice(0, 12);
}

function platformSpec(platform) {
  switch (platform) {
    case "TikTok":
      return { aspect: "9:16", length: "12–35s", style: "fast hooks + big captions", maxCaption: 150 };
    case "Instagram":
      return { aspect: "9:16", length: "7–30s", style: "clean edits + punchy subtitle pacing", maxCaption: 2200 };
    case "YouTube":
      return { aspect: "9:16", length: "15–45s", style: "clarity + retention loop", maxCaption: 1000 };
    case "X":
      return { aspect: "16:9 or 1:1", length: "15–60s", style: "statement + proof + reply bait", maxCaption: 280 };
    case "Facebook":
      return { aspect: "9:16 or 1:1", length: "15–60s", style: "clear headline + social proof", maxCaption: 2000 };
    default:
      return { aspect: "9:16", length: "12–35s", style: "short-form optimized", maxCaption: 300 };
  }
}

export function buildExportPackage({
  project,
  platform = "TikTok",
  brandKit = null, // { brandName, handle, watermarkText }
}) {
  const latest = project?.versions?.[project.versions.length - 1];
  const content = safe(latest?.content || "");

  const title = safe(project?.title || "Untitled");
  const type = safe(project?.type || "content");
  const spec = platformSpec(platform);

  const hashtags = defaultHashtags(title);
  const handle = safe(brandKit?.handle || "");
  const watermarkText = safe(brandKit?.watermarkText || "");
  const brandName = safe(brandKit?.brandName || "");

  const captionCore = (() => {
    const base = `🔥 ${title}\n\n`;
    const tagLine = handle ? `Follow ${handle} for more.\n\n` : "Follow for more.\n\n";
    const tags = hashtags.join(" ");
    const cap = `${base}${tagLine}${tags}`.slice(0, spec.maxCaption);
    return cap;
  })();

  const exportName = `${type}_${title.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 28)}_${platform}_${nowStamp()}`;

  const instructions = [
    `EXPORT TARGET: ${platform}`,
    `FORMAT: ${type.toUpperCase()}`,
    `RECOMMENDED ASPECT: ${spec.aspect}`,
    `RECOMMENDED LENGTH: ${spec.length}`,
    `STYLE: ${spec.style}`,
    brandName ? `BRAND: ${brandName}` : null,
    handle ? `HANDLE: ${handle}` : null,
    watermarkText ? `WATERMARK: ${watermarkText}` : null,
  ].filter(Boolean);

  // “Video/Design” cannot be *rendered* by a pure React client without a media pipeline.
  // We export a production-ready pack: script/captions/shotlist/prompts/specs.
  const pack = {
    meta: {
      exportName,
      platform,
      type,
      title,
      createdAt: new Date().toISOString(),
    },
    spec,
    caption: captionCore,
    hashtags,
    content,
    instructions,
    checklist: [
      "Paste script into your teleprompter / notes",
      "Record vertical footage (9:16) with strong lighting",
      "Add captions with high contrast",
      "Use a 0.3–0.5s cut rhythm for the first 3 seconds",
      "End with CTA + loop-friendly last line",
    ],
  };

  // Bundle text output for “Copy All”
  const textBundle = [
    `=== ASTRA MIND EXPORT PACK ===`,
    ...instructions.map((l) => `- ${l}`),
    ``,
    `TITLE: ${title}`,
    `TYPE: ${type}`,
    ``,
    `CAPTION:`,
    captionCore,
    ``,
    `HASHTAGS:`,
    hashtags.join(" "),
    ``,
    `CORE OUTPUT:`,
    content,
    ``,
    `CHECKLIST:`,
    ...pack.checklist.map((c, i) => `${i + 1}) ${c}`),
  ].join("\n");

  return { pack, textBundle, exportName };
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export function downloadJsonFile(filename, obj) {
  const text = JSON.stringify(obj, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
