import fs from "fs";
import path from "path";
import { exec } from "child_process";

export function mergeAudioVideo({ videoPath, audioPath, outputPath }) {
  return new Promise((resolve, reject) => {
    const command = `
      ffmpeg -i ${videoPath} -i ${audioPath} -c:v copy -c:a aac ${outputPath}
    `;

    exec(command, (err) => {
      if (err) {
        console.error("🔥 FFmpeg Error:", err);
        return reject(err);
      }

      console.log("🎬 Final video created:", outputPath);
      resolve(outputPath);
    });
  });
}