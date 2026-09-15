// src/core/video/kineticSceneEngine.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ROOT = process.cwd();
const KINETIC_DIR = path.join(ROOT, "server-renders", "kinetic-scenes");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function assertFile(filePath, label = "file") {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath}`);
  }
}

function runFFmpeg(args = []) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static path missing."));
      return;
    }

    console.log("🎞️ Kinetic Scene FFmpeg command:");
    console.log(ffmpegPath, args.join(" "));

    const ff = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    ff.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ff.on("error", reject);

    ff.on("close", (code) => {
      if (stderr) {
        console.log("🎞️ Kinetic Scene FFmpeg log:");
        console.log(stderr);
      }

      if (code === 0) resolve({ ok: true });
      else reject(new Error(stderr || `Kinetic Scene FFmpeg failed with code ${code}`));
    });
  });
}

function clean(value = "") {
  return String(value || "").toLowerCase();
}

function normalizeMotionStyle({ style = "cinematic", scene = {}, productionPlan = {} } = {}) {
  const source = clean(
    productionPlan?.motionEffect ||
      productionPlan?.cameraMovement ||
      productionPlan?.directorMotion ||
      scene?.cinematicDirection?.cameraMotion ||
      scene?.cameraMotion ||
      style
  );

  if (source.includes("handheld")) return "handheld";
  if (source.includes("orbit")) return "orbit";
  if (source.includes("pullback") || source.includes("pull back")) return "pullback";
  if (source.includes("rise") || source.includes("heroic")) return "rise";
  if (source.includes("zoom-through") || source.includes("reveal")) return "reveal";
  if (source.includes("push")) return "push";
  if (source.includes("investigative") || source.includes("documentary")) return "investigative";
  if (source.includes("future") || source.includes("tech") || source.includes("digital")) return "futuristic";
  if (source.includes("impact")) return "impact";
  if (source.includes("slow")) return "slow";

  return "cinematic";
}

function getZoomExpression(style = "cinematic", intensity = 70) {
  const strength = Math.max(0.00045, Math.min(0.004, Number(intensity || 70) / 42000));

  switch (style) {
    case "impact":
      return `min(zoom+${strength * 2.1},1.2)`;
    case "handheld":
      return `min(zoom+${strength * 1.15},1.12)`;
    case "orbit":
      return `min(zoom+${strength * 0.95},1.1)`;
    case "pullback":
      return `max(zoom-${strength * 0.75},1.0)`;
    case "rise":
      return `min(zoom+${strength * 0.65},1.07)`;
    case "reveal":
      return `min(zoom+${strength * 1.55},1.16)`;
    case "investigative":
      return `min(zoom+${strength * 0.75},1.085)`;
    case "futuristic":
      return `min(zoom+${strength * 1.35},1.14)`;
    case "slow":
      return `min(zoom+${strength * 0.5},1.06)`;
    default:
      return `min(zoom+${strength},1.11)`;
  }
}

function getPanExpression(style = "cinematic") {
  switch (style) {
    case "handheld":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/7)*10+sin(on/19)*7`,
        y: `ih/2-(ih/zoom/2)+cos(on/9)*8+sin(on/23)*5`,
      };
    case "orbit":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/22)*26`,
        y: `ih/2-(ih/zoom/2)+cos(on/38)*10`,
      };
    case "pullback":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/44)*8`,
        y: `ih/2-(ih/zoom/2)-on*0.04`,
      };
    case "rise":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/48)*7`,
        y: `ih/2-(ih/zoom/2)-on*0.08`,
      };
    case "reveal":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/18)*18`,
        y: `ih/2-(ih/zoom/2)+cos(on/20)*12`,
      };
    case "impact":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/10)*20`,
        y: `ih/2-(ih/zoom/2)+cos(on/12)*14`,
      };
    case "investigative":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/42)*9`,
        y: `ih/2-(ih/zoom/2)+cos(on/52)*6`,
      };
    case "futuristic":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/15)*15`,
        y: `ih/2-(ih/zoom/2)+cos(on/18)*10`,
      };
    case "slow":
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/60)*5`,
        y: `ih/2-(ih/zoom/2)+cos(on/70)*4`,
      };
    default:
      return {
        x: `iw/2-(iw/zoom/2)+sin(on/25)*12`,
        y: `ih/2-(ih/zoom/2)+cos(on/31)*8`,
      };
  }
}

function inferGrade({ style = "cinematic", scene = {}, productionPlan = {} } = {}) {
  const text = clean(`${style} ${scene?.cinematicDirection?.colorGrade || ""} ${productionPlan?.colorGrade || ""}`);

  if (text.includes("kodak") || text.includes("documentary")) return "documentary";
  if (text.includes("gold") || text.includes("luxury")) return "luxury";
  if (text.includes("green") || text.includes("finance")) return "finance";
  if (text.includes("emerald") || text.includes("nature") || text.includes("wellness")) return "emerald";
  if (text.includes("cyber") || text.includes("violet") || text.includes("technology") || text.includes("blue")) return "tech";
  if (text.includes("fire") || text.includes("orange")) return "fire";

  return "hollywood";
}

