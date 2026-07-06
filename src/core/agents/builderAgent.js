export async function runBuilderAgent(input) {
  return {
    ok: true,
    executionPlan: [
      "Define architecture",
      "Build backend",
      "Connect frontend",
      "Deploy system",
    ],
    input,
  };
}
