import { buildImagePrompt } from "./localImageGeneration.js";

describe("local image prompt", () => {
  test("preserves creative direction and enforces original unbranded output", () => {
    const prompt = buildImagePrompt({
      prompt: "Eight heroes beside a glowing cave pond",
      style: "cinematic anime fantasy",
    });
    expect(prompt).toContain("Eight heroes beside a glowing cave pond");
    expect(prompt).toContain("cinematic anime fantasy");
    expect(prompt).toContain("Original characters and world");
    expect(prompt).toContain("No text, no logos, no watermark");
  });
});
