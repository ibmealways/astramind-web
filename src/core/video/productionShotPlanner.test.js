import { buildMediaSourcePlan, splitScenesIntoProductionShots } from "./productionShotPlanner.js";

describe("production shot planner", () => {
  test("splits a 60 second storyboard into clips no longer than ten seconds", () => {
    const shots = splitScenesIntoProductionShots({
      scenes: [
        { id: "hook", duration: 9, voiceover: "one two three" },
        { id: "problem", duration: 12, voiceover: "one two three four five six" },
        { id: "build", duration: 17, voiceover: "one two three four five six seven eight" },
        { id: "proof", duration: 12, voiceover: "one two three four" },
        { id: "payoff", duration: 10, voiceover: "one two three" },
      ],
    });
    expect(shots.reduce((sum, shot) => sum + shot.duration, 0)).toBe(60);
    expect(shots.every((shot) => shot.duration <= 10)).toBe(true);
    expect(shots).toHaveLength(8);
    expect(shots.filter((shot) => shot.sourceSceneId === "build")).toHaveLength(2);
  });

  test("selects stock for suitable scenes and generated clips for the rest", () => {
    const plan = buildMediaSourcePlan({
      mode: "runway",
      stockEnabled: true,
      scenes: [{ id: "people", visual: "People practicing tai chi" }, { id: "ui", visual: "A product interface" }],
    });
    expect(plan[0].preferredSource).toBe("licensed-stock");
    expect(plan[1].preferredSource).toBe("short-video-model");
  });
});
