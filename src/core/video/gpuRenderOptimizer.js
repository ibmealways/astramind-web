// src/core/video/gpuRenderOptimizer.js
import os from "os";
import { spawnSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

function safeExec(command, args = []) {
  try {
    return spawnSync(command, args, {
      encoding: "utf8",
      windowsHide: true,
    });
  } catch (error) {
    return {
      error,
      stdout: "",
      stderr: "",
      status: 1,
    };
  }
}

export function detectGPUCapabilities() {
  const platform = process.platform;

  const capabilities = {
    platform,
    ffmpegAvailable: Boolean(ffmpegPath),

    cpu: {
      cores: os.cpus()?.length || 1,
      model: os.cpus()?.[0]?.model || "Unknown CPU",
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    },

    gpu: {
      detected: false,
      vendor: null,
      renderer: null,
      acceleration: "cpu",
    },
  };

  /*
    Windows GPU detection
  */
  if (platform === "win32") {
    const result = safeExec("wmic", [
      "path",
      "win32_VideoController",
      "get",
      "name",
    ]);

    const output = String(result.stdout || "").toLowerCase();

    if (output.includes("nvidia")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "NVIDIA";
      capabilities.gpu.acceleration = "h264_nvenc";
    } else if (output.includes("amd")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "AMD";
      capabilities.gpu.acceleration = "h264_amf";
    } else if (output.includes("intel")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "Intel";
      capabilities.gpu.acceleration = "h264_qsv";
    }

    capabilities.gpu.renderer = output.trim();
  }

  /*
    macOS
  */
  if (platform === "darwin") {
    capabilities.gpu.detected = true;
    capabilities.gpu.vendor = "Apple";
    capabilities.gpu.acceleration = "h264_videotoolbox";
  }

  /*
    Linux
  */
  if (platform === "linux") {
    const result = safeExec("lspci");

    const output = String(result.stdout || "").toLowerCase();

    if (output.includes("nvidia")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "NVIDIA";
      capabilities.gpu.acceleration = "h264_nvenc";
    } else if (output.includes("amd")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "AMD";
      capabilities.gpu.acceleration = "h264_amf";
    } else if (output.includes("intel")) {
      capabilities.gpu.detected = true;
      capabilities.gpu.vendor = "Intel";
      capabilities.gpu.acceleration = "h264_qsv";
    }

    capabilities.gpu.renderer = output.trim();
  }

  return capabilities;
}

export function getBestVideoEncoder() {
  const gpu = detectGPUCapabilities();

  if (!gpu.ffmpegAvailable) {
    return "libx264";
  }

  return gpu.gpu.acceleration || "libx264";
}

export function getOptimalRenderPreset({
  quality = "balanced",
} = {}) {
  const encoder = getBestVideoEncoder();

  /*
    NVENC presets
  */
  if (encoder === "h264_nvenc") {
    if (quality === "ultra") {
      return {
        encoder,
        preset: "p5",
        tune: "hq",
      };
    }

    if (quality === "fast") {
      return {
        encoder,
        preset: "p1",
        tune: "ll",
      };
    }

    return {
      encoder,
      preset: "p3",
      tune: "hq",
    };
  }

  /*
    Intel QuickSync
  */
  if (encoder === "h264_qsv") {
    return {
      encoder,
      preset: "medium",
    };
  }

  /*
    AMD
  */
  if (encoder === "h264_amf") {
    return {
      encoder,
      preset: "balanced",
    };
  }

  /*
    Apple
  */
  if (encoder === "h264_videotoolbox") {
    return {
      encoder,
      preset: "medium",
    };
  }

  /*
    CPU fallback
  */
  return {
    encoder: "libx264",
    preset:
      quality === "ultra"
        ? "slow"
        : quality === "fast"
        ? "veryfast"
        : "medium",
  };
}

export function buildGPUEncodingArgs({
  quality = "balanced",
} = {}) {
  const config = getOptimalRenderPreset({
    quality,
  });

  const args = [
    "-c:v",
    config.encoder,
  ];

  if (config.preset) {
    args.push("-preset", config.preset);
  }

  if (config.tune) {
    args.push("-tune", config.tune);
  }

  /*
    Universal compatibility
  */
  args.push(
    "-pix_fmt",
    "yuv420p"
  );

  args.push(
    "-movflags",
    "+faststart"
  );

  return args;
}

export function getRenderBenchmark() {
  const gpu = detectGPUCapabilities();

  const estimatedSpeed =
    gpu.gpu.vendor === "NVIDIA"
      ? "Very Fast"
      : gpu.gpu.vendor === "AMD"
      ? "Fast"
      : gpu.gpu.vendor === "Intel"
      ? "Moderate"
      : "CPU Only";

  return {
    ok: true,
    gpu,
    recommendedEncoder: getBestVideoEncoder(),
    estimatedRenderSpeed: estimatedSpeed,
    timestamp: new Date().toISOString(),
  };
}

export default {
  detectGPUCapabilities,
  getBestVideoEncoder,
  getOptimalRenderPreset,
  buildGPUEncodingArgs,
  getRenderBenchmark,
};