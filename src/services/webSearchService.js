// Read provider configuration at request time. ES module imports are evaluated
// before server.js calls dotenv.config(), so module-level snapshots can be empty
// even when the key is correctly present in .env.
const searchEnabled = () => String(process.env.ENABLE_WEB_SEARCH || "true").toLowerCase() === "true";
const searchProvider = () => process.env.WEB_SEARCH_PROVIDER || process.env.SEARCH_PROVIDER || "tavily";
const tavilyApiKey = () => process.env.TAVILY_API_KEY || "";
const newsApiKey = () => process.env.NEWS_API_KEY || "";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeResults(results = []) {
  return results
    .filter(Boolean)
    .map((item) => ({
      title: cleanText(item.title),
      url: cleanText(item.url),
      snippet: cleanText(item.content || item.snippet || item.description),
      publishedDate: cleanText(item.published_date || item.publishedDate || item.publishedAt || item.date),
      sourceName: cleanText(item.sourceName || item.source?.name || item.publisher),
      score: Number(item.score || 0),
    }))
    .filter((item) => item.title || item.url || item.snippet);
}

export function shouldUseWebSearch(query = "") {
  const text = cleanText(query).toLowerCase();

  if (!text) return false;

  const triggers = [
    "search the internet",
    "search online",
    "look this up",
    "look it up",
    "browse",
    "latest",
    "current",
    "today",
    "recent",
    "news",
    "headline",
    "headlines",
    "resources",
    "sources",
    "find articles",
    "find stories",
    "search for",
    "trending",
    "viral",
    "tiktok",
    "weather",
    "forecast",
    "right now",
  ];

  return triggers.some((trigger) => text.includes(trigger));
}

async function searchTavily(cleanedQuery, options, fetchImpl, apiKey) {
  if (!apiKey) return { ok: false, provider: "tavily", error: "Missing TAVILY_API_KEY.", results: [] };
  try {
    const response = await fetchImpl("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: cleanedQuery,
        search_depth: options.searchDepth || "advanced",
        include_answer: Boolean(options.includeAnswer),
        include_images: false,
        include_raw_content: false,
        max_results: options.maxResults || 5,
        topic: options.topic || undefined,
        days: options.days || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, provider: "tavily", error: data?.error || data?.message || `Tavily search failed with status ${response.status}.`, results: [] };
    const results = normalizeResults(data?.results || []);
    return { ok: results.length > 0, provider: "tavily", query: cleanedQuery, answer: cleanText(data?.answer), results, error: results.length ? null : "Tavily returned no results." };
  } catch (error) {
    return { ok: false, provider: "tavily", query: cleanedQuery, error: error.message || "Unknown Tavily search error.", results: [] };
  }
}

async function searchNewsApi(cleanedQuery, options, fetchImpl, apiKey) {
  if (!apiKey) return { ok: false, provider: "newsapi", error: "Missing NEWS_API_KEY.", results: [] };
  try {
    const parameters = new URLSearchParams({
      q: cleanedQuery.slice(0, 500),
      language: options.language || "en",
      sortBy: options.sortBy || "relevancy",
      pageSize: String(Math.min(100, Math.max(1, Number(options.maxResults || 5)))),
      page: "1",
    });
    const response = await fetchImpl(`https://newsapi.org/v2/everything?${parameters}`, {
      headers: { "X-Api-Key": apiKey },
    });
    const data = await response.json();
    if (!response.ok || data?.status !== "ok") {
      return { ok: false, provider: "newsapi", error: data?.message || data?.code || `NewsAPI search failed with status ${response.status}.`, code: data?.code, results: [] };
    }
    const results = normalizeResults(data?.articles || []);
    return { ok: results.length > 0, provider: "newsapi", query: cleanedQuery, results, error: results.length ? null : "NewsAPI returned no articles." };
  } catch (error) {
    return { ok: false, provider: "newsapi", query: cleanedQuery, error: error.message || "Unknown NewsAPI search error.", results: [] };
  }
}

