// src/server/routes/developerApiRoutes.js
import express from "express";

import {
  API_PLANS,
  DEFAULT_API_PLAN,
  USAGE_EVENT_TYPES,
  PROVIDERS,
  getDeveloperPlan,
  getPublicPlanCatalog,
  getCreditCost,
  canUseFeature,
} from "../../core/platform/developerPlans.js";

import {
  createDeveloper,
  updateDeveloper,
  createApiKey,
  listApiKeys,
  listDevelopers,
  getDeveloper,
  revokeApiKey,
  rotateApiKey,
  validateApiKey,
  extractApiKeyFromRequest,
  requireApiKey,
  createDefaultOwnerKey,
} from "../../core/platform/apiKeyManager.js";

import {
  addCredits,
  resetMonthlyCredits,
  checkRateLimit,
  preflightUsage,
  recordUsage,
  getUsageSummary,
  listDeveloperUsage,
  suspendDeveloper,
  reactivateDeveloper,
} from "../../core/platform/usageMeter.js";

import {
  checkPlatformRateLimit,
  getRateLimitStats,
  clearRateLimitWindows,
} from "../../core/platform/rateLimiter.js";

import {
  enqueueRender,
  getRenderJob,
  listRenderJobs,
  cancelRenderJob,
  getQueueStats,
  JOB_PRIORITY,
} from "../../core/video/renderQueue.js";

import {
  startJobWorker,
  stopJobWorker,
  runWorkerOnce,
  getJobWorkerState,
  recoverStuckJobs,
} from "../../core/platform/jobWorkerEngine.js";

import {
  getBillingPlanCatalog,
  listCreditPacks,
  estimateUsageCharge,
  getDeveloperBillingSummary,
  getBillingLedger,
} from "../../core/platform/billingMeter.js";

import { generateAIStoryboard } from "../../core/video/aiStoryboardBrain.js";
import {
  renderCinematicVideo,
  getCinematicHealth,
} from "../../core/video/cinematicRenderEngine.js";
import { getAIVideoGenerationHealth } from "../../core/video/aiVideoGenerationBuilder.js";

const router = express.Router();

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getRequestIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

function getRequestOrigin(req) {
  return req.headers.origin || req.headers.referer || "";
}

function isOwnerRequest(req) {
  const ownerSecret =
    process.env.ASTRAMIND_OWNER_SECRET ||
    process.env.ADMIN_API_SECRET;

  const supplied =
    req.headers["x-astramind-owner-secret"] ||
    req.headers["x-admin-secret"] ||
    "";

  return Boolean(ownerSecret && supplied && supplied === ownerSecret);
}

function ownerOnly(req, res, next) {
  if (isOwnerRequest(req)) return next();

  const apiKey = extractApiKeyFromRequest(req);
  const validation = validateApiKey({
    apiKey,
    requiredScope: "admin:*",
    origin: getRequestOrigin(req),
    ip: getRequestIp(req),
  });

  if (validation.ok && validation.plan === API_PLANS.ENTERPRISE) {
    req.astramindDeveloper = validation.developer;
    req.astramindDeveloperId = validation.developerId;
    req.astramindApiKey = validation.apiKey;
    req.astramindPlan = validation.plan;
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: "Forbidden",
    reason: "owner_or_enterprise_admin_required",
  });
}

function developerContext(req) {
  return {
    developerId:
      req.astramindDeveloperId ||
      req.body?.developerId ||
      req.query?.developerId ||
      "anonymous",
    plan:
      req.astramindPlan ||
      req.astramindDeveloper?.plan ||
      req.body?.plan ||
      DEFAULT_API_PLAN,
    mode: req.astramindApiKey?.mode || "test",
    apiKeyId: req.astramindApiKey?.keyId || null,
  };
}

function safeNumber(value, fallback = 1, min = 1, max = 1000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
}

