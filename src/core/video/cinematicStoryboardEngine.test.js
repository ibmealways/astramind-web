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
});
