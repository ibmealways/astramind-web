export async function getLiveNews(query) {
  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      console.warn("❌ Missing NEWS_API_KEY");
      return [];
    }

    const cleaned = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .slice(0, 3)
      .join(" ");

    console.log("📰 Query:", cleaned);

    const url = `https://newsapi.org/v2/top-headlines?q=${cleaned}&country=us&pageSize=5&apiKey=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    console.log("🧪 FULL NEWS RESPONSE:", data);
    console.log("📰 TOTAL RESULTS:", data.totalResults);
    console.log("📰 RAW ARTICLES:", data.articles?.length);

    if (data.status !== "ok") {
      console.error("❌ NEWS API ERROR:", data);
      return [];
    }

    // 🔁 FALLBACK IF EMPTY
    if (!data.articles || data.articles.length === 0) {
      console.warn("⚠️ No results, retrying fallback...");

      const fallbackUrl = `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();

      console.log("🔁 FALLBACK ARTICLES:", fallbackData.articles?.length);

      data.articles = fallbackData.articles || [];
    }

    const articles = (data.articles || [])
      .filter(a => a.title && a.url)
      .slice(0, 5);

    console.log("📰 VALID ARTICLES:", articles.length);

    return articles.map((a) => ({
      title: a.title,
      source: a.source?.name || "Unknown",
      url: a.url,
    }));

  } catch (err) {
    console.error("🔥 NEWS AGENT ERROR:", err);
    return [];
  }
}