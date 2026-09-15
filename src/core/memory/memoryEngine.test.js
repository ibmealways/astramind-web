import { addMemory, recallMemory, recallRelevantMemory } from "./memoryEngine.js";

describe("memoryEngine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("stores structured memories and preserves their content", () => {
    addMemory({ content: "Build a launch checklist", category: "project" });

    expect(recallMemory()).toEqual([
      expect.objectContaining({
        content: "Build a launch checklist",
        category: "project",
        createdAt: expect.any(String),
      }),
    ]);
  });

  test("recalls only memories relevant to the query", () => {
    addMemory("Prepare the Aigenikz launch plan");
    addMemory("Review a smoothie recipe");

    expect(recallRelevantMemory("Aigenikz launch")).toContain("Aigenikz launch plan");
    expect(recallRelevantMemory("unrelated phrase")).toBeNull();
  });
});