export async function runWebSearch(query, options = {}) {
  const configuredProvider = searchProvider();
  if (!searchEnabled()) {
    return {
      ok: false,
      provider: configuredProvider,
      error: "Web search disabled.",
      results: [],
    };
  }

  const cleanedQuery = cleanText(query);

  if (!cleanedQuery) {
    return {
      ok: false,
      provider: configuredProvider,
      error: "Missing search query.",
      results: [],
    };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const configuredOrder = Array.isArray(options.providerOrder) && options.providerOrder.length
    ? options.providerOrder
    : [configuredProvider, "tavily", "newsapi"];
  const providerOrder = unique(configuredOrder.map((provider) => cleanText(provider).toLowerCase()));
  const attempts = [];

  for (const provider of providerOrder) {
    let result;
    if (provider === "tavily") result = await searchTavily(cleanedQuery, options, fetchImpl, options.tavilyApiKey ?? tavilyApiKey());
    else if (provider === "newsapi") result = await searchNewsApi(cleanedQuery, options, fetchImpl, options.newsApiKey ?? newsApiKey());
    else result = { ok: false, provider, error: `Unsupported search provider: ${provider}`, results: [] };
    attempts.push({ provider: result.provider, ok: result.ok, resultCount: result.results?.length || 0, error: result.error || null });
    if (result.ok && result.results.length) return { ...result, fallbackUsed: attempts.length > 1, attempts };
  }

  return { ok: false, provider: providerOrder[0] || configuredProvider, query: cleanedQuery, error: attempts.map(({ provider, error }) => `${provider}: ${error}`).join(" | ") || "All search providers failed.", results: [], attempts };
}

function buildResearchQueries({ query = "", intent = {}, platform = "TikTok" } = {}) {
  const base = cleanText(query);
  const type = intent?.type || "general_web";
  const today = new Date().toISOString().slice(0, 10);

  if (type === "trend") {
    return unique([
      `current viral trends on ${platform} today ${today}`,
      `latest ${platform} trending topics creators are posting about today`,
      `what is trending on ${platform} right now`,
      `${base}`,
    ]);
  }

  if (type === "news") {
    return unique([
      `latest breaking news today ${today}`,
      `top news headlines today ${today}`,
      `${base}`,
    ]);
  }

  if (type === "weather") {
    return unique([
      `${base} current weather forecast today`,
      `${base} weather forecast next 24 hours`,
    ]);
  }

  if (type === "finance") {
    return unique([
      `${base} latest market news today`,
      `${base} current price analysis today`,
      `${base}`,
    ]);
  }

  if (type === "local") {
    return unique([
      `${base} local current information today`,
      `${base} near me latest updates`,
    ]);
  }

  if (type === "how_to") {
    return unique([
      `${base} step by step guide`,
      `${base} best practices tutorial`,
    ]);
  }

  return unique([
    `${base}`,
    `${base} latest information`,
    `${base} sources`,
  ]);
}

function extractKeyFacts(results = []) {
  return results.slice(0, 10).map((item, index) => ({
    id: `fact_${index + 1}`,
    title: item.title,
    summary: item.snippet,
    url: item.url,
    publishedDate: item.publishedDate || null,
  }));
}

function buildCreativeBrief({ query = "", intent = {}, results = [], platform = "TikTok" } = {}) {
  const type = intent?.type || "general_web";
  const facts = extractKeyFacts(results);
  const top = facts[0];

  const angleMap = {
    trend: "turn the current internet conversation into a fast, high-retention short-form video",
    news: "explain the latest development with urgency, clarity, and cinematic context",
    weather: "turn live weather conditions into a useful, local, visually clear short-form update",
    finance: "explain the market movement and why viewers should pay attention",
    local: "make the local information feel immediate, useful, and relevant",
    how_to: "teach the viewer quickly with a clear problem-solution structure",
    general_web: "research the subject, extract the strongest angle, and turn it into a compelling video",
  };

  return {
    requestedPrompt: query,
    researchType: type,
    platform,
    primaryAngle: angleMap[type] || angleMap.general_web,
    suggestedTitle: top?.title || query,
    hook: top?.title
      ? `Everyone is talking about this: ${top.title}`
      : `Here is what you need to know about ${query}.`,
    viewerPromise:
      type === "trend"
        ? "Show the viewer what is trending, why it matters, and how to understand it fast."
        : "Give the viewer the clearest, most useful version of the researched topic.",
    keyFacts: facts,
    sourceCount: results.length,
  };
}

export async function runAutonomousResearch({
  query = "",
  intent = {},
  platform = "TikTok",
  maxResults,
} = {}) {
  const researchRequired = Boolean(intent?.required || shouldUseWebSearch(query));

  if (!researchRequired) {
    return {
      ok: false,
      skipped: true,
      reason: "Research not required for this prompt.",
      researchType: intent?.type || "none",
      originalQuery: query,
      results: [],
    };
  }

  const queries = buildResearchQueries({ query, intent, platform });
  const allResults = [];
  const searches = [];

  for (const searchQuery of queries.slice(0, 4)) {
    const search = await runWebSearch(searchQuery, {
      maxResults: maxResults || intent?.maxResults || 6,
      searchDepth: intent?.searchDepth || "advanced",
      includeAnswer: false,
    });

    searches.push(search);

    if (Array.isArray(search?.results)) {
      allResults.push(...search.results);
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const item of allResults) {
    const key = item.url || `${item.title}:${item.snippet}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const brief = buildCreativeBrief({
    query,
    intent,
    results: deduped,
    platform,
  });

  return {
    ok: deduped.length > 0,
    engine: "AstraMind Autonomous Research Layer v1",
    originalQuery: query,
    researchType: intent?.type || "general_web",
    freshness: intent?.freshness || "recent",
    platform,
    queries,
    searches,
    results: deduped,
    brief,
    sourceContext: buildSearchContext(deduped),
    generatedAt: new Date().toISOString(),
    error: deduped.length ? null : searches.find((s) => s?.error)?.error || "No research results found.",
  };
}

export function buildResearchContext(results = []) {
  return buildSearchContext(results);
}

export function buildResearchEnhancedTopic({
  originalTopic = "",
  researchBrief = null,
  viralAngle = null,
} = {}) {
  if (!researchBrief?.ok || !researchBrief?.brief) {
    return cleanText(originalTopic);
  }

  const facts = researchBrief.brief.keyFacts || [];

  return [
    cleanText(originalTopic),
    "",
    "AUTONOMOUS RESEARCH BRIEF:",
    `Research type: ${researchBrief.researchType}`,
    `Freshness: ${researchBrief.freshness}`,
    `Platform: ${researchBrief.platform}`,
    `Selected angle: ${viralAngle?.angle || researchBrief.brief.primaryAngle}`,
    `Suggested hook: ${viralAngle?.hook || researchBrief.brief.hook}`,
    `Viewer promise: ${researchBrief.brief.viewerPromise}`,
    "",
    "SOURCE-BACKED FACTS TO USE:",
    ...facts.slice(0, 6).map((fact, index) =>
      `${index + 1}. ${fact.title || "Source"} — ${fact.summary || "No summary available."} Source: ${fact.url || "No URL"}`
    ),
    "",
    "VIDEO REQUIREMENT:",
    "Use the research brief as factual grounding before storyboard generation. Turn the strongest researched angle into a complete short-form video with clear hook, context, proof, payoff, captions, visuals, narration, and final MP4.",
  ].join("\n");
}

export function buildSearchContext(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return "No search results were available.";
  }

  return results
    .map((item, index) => {
      return [
        `Source ${index + 1}:`,
        `Title: ${item.title || "Untitled"}`,
        `URL: ${item.url || "No URL"}`,
        `Snippet: ${item.snippet || "No snippet available."}`,
        item.publishedDate ? `Published: ${item.publishedDate}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
