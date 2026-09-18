import { getAigenikzMusicStatus, renderAigenikzMusic } from "./AigenikzMusicProvider.js";
import { getElevenLabsMusicStatus, renderElevenLabsVocalSong } from "./ElevenLabsMusicProvider.js";

const clean = (value) => String(value || "").trim().toLowerCase();

export function getMusicGenerationStatus(env = process.env) {
  const aigenikz = getAigenikzMusicStatus(env);
  const elevenlabs = getElevenLabsMusicStatus(env);
  const preference = clean(env.MUSIC_GENERATION_PROVIDER) || "auto";
  const active = preference === "elevenlabs"
    ? (elevenlabs.configured ? { ...elevenlabs, label: "ElevenLabs Music", selfHosted: false } : null)
    : (aigenikz.configured ? aigenikz : preference === "aigenikz" ? null : elevenlabs.configured ? { ...elevenlabs, label: "ElevenLabs Music", selfHosted: false } : null);
  return {
    configured: Boolean(active),
    preference,
    activeProvider: active?.provider || null,
    activeProviderLabel: active?.label || null,
    model: active?.model || null,
    selfHosted: Boolean(active?.selfHosted),
    providers: { aigenikz, elevenlabs: { ...elevenlabs, label: "ElevenLabs Music", selfHosted: false } },
  };
}

export async function renderFullSong(session, options = {}) {
  const status = getMusicGenerationStatus();
  if (!status.configured) {
    if (status.preference === "aigenikz") throw new Error("Aigenikz Music is selected but AIGENIKZ_MUSIC_WORKER_URL is not configured.");
    if (status.preference === "elevenlabs") throw new Error("ElevenLabs Music is selected but ELEVENLABS_API_KEY is not configured.");
    throw new Error("No full-song music provider is configured. Connect an Aigenikz Music worker or an optional external provider.");
  }
  return status.activeProvider === "aigenikz-music"
    ? renderAigenikzMusic(session, options)
    : renderElevenLabsVocalSong(session, options);
}

export default renderFullSong;
