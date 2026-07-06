// src/core/content/voiceEngine.js
import fetch from "node-fetch";

export async function generateVoice(text = "") {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!apiKey) {
      console.warn("⚠️ Missing ElevenLabs API Key. Voice generation skipped.");
      return null;
    }

    const cleanText = String(text || "").trim();

    if (!cleanText) {
      console.warn("⚠️ Empty text passed to generateVoice.");
      return null;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔥 ElevenLabs API Error:", errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("🔥 VOICE ENGINE ERROR:", err);
    return null;
  }
}

export default generateVoice;