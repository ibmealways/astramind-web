import OpenAI from "openai";
import { getLivePrice } from "../finance/marketData.js";

function extractSymbols(text = "") {
  const matches = text.match(/\b[A-Z]{2,5}\b/g);
  return matches || [];
}

export async function buildNewsIntelligence(articles = []) {
  try {
    if (!articles.length) {
      return "⚠️ No intelligence available.";
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return "❌ Missing OpenAI API key.";
    }

    const client = new OpenAI({ apiKey });

    const headlines = articles
      .map((a, i) => `${i + 1}. ${a.title}`)
      .join("\n");

const prompt = `
You are an elite geopolitical and financial intelligence analyst.

Analyze these headlines and produce a structured intelligence report.

Headlines:
${headlines}

Return this EXACT structure:

🧠 Aigenikz Intelligence Brief

⚡ Situation:
(what is happening globally)

🔥 What Matters:
(key developments and why they matter)

💰 Market Impact:
(which sectors/assets are affected and how)

📊 Trade Signals:
(short bullish/bearish signals)

🎯 Opportunities:
(list stocks, crypto, or assets like XOM, BTC, etc.)

📈 Confidence Score:
(score from 1–10 + brief reasoning)

⚠️ Risk Level:
(Low / Medium / High + why)

⏱ Suggested Timing:
(Short-term / Mid-term / Long-term + explanation)

Be sharp, realistic, and actionable.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const intelText =
      completion.choices?.[0]?.message?.content || "";

    const symbols = extractSymbols(intelText);

    console.log("📊 Detected Symbols:", symbols);

    const prices = await Promise.all(
      symbols.slice(0, 5).map((s) => getLivePrice(s))
    );

    const priceText = prices
      .filter((p) => p && p.price)
      .map((p) => `${p.symbol}: $${p.price}`)
      .join("\n");

    return `${intelText}

📡 Live Prices:
${priceText || "No price data available"}`;

  } catch (err) {
    console.error("🔥 INTEL ENGINE ERROR:", err);
    return "⚠️ Failed to generate intelligence.";
  }
}