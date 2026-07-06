import fetch from "node-fetch";

export async function postToTwitter(videoUrl, caption) {
  const token = process.env.TWITTER_BEARER;

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: caption + " " + videoUrl,
    }),
  });

  return res.json();
}