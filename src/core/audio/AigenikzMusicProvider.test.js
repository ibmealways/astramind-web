import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getAigenikzMusicStatus, renderAigenikzMusic } from "./AigenikzMusicProvider.js";
import { getMusicGenerationStatus } from "./MusicGenerationProvider.js";

const session = {
  id: "session-12345678", title: "Light Within", prompt: "uplifting original song",
  lyrics: { text: "[Verse 1]\nA new day opens\n[Chorus]\nLight from within" },
  genre: "Pop", mood: "Uplifting", bpm: 120, key: "G minor", timeSignature: "4/4", durationSeconds: 60,
  tracks: [{ name: "Drums", type: "instrument" }, { name: "Vocals", type: "vocal" }], sections: [],
};

test("prefers the owned worker when configured", () => {
  const status = getMusicGenerationStatus({ MUSIC_GENERATION_PROVIDER: "auto", AIGENIKZ_MUSIC_WORKER_URL: "https://worker.example", AIGENIKZ_MUSIC_MODEL: "ace-step-1.5", ELEVENLABS_API_KEY: "external" });
  assert.equal(status.activeProvider, "aigenikz-music");
  assert.equal(status.selfHosted, true);
  assert.equal(status.model, "ace-step-1.5");
});

test("reports worker status without exposing secrets", () => {
  const status = getAigenikzMusicStatus({ AIGENIKZ_MUSIC_WORKER_TOKEN: "secret" });
  assert.equal(status.configured, false);
  assert.equal(status.authenticated, true);
  assert.equal(JSON.stringify(status).includes("secret"), false);
});

test("stores an immediate audio response as an Aigenikz master", async () => {
  const previousUrl = process.env.AIGENIKZ_MUSIC_WORKER_URL;
  const previousToken = process.env.AIGENIKZ_MUSIC_WORKER_TOKEN;
  process.env.AIGENIKZ_MUSIC_WORKER_URL = "https://worker.example";
  process.env.AIGENIKZ_MUSIC_WORKER_TOKEN = "service-secret";
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "aigenikz-music-"));
  let submitted;
  try {
    const render = await renderAigenikzMusic(session, {
      outputDir,
      fetchImpl: async (_url, options) => {
        submitted = JSON.parse(options.body);
        assert.equal(options.headers.Authorization, "Bearer service-secret");
        return new Response(Buffer.from("audio-bytes"), { status: 200, headers: { "content-type": "audio/mpeg" } });
      },
    });
    assert.equal(submitted.lyrics.includes("Light from within"), true);
    assert.equal(submitted.instruments.join(","), "Drums");
    assert.equal(render.provider, "aigenikz-music");
    assert.equal(fs.readFileSync(render.outputPath, "utf8"), "audio-bytes");
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
    if (previousUrl === undefined) delete process.env.AIGENIKZ_MUSIC_WORKER_URL; else process.env.AIGENIKZ_MUSIC_WORKER_URL = previousUrl;
    if (previousToken === undefined) delete process.env.AIGENIKZ_MUSIC_WORKER_TOKEN; else process.env.AIGENIKZ_MUSIC_WORKER_TOKEN = previousToken;
  }
});
