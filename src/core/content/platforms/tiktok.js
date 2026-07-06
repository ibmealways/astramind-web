export async function postToTikTok(videoUrl, caption) {
  console.log("⚠️ TikTok API requires Business App setup");

  return {
    message: "Upload via TikTok Business API",
    videoUrl,
    caption
  };
}