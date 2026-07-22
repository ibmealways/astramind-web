import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import ManifestLoader from "../src/core/manifest/ManifestLoader.js";
import ManifestValidator from "../src/core/manifest/ManifestValidator.js";
import defaultManifest from "../src/core/manifest/defaultManifest.js";
import { KernelBootstrap } from "../src/core/kernel/KernelBootstrap.js";
import { createDynamicConversationPlan } from "../src/core/mission/DynamicConversationPlanner.js";
import { buildProductFormulationProposal, calculateFormulationBatch } from "../src/core/research/ProductFormulationEngine.js";
import { generateLocalContentLabDialogue } from "../src/core/research/ContentLabDialogueFallback.js";
import { generateLocalFinanceDialogue } from "../src/core/finance/FinanceDialogueEngine.js";
import { attachResearchSources, buildEvidenceResearchQueries, planResearch, validateResearchSources } from "../src/core/research/ResearchPipeline.js";
import { createChatRouter } from "../src/server/routes/chatRoutes.js";
import { composeAudioProject, inferCompositionBrief } from "../src/core/audio/AudioCompositionEngine.js";
import { buildWaveformBuffer } from "../src/core/audio/AstraMindWaveformProvider.js";
import { extractLyricTheme, generateLocalLyrics } from "../src/core/audio/LocalLyricEngine.js";
import { buildElevenLabsCompositionPlan, splitLyricsIntoSections } from "../src/core/audio/ElevenLabsMusicProvider.js";
import { createFullVideoGenerationPlan, summarizeFullVideoResult } from "../src/core/video/FullVideoGenerationOS.js";
import { buildNativeVideoRequest, cancelNativeVideoJob, generateNativeVideoClip, getNativeVideoHealth } from "../src/core/video/AstraMindNativeVideoProvider.js";
import fs from "fs";
import os from "os";
import path from "path";

const clone = (value) => JSON.parse(JSON.stringify(value));

test("AstraMind native video request keeps generation on the self-hosted worker contract", () => {
  const request = buildNativeVideoRequest({
    prompt:"A continuous cinematic flight through the AstraMind realm",
    duration:7,
    width:1280,
    height:720,
    continuity:{ sceneId:"scene-2", previousShot:"shot-1" },
    settings:{ backend:"ltx", model:"test/ltx" },
  });
  assert.equal(request.backend, "ltx");
  assert.equal(request.model, "test/ltx");
  assert.equal(request.durationSeconds, 7);
  assert.equal(request.continuity.previousShot, "shot-1");
  assert.equal(request.image, null);
});

test("AstraMind native provider persists a completed worker artifact", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "astramind-native-video-"));
  const outputPath = path.join(directory, "clip.mp4");
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/v1/video/generations")) {
      return new Response(JSON.stringify({ ok:true, id:"native-job-1", status:"completed", backend:"ltx", model:"test/ltx", videoBase64:Buffer.from("native-mp4").toString("base64") }), { status:202 });
    }
    throw new Error(`Unexpected native worker URL: ${url}`);
  };
  try {
    const result = await generateNativeVideoClip({ prompt:"Native motion", outputPath, fetchImpl, settings:{ endpoint:"http://native.test", backend:"ltx", model:"test/ltx" } });
    assert.equal(result.taskId, "native-job-1");
    assert.equal(fs.readFileSync(outputPath, "utf8"), "native-mp4");
  } finally {
    fs.rmSync(directory, { recursive:true, force:true });
  }
});

test("AstraMind native provider reports unavailable GPU workers without throwing", async () => {
  const health = await getNativeVideoHealth({ fetchImpl:async () => { throw new Error("connection refused"); }, settings:{ endpoint:"http://127.0.0.1:8189" } });
  assert.equal(health.ready, false);
  assert.equal(health.code, "NATIVE_WORKER_UNAVAILABLE");
});

test("AstraMind native provider sends authenticated cancellation to its worker", async () => {
  let request = null;
  const result = await cancelNativeVideoJob("native-job-2", {
    settings:{ endpoint:"http://native.test", token:"private-test-token" },
    fetchImpl:async (url, options) => {
      request = { url:String(url), options };
      return new Response(JSON.stringify({ ok:true, id:"native-job-2", status:"cancel_requested" }), { status:200 });
    },
  });
  assert.equal(result.cancelled, true);
  assert.equal(request.url, "http://native.test/v1/video/generations/native-job-2/cancel");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer private-test-token");
});

