import fetch from "node-fetch";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function runResearchAgent(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, results: [] };
    }

    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));

    return {
      ok: true,
      results,
    };
  } catch (err) {
    console.error("Research Agent Error:", err);
    return { ok: false, results: [] };
  }
}