function routeProvider(provider = "") {
  const value = clean(provider).toLowerCase();

  if (value === "runway") return PROVIDERS.RUNWAY;
  if (value === "veo") return PROVIDERS.VEO;
  if (value === "luma") return PROVIDERS.LUMA;
  if (value === "openai") return PROVIDERS.OPENAI;
  if (value === "fallback-motion") return PROVIDERS.FALLBACK_MOTION;

  return PROVIDERS.ASTRAMIND_NATIVE;
}

function respondError(res, status, reason, extra = {}) {
  return res.status(status).json({
    ok: false,
    error: reason,
    reason,
    ...extra,
  });
}

function checkStandaloneRateLimit(req, res, route = "global") {
  const context = developerContext(req);

  const rate = checkPlatformRateLimit({
    identity: context.developerId,
    plan: context.plan,
    route,
    increment: true,
  });

  res.setHeader("X-AstraMind-RateLimit-Minute-Limit", rate.minute.limit ?? "unlimited");
  res.setHeader(
    "X-AstraMind-RateLimit-Minute-Remaining",
    rate.minute.remaining ?? "unlimited"
  );
  res.setHeader("X-AstraMind-RateLimit-Day-Limit", rate.day.limit ?? "unlimited");
  res.setHeader("X-AstraMind-RateLimit-Day-Remaining", rate.day.remaining ?? "unlimited");

  return rate;
}

