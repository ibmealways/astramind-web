import fetch from "node-fetch";

export async function postToInstagram(videoUrl, caption) {
  const token = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;

  // Step 1: Create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        video_url: videoUrl,
        caption,
        access_token: token,
      }),
    }
  );

  const createData = await createRes.json();

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: createData.id,
        access_token: token,
      }),
    }
  );

  return publishRes.json();
}