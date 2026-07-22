import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { generateAIStoryboard } from "../core/video/aiStoryboardBrain.js";
import { runWebSearch } from "./webSearchService.js";
import { buildPrelaunchReadiness, buildPromotionalVideoPreflight } from "./prelaunchReadinessService.js";
import { saveWorkflowRun } from "./projectPersistenceService.js";

function clean(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function buildPromotionalResearchQuery(topic) {
  if (/astramind/i.test(topic)) {
    return '"AI content creation" OR "creator economy" OR "artificial intelligence tools"';
  }
  return clean(topic)
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 18)
    .join(" ");
}

function parseJson(text = "") {
  const source = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(source);
  } catch {
    const match = source.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

function localCampaign({ topic, audience, tone, durationTarget }) {
  const segment = Math.max(5, Math.round(durationTarget / 6));
  const scenes = [
    ["The portal opens", "What if your ideas could enter an operating system built to remember, research, and create?", "YOUR IMAGINATION HAS AN OPERATING SYSTEM"],
    ["Intelligence that remembers", "AstraMind Chat connects conversation intelligence with persistent, governed memory.", "CHAT + CONTINUOUS MEMORY"],
    ["Research becomes evidence", "Research Workspace turns questions into source-aware briefs and reusable intelligence artifacts.", "RESEARCH OS"],
    ["One connected creator realm", "Create scripts, images, music, video plans, books, and experiments from one continuous mission.", "CREATOR STUDIO"],
    ["Decisions become missions", "Mission Control coordinates workflows while Finance and Journey tools help plan the road ahead.", "MISSION CONTROL + FINANCE"],
    ["Build beyond the interface", "AstraMind Technologies: one adaptive system for creators, researchers, authors, and entrepreneurs.", "ENTER THE ASTRAMIND REALM"],
  ];
  return {
    provider: "local-campaign-blueprint",
    campaignTitle: "AstraMind: Beyond the Interface",
    concept: `A ${clean(tone, "cinematic").toLowerCase()} portal journey that transforms a single idea into connected intelligence and production artifacts for ${clean(audience, "creators")}.`,
    script: scenes.map(([title, voiceover, onScreen], index) => ({
      scene: index + 1,
      title,
      timecode: `${index * segment}-${Math.min(durationTarget, (index + 1) * segment)}s`,
      voiceover,
      onScreen,
    })),
    voiceoverDirection: "Warm, assured cinematic narration; begin intimate, build momentum, and land the final line with calm authority.",
    soundtrackBrief: "Original hybrid cinematic-electronic score, 92 BPM, evolving pulse, dimensional synth textures, restrained percussion, and a luminous final resolve.",
    captions: scenes.map(([, , onScreen]) => onScreen),
    socialDescriptions: {
      youtube: `Meet AstraMind Technologies OS—an adaptive intelligence and creation environment for ${topic}.`,
      tiktok: "One idea. An entire creator operating system. Step inside AstraMind.",
      instagram: "Research, remember, plan, and create across one connected intelligence realm. This is AstraMind Technologies OS.",
    },
  };
}

async function generateCampaignWithOpenAI(input) {
  if (!process.env.OPENAI_API_KEY) return localCampaign(input);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.65,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are AstraMind's campaign director. Return valid JSON only. Make truthful product claims and never claim that a provider-rendered asset exists when only a production blueprint exists.",
      },
      {
        role: "user",
        content: `Create a complete ${input.durationTarget}-second promotional campaign package.\nMission: ${input.topic}\nAudience: ${input.audience}\nTone: ${input.tone}\nPlatforms: YouTube, TikTok, Instagram\n\nReturn this exact JSON shape: {"campaignTitle":"","concept":"","script":[{"scene":1,"title":"","timecode":"0-10s","voiceover":"","onScreen":""}],"voiceoverDirection":"","soundtrackBrief":"","captions":[""],"socialDescriptions":{"youtube":"","tiktok":"","instagram":""}}. Include exactly six timestamped scenes and original wording.`,
      },
    ],
  });
  const parsed = parseJson(completion.choices?.[0]?.message?.content);
  if (!parsed?.campaignTitle || !Array.isArray(parsed.script) || parsed.script.length === 0) {
    throw new Error("Campaign provider returned an invalid package.");
  }
  return { provider: "openai", ...parsed };
}

function normalizeSources(search) {
  return (search?.results || []).slice(0, 8).map((source, index) => ({
    id: `promo-source-${index + 1}`,
    title: source.title || "Untitled source",
    url: source.url || null,
    sourceName: source.sourceName || source.publisher || search.provider || "Web research",
    snippet: source.snippet || "",
    publishedDate: source.publishedDate || null,
    score: Number(source.score || 0),
  }));
}

function normalizeSixSceneStoryboard(storyboard, campaign) {
  const existing = Array.isArray(storyboard?.scenes) ? storyboard.scenes.slice(0, 6) : [];
  const scenes = Array.from({ length: 6 }, (_, index) => {
    const current = existing[index] || {};
    const script = campaign?.script?.[index] || {};
    const title = current.title || script.title || `Scene ${index + 1}`;
    const visual = current.visual || current.visualDescription || `An interdimensional AstraMind interface visualizing ${title.toLowerCase()}, cinematic dimensional lighting, premium technology campaign composition`;
    return {
      ...current,
      sceneNumber: current.sceneNumber || current.scene || index + 1,
      title,
      duration: current.duration || 10,
      narration: current.narration || current.voiceover || script.voiceover || "",
      onScreenText: current.onScreenText || script.onScreen || "",
      visual,
      imagePrompt: current.imagePrompt || current.visualPrompt || current.prompt || visual,
    };
  });
  return { ...storyboard, sceneCount: 6, scenes };
}

