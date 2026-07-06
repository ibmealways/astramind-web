import fetch from "node-fetch";

export async function postToYouTube(videoUrl, caption) {
  return {
    success: false,
    message: "YouTube upload requires OAuth2 flow (next step)"
  };
}