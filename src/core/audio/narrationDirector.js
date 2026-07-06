// src/core/audio/narrationDirector.js
export function buildNarrationDirection({
  topic = "",
  platform = "TikTok",
  durationTarget = 30,
  creatorIdentity = {},
  productionPlan = {},
} = {}) {
  const intense =
    productionPlan?.captionStyle === "bold-kinetic" ||
    /trump|maga|exposed|truth|warning|breaking/i.test(topic);

  const documentary =
    /documentary|history|timeline|evidence|investigation/i.test(topic);

  const wpm = intense ? 155 : documentary ? 135 : 145;
  const targetWords = Math.max(30, Math.round((durationTarget / 60) * wpm));

  return {
    ok: true,
    engine: "AstraMind Narration Director v1",
    topic,
    platform,
    durationTarget,
    targetWords,
    voiceStyle: intense
      ? "authoritative-intense"
      : documentary
      ? "calm-investigative"
      : "clear-cinematic",
    pacing: intense
      ? "short punchy lines"
      : documentary
      ? "measured documentary cadence"
      : "smooth cinematic narration",
    emphasisWords: intense
      ? ["truth", "pattern", "proof", "consequence"]
      : ["future", "create", "transform", "decision"],
    instruction:
      `Write narration around ${targetWords} words. Keep it synced to a ${durationTarget}-second video. Avoid ending early.`,
    creatorIdentity,
    productionPlan,
  };
}

export function expandNarrationForDuration({
  baseText = "",
  durationTarget = 30,
  topic = "",
} = {}) {
  const words = String(baseText || "").split(/\s+/).filter(Boolean);
  const targetWords = Math.max(30, Math.round((durationTarget / 60) * 145));

  if (words.length >= targetWords * 0.8) return baseText;

  const addOn = `
This is where the story starts to connect. The pattern becomes clearer when every piece is viewed together. 
The old way was scattered. The new way is intelligent, adaptive, and built to move ideas into action.
`;

  let output = baseText;

  while (output.split(/\s+/).filter(Boolean).length < targetWords * 0.85) {
    output += " " + addOn;
  }

  return output.trim();
}

export function getNarrationDirectorHealth() {
  return {
    ok: true,
    engine: "AstraMind Narration Director v1",
    supports: {
      durationAwareNarration: true,
      creatorVoiceStyle: true,
      emphasisControl: true,
      antiCutoffExpansion: true,
    },
  };
}

export default {
  buildNarrationDirection,
  expandNarrationForDuration,
  getNarrationDirectorHealth,
};