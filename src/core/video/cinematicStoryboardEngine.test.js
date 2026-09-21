import { buildCinematicStoryboard } from "./cinematicStoryboardEngine.js";

describe("cinematicStoryboardEngine", () => {
  it("keeps Nature's Elixirz merchandise hoodies in the wellness campaign", () => {
    const storyboard = buildCinematicStoryboard({
      topic:
        "Create a Nature's Elixirz health guidance app video covering smoothies, frequencies, meal plans, Tai Chi, VIP, and merchandise hoodies.",
      platform: "TikTok",
      durationTarget: 60,
    });

    expect(storyboard.theme.type).toBe("natures_elixirz_wellness_os");
    expect(storyboard.scenes.map((scene) => scene.visual).join(" ")).not.toMatch(
      /restaurant|grease|exhaust hood|NFPA/i
    );
  });

  it("keeps Hollow Bloom in its canonical fictional world", () => {
    const storyboard = buildCinematicStoryboard({
      topic:
        "Create Hollow Bloom Episode 1 Seeds of Change. Kyle, Jorge, Jack, Susan, Rosé, Shaun, Max, and Timmy leave high-school graduation and enter the cave garden. Require creator approval before changing canon.",
      platform: "YouTube Shorts",
      style: "cinematic anime fantasy",
      durationTarget: 60,
    });

    expect(storyboard.theme.type).toBe("hollow_bloom_episode_one");
    expect(storyboard.scenes.map((scene) => scene.title)).toEqual([
      "The Last Day",
      "The Hidden Garden",
      "The Awakening",
      "First Powers",
      "They Are Not Alone",
    ]);
    const script = storyboard.scenes.map((scene) => `${scene.visual} ${scene.voiceover}`).join(" ");
    expect(script).toMatch(/graduation/i);
    expect(script).toMatch(/cave/i);
    expect(script).not.toMatch(/neural AI core|creator systems|AI dashboard/i);
    expect(storyboard.totalDuration).toBe(60);
  });
});