async function meteredHandler({
  req,
  res,
  eventType,
  provider = PROVIDERS.ASTRAMIND_NATIVE,
  quantity = 1,
  feature = null,
  route = "",
  handler,
}) {
  const context = developerContext(req);

  const platformRate = checkStandaloneRateLimit(req, res, route || eventType);

  if (!platformRate.ok) {
    return respondError(res, 429, "rate_limit_exceeded", {
      rateLimit: platformRate,
    });
  }

  const preflight = preflightUsage({
    developerId: context.developerId,
    plan: context.plan,
    eventType,
    provider,
    quantity,
    feature,
  });

  if (!preflight.ok) {
    const status =
      preflight.reason === "rate_limit_exceeded"
        ? 429
        : preflight.reason === "insufficient_credits"
        ? 402
        : preflight.reason === "feature_not_available_for_plan"
        ? 403
        : 400;

    return respondError(res, status, preflight.reason, { preflight });
  }

  try {
    const result = await handler({ context, preflight });

    const usage = recordUsage({
      developerId: context.developerId,
      plan: context.plan,
      eventType,
      provider,
      quantity,
      feature,
      requestId: req.headers["x-request-id"] || null,
      projectId: result?.projectId || result?.data?.projectId || result?.job?.jobId || null,
      jobId: result?.jobId || result?.job?.jobId || null,
      route,
      status: "success",
      metadata: {
        mode: context.mode,
        ip: getRequestIp(req),
        userAgent: req.headers["user-agent"] || "",
      },
      allowNegative: false,
    });

    return res.json({
      ok: true,
      data: result,
      usage: {
        event: usage.event,
        balance: usage.usage?.credits?.currentBalance,
        plan: usage.usage?.plan,
      },
      rateLimit: platformRate,
    });
  } catch (error) {
    recordUsage({
      developerId: context.developerId,
      plan: context.plan,
      eventType: USAGE_EVENT_TYPES.API_REQUEST,
      provider: PROVIDERS.ASTRAMIND_NATIVE,
      quantity: 1,
      feature: "api.error",
      route,
      status: "error",
      metadata: { message: error.message },
      allowNegative: true,
    });

    return respondError(res, 500, "handler_failed", {
      message: error.message,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLIC                                                                     */
/* -------------------------------------------------------------------------- */

router.get("/health", async (req, res) => {
  res.json({
    ok: true,
    service: "AstraMind Developer API Platform",
    version: "v2-commercial",
    status: "online",
    plans: getPublicPlanCatalog(),
    billing: {
      plans: getBillingPlanCatalog(),
      creditPacks: listCreditPacks().packs,
    },
    queue: getQueueStats(),
    worker: getJobWorkerState(),
    cinematic: getCinematicHealth(),
    videoProviders: await getAIVideoGenerationHealth(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/plans", (req, res) => {
  res.json({
    ok: true,
    plans: getPublicPlanCatalog(),
    billingPlans: getBillingPlanCatalog(),
  });
});

router.get("/plans/:plan", (req, res) => {
  res.json({
    ok: true,
    plan: getDeveloperPlan(req.params.plan),
  });
});

router.get("/pricing/credit-costs", (req, res) => {
  const eventType = req.query.eventType || USAGE_EVENT_TYPES.API_REQUEST;
  const provider = req.query.provider || PROVIDERS.ASTRAMIND_NATIVE;
  const quantity = safeNumber(req.query.quantity || 1, 1, 1, 1000);

  res.json({
    ok: true,
    eventType,
    provider,
    quantity,
    creditCost: getCreditCost(eventType, provider),
    estimate: estimateUsageCharge({ eventType, provider, quantity }),
  });
});

/* -------------------------------------------------------------------------- */
/* ADMIN                                                                      */
/* -------------------------------------------------------------------------- */

router.post("/admin/bootstrap-owner-key", ownerOnly, (req, res) => {
  res.json(createDefaultOwnerKey());
});

router.post("/admin/developers", ownerOnly, (req, res) => {
  const result = createDeveloper({
    developerId: req.body.developerId,
    email: req.body.email,
    name: req.body.name,
    company: req.body.company,
    plan: req.body.plan || DEFAULT_API_PLAN,
    metadata: req.body.metadata || {},
  });

  res.json(result);
});

router.get("/admin/developers", ownerOnly, (req, res) => {
  res.json(listDevelopers());
});

router.get("/admin/developers/:developerId", ownerOnly, (req, res) => {
  res.json(getDeveloper({ developerId: req.params.developerId }));
});

router.patch("/admin/developers/:developerId", ownerOnly, (req, res) => {
  try {
    const result = updateDeveloper({
      developerId: req.params.developerId,
      email: req.body.email,
      name: req.body.name,
      company: req.body.company,
      plan: req.body.plan,
      status: req.body.status,
      settings: req.body.settings,
      billing: req.body.billing,
      metadata: req.body.metadata,
    });

    if (req.body.plan) {
      updateDeveloperPlan({
        developerId: req.params.developerId,
        plan: req.body.plan,
      });
    }

    res.json(result);
  } catch (error) {
    respondError(res, 404, "developer_update_failed", {
      message: error.message,
    });
  }
});

router.post("/admin/developers/:developerId/suspend", ownerOnly, (req, res) => {
  res.json(
    suspendDeveloper({
      developerId: req.params.developerId,
      reason: req.body.reason || "admin_suspend",
    })
  );
});

router.post("/admin/developers/:developerId/reactivate", ownerOnly, (req, res) => {
  res.json(reactivateDeveloper({ developerId: req.params.developerId }));
});

router.post("/admin/developers/:developerId/credits", ownerOnly, (req, res) => {
  res.json(
    addCredits({
      developerId: req.params.developerId,
      credits: req.body.credits,
      reason: req.body.reason || "admin_credit",
      metadata: req.body.metadata || {},
    })
  );
});

router.post("/admin/developers/:developerId/reset-month", ownerOnly, (req, res) => {
  res.json(
    resetMonthlyCredits({
      developerId: req.params.developerId,
      monthKey: req.body.monthKey,
    })
  );
});

router.get("/admin/usage", ownerOnly, (req, res) => {
  res.json(listDeveloperUsage());
});

router.get("/admin/billing", ownerOnly, (req, res) => {
  res.json(getBillingLedger({ limit: safeNumber(req.query.limit, 200, 1, 1000) }));
});

router.get("/admin/billing/:developerId", ownerOnly, (req, res) => {
  res.json(getDeveloperBillingSummary({ developerId: req.params.developerId }));
});

router.get("/admin/rate-limits", ownerOnly, (req, res) => {
  res.json(
    getRateLimitStats({
      identity: req.query.identity || null,
      route: req.query.route || null,
    })
  );
});

router.delete("/admin/rate-limits", ownerOnly, (req, res) => {
  res.json(
    clearRateLimitWindows({
      identity: req.query.identity || null,
      route: req.query.route || null,
    })
  );
});

/* -------------------------------------------------------------------------- */
/* API KEYS                                                                   */
/* -------------------------------------------------------------------------- */

router.post("/admin/api-keys", ownerOnly, (req, res) => {
  const result = createApiKey({
    developerId: req.body.developerId,
    mode: req.body.mode || "test",
    label: req.body.label,
    plan: req.body.plan || DEFAULT_API_PLAN,
    scopes: req.body.scopes || [],
    expiresAt: req.body.expiresAt || null,
    allowedOrigins: req.body.allowedOrigins || [],
    allowedIps: req.body.allowedIps || [],
    metadata: req.body.metadata || {},
  });

  res.json(result);
});

router.get("/admin/api-keys", ownerOnly, (req, res) => {
  res.json(
    listApiKeys({
      developerId: req.query.developerId || null,
      includeRevoked: req.query.includeRevoked === "true",
    })
  );
});

router.post("/admin/api-keys/:keyId/revoke", ownerOnly, (req, res) => {
  res.json(
    revokeApiKey({
      keyId: req.params.keyId,
      reason: req.body.reason || "admin_revoke",
    })
  );
});

router.post("/admin/api-keys/:keyId/rotate", ownerOnly, (req, res) => {
  res.json(
    rotateApiKey({
      keyId: req.params.keyId,
      label: req.body.label,
      expiresAt: req.body.expiresAt,
      metadata: req.body.metadata || {},
    })
  );
});

router.post("/keys/validate", (req, res) => {
  const apiKey = extractApiKeyFromRequest(req);

  const result = validateApiKey({
    apiKey,
    requiredScope: req.body.requiredScope || "",
    origin: getRequestOrigin(req),
    ip: getRequestIp(req),
    touch: false,
  });

  res.status(result.ok ? 200 : 401).json(result);
});

/* -------------------------------------------------------------------------- */
/* DEVELOPER SELF SERVICE                                                     */
/* -------------------------------------------------------------------------- */

router.get("/me", requireApiKey("developer:read"), (req, res) => {
  res.json({
    ok: true,
    developer: req.astramindDeveloper,
    apiKey: req.astramindApiKey,
    usage: getUsageSummary({
      developerId: req.astramindDeveloperId,
      plan: req.astramindPlan,
    }),
    billing: getDeveloperBillingSummary({
      developerId: req.astramindDeveloperId,
    }),
  });
});

router.get("/me/usage", requireApiKey("usage:read"), (req, res) => {
  res.json(
    getUsageSummary({
      developerId: req.astramindDeveloperId,
      plan: req.astramindPlan,
    })
  );
});

router.get("/me/billing", requireApiKey("billing:read"), (req, res) => {
  res.json(getDeveloperBillingSummary({ developerId: req.astramindDeveloperId }));
});

/* -------------------------------------------------------------------------- */
/* USAGE                                                                      */
/* -------------------------------------------------------------------------- */

router.post("/usage/preflight", requireApiKey("usage:preflight"), (req, res) => {
  const context = developerContext(req);

  const result = preflightUsage({
    developerId: context.developerId,
    plan: context.plan,
    eventType: req.body.eventType || USAGE_EVENT_TYPES.API_REQUEST,
    provider: req.body.provider || PROVIDERS.ASTRAMIND_NATIVE,
    quantity: safeNumber(req.body.quantity, 1, 1, 1000),
    feature: req.body.feature || null,
  });

  res.status(result.ok ? 200 : 402).json(result);
});

router.post("/usage/record", requireApiKey("usage:write"), (req, res) => {
  const context = developerContext(req);

  const result = recordUsage({
    developerId: context.developerId,
    plan: context.plan,
    eventType: req.body.eventType || USAGE_EVENT_TYPES.API_REQUEST,
    provider: req.body.provider || PROVIDERS.ASTRAMIND_NATIVE,
    quantity: safeNumber(req.body.quantity, 1, 1, 1000),
    feature: req.body.feature || null,
    requestId: req.body.requestId || null,
    projectId: req.body.projectId || null,
    jobId: req.body.jobId || null,
    route: req.body.route || "/developer/usage/record",
    status: req.body.status || "success",
    metadata: req.body.metadata || {},
    allowNegative: Boolean(req.body.allowNegative),
  });

  res.status(result.ok ? 200 : 402).json(result);
});

router.get("/usage/rate-limit", requireApiKey("usage:read"), (req, res) => {
  const context = developerContext(req);

  res.json(
    checkRateLimit({
      developerId: context.developerId,
      plan: context.plan,
      eventType: req.query.eventType || USAGE_EVENT_TYPES.API_REQUEST,
    })
  );
});

/* -------------------------------------------------------------------------- */
/* STORYBOARD                                                                 */
/* -------------------------------------------------------------------------- */

router.post("/storyboard/create", requireApiKey("storyboard:create"), async (req, res) => {
  return meteredHandler({
    req,
    res,
    eventType: USAGE_EVENT_TYPES.STORYBOARD_CREATE,
    provider: PROVIDERS.OPENAI,
    quantity: 1,
    feature: "canUseStoryboardApi",
    route: "/developer/storyboard/create",
    handler: async () => {
      const topic = clean(req.body.topic || req.body.prompt || "");
      if (!topic) throw new Error("topic or prompt is required.");

      return generateAIStoryboard({
        topic,
        platform: req.body.platform || "TikTok",
        style: req.body.style || "cinematic futuristic high-energy",
        durationTarget: req.body.durationTarget || 30,
        allowFallback: true,
      });
    },
  });
});

/* -------------------------------------------------------------------------- */
/* VIDEO: QUEUE + DIRECT                                                      */
/* -------------------------------------------------------------------------- */

router.post("/video/render", requireApiKey("video:render"), async (req, res) => {
  const asyncMode = req.body.async !== false;

  if (asyncMode) {
    return handleQueuedRender(req, res);
  }

  return handleDirectRender(req, res);
});

async function handleQueuedRender(req, res) {
  const providerName =
    req.body.aiVideoProvider ||
    req.body.provider ||
    process.env.AI_VIDEO_PROVIDER ||
    "fallback-motion";

  const provider = routeProvider(providerName);
  const sceneCount = safeNumber(req.body.sceneCount || 5, 5, 1, 20);
  const context = developerContext(req);

  return meteredHandler({
    req,
    res,
    eventType: USAGE_EVENT_TYPES.VIDEO_RENDER_FULL,
    provider,
    quantity: sceneCount,
    feature: "canUseFullRenderApi",
    route: "/developer/video/render:queued",
    handler: async ({ context: innerContext }) => {
      const topic = clean(req.body.topic || req.body.prompt || "");
      if (!topic) throw new Error("topic or prompt is required.");

      const plan = getDeveloperPlan(innerContext.plan);

      if (sceneCount > plan.limits.maxScenesPerVideo) {
        throw new Error(
          `Scene count exceeds plan limit. Requested ${sceneCount}, max ${plan.limits.maxScenesPerVideo}.`
        );
      }

      if (providerName === "runway" && !canUseFeature(innerContext.plan, "canUseRunwayProvider")) {
        throw new Error("Runway provider is not available on this plan.");
      }

      if (providerName === "veo" && !canUseFeature(innerContext.plan, "canUseVeoProvider")) {
        throw new Error("Veo provider is not available on this plan.");
      }

      const priority =
        plan.limits.priorityQueue
          ? JOB_PRIORITY.HIGH
          : JOB_PRIORITY.NORMAL;

      const enqueued = enqueueRender({
        payload: {
          ...req.body,
          topic,
          aiVideoProvider: providerName,
          durationTarget: Math.min(
            Number(req.body.durationTarget || 30),
            plan.limits.maxRenderDurationSeconds || 30
          ),
          userTier: req.body.userTier || "CREATOR",
        },
        developerId: context.developerId,
        apiKeyId: context.apiKeyId,
        plan: context.plan,
        priority,
        maxAttempts: req.body.maxAttempts || 2,
        webhookUrl: req.body.webhookUrl || "",
        metadata: {
          route: "/developer/video/render",
          mode: "queued",
        },
      });

      return {
        queued: true,
        jobId: enqueued.job.jobId,
        job: enqueued.job,
        statusUrl: `/api/developer/jobs/${enqueued.job.jobId}`,
        worker: getJobWorkerState(),
      };
    },
  });
}

async function handleDirectRender(req, res) {
  const providerName =
    req.body.aiVideoProvider ||
    req.body.provider ||
    process.env.AI_VIDEO_PROVIDER ||
    "fallback-motion";

  const provider = routeProvider(providerName);
  const sceneCount = safeNumber(req.body.sceneCount || 5, 5, 1, 20);

  return meteredHandler({
    req,
    res,
    eventType: USAGE_EVENT_TYPES.VIDEO_RENDER_FULL,
    provider,
    quantity: sceneCount,
    feature: "canUseFullRenderApi",
    route: "/developer/video/render:direct",
    handler: async ({ context }) => {
      const topic = clean(req.body.topic || req.body.prompt || "");
      if (!topic) throw new Error("topic or prompt is required.");

      const plan = getDeveloperPlan(context.plan);

      const durationTarget = Math.min(
        Number(req.body.durationTarget || 30),
        plan.limits.maxRenderDurationSeconds || 30
      );

      if (sceneCount > plan.limits.maxScenesPerVideo) {
        throw new Error(
          `Scene count exceeds plan limit. Requested ${sceneCount}, max ${plan.limits.maxScenesPerVideo}.`
        );
      }

      return renderCinematicVideo({
        topic,
        platform: req.body.platform || "TikTok",
        style: req.body.style || "cinematic futuristic high-energy",
        durationTarget,
        voiceover: req.body.voiceover !== false,
        voiceId: req.body.voiceId,
        soundtrack: req.body.soundtrack !== false,
        soundtrackMood: req.body.soundtrackMood || "cinematic",
        subtitles: req.body.subtitles !== false,
        avatarPresenter: Boolean(req.body.avatarPresenter),
        avatarImagePath: req.body.avatarImagePath || "",
        useTransitions: req.body.useTransitions !== false,
        transitionStyle: req.body.transitionStyle || "cinematic",
        preferGPU: Boolean(req.body.preferGPU),
        quality: req.body.quality || "balanced",
        motionEffect: req.body.motionEffect || "cinematic",
        createSocialPackage: req.body.createSocialPackage !== false,
        userTier: req.body.userTier || "CREATOR",
        aiVideoProvider: providerName,
      });
    },
  });
}

router.post("/video/preflight", requireApiKey("video:preflight"), (req, res) => {
  const context = developerContext(req);
  const providerName = req.body.provider || req.body.aiVideoProvider || "fallback-motion";
  const provider = routeProvider(providerName);
  const sceneCount = safeNumber(req.body.sceneCount || 5, 5, 1, 100);

  const result = preflightUsage({
    developerId: context.developerId,
    plan: context.plan,
    eventType: USAGE_EVENT_TYPES.VIDEO_RENDER_FULL,
    provider,
    quantity: sceneCount,
    feature: "canUseFullRenderApi",
  });

  res.status(result.ok ? 200 : 402).json(result);
});

/* -------------------------------------------------------------------------- */
/* JOBS + WORKER                                                              */
/* -------------------------------------------------------------------------- */

router.get("/jobs", requireApiKey("jobs:read"), (req, res) => {
  const context = developerContext(req);

  res.json(
    listRenderJobs({
      status: req.query.status || null,
      developerId:
        req.query.all === "true" && context.plan === API_PLANS.ENTERPRISE
          ? null
          : context.developerId,
      limit: safeNumber(req.query.limit, 100, 1, 500),
    })
  );
});

router.get("/jobs/:jobId", requireApiKey("jobs:read"), (req, res) => {
  const result = getRenderJob(req.params.jobId);
  const context = developerContext(req);

  if (!result.ok) return res.status(404).json(result);

  if (result.job.developerId !== context.developerId && context.plan !== API_PLANS.ENTERPRISE) {
    return respondError(res, 403, "job_does_not_belong_to_developer");
  }

  res.json(result);
});

router.post("/jobs/:jobId/cancel", requireApiKey("jobs:write"), (req, res) => {
  const current = getRenderJob(req.params.jobId);
  const context = developerContext(req);

  if (!current.ok) return res.status(404).json(current);

  if (current.job.developerId !== context.developerId && context.plan !== API_PLANS.ENTERPRISE) {
    return respondError(res, 403, "job_does_not_belong_to_developer");
  }

  res.json(cancelRenderJob(req.params.jobId, req.body.reason || "cancelled_by_api"));
});

router.get("/queue/stats", requireApiKey("jobs:read"), (req, res) => {
  res.json({
    ok: true,
    queue: getQueueStats(),
    worker: getJobWorkerState(),
  });
});

router.post("/admin/worker/start", ownerOnly, (req, res) => {
  res.json(
    startJobWorker({
      pollIntervalMs: req.body.pollIntervalMs || 5000,
      maxConcurrentJobs: req.body.maxConcurrentJobs || 1,
      stopOnFatalError: Boolean(req.body.stopOnFatalError),
    })
  );
});

router.post("/admin/worker/stop", ownerOnly, async (req, res) => {
  res.json(await stopJobWorker(req.body.reason || "admin_stop"));
});

router.post("/admin/worker/run-once", ownerOnly, async (req, res) => {
  res.json(await runWorkerOnce(req.body.config || {}));
});

router.post("/admin/worker/recover-stuck", ownerOnly, (req, res) => {
  res.json(
    recoverStuckJobs({
      maxRunningMinutes: req.body.maxRunningMinutes || 60,
      markFailed: req.body.markFailed !== false,
    })
  );
});

router.get("/admin/worker/state", ownerOnly, (req, res) => {
  res.json(getJobWorkerState());
});

/* -------------------------------------------------------------------------- */
/* STATUS                                                                     */
/* -------------------------------------------------------------------------- */

router.get("/status", requireApiKey("developer:read"), async (req, res) => {
  res.json({
    ok: true,
    platform: "AstraMind Developer API Platform",
    version: "v2-commercial",
    developerId: req.astramindDeveloperId,
    plan: req.astramindPlan,
    health: {
      cinematic: getCinematicHealth(),
      videoProviders: await getAIVideoGenerationHealth(),
      queue: getQueueStats(),
      worker: getJobWorkerState(),
    },
    usage: getUsageSummary({
      developerId: req.astramindDeveloperId,
      plan: req.astramindPlan,
    }),
    billing: getDeveloperBillingSummary({
      developerId: req.astramindDeveloperId,
    }),
    timestamp: new Date().toISOString(),
  });
});

export default router;
