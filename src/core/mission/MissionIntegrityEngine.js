const STOP = new Set([
  "about","after","again","also","and","are","but","capabilities","content","create","demonstration",
  "for","from","have","into","its","launch","make","more","our","pre","presentation","script","that",
  "the","their","this","technologies","use","using","video","with","will","your",
]);

function tokens(value) {
  return new Set((String(value || "").toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((token) => !STOP.has(token)));
}

export function relevanceScore(mission, candidate) {
  const missionTokens = tokens(mission);
  const candidateTokens = tokens(candidate);
  if (!missionTokens.size || !candidateTokens.size) return 0;
  let overlap = 0;
  for (const token of missionTokens) if (candidateTokens.has(token)) overlap++;
  return overlap / Math.sqrt(missionTokens.size * candidateTokens.size);
}

function matchedMissionTerms(mission, candidate) {
  const missionTokens = tokens(mission);
  const candidateTokens = tokens(candidate);
  return [...missionTokens].filter((token) => candidateTokens.has(token));
}

export function filterRelevantResearch(originalMission, researchBrief, { minimumScore = 0.12, minimumMatchedTerms = 1, limit = 8 } = {}) {
  const results = Array.isArray(researchBrief?.results) ? researchBrief.results : [];
  const evaluated = results.map((source) => {
    const text = `${source.title || ""} ${source.summary || source.snippet || ""}`;
    const matchedTerms = matchedMissionTerms(originalMission, text);
    return { ...source, missionRelevance: relevanceScore(originalMission, text), matchedMissionTerms: matchedTerms };
  });
  const accepted = evaluated
    .filter(({ missionRelevance, matchedMissionTerms }) => missionRelevance >= minimumScore && matchedMissionTerms.length >= minimumMatchedTerms)
    .sort((a, b) => b.missionRelevance - a.missionRelevance)
    .slice(0, limit);
  return {
    ...(researchBrief || {}),
    results: accepted,
    sourceCount: accepted.length,
    integrity: { evaluated: evaluated.length, accepted: accepted.length, rejected: evaluated.length - accepted.length, minimumScore, minimumMatchedTerms },
  };
}

export function buildBoundedResearchContext(originalMission, researchBrief, maxCharacters = 5000) {
  const facts = (researchBrief?.results || []).map((source, index) => `${index + 1}. ${source.title}\n${String(source.summary || source.snippet || "").slice(0, 700)}\nSource: ${source.url || "unavailable"}`);
  const value = `ORIGINAL MISSION (authoritative):\n${originalMission}\n\nRELEVANT RESEARCH FACTS:\n${facts.join("\n\n")}`;
  return value.slice(0, maxCharacters);
}

export function evaluateMissionContinuity(originalMission, { topic = "", storyboard = null } = {}) {
  const sceneText = (storyboard?.scenes || []).map((scene) => `${scene.title || ""} ${scene.visual || ""} ${scene.narration || scene.voiceover || ""}`).join(" ");
  const topicScore = relevanceScore(originalMission, topic);
  const storyboardScore = relevanceScore(originalMission, sceneText);
  const score = storyboard?.scenes?.length ? storyboardScore : topicScore;
  return {
    ok: score >= 0.1,
    score,
    topicScore,
    storyboardScore,
    reason: score >= 0.1 ? "Mission continuity verified." : "Generated creative direction drifted away from the original mission.",
  };
}

export function createMissionPreflight({ originalMission, researchBrief, storyboard, continuity }) {
  return {
    originalMission,
    research: { acceptedSources: researchBrief?.integrity?.accepted || 0, rejectedSources: researchBrief?.integrity?.rejected || 0 },
    storyboard: { scenes: storyboard?.scenes?.length || 0, captions: storyboard?.captions?.length || 0 },
    continuity,
    estimatedPaidStages: ["scene visual generation", "voice generation", "video rendering"],
    createdAt: new Date().toISOString(),
  };
}
