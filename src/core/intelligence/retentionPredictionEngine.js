// src/core/intelligence/retentionPredictionEngine.js
export function predictRetention({
  topic = "",
  platform = "TikTok",
  durationTarget = 30,
  scenes = [],
  productionPlan = {},
} = {}) {
  const text = String(topic || "").toLowerCase();

  let score = 50;

  if (/trump|maga|breaking|exposed|truth|warning/i.test(text)) score += 18;
  if (/ai|future|astramind|automation|technology/i.test(text)) score += 12;
  if (/documentary|history|evidence|timeline/i.test(text)) score += 10;

  if (durationTarget > 75) score -= 8;
  if (durationTarget > 120) score -= 12;

  if (scenes.length >= 5) score += 6;
  if (productionPlan?.captionStyle === "bold-kinetic") score += 5;
  if (productionPlan?.motionIntensity > 75) score += 5;

  score = Math.max(0, Math.min(100, score));

  return {
    ok: true,
    engine: "Aigenikz Retention Prediction Engine v1",
    score,
    rating:
      score >= 80 ? "high" : score >= 60 ? "strong" : score >= 45 ? "moderate" : "weak",
    risks: {
      tooLong: durationTarget > 90,
      weakMotion: Number(productionPlan?.motionIntensity || 0) < 55,
      lowSceneCount: scenes.length < 5,
    },
    recommendations: [
      durationTarget > 90
        ? "Use stronger chapter breaks every 20–30 seconds."
        : "Keep pacing tight.",
      scenes.length < 7
        ? "Add more visual beats for better retention."
        : "Scene count is healthy.",
      productionPlan?.captionStyle === "bold-kinetic"
        ? "Use punchy captions but avoid overcrowding."
        : "Use clean cinematic captions with emphasis words.",
    ],
  };
}

export function getRetentionPredictionHealth() {
  return {
    ok: true,
    engine: "Aigenikz Retention Prediction Engine v1",
    supports: {
      viralRetentionScoring: true,
      durationRiskDetection: true,
      sceneCountAnalysis: true,
      motionIntensityAnalysis: true,
      recommendations: true,
    },
  };
}

export default {
  predictRetention,
  getRetentionPredictionHealth,
};