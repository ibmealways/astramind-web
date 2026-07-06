import fetch from "node-fetch";

export async function generateRunwayVideo(prompt) {
  try {
    const apiKey = process.env.RUNWAY_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ Missing RUNWAY API Key");
      return null;
    }

    // Step 1: Create generation job
    const createRes = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gen-3",
        prompt: prompt,
        duration: 5, // seconds
        resolution: "720p"
      }),
    });

    const createData = await createRes.json();

    if (!createData.id) {
      console.error("❌ Runway job failed:", createData);
      return null;
    }

    const jobId = createData.id;

    console.log("🎬 Runway Job Created:", jobId);

    // Step 2: Poll for completion
    let status = "processing";
    let videoUrl = null;

    while (status === "processing") {
      await new Promise(r => setTimeout(r, 4000));

      const statusRes = await fetch(
        `https://api.runwayml.com/v1/generate/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const statusData = await statusRes.json();

      status = statusData.status;

      console.log("⏳ Runway Status:", status);

      if (status === "completed") {
        videoUrl = statusData.output?.video_url;
      }

      if (status === "failed") {
        console.error("❌ Runway generation failed");
        return null;
      }
    }

    return videoUrl;

  } catch (err) {
    console.error("🔥 Runway Engine Error:", err);
    return null;
  }
}