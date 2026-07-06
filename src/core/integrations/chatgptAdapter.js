// src/core/integrations/chatgptAdapter.js

export async function runChatGPT(prompt) {
   if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ Missing OpenAI Key");
    return "⚠️ OpenAI key not configured.";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "⚠️ No response";
}