function getColorFilter({ grade = "hollywood" } = {}) {
  switch (grade) {
    case "tech":
      return "eq=contrast=1.16:saturation=1.18:brightness=0.01,colorbalance=bs=0.08:rs=-0.03";
    case "fire":
      return "eq=contrast=1.18:saturation=1.1:brightness=0.005,colorbalance=rs=0.09:gs=0.02:bs=-0.05";
    case "luxury":
      return "eq=contrast=1.12:saturation=1.06:brightness=0.01,colorbalance=rs=0.06:gs=0.03:bs=-0.04";
    case "finance":
      return "eq=contrast=1.12:saturation=1.05:brightness=0.005,colorbalance=gs=0.06:bs=-0.02";
    case "emerald":
      return "eq=contrast=1.08:saturation=1.14:brightness=0.015,colorbalance=gs=0.07";
    case "documentary":
      return "eq=contrast=1.08:saturation=0.92:brightness=0.008";
    default:
      return "eq=contrast=1.13:saturation=1.08:brightness=0.008,colorbalance=rs=0.03:bs=0.02";
  }
}

function getOverlayFilters({ motionStyle = "cinematic", grade = "hollywood", width = 1080, height = 1920 }) {
  const filters = [];

  filters.push("vignette=PI/6");

  if (["tech", "fire", "luxury"].includes(grade)) {
    filters.push(`drawbox=x=0:y=0:w=${width}:h=${height}:color=white@0.012:t=fill`);
  }

  if (motionStyle === "handheld" || grade === "documentary") {
    filters.push("noise=alls=2:allf=t+u");
  }

  if (grade === "tech") {
    filters.push(`drawgrid=width=180:height=180:thickness=1:color=cyan@0.025`);
  }

  return filters;
}

export function buildKineticScenePlan({
  scene = {},
  platform = "TikTok",
  style = "cinematic",
  duration = 5,
  intensity = 70,
  productionPlan = {},
} = {}) {
  const motionStyle = normalizeMotionStyle({ style, scene, productionPlan });
  const grade = inferGrade({ style, scene, productionPlan });
  const vertical = !String(platform || "").toLowerCase().includes("youtube-wide");

  const width = vertical ? 1080 : 1920;
  const height = vertical ? 1920 : 1080;
  const fps = 30;
  const safeDuration = Math.max(2, Math.min(Number(duration || scene.duration || 5), 30));
  const safeIntensity = Math.max(10, Math.min(Number(intensity || 70), 100));

  return {
    ok: true,
    engine: "Aigenikz Kinetic Scene Engine v2 Hollywood Camera Choreography",
    sceneId: scene.id || `scene_${Date.now()}`,
    motionStyle,
    grade,
    width,
    height,
    fps,
    duration: safeDuration,
    frames: Math.round(safeDuration * fps),
    intensity: safeIntensity,
    zoomExpression: getZoomExpression(motionStyle, safeIntensity),
    panExpression: getPanExpression(motionStyle),
    colorFilter: getColorFilter({ grade }),
    overlayFilters: getOverlayFilters({ motionStyle, grade, width, height }),
    cinematicIntent: {
      camera: scene?.cinematicDirection?.cameraMotion || motionStyle,
      lens: scene?.cinematicDirection?.lens || "35mm cinema lens",
      lighting: scene?.cinematicDirection?.lighting || "cinematic motivated lighting",
      grade,
      depthSimulation: true,
      parallaxStyle: "single-image 3D depth illusion using zoompan, drift, grade, vignette, and atmosphere overlays",
    },
  };
}

export async function renderKineticScene({
  inputPath,
  outputPath,
  scene = {},
  platform = "TikTok",
  style = "cinematic",
  duration = 5,
  intensity = 70,
  productionPlan = {},
} = {}) {
  if (!inputPath) throw new Error("renderKineticScene requires inputPath.");

  assertFile(inputPath, "Kinetic scene source");
  ensureDir(path.dirname(outputPath));

  const plan = buildKineticScenePlan({ scene, platform, style, duration, intensity, productionPlan });
  const pan = plan.panExpression;

  const filterChain = [
    `scale=${plan.width}:${plan.height}:force_original_aspect_ratio=increase`,
    `crop=${plan.width}:${plan.height}`,
    `zoompan=z='${plan.zoomExpression}':x='${pan.x}':y='${pan.y}':d=${plan.frames}:s=${plan.width}x${plan.height}`,
    plan.colorFilter,
    ...plan.overlayFilters,
    `fps=${plan.fps}`,
    `format=yuv420p`,
  ].join(",");

  console.log("🎞️ Rendering Hollywood kinetic scene:", scene?.id || "unknown", plan.cinematicIntent);

  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    inputPath,
    "-vf",
    filterChain,
    "-t",
    String(plan.duration),
    "-r",
    String(plan.fps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  assertFile(outputPath, "Rendered kinetic scene");
  const stats = fs.statSync(outputPath);

  return {
    ok: true,
    engine: "Aigenikz Kinetic Scene Engine v2 Hollywood Camera Choreography",
    sceneId: plan.sceneId,
    outputPath,
    videoPath: outputPath,
    sizeBytes: stats.size,
    duration: plan.duration,
    fps: plan.fps,
    plan,
  };
}

export default {
  buildKineticScenePlan,
  renderKineticScene,
};
