import { postToTwitter } from "./platforms/twitter.js";
import { postToInstagram } from "./platforms/instagram.js";
import { postToTikTok } from "./platforms/tiktok.js";

export async function publishContent({ videoUrl, caption, platforms }) {
  const results = [];

  for (const platform of platforms) {
    try {
      let response;

      if (platform === "twitter") {
        response = await postToTwitter(videoUrl, caption);
      }

      if (platform === "instagram") {
        response = await postToInstagram(videoUrl, caption);
      }

      if (platform === "tiktok") {
        response = await postToTikTok(videoUrl, caption);
      }

      results.push({
        platform,
        success: true,
        response,
      });

    } catch (err) {
      console.error(`❌ ${platform} failed`, err);

      results.push({
        platform,
        success: false,
      });
    }
  }

  return results;
}