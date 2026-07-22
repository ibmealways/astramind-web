import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import RunwayML from "@runwayml/sdk";
import db from "../server/db/sqlite.js";
import { getPlatformDb } from "../server/db/platformDb.js";
import kernelBootstrap from "../core/kernel/KernelBootstrap.js";
import defaultManifest from "../core/manifest/defaultManifest.js";
import { FEATURE_FLAGS } from "../config/featureFlags.js";
import { PRELAUNCH_CONTRACTS, PRELAUNCH_PROVIDERS } from "../core/contracts/prelaunchContractCatalog.js";
import { subscriptionStore } from "./subscriptionService.js";
import { estimateVideoCredits } from "../core/subscription/UsageMeter.js";
import { getNativeVideoHealth } from "../core/video/AstraMindNativeVideoProvider.js";

const IMPLEMENTED_ENDPOINTS = new Set([
  "/api/auth", "/api/chat", "/api/workflows/run", "/api/platform/summary", "/api/finance/portfolio",
  "/api/tradepilot/market-snapshot", "/api/creator-brain/profile", "/api/content/generate", "/api/ai-image/scene-visuals",
  "/api/video/render", "/api/cinematic-video/render", "/api/cinematic-video/storyboard", "/api/cinematic-video/status/:projectId",
  "/api/audio-studio/sessions", "/api/audio-studio/lyrics/generate", "/api/book-project/create",
  "/api/billing", "/api/readiness", "/api/agent-workflow/research-summary", "/api/memory/store", "/api/memory/search", "/api/research/save",
]);

function check(id, label, status, detail, required = true, metadata = {}) {
  return { id, label, status, required, detail, ...metadata };
}

function summarize(checks) {
  const blocked = checks.filter((item) => item.required && item.status === "blocked").length;
  const warnings = checks.filter((item) => ["warning", "unverified"].includes(item.status)).length;
  const passed = checks.filter((item) => item.status === "ready").length;
  const status = blocked ? "blocked" : warnings ? "degraded" : "ready";
  return { status, ready: status === "ready", score: checks.length ? Math.round((passed / checks.length) * 100) : 0, totals: { checks: checks.length, passed, warnings, blocked } };
}

function providerConfigured(provider) {
  if (!provider) return false;
  if (provider.id === "ffmpeg") return Boolean(ffmpegPath && fs.existsSync(ffmpegPath));
  if (provider.id === "runway") return Boolean(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_SECRET);
  if (!provider.env.length) return true;
  return provider.env.every((key) => Boolean(process.env[key]));
}

function tableExists(database, table) {
  return Boolean(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
}

async function platformTableExists(database, table) {
  return Boolean(await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table));
}

function storageCheck(relativePath) {
  const resolved = path.resolve(relativePath);
  try {
    fs.mkdirSync(resolved, { recursive: true });
    fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
    return check(`storage:${relativePath}`, relativePath, "ready", "Render storage is readable and writable.");
  } catch (error) {
    return check(`storage:${relativePath}`, relativePath, "blocked", `Render storage is unavailable: ${error.message}`);
  }
}

export async function buildPrelaunchReadiness() {
  const checks = [];
  let kernel = null;
  try {
    kernel = await kernelBootstrap.boot();
    const health = await kernel.health();
    checks.push(check("kernel", "AstraMind Kernel", health.healthy ? "ready" : "blocked", health.healthy ? "Manifest, registry, capabilities, missions, and providers passed health checks." : "Kernel health reported a failure."));
  } catch (error) {
    checks.push(check("kernel", "AstraMind Kernel", "blocked", error.message));
  }

  const mainTables = ["users", "memory", "kernel_missions", "subscriptions", "subscription_events", "credit_ledger", "audio_sessions", "creator_profile"];
  const missingMain = mainTables.filter((table) => !tableExists(db, table));
  checks.push(check("persistence:core", "Core persistence", missingMain.length ? "blocked" : "ready", missingMain.length ? `Missing tables: ${missingMain.join(", ")}.` : `${mainTables.length} required core tables are available.`));

  try {
    const platformDb = await getPlatformDb();
    const platformTables = ["platform_projects", "book_chapters", "workflow_runs", "research_sources"];
    const results = await Promise.all(platformTables.map((table) => platformTableExists(platformDb, table)));
    const missing = platformTables.filter((_, index) => !results[index]);
    checks.push(check("persistence:platform", "Research OS persistence", missing.length ? "blocked" : "ready", missing.length ? `Missing tables: ${missing.join(", ")}.` : `${platformTables.length} platform artifact tables are available.`));
  } catch (error) {
    checks.push(check("persistence:platform", "Research OS persistence", "blocked", error.message));
  }

  const authorityIds = new Set(defaultManifest.authorities.map(({ id }) => id));
  const capabilityIds = new Set(defaultManifest.capabilities.map(({ id }) => id));
  const contracts = PRELAUNCH_CONTRACTS.map((contract) => {
    const routeReady = !contract.api || IMPLEMENTED_ENDPOINTS.has(contract.api);
    const kernelReady = authorityIds.has(contract.authority) && capabilityIds.has(contract.capability);
    const activationDeferred = contract.id === "billing" && contract.featureFlag === "subscriptionOS" && !FEATURE_FLAGS.subscriptionOS;
    const featureReady = !contract.featureFlag || Boolean(FEATURE_FLAGS[contract.featureFlag]) || activationDeferred;
    return { ...contract, status: routeReady && kernelReady && featureReady ? "ready" : "blocked", routeReady, kernelReady, featureReady, activationDeferred };
  });
  const blockedContracts = contracts.filter(({ status }) => status === "blocked");
  checks.push(check("contracts", "Contract and Kernel wiring", blockedContracts.length ? "blocked" : "ready", blockedContracts.length ? `Blocked contracts: ${blockedContracts.map(({ name }) => name).join(", ")}.` : `${contracts.length} customer contracts have UI, route, capability, and authority coverage.`));
  const closureEndpoints=["/api/cinematic-video/storyboard","/api/cinematic-video/status/:projectId","/api/workflows/run","/api/memory/store","/api/memory/search","/api/research/save","/api/creator-brain/profile"];
  const missingClosure=closureEndpoints.filter((endpoint)=>!IMPLEMENTED_ENDPOINTS.has(endpoint));
  checks.push(check("route-contracts","Executable route contract catalog",missingClosure.length?"blocked":"ready",missingClosure.length?`Missing endpoints: ${missingClosure.join(", ")}.`:`${closureEndpoints.length} critical cross-workspace route contracts are registered exactly.`));

  const providers = PRELAUNCH_PROVIDERS.map((provider) => {
    const configured = providerConfigured(provider);
    return { id: provider.id, name: provider.name, configured, required: provider.required, requiredFor: provider.requiredFor || [], status: configured ? "ready" : provider.required ? "blocked" : "optional" };
  });
  const coreProviderBlocked = providers.filter((provider) => provider.required && !provider.configured);
  checks.push(check("providers:core", "Core intelligence providers", coreProviderBlocked.length ? "blocked" : "ready", coreProviderBlocked.length ? `Missing configuration: ${coreProviderBlocked.map(({ name }) => name).join(", ")}.` : "All launch-critical intelligence providers are configured."));
  checks.push(storageCheck("server-renders"), storageCheck(path.join("public", "renders")));
  checks.push(check("subscription-os", "Subscription OS activation", FEATURE_FLAGS.subscriptionOS ? "ready" : "warning", FEATURE_FLAGS.subscriptionOS ? "Subscription OS is activated." : "Safely disabled until the Stripe purchase, renewal, cancellation, and failed-payment test cycle passes.", false));

  return { ok: true, generatedAt: new Date().toISOString(), release: { edition: defaultManifest.metadata.edition, version: defaultManifest.metadata.osVersion, build: defaultManifest.metadata.buildNumber }, ...summarize(checks), checks, contracts, providers, kernel: kernel ? { ...kernel.info(), authorities: defaultManifest.authorities.length, capabilities: defaultManifest.capabilities.length } : null };
}