export function createPromotionalCampaignOrchestrator({
  generateCampaign = generateCampaignWithOpenAI,
  generateStoryboard = generateAIStoryboard,
  search = runWebSearch,
  readiness = buildPrelaunchReadiness,
  videoPreflight = buildPromotionalVideoPreflight,
  persist = saveWorkflowRun,
  logger = console,
} = {}) {
  return async function runPromotionalCampaign({ input = {}, userId, missionId } = {}) {
    const topic = clean(input.topic);
    if (!topic) throw Object.assign(new Error("A promotional campaign topic is required."), { status: 400, code: "TOPIC_REQUIRED" });

    const executionId = missionId || randomUUID();
    const audience = clean(input.audience, "Creators, entrepreneurs, researchers, authors, and small businesses");
    const tone = clean(input.tone, "Cinematic, visionary, trustworthy, and exciting");
    const durationTarget = Math.min(180, Math.max(30, Number(input.durationTarget || 60)));
    const stages = [];
    const mark = (stage, status, detail) => {
      const entry = { stage, status, detail, timestamp: new Date().toISOString() };
      stages.push(entry);
      logger.log(`[PromotionalCampaign:${executionId}] ${stage} -> ${status}${detail ? ` | ${detail}` : ""}`);
      return entry;
    };

    mark("mission.accepted", "completed", `${durationTarget}s campaign for ${audience}`);

    mark("readiness.audit", "running");
    const systemReadiness = await readiness();
    mark("readiness.audit", "completed", `${systemReadiness.status}; ${systemReadiness.totals?.blocked || 0} blockers`);

    mark("research.collect", "running");
    let research = { ok: false, provider: "none", results: [], error: null };
    try {
      research = await search(buildPromotionalResearchQuery(topic), { maxResults: 6, searchDepth: "advanced" });
    } catch (error) {
      research = { ok: false, provider: "unavailable", results: [], error: error.message };
    }
    const sources = normalizeSources(research);
    mark("research.collect", sources.length ? "completed" : "degraded", sources.length ? `${sources.length} industry-context sources collected via ${research.provider}${research.fallbackUsed ? " fallback" : ""}` : (research.error || "No external claims required; continuing with product contract data"));

    mark("campaign.generate", "running");
    let campaign;
    try {
      campaign = await generateCampaign({ topic, audience, tone, durationTarget, sources });
      mark("campaign.generate", "completed", campaign.provider || "configured provider");
    } catch (error) {
      campaign = localCampaign({ topic, audience, tone, durationTarget });
      campaign.providerError = error.message;
      mark("campaign.generate", "degraded", `Provider unavailable; local production blueprint created: ${error.message}`);
    }

    mark("storyboard.generate", "running");
    const generatedStoryboard = await generateStoryboard({ topic, platform: "YouTube / TikTok / Instagram", style: tone, durationTarget, allowFallback: true });
    const storyboard = normalizeSixSceneStoryboard(generatedStoryboard, campaign);
    mark("storyboard.generate", "completed", `${storyboard?.scenes?.length || 0} scenes; ${storyboard?.source || "storyboard engine"}`);

    const imagePrompts = (storyboard?.scenes || []).map((scene, index) => ({
      scene: scene.sceneNumber || scene.scene || index + 1,
      title: scene.title || campaign.script?.[index]?.title || `Scene ${index + 1}`,
      prompt: scene.imagePrompt || scene.visualPrompt || scene.visual || scene.prompt || "",
    }));

    mark("provider.preflight", "running");
    const preflight = await videoPreflight({ userId, durationTarget, voiceover: true });
    mark("provider.preflight", preflight.canRender ? "completed" : "blocked", preflight.canRender ? "All required render gates passed" : "Paid rendering remains stopped until required gates pass");

    const masterSummary = [
      campaign.campaignTitle,
      campaign.concept,
      `System readiness: ${systemReadiness.status} (${systemReadiness.score}%); ${systemReadiness.totals?.blocked || 0} blockers.`,
      `Campaign package: ${campaign.script?.length || 0} scripted scenes, ${imagePrompts.length} storyboard image prompts, voiceover direction, soundtrack brief, captions, and three social descriptions.`,
      `Provider preflight: ${preflight.canRender ? "PASSED—render may be submitted after explicit approval." : "BLOCKED—no paid render was started."}`,
    ].join("\n\n");

    const result = {
      ok: true,
      workflowType: "promotional_campaign",
      executionId,
      masterSummary,
      readiness: systemReadiness,
      sources,
      stages,
      orchestration: {
        research: { reply: sources.length ? `${sources.length} optional current-claim sources collected.` : "No external sources were available; campaign claims are limited to AstraMind's audited internal contract catalog.", sources },
        content: { result: campaign },
        storyboard,
        imagePrompts,
        audio: { voiceoverDirection: campaign.voiceoverDirection, soundtrackBrief: campaign.soundtrackBrief },
        distribution: { captions: campaign.captions || [], socialDescriptions: campaign.socialDescriptions || {} },
        preflight,
      },
      render: { started: false, requiresExplicitApproval: true, canRender: preflight.canRender },
      generatedAt: new Date().toISOString(),
    };

    try {
      await persist({
        userId,
        workflowKey: "promotional_campaign",
        primaryAgent: "mission-control",
        inputText: topic,
        resultText: masterSummary,
        structuredOutput: result,
        sources,
      });
      mark("artifacts.persist", "completed", "Campaign workflow and artifacts saved");
    } catch (error) {
      mark("artifacts.persist", "degraded", error.message);
    }

    mark("mission.complete", "completed", preflight.canRender ? "Awaiting explicit render approval" : "Production package ready; render gate remains closed");
    return result;
  };
}

export const runPromotionalCampaign = createPromotionalCampaignOrchestrator();
export default runPromotionalCampaign;
