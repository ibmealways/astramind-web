import { createHash, randomUUID } from "node:crypto";
import { analyzeRhymes } from "./RhymeAnalysisEngine.js";
import { AUDIO_GENRES, AUDIO_INSTRUMENTS } from "./AudioCatalog.js";

const KEYS = ["C minor", "D minor", "E minor", "F minor", "G minor", "A minor", "C major", "D major", "E major", "G major", "A major"];
const PROGRESSIONS = {
  Pop: ["I", "V", "vi", "IV"], HipHop: ["i", "VI", "III", "VII"], RnB: ["ii7", "V7", "Imaj7", "vi7"],
  Country: ["I", "V", "vi", "IV"], "Country Rap": ["i", "VI", "III", "VII"], Gospel: ["I", "IV", "I", "V"],
  Jazz: ["ii7", "V7", "Imaj7", "VI7"], Blues: ["I7", "IV7", "I7", "V7"], Electronic: ["i", "III", "VII", "VI"],
  Cinematic: ["i", "iv", "VI", "V"], Rock: ["I", "IV", "vi", "V"], Alternative: ["I", "iii", "IV", "iv"],
  Reggae: ["I", "IV", "V", "IV"], Latin: ["i", "VII", "VI", "V"], Classical: ["I", "IV", "V", "I"],
};
const GENRE_TRACKS = {
  Pop: ["Drums", "Bass", "Chords", "Lead", "Vocals"], HipHop: ["Drums", "808 Bass", "Keys", "Texture", "Vocals"],
  RnB: ["Drums", "Bass", "Electric Piano", "Guitar", "Vocals"], Electronic: ["Drums", "Bass", "Synth Chords", "Arp", "Lead"],
  Cinematic: ["Percussion", "Low Strings", "Strings", "Brass", "Atmosphere"], Rock: ["Drums", "Bass", "Rhythm Guitar", "Lead Guitar", "Vocals"],
  Country: ["Drums", "Bass", "Acoustic Guitar", "Electric Guitar", "Fiddle", "Vocals"],
  "Country Rap": ["Drums", "808 Bass", "Acoustic Guitar", "Banjo", "Treble Synth", "Vocals"],
  Gospel: ["Drums", "Bass", "Piano", "Organ", "Choir", "Vocals"], Jazz: ["Drums", "Bass", "Piano", "Trumpet", "Vocals"],
  Blues: ["Drums", "Bass", "Electric Guitar", "Harmonica", "Vocals"], Alternative: ["Drums", "Bass", "Electric Guitar", "Synth", "Vocals"],
  Reggae: ["Drums", "Percussion", "Bass", "Electric Guitar", "Organ", "Vocals"], Latin: ["Drums", "Percussion", "Bass", "Piano", "Trumpet", "Vocals"],
  Classical: ["Strings", "Piano", "Brass", "Percussion"],
};

function seedNumber(value) { return parseInt(createHash("sha256").update(String(value)).digest("hex").slice(0, 8), 16); }
function clamp(value, min, max) { return Math.min(Math.max(Number(value) || min, min), max); }
function slugGenre(value) { const normalized = String(value || "Pop").replace(/[^a-z]/gi, "").toLowerCase(); return ({ hiphop: "HipHop", rb: "RnB", rnb: "RnB", edm: "Electronic", countryrap: "Country Rap", countryhiphop: "Country Rap", hickhop: "Country Rap" })[normalized] || Object.keys(GENRE_TRACKS).find((key) => key.replace(/[^a-z]/gi, "").toLowerCase() === normalized) || "Pop"; }

export function inferCompositionBrief(input = {}) {
  const prompt = String(input.prompt || "").trim();
  const lower = prompt.toLowerCase();
  let genre = input.genre && input.genre !== "Auto" ? slugGenre(input.genre) : null;
  if (!genre) {
    const candidates = AUDIO_GENRES.filter((item) => item !== "Auto").sort((a, b) => b.length - a.length);
    genre = candidates.find((item) => lower.includes(item.toLowerCase())) || (/country.*rap|rap.*country|hick\s?hop/.test(lower) ? "Country Rap" : /hip[ -]?hop/.test(lower) ? "HipHop" : "Pop");
  }
  const bpmMatch = lower.match(/\b(\d{2,3})\s*bpm\b/);
  const durationMatch = lower.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(minute|min|second|sec)s?\b/);
  const wordNumbers = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  const durationValue = durationMatch ? (wordNumbers[durationMatch[1]] || Number(durationMatch[1])) : null;
  const inferredDuration = durationMatch ? Math.round(durationValue * (/min/.test(durationMatch[2]) ? 60 : 1)) : input.durationSeconds;
  const mood = input.mood || (["uplifting", "romantic", "melancholy", "energetic", "cinematic", "aggressive", "peaceful"].find((item) => lower.includes(item)) || "Uplifting");
  return { ...input, prompt, genre, mood, bpm: bpmMatch ? Number(bpmMatch[1]) : input.bpm, durationSeconds: inferredDuration };
}

