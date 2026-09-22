import { SCENE_METHODS, buildProductionRoutingPlan, routeSceneProduction } from "./sceneCapabilityRouter.js";

describe("scene capability router", () => {
  test("uses a reusable rig for referenced dialogue", () => {
    const route = routeSceneProduction(
      { id: "dialogue", visual: "Kyle speaks in close-up", cast: ["kyle"] },
      { characterRigAvailable: true, localVideoAvailable: true }
    );
    expect(route.method).toBe(SCENE_METHODS.CHARACTER_RIG);
  });

  test("reserves local video for complex action", () => {
    const route = routeSceneProduction(
      { id: "action", visual: "The heroes fight during a magical transformation" },
      { localVideoAvailable: true }
    );
    expect(route.method).toBe(SCENE_METHODS.LOCAL_VIDEO);
    expect(route.estimatedComputeClass).toBe("local-gpu");
  });

  test("builds an explainable mixed production plan", () => {
    const plan = buildProductionRoutingPlan({
      scenes: [
        { id: "town", visual: "Establishing view of the town" },
        { id: "storm", visual: "Rain and glowing particles move through the forest" },
        { id: "chase", visual: "A fast chase through the cave" },
      ],
      context: { localVideoAvailable: true, policy: "affordable" },
    });
    expect(plan.sceneCount).toBe(3);
    expect(plan.methods[SCENE_METHODS.CAMERA_MOTION]).toBe(1);
    expect(plan.methods[SCENE_METHODS.LAYERED_MOTION]).toBe(1);
    expect(plan.methods[SCENE_METHODS.LOCAL_VIDEO]).toBe(1);
  });
});
