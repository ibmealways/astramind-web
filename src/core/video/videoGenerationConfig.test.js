import { LOCAL_TEST_LABEL, normalizeVideoMode, validateVideoOptions } from "./videoGenerationConfig.js";

describe("video generation configuration", () => {
  test("production defaults to disabled", () => {
    expect(normalizeVideoMode("", { nodeEnv: "production" })).toBe("disabled");
  });

  test("local aliases use the explicit test mode", () => {
    expect(normalizeVideoMode("fallback-motion")).toBe("local-test");
    const options = validateVideoOptions(
      { mode: "local-test", allowFallback: true, durationTarget: 20 },
      { env: { NODE_ENV: "test" }, maxDuration: 30 }
    );
    expect(options.mode).toBe("local-test");
    expect(options.diagnostics.label).toBe(LOCAL_TEST_LABEL);
    expect(options.diagnostics.realProvider).toBe(false);
  });

  test("real providers cannot silently fall back", () => {
    expect(() => validateVideoOptions(
      { mode: "runway", allowFallback: true, durationTarget: 20 },
      { env: { NODE_ENV: "test", RUNWAY_API_KEY: "test-key" } }
    )).toThrow("Fallback is prohibited");
  });

  test("local AI video requires a connected worker and never uses still fallback", () => {
    expect(() => validateVideoOptions(
      { mode: "aigenikz-local", durationTarget: 30 },
      { env: { NODE_ENV: "test" } }
    )).toThrow("AIGENIKZ_VIDEO_WORKER_URL");
    const options = validateVideoOptions(
      { mode: "aigenikz-local", durationTarget: 30 },
      { env: { NODE_ENV: "test", AIGENIKZ_VIDEO_WORKER_URL: "https://example.com", AIGENIKZ_VIDEO_WORKER_TOKEN: "test" } }
    );
    expect(options.diagnostics.realProvider).toBe(true);
    expect(options.allowFallback).toBe(false);
  });

  test("unverified features and unknown options fail", () => {
    expect(() => validateVideoOptions({ mode: "local-test", allowFallback: true, voiceover: true })).toThrow("ELEVENLABS_API_KEY");
    expect(() => validateVideoOptions({ mode: "local-test", allowFallback: true, mystery: true })).toThrow("Unsupported video options");
  });
});
