import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { validateVideoArtifact } from "./src/core/video/videoArtifactValidator.js";

const tempDir = path.resolve("server-renders", ".artifact-validation-test");
const movingPath = path.join(tempDir, "moving.mp4");
const blackPath = path.join(tempDir, "black.mp4");

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true, stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}.`)));
  });
}

try {
  fs.mkdirSync(tempDir, { recursive: true });
  await run(["-y", "-f", "lavfi", "-i", "testsrc2=size=320x568:rate=24", "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p", movingPath]);
  const valid = await validateVideoArtifact({ filePath: movingPath, source: "local-test", expected: { minDuration: 2, maxDuration: 4 } });
  if (!valid.ok || valid.video.width !== 320 || valid.video.height !== 568) throw new Error("Moving artifact was not validated correctly.");
  await run(["-y", "-f", "lavfi", "-i", "color=c=black:s=320x568:r=24", "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p", blackPath]);
  let blackRejected = false;
  try {
    await validateVideoArtifact({ filePath: blackPath, source: "local-test" });
  } catch (error) {
    blackRejected = /black-video fallback/i.test(error.message);
  }
  if (!blackRejected) throw new Error("Black artifact was not rejected.");
  console.log("Artifact validator accepted moving video and rejected black video.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