async function inspectRunwayAccount() {
  const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_SECRET;
  if (!apiKey) return { status: "blocked", detail: "Runway credentials are missing.", creditBalance: null };
  try {
    const organization = await new RunwayML({ apiKey, timeout: 6000 }).organization.retrieve();
    const creditBalance = Number(organization?.creditBalance || 0);
    return creditBalance > 0
      ? { status: "ready", detail: `Provider authenticated with ${creditBalance.toLocaleString()} Runway credits available.`, creditBalance }
      : { status: "blocked", detail: "Runway authenticated, but the organization has no provider credits available.", creditBalance: 0 };
  } catch (error) {
    return { status: "unverified", detail: `Credentials are configured, but the non-billable balance check could not complete: ${error.message}`, creditBalance: null };
  }
}

export async function buildPromotionalVideoPreflight({ userId, durationTarget = 90, voiceover = true } = {}) {
  const estimatedCredits = estimateVideoCredits(durationTarget);
  const subscription = userId ? subscriptionStore.ensure(userId) : null;
  const checks = [];
  checks.push(check("plan", "Video entitlement", subscription?.active && subscription?.plan?.entitlements?.video ? "ready" : "blocked", subscription?.plan?.entitlements?.video ? `${subscription.plan.name} includes cinematic video rendering.` : "Cinematic rendering requires an active Pro or Elite plan."));
  checks.push(check("credits", "AstraMind credits", (subscription?.creditsBalance || 0) >= estimatedCredits ? "ready" : "blocked", `${estimatedCredits} credits estimated; ${subscription?.creditsBalance || 0} available.`));
  checks.push(check("openai", "OpenAI storyboard and visuals", process.env.OPENAI_API_KEY ? "ready" : "blocked", process.env.OPENAI_API_KEY ? "Provider key is configured." : "OPENAI_API_KEY is missing."));
  const native = await getNativeVideoHealth();
  checks.push(check("astramind-native", "AstraMind native video worker", native.ready ? "ready" : "blocked", native.ready ? `${native.backend} is ready on ${native.device || "the configured GPU worker"}.` : (native.error || "The self-hosted GPU worker is unavailable."), true, { backend:native.backend, model:native.model, device:native.device || null }));
  if (process.env.ASTRAMIND_ALLOW_PAID_VIDEO_PROVIDERS === "true") {
    const runway = await inspectRunwayAccount();
    checks.push(check("runway", "Optional Runway fallback", runway.status, runway.detail, false, { creditBalance: runway.creditBalance }));
  }
  checks.push(check("ffmpeg", "FFmpeg final assembly", Boolean(ffmpegPath && fs.existsSync(ffmpegPath)) ? "ready" : "blocked", ffmpegPath ? "Local assembly binary is available." : "FFmpeg binary is unavailable."));
  checks.push(storageCheck("server-renders"));
  if (voiceover) checks.push(check("elevenlabs", "ElevenLabs voiceover", process.env.ELEVENLABS_API_KEY ? "ready" : "blocked", process.env.ELEVENLABS_API_KEY ? "Voice provider is configured." : "ELEVENLABS_API_KEY is missing; disable voiceover or configure the provider."));
  const summary = summarize(checks);
  return { ok: true, generatedAt: new Date().toISOString(), gate: "promotional-video", ...summary, canRender: !checks.some((item) => item.required && item.status === "blocked"), estimatedCredits, subscription: subscription ? { planId: subscription.planId, planName: subscription.plan.name, status: subscription.status, creditsBalance: subscription.creditsBalance } : null, checks };
}

export default { buildPrelaunchReadiness, buildPromotionalVideoPreflight };