export function composeAudioProject({ prompt = "", title, genre = "Pop", mood = "Uplifting", bpm = 120, durationSeconds = 150, instrumental = false, lyricsText = "", lyricsMode = "astramind", instrumentMode = "astramind", selectedInstruments = [], generateVideo = false } = {}) {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new Error("A composition prompt is required.");
  const normalizedGenre = slugGenre(genre);
  const tempo = clamp(bpm, 50, 200);
  const duration = clamp(durationSeconds, 30, 600);
  const seed = seedNumber(`${cleanPrompt}:${normalizedGenre}:${mood}:${tempo}`);
  const key = KEYS[seed % KEYS.length];
  const progression = PROGRESSIONS[normalizedGenre];
  const sections = [
    { name: "Intro", bars: 4, energy: 25 }, { name: "Verse 1", bars: 16, energy: 52 }, { name: "Pre-Chorus", bars: 8, energy: 68 },
    { name: "Chorus", bars: 16, energy: 92 }, { name: "Verse 2", bars: 16, energy: 58 }, { name: "Bridge", bars: 8, energy: 72 },
    { name: "Final Chorus", bars: 16, energy: 100 }, { name: "Outro", bars: 4, energy: 32 },
  ];
  const secondsPerBar = (60 / tempo) * 4;
  let cursor = 0;
  const timeline = sections.map((section) => {
    const start = cursor; cursor += section.bars * secondsPerBar;
    return { ...section, id: `section-${section.name.toLowerCase().replace(/\W+/g, "-")}`, startSeconds: Number(start.toFixed(2)), endSeconds: Number(Math.min(cursor, duration).toFixed(2)), chordProgression: progression };
  }).filter(({ startSeconds }) => startSeconds < duration);
  const manualTracks = Array.isArray(selectedInstruments) ? selectedInstruments.filter((name) => AUDIO_INSTRUMENTS.includes(name)).slice(0, 16) : [];
  const wantsInstrumental = instrumental || lyricsMode === "instrumental";
  const arrangementTracks = instrumentMode === "manual" && manualTracks.length ? manualTracks : GENRE_TRACKS[normalizedGenre];
  const trackNames = [...new Set([...arrangementTracks.filter((name) => !wantsInstrumental || name !== "Vocals"), ...(!wantsInstrumental && !arrangementTracks.includes("Vocals") ? ["Vocals"] : [])])];
  const tracks = trackNames.map((name, index) => ({
    id: randomUUID(), name, type: name === "Vocals" ? "vocal" : name.includes("Drum") || name === "Percussion" ? "drums" : "instrument",
    color: ["#22d3ee", "#818cf8", "#c084fc", "#f472b6", "#fbbf24"][index % 5], volumeDb: index === 0 ? -4 : -7, pan: index % 2 ? -12 + index * 6 : 0,
    mute: false, solo: false, effects: name === "Vocals" ? [{ type: "compressor", amount: 55 }, { type: "reverb", amount: 24 }] : [{ type: "eq", amount: 50 }],
    clips: timeline.map((section) => ({ id: randomUUID(), sectionId: section.id, name: `${name} · ${section.name}`, startSeconds: section.startSeconds, endSeconds: section.endSeconds, gainDb: 0 })),
  }));
  return {
    id: randomUUID(), title: String(title || cleanPrompt.split(/\s+/).slice(0, 6).join(" ")).slice(0, 80), prompt: cleanPrompt, genre: normalizedGenre, mood: String(mood), bpm: tempo, key,
    timeSignature: "4/4", durationSeconds: duration, progression, sections: timeline, tracks, master: { volumeDb: -1, limiter: true, targetLufs: -14 },
    lyrics: wantsInstrumental ? null : { mode: lyricsMode, concept: cleanPrompt, hook: `A memorable hook centered on: ${cleanPrompt.slice(0, 100)}`, guidance: "Use original lyrics only; preserve the Creator's voice and avoid imitating living artists.", text: String(lyricsText || "").slice(0, 30000) },
    composition: { instrumentMode, selectedInstruments: manualTracks, arrangementGeneratedBy: instrumentMode === "manual" ? "creator" : "astramind" },
    videoIntent: { requested: Boolean(generateVideo), status: generateVideo ? "ready-for-video-studio" : "not-requested" },
    algorithm: "astramind-composer-v2", provider: { status: "blueprint-ready", audioGenerationConfigured: true, waveform: "astramind-native", singingVoiceConfigured: false }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
  };
}

export function updateTrackMixer(session, { trackId, volumeDb, pan, mute, solo, effects } = {}) {
  let found = false;
  const tracks = session.tracks.map((track) => {
    if (track.id !== trackId) return track; found = true;
    return { ...track, volumeDb: volumeDb === undefined ? track.volumeDb : clamp(volumeDb, -60, 12), pan: pan === undefined ? track.pan : clamp(pan, -100, 100), mute: mute === undefined ? track.mute : Boolean(mute), solo: solo === undefined ? track.solo : Boolean(solo), effects: Array.isArray(effects) ? effects.slice(0, 12) : track.effects };
  });
  if (!found) throw new Error("Audio track not found.");
  return { ...session, tracks, updatedAt: new Date().toISOString(), version: session.version + 1 };
}

export function buildAudioExportManifest(session, format = "wav") {
  const supported = ["wav", "mp3", "stems", "json"];
  if (!supported.includes(format)) throw new Error("Unsupported audio export format.");
  return { sessionId: session.id, title: session.title, format, sampleRate: format === "wav" ? 16000 : 48000, bitDepth: format === "wav" ? 16 : format === "stems" ? 24 : null, tracks: session.tracks.map(({ id, name, volumeDb, pan, mute, solo, effects }) => ({ id, name, volumeDb, pan, mute, solo, effects })), master: session.master, status: format === "json" ? "ready" : format === "wav" ? "native-render-available" : "provider-render-required", createdAt: new Date().toISOString() };
}

export function updateSessionLyrics(session, text = "") {
  const cleanText = String(text).slice(0, 30000);
  return { ...session, lyrics: { ...(session.lyrics || {}), text: cleanText, rhymeAnalysis: analyzeRhymes(cleanText) }, updatedAt: new Date().toISOString(), version: session.version + 1 };
}