test("Full Video OS decomposes long missions into a resumable continuity graph", () => {
  const plan = createFullVideoGenerationPlan({
    projectId:"video-test-1",
    topic:"Launch AstraMind through a continuous cinematic realm",
    platform:"YouTube",
    durationTarget:90,
    style:"interdimensional cinematic",
  });
  assert.equal(plan.id, "video-test-1");
  assert.equal(plan.algorithm, "Continuity Render Graph");
  assert.equal(plan.profile.aspectRatio, "16:9");
  assert.equal(plan.graph.shots.length, 12);
  assert.equal(plan.graph.shots[1].dependsOn[0], "shot-01");
  assert.equal(plan.recovery.resumeFromLastCompletedStage, true);
  assert.ok(plan.contracts.includes("Audio & Music Studio"));
  assert.equal(plan.providerPolicy.preferred, "astramind-native");
  assert.deepEqual(plan.providerPolicy.fallbackOrder, ["astramind-native", "fallback-motion"]);
});

test("Full Video OS extracts the final artifact from the existing render contract", () => {
  const summary = summarizeFullVideoResult({
    ok:true,
    stage:"pipeline-complete",
    outputs:{ render:{ videoUrl:"/server-renders/final.mp4", outputPath:"server-renders/final.mp4" } },
  });
  assert.equal(summary.videoUrl, "/server-renders/final.mp4");
  assert.equal(summary.outputPath, "server-renders/final.mp4");
});

test("ElevenLabs Music plan preserves saved lyrics as timed vocal sections", () => {
  const lyrics = "[Verse 1]\nSunrise breaking on a two-lane road\nTruth in my word\n\n[Chorus]\nLove is the reason I stand my ground";
  const blocks = splitLyricsIntoSections(lyrics);
  assert.deepEqual(blocks.map(({ name }) => name), ["Verse 1", "Chorus"]);
  const plan = buildElevenLabsCompositionPlan({
    durationSeconds: 60,
    genre: "Country Rap",
    mood: "Uplifting",
    bpm: 120,
    key: "A minor",
    lyrics: { text: lyrics },
    tracks: [{ name: "Acoustic Guitar", type: "instrument" }, { name: "Vocals", type: "vocal" }],
  }, { vocalStyle: "warm expressive male lead vocalist" });
  assert.equal(plan.chunks.length, 2);
  assert.match(plan.chunks[0].text, /Sunrise breaking/);
  assert.ok(plan.chunks[0].positive_styles.includes("Country Rap"));
  assert.ok(plan.chunks[0].positive_styles.includes("warm expressive male lead vocalist"));
  assert.equal(plan.chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0), 60000);
});

function degreaserExperiment() {
  return {
    id: "experiment-degreaser-1",
    title: "Biodegradable restaurant degreaser",
    question: "Develop a governed biodegradable industrial degreaser baseline.",
    hypothesis: "A neutral aqueous surfactant system may provide a safer comparison baseline.",
    formulationProposal: buildProductFormulationProposal({ objective: "Develop a biodegradable industrial degreaser" }),
    citations: [],
  };
}

async function withChatServer(options, run) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/chat", createChatRouter({
    memoryStore: { rememberExchange() {} },
    approvalStore: {},
    artifactStore: {},
    ...options,
  }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("system manifest loads as an immutable, valid contract catalog", () => {
  const manifest = new ManifestLoader().load(defaultManifest);
  assert.equal(new ManifestValidator().validate(manifest).valid, true);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.authorities), true);
  assert.ok(manifest.capabilities.some(({ id }) => id === "workflow.execute"));
});

