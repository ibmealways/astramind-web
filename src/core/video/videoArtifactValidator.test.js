import { parseFfmpegProbe, validateProbeDiagnostics } from "./videoArtifactValidator.js";

describe("video artifact validation", () => {
  const diagnostics = `Duration: 00:00:05.03, start: 0.000000\nStream #0:0: Video: h264 (High), yuv420p, 1080x1920, 30 fps\nStream #0:1: Audio: aac (LC), 48000 Hz, stereo`;

  test("parses and accepts a valid MP4 stream description", () => {
    const probe = parseFfmpegProbe(diagnostics);
    expect(probe.video).toMatchObject({ codec: "h264", width: 1080, height: 1920, frameRate: 30 });
    expect(probe.audio).toMatchObject({ codec: "aac", sampleRate: 48000, channels: "stereo" });
    expect(validateProbeDiagnostics(probe, { audioRequired: true, maxDuration: 6 })).toEqual({ ok: true, errors: [] });
  });

  test("rejects missing video and requested audio", () => {
    const result = validateProbeDiagnostics({ duration: 5, video: null, audio: null }, { audioRequired: true });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/no video stream/i);
    expect(result.errors.join(" ")).toMatch(/Audio was requested/i);
  });

  test("allows bounded container and transition timing tolerance", () => {
    const video = { codec: "h264", width: 1080, height: 1920, frameRate: 30 };
    expect(validateProbeDiagnostics(
      { duration: 64.9, video, audio: null },
      { maxDuration: 60, durationToleranceSeconds: 5 }
    ).ok).toBe(true);
    const rejected = validateProbeDiagnostics(
      { duration: 65.1, video, audio: null },
      { maxDuration: 60, durationToleranceSeconds: 5 }
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.errors.join(" ")).toMatch(/65\.10s/);
  });
});
