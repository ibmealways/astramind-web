import fs from "fs";
import path from "path";
import crypto from "crypto";

const OUTPUT_DIR = path.resolve("public", "renders", "generated-images");

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value = "aigenikz-image") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "aigenikz-image";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildImagePrompt({ prompt, style = "cinematic anime fantasy" }) {
  return [
    clean(prompt),
    `Style: ${clean(style)}.`,
    "Professional key visual, strong composition, expressive subjects, detailed environment, coherent lighting.",
    "Original characters and world. No text, no logos, no watermark, no real-world brands.",
    "masterpiece, high score, great score, absurdres",
  ].join(" ");
}

export async function generateLocalImage({ prompt, style, aspect = "landscape", seed = -1 }) {
  const baseUrl = String(process.env.AIGENIKZ_VIDEO_WORKER_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.AIGENIKZ_VIDEO_WORKER_TOKEN || "").trim();
  if (!baseUrl || !token) throw new Error("Aigenikz local AI worker is not configured.");
  const finalPrompt = buildImagePrompt({ prompt, style });
  const headers = { Authorization: `Bearer ${token}` };
  const submittedResponse = await fetch(`${baseUrl}/v1/image/generations`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: finalPrompt, aspect, seed }),
    signal: AbortSignal.timeout(30000),
  });
  const submitted = await submittedResponse.json().catch(() => ({}));
  if (!submittedResponse.ok) throw new Error(submitted.error || `Local image worker rejected the request (${submittedResponse.status}).`);
  if (!submitted.job_id) throw new Error("Local image worker returned no job ID.");

  const deadline = Date.now() + 25 * 60 * 1000;
  let job = submitted;
  while (job.status === "queued" || job.status === "running") {
    if (Date.now() > deadline) throw new Error("Local image generation timed out after 25 minutes.");
    await sleep(4000);
    const response = await fetch(`${baseUrl}/v1/image/generations/${encodeURIComponent(job.job_id)}`, {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    job = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(job.error || `Local image status failed (${response.status}).`);
  }
  if (job.status !== "completed") throw new Error(job.error || "Local image generation failed.");

  const imageResponse = await fetch(`${baseUrl}/v1/image/generations/${encodeURIComponent(job.job_id)}/file`, {
    headers,
    signal: AbortSignal.timeout(120000),
  });
  if (!imageResponse.ok || !(imageResponse.headers.get("content-type") || "").includes("image/png")) {
    throw new Error(`Local worker did not return a PNG (${imageResponse.status}).`);
  }
  const image = Buffer.from(await imageResponse.arrayBuffer());
  if (image.length < 10000) throw new Error("Local worker returned an empty or invalid image.");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${safeSlug(prompt)}-${crypto.randomBytes(6).toString("hex")}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, image);
  return {
    outputPath,
    publicUrl: `/renders/generated-images/${filename}`,
    source: "aigenikz-local",
    model: job.model,
    seed: job.seed,
    prompt: finalPrompt,
    fallbackUsed: false,
  };
}

export default { buildImagePrompt, generateLocalImage };
