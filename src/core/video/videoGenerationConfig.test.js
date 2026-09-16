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

  test("unverified features and unknown options fail", () => {
    expect(() => validateVideoOptions({ mode: "local-test", allowFallback: true, voiceover: true })).toThrow("Voiceover is unavailable");
    expect(() => validateVideoOptions({ mode: "local-test", allowFallback: true, mystery: true })).toThrow("Unsupported video options");
  });
});