test("manifest validation rejects duplicate authority contracts", () => {
  const invalid = clone(defaultManifest);
  invalid.authorities.push(clone(invalid.authorities[0]));
  const result = new ManifestValidator().validate(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate authorities id")));
});

test("kernel boots and executes the workflow contract", async () => {
  const bootstrap = new KernelBootstrap({ workflowHandler: async ({ mission, input }) => ({ ok: true, mission, echoed: input.value }) });
  const kernel = await bootstrap.boot();
  const health = await kernel.health();
  const result = await kernel.executeMission({ mission: "contract.restore", input: { value: "online" } });
  assert.equal(health.healthy, true);
  assert.equal(result.mission.status, "completed");
  assert.equal(result.data.echoed, "online");
});

test("dynamic research missions retain the governed Research OS plan", () => {
  const planning = createDynamicConversationPlan({
    classification: { intent: { primaryAgent: "research", workflow: "product_research" } },
    input: { message: "Research biodegradable degreasers" },
  });
  assert.equal(planning.template, "research-os-v1");
  assert.equal(planning.plan.at(-1).capability, "workflow.execute");
  assert.ok(planning.plan.some(({ capability }) => capability === "research.validate"));
});

test("governed formulation preserves a 100 percent mass balance when scaled", () => {
  const proposal = buildProductFormulationProposal({ objective: "Biodegradable industrial degreaser", batchSizeGrams: 1000 });
  const scaled = calculateFormulationBatch(proposal.components, 5000);
  assert.equal(proposal.totalPercentage, 100);
  assert.equal(scaled.reduce((sum, component) => sum + component.grams, 0), 5000);
  assert.equal(scaled.find(({ id }) => id === "citrate").grams, 75);
});

test("local Content Lab dialogue explains named ingredients without claiming validation", () => {
  const result = generateLocalContentLabDialogue({
    message: "Why was sodium citrate selected and what must pass before increasing it?",
    experiment: degreaserExperiment(),
  });
  assert.equal(result.provider, "astramind-local");
  assert.equal(result.fallback, true);
  assert.match(result.text, /Why Sodium citrate is in the baseline/i);
  assert.match(result.text, /not proof/i);
  assert.match(result.text, /Gate before increasing/i);
});

test("local Content Lab dialogue calculates requested research batch quantities", () => {
  const result = generateLocalContentLabDialogue({ message: "Scale the saved candidate to a 5 kg research batch.", experiment: degreaserExperiment() });
  assert.match(result.text, /5 kg/i);
  assert.match(result.text, /Sodium citrate: 1.5% \(75 g\)/i);
  assert.match(result.text, /100% and 5000 g total/i);
});

test("volume scaling recognizes gallons but withholds quantities until density is measured", () => {
  const result = generateLocalContentLabDialogue({ message: "Scale this to a 5 gallon bucket.", experiment: degreaserExperiment() });
  assert.match(result.text, /Measured density required/i);
  assert.match(result.text, /5 US liquid gallons/i);
  assert.match(result.text, /18,927\.059 mL/i);
  assert.match(result.text, /issued no ingredient quantities/i);
  assert.doesNotMatch(result.text, /Governed batch calculation: 100 g/i);
});

test("volume scaling converts gallons with a creator-reported measured density", () => {
  const result = generateLocalContentLabDialogue({
    message: "Measured density is 1.02 g/mL at 20 C. Scale to 5 gallons.",
    experiment: degreaserExperiment(),
  });
  assert.match(result.text, /Governed volume-to-mass calculation/i);
  assert.match(result.text, /Measured density:\*\* 1\.02 g\/mL/i);
  assert.match(result.text, /Target batch mass:\*\* 19,305\.6 g/i);
  assert.match(result.text, /Sodium citrate: 1\.5% \(289\.58 g\)/i);
});

test("volume scaling recognizes liters and fluid ounces", () => {
  const liters = generateLocalContentLabDialogue({ message: "Scale to 10 liters.", experiment: degreaserExperiment() });
  const ounces = generateLocalContentLabDialogue({ message: "Scale to 64 fluid ounces.", experiment: degreaserExperiment() });
  assert.match(liters.text, /10 liters \(10,000 mL\)/i);
  assert.match(ounces.text, /64 US fluid ounces \(1,892\.706 mL\)/i);
});

test("Evidence Governance v2 creates focused lanes and rejects community claims", () => {
  const objective = "Research chemical safety SDS GHS biodegradability wastewater for a degreaser";
  const lanes = buildEvidenceResearchQueries(objective);
  assert.ok(lanes.length >= 5);
  let state = planResearch(objective);
  state = attachResearchSources(state, [
    { title: "Safer Choice Standard", url: "https://www.epa.gov/saferchoice/standard", description: "Safer chemical ingredient and environmental criteria for cleaning products." },
    { title: "Forum formula", url: "https://www.reddit.com/r/chemistry/example", description: "An anonymous degreaser formula discussion." },
  ]);
  state = validateResearchSources(state);
  assert.equal(state.research.sources.length, 2);
  assert.equal(state.research.sources.find(({ sourceType }) => sourceType === "community").validation.valid, false);
});

test("local Finance dialogue calculates cash flow and an emergency-fund path", () => {
  const result = generateLocalFinanceDialogue({
    message: "Build a three-month emergency fund plan.",
    transactions: [
      { category: "Income", description: "Monthly income", amount: 5000 },
      { category: "Expense", description: "Rent", amount: -1800 },
      { category: "Expense", description: "Utilities and food", amount: -1200 },
    ],
    context: { cash: 1000 },
  });
  assert.equal(result.providerRequired, false);
  assert.equal(result.summary.net, 2000);
  assert.match(result.reply, /3-month emergency-fund path/i);
  assert.match(result.reply, /Modeled target: \*\*\$9,000\*\*/i);
  assert.match(result.reply, /Remaining gap: \*\*\$8,000\*\*/i);
});

test("local Finance dialogue evaluates a stated trip target against ledger surplus", () => {
  const result = generateLocalFinanceDialogue({
    message: "Can I afford a $2,500 trip in four months?",
    transactions: [
      { category: "Income", amount: 4000 },
      { category: "Expense", amount: 3000 },
    ],
  });
  assert.match(result.reply, /Trip affordability: \$2,500 in 4 months/i);
  assert.match(result.reply, /Required monthly trip deposit: \*\*\$625\*\*/i);
  assert.match(result.reply, /Feasible from the recorded cash flow/i);
});

test("Content Lab dialogue route returns configured intelligence when available", async () => {
  await withChatServer({ intelligenceResponder: async () => ({ text: "Provider-backed governed answer", provider: "test", model: "test-model", gateway: "test-gateway" }) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/chat/lab-dialogue`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-memory-user-id": "test-user" },
      body: JSON.stringify({ message: "What is the next gate?", experiment: degreaserExperiment(), history: [] }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.reply, "Provider-backed governed answer");
    assert.equal(body.intelligence.fallback, false);
  });
});

test("Content Lab dialogue route falls back locally when cloud providers are exhausted", async () => {
  const unavailable = Object.assign(new Error("All configured providers unavailable"), { code: "INTELLIGENCE_PROVIDERS_EXHAUSTED", status: 503 });
  await withChatServer({ intelligenceResponder: async () => { throw unavailable; } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/chat/lab-dialogue`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-memory-user-id": "test-user" },
      body: JSON.stringify({ message: "Why is sodium citrate included?", experiment: degreaserExperiment(), history: [] }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.intelligence.provider, "astramind-local");
    assert.equal(body.intelligence.fallback, true);
    assert.match(body.reply, /governed local Content Lab engine/i);
  });
});

test("Music Studio infers Country Rap from a single prompt", () => {
  const brief = inferCompositionBrief({
    prompt: "Create an uplifting country rap anthem at 96 BPM for a two minute launch video.",
    genre: "Auto",
  });
  assert.equal(brief.genre, "Country Rap");
  assert.equal(brief.bpm, 96);
  assert.equal(brief.durationSeconds, 120);
});

test("Music Studio honors creator-selected instruments and prepares a video intent", () => {
  const session = composeAudioProject({
    prompt: "A hopeful country rap song about building a better future.",
    genre: "Country Rap",
    lyricsMode: "manual",
    lyricsText: "We build tomorrow one brave step at a time.",
    instrumentMode: "manual",
    selectedInstruments: ["Drums", "Trumpet", "Piano", "Electric Guitar", "Bass", "Treble Synth"],
    generateVideo: true,
  });
  assert.equal(session.genre, "Country Rap");
  assert.deepEqual(session.tracks.map(({ name }) => name), ["Drums", "Trumpet", "Piano", "Electric Guitar", "Bass", "Treble Synth", "Vocals"]);
  assert.equal(session.videoIntent.status, "ready-for-video-studio");
  assert.match(session.lyrics.text, /build tomorrow/i);
});

test("AstraMind native waveform provider produces a valid playable WAV", () => {
  const session = composeAudioProject({
    prompt: "Create a Country Rap instrumental preview.",
    genre: "Country Rap",
    lyricsMode: "instrumental",
    instrumentMode: "manual",
    selectedInstruments: ["Drums", "Bass", "Piano", "Trumpet"],
  });
  const rendered = buildWaveformBuffer(session, { durationSeconds: 1, sampleRate: 8000 });
  assert.equal(rendered.buffer.subarray(0,4).toString("ascii"), "RIFF");
  assert.equal(rendered.buffer.subarray(8,12).toString("ascii"), "WAVE");
  assert.equal(rendered.buffer.length, 44 + (8000 * 2));
});

test("local lyric v2 extracts the subject without leaking composition instructions", () => {
  const prompt = "Generate a Country Rap describing conservative values and how love has everything to do with it at 120 BPM.";
  const theme = extractLyricTheme(prompt);
  const result = generateLocalLyrics({ prompt, genre:"Country Rap", structure:"Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Final Chorus" });
  assert.deepEqual(theme.keywords, ["conservative", "values", "love"]);
  assert.equal(result.suggestedTitle, "Love Stands Ground");
  assert.doesNotMatch(result.lyrics, /generate|describing|country rap|120\s*bpm/i);
  assert.match(result.lyrics, /\[Pre-Chorus\]\nNo matter how far these wheels may roll/i);
  assert.match(result.lyrics, /Love is the reason I stand my ground/i);
});

test("local lyric v2 keeps non-heading lines within a singable phrase range", () => {
  const result = generateLocalLyrics({ prompt:"Write an uplifting song about overcoming adversity and building a better future.", genre:"Pop" });
  const lyricLines=result.lyrics.split("\n").filter((line)=>line&&!line.startsWith("["));
  assert.ok(lyricLines.length >= 20);
  assert.ok(lyricLines.every((line)=>line.split(/\s+/).length >= 5&&line.split(/\s+/).length <= 14));
});
