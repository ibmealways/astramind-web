/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: ExecutionStrategyResolver.js
 *
 * Description:
 * Enterprise Execution Strategy Resolver
 *
 * The ExecutionStrategyResolver is AstraMind's execution decision engine.
 *
 * It transforms an execution request into an optimized execution strategy
 * recommendation using registry information, historical performance,
 * environment constraints, and execution policies.
 *
 * Responsibilities
 * ----------------
 * • Resolve execution strategies
 * • Evaluate execution environments
 * • Rank strategies
 * • Calculate confidence
 * • Build fallback chains
 * • Produce execution plans
 * • Generate execution recommendations
 *
 * IMPORTANT
 * ---------
 * ExecutionStrategyResolver NEVER executes work.
 *
 * ExecutionStrategyResolver NEVER routes work.
 *
 * It only determines the best execution strategy.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import ExecutionStrategyRegistry from "./ExecutionStrategyRegistry.js";

function clone(value) {

    return JSON.parse(

        JSON.stringify(value)

    );

}

export const StrategyResolutionState = Object.freeze({

    READY: "ready",

    BLOCKED: "blocked",

    UNKNOWN: "unknown",

    INVALID: "invalid"

});

export default class ExecutionStrategyResolver {

    constructor({

        registry,

        diagnostics = null,

        eventBus = null,

        missionHistory = null

    } = {}) {

        if (

            !(registry instanceof ExecutionStrategyRegistry)

        ) {

            throw new Error(

                "ExecutionStrategyResolver requires ExecutionStrategyRegistry."

            );

        }

        this.registry = registry;

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

        this.missionHistory = missionHistory;

        /**
         * =====================================================
         * Resolution Cache
         * =====================================================
         */

        this.cache = new Map();

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            resolutions: 0,

            cacheHits: 0,

            strategySelections: 0,

            fallbacksGenerated: 0,

            recommendationsGenerated: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "ExecutionStrategyResolver initialized."

        );

    }

    /**
     * =====================================================
     * Timeline
     * =====================================================
     */

    record(

        event,

        metadata = {}

    ) {

        this.timeline.push({

            timestamp: Date.now(),

            event,

            metadata

        });

    }

    /**
     * =====================================================
     * Resolve Strategy
     * =====================================================
     */

    resolve(

        workload = {}

    ) {

        this.metrics.resolutions++;

        const cacheKey =

            JSON.stringify(workload);

        if (

            this.cache.has(cacheKey)

        ) {

            this.metrics.cacheHits++;

            return this.cache.get(

                cacheKey

            );

        }

        const recommendation =

            this.buildRecommendation(

                workload

            );

        this.cache.set(

            cacheKey,

            recommendation

        );

        this.record(

            "Execution strategy resolved.",

            {

                workload

            }

        );

        return recommendation;

    }

    /**
     * =====================================================
     * Build Recommendation
     * =====================================================
     */

    buildRecommendation(

        workload

    ) {

        return {

            state:

                StrategyResolutionState.READY,

            workload,

            generatedAt:

                Date.now(),

            recommendation: null,

            alternatives: [],

            confidence: 0

        };

    }

    /**
     * =====================================================
     * Cache
     * =====================================================
     */

    clearCache() {

        this.cache.clear();

    }

    invalidate(

        workload

    ) {

        this.cache.delete(

            JSON.stringify(workload)

        );

    }

    /**
     * =====================================================
     * Cache Lookup
     * =====================================================
     */

    hasCached(

        workload

    ) {

        return this.cache.has(

            JSON.stringify(workload)

        );

    }

    getCached(

        workload

    ) {

        return this.cache.get(

            JSON.stringify(workload)

        );

    }

        /**
     * =====================================================
     * Weighted Strategy Scoring
     *
     * Produces a normalized score used to rank strategies.
     * =====================================================
     */

    scoreStrategy(

        strategy,

        workload = {}

    ) {

        const scores = {

            performance:

                this.scorePerformance(

                    strategy

                ),

            affinity:

                this.scoreAffinity(

                    strategy,

                    workload

                ),

            environment:

                this.scoreEnvironment(

                    strategy,

                    workload

                ),

            hardware:

                this.scoreHardware(

                    strategy,

                    workload

                ),

            history:

                this.scoreHistory(

                    strategy,

                    workload

                ),

            userPreference:

                this.scoreUserPreference(

                    strategy,

                    workload

                )

        };

        const total =

              scores.performance * 0.35
            + scores.affinity * 0.25
            + scores.environment * 0.15
            + scores.hardware * 0.10
            + scores.history * 0.10
            + scores.userPreference * 0.05;

        return {

            strategy,

            total: Number(

                total.toFixed(2)

            ),

            breakdown: scores

        };

    }

    /**
     * =====================================================
     * Performance Score
     * =====================================================
     */

    scorePerformance(

        strategy

    ) {

        return this.registry

            .calculatePerformanceScore(

                strategy.id

            );

    }

    /**
     * =====================================================
     * Capability Affinity
     * =====================================================
     */

    scoreAffinity(

        strategy,

        workload

    ) {

        return this.registry

            .calculateAffinity(

                strategy.id,

                workload

            );

    }

    /**
     * =====================================================
     * Environment Match
     * =====================================================
     */

    scoreEnvironment(

        strategy,

        workload

    ) {

        if (

            !workload.environment

        ) {

            return 100;

        }

        return strategy

            .supportedEnvironments

            .includes(

                workload.environment

            )

            ? 100

            : 0;

    }

    /**
     * =====================================================
     * Hardware Match
     * =====================================================
     */

    scoreHardware(

        strategy,

        workload

    ) {

        const required =

            workload.hardware || [];

        if (

            required.length === 0

        ) {

            return 100;

        }

        const supported =

            strategy.metadata

                ?.hardware || [];

        const matches =

            required.filter(

                item =>

                    supported.includes(

                        item

                    )

            ).length;

        return Math.round(

            (

                matches /

                required.length

            ) * 100

        );

    }

    /**
     * =====================================================
     * Historical Learning
     * =====================================================
     */

    scoreHistory(

        strategy,

        workload

    ) {

        if (

            !this.missionHistory ||

            typeof this.missionHistory

                .findSimilarMissions !==

            "function"

        ) {

            return 50;

        }

        const similar =

            this.missionHistory

                .findSimilarMissions({

                    type:

                        workload.capability

                });

        if (

            similar.length === 0

        ) {

            return 50;

        }

        const successful =

            similar.filter(

                mission =>

                    mission.status ===

                    "completed"

            ).length;

        return Math.round(

            (

                successful /

                similar.length

            ) * 100

        );

    }

    /**
     * =====================================================
     * User Preference
     * =====================================================
     */

    scoreUserPreference(

        strategy,

        workload

    ) {

        if (

            !workload.preferredStrategy

        ) {

            return 50;

        }

        return workload

            .preferredStrategy ===

            strategy.id

            ? 100

            : 25;

    }

    /**
     * =====================================================
     * Rank Strategies
     * =====================================================
     */

    rankStrategies(

        workload = {}

    ) {

        const candidates =

            this.registry.match(

                workload

            );

        return candidates

            .map(

                strategy =>

                    this.scoreStrategy(

                        strategy,

                        workload

                    )

            )

            .sort(

                (a, b) =>

                    b.total -

                    a.total

            );

    }

    /**
     * =====================================================
     * Select Best Strategy
     * =====================================================
     */

    selectBest(

        workload = {}

    ) {

        const ranked =

            this.rankStrategies(

                workload

            );

        if (

            ranked.length === 0

        ) {

            return null;

        }

        this.metrics.strategySelections++;

        return ranked[0];

    }

    /**
     * =====================================================
     * Confidence
     * =====================================================
     */

    calculateConfidence(

        rankedStrategy

    ) {

        if (

            !rankedStrategy

        ) {

            return 0;

        }

        return Math.min(

            Math.round(

                rankedStrategy.total

            ),

            100

        );

    }

        /**
     * =====================================================
     * Build Execution Recommendation
     *
     * Produces a complete recommendation package including
     * primary strategy, fallbacks, confidence, objectives,
     * risk assessment and explanation.
     * =====================================================
     */

    buildRecommendation(workload = {}) {

        const ranked = this.rankStrategies(workload);

        if (ranked.length === 0) {

            return {

                state: StrategyResolutionState.BLOCKED,

                reason: "No compatible execution strategies available.",

                generatedAt: Date.now()

            };

        }

        const primary = ranked[0];

        const fallbacks = ranked.slice(1);

        this.metrics.recommendationsGenerated++;

        return {

            state: StrategyResolutionState.READY,

            generatedAt: Date.now(),

            workload,

            recommendation: primary,

            alternatives: fallbacks,

            confidence: this.calculateConfidence(primary),

            objectives: this.determineObjectives(workload),

            risk: this.assessRisk(primary, workload),

            explanation: this.generateExplanation(

                primary,

                workload

            )

        };

    }

    /**
     * =====================================================
     * Determine Execution Objectives
     * =====================================================
     */

    determineObjectives(workload = {}) {

        return {

            prioritizeSpeed:

                !!workload.prioritizeSpeed,

            prioritizeCost:

                !!workload.prioritizeCost,

            prioritizeQuality:

                !!workload.prioritizeQuality,

            prioritizePrivacy:

                !!workload.prioritizePrivacy,

            prioritizeReliability:

                workload.prioritizeReliability !== false

        };

    }

    /**
     * =====================================================
     * Risk Assessment
     * =====================================================
     */

    assessRisk(

        rankedStrategy,

        workload = {}

    ) {

        let score = 0;

        const breakdown = [];

        if (

            rankedStrategy.total < 70

        ) {

            score += 25;

            breakdown.push(

                "Overall strategy score below preferred threshold."

            );

        }

        if (

            workload.environment === "offline"

        ) {

            score += 15;

            breakdown.push(

                "Offline execution environment."

            );

        }

        if (

            workload.hardware?.includes("gpu") &&

            !rankedStrategy.strategy.metadata?.hardware?.includes("gpu")

        ) {

            score += 20;

            breakdown.push(

                "Requested GPU acceleration unavailable."

            );

        }

        if (

            rankedStrategy.breakdown.performance < 60

        ) {

            score += 20;

            breakdown.push(

                "Historical performance below optimal."

            );

        }

        return {

            score,

            level:

                score < 20

                    ? "low"

                    : score < 45

                        ? "medium"

                        : "high",

            breakdown

        };

    }

    /**
     * =====================================================
     * Build Fallback Plan
     * =====================================================
     */

    buildFallbackPlan(

        rankedStrategies = []

    ) {

        this.metrics.fallbacksGenerated++;

        return rankedStrategies

            .slice(1)

            .map(

                (candidate, index) => ({

                    order:

                        index + 2,

                    strategy:

                        candidate.strategy.id,

                    confidence:

                        this.calculateConfidence(

                            candidate

                        )

                })

            );

    }

    /**
     * =====================================================
     * Provider Health
     * =====================================================
     */

    evaluateProviderHealth(

        providers = []

    ) {

        return providers.map(provider => ({

            provider,

            status: "healthy",

            latencyMs: null,

            availability: 100

        }));

    }

    /**
     * =====================================================
     * Policy Filtering
     * =====================================================
     */

    filterByPolicy(

        rankedStrategies,

        workload = {}

    ) {

        return rankedStrategies.filter(candidate => {

            if (

                workload.enterpriseOnly &&

                candidate.strategy.metadata?.enterprise !== true

            ) {

                return false;

            }

            if (

                workload.localOnly &&

                !candidate.strategy.supportedEnvironments.includes("local")

            ) {

                return false;

            }

            if (

                workload.cloudOnly &&

                !candidate.strategy.supportedEnvironments.includes("cloud")

            ) {

                return false;

            }

            return true;

        });

    }

    /**
     * =====================================================
     * Explain Decision
     * =====================================================
     */

    generateExplanation(

        rankedStrategy,

        workload = {}

    ) {

        return {

            selectedStrategy:

                rankedStrategy.strategy.name,

            totalScore:

                rankedStrategy.total,

            confidence:

                this.calculateConfidence(

                    rankedStrategy

                ),

            rationale: [

                "Highest weighted execution score.",

                "Capability compatibility verified.",

                "Environment compatibility verified.",

                "Historical performance considered.",

                "User preferences applied."

            ],

            objectives:

                this.determineObjectives(

                    workload

                )

        };

    }

    /**
     * =====================================================
     * Build Complete Execution Plan
     * =====================================================
     */

    buildExecutionPlan(

        workload = {}

    ) {

        const ranked =

            this.filterByPolicy(

                this.rankStrategies(

                    workload

                ),

                workload

            );

        if (

            ranked.length === 0

        ) {

            return {

                state:

                    StrategyResolutionState.BLOCKED,

                reason:

                    "No strategies satisfy execution policy."

            };

        }

        return {

            recommendation:

                this.buildRecommendation(

                    workload

                ),

            fallbackPlan:

                this.buildFallbackPlan(

                    ranked

                ),

            providerHealth:

                this.evaluateProviderHealth(

                    workload.providers || []

                ),

            generatedAt:

                Date.now()

        };

    }

        /**
     * =====================================================
     * Execution Budget Evaluation
     *
     * Determines whether the selected strategy is likely
     * to remain within the execution constraints.
     * =====================================================
     */

    evaluateBudget(

        recommendation,

        workload = {}

    ) {

        const budget = workload.budget || {};

        return {

            estimatedCost:

                recommendation.strategy.metadata

                    ?.estimatedCost ?? 0,

            estimatedTokens:

                recommendation.strategy.metadata

                    ?.estimatedTokens ?? 0,

            estimatedDurationMs:

                recommendation.strategy.metadata

                    ?.estimatedDurationMs ?? 0,

            withinCostBudget:

                budget.maxCost == null ||

                (recommendation.strategy.metadata?.estimatedCost ?? 0)

                    <= budget.maxCost,

            withinTokenBudget:

                budget.maxTokens == null ||

                (recommendation.strategy.metadata?.estimatedTokens ?? 0)

                    <= budget.maxTokens,

            withinTimeBudget:

                budget.maxDurationMs == null ||

                (recommendation.strategy.metadata?.estimatedDurationMs ?? 0)

                    <= budget.maxDurationMs

        };

    }

    /**
     * =====================================================
     * SLA Evaluation
     * =====================================================
     */

    evaluateSLA(

        recommendation,

        workload = {}

    ) {

        const sla = workload.sla || {};

        const average =

            recommendation.strategy.metrics

                ?.averageExecutionMs ?? 0;

        const successRate =

            Number(

                this.registry.getSuccessRate(

                    recommendation.strategy.id

                )

            );

        return {

            latencyTarget:

                sla.maxLatencyMs ?? null,

            reliabilityTarget:

                sla.minSuccessRate ?? null,

            latencySatisfied:

                sla.maxLatencyMs == null ||

                average <= sla.maxLatencyMs,

            reliabilitySatisfied:

                sla.minSuccessRate == null ||

                successRate >= sla.minSuccessRate

        };

    }

    /**
     * =====================================================
     * Regulatory Compliance
     * =====================================================
     */

    evaluateCompliance(

        recommendation,

        workload = {}

    ) {

        const compliance =

            workload.compliance || [];

        const supported =

            recommendation.strategy.metadata

                ?.compliance || [];

        const missing =

            compliance.filter(

                rule =>

                    !supported.includes(rule)

            );

        return {

            requested:

                compliance,

            supported,

            compliant:

                missing.length === 0,

            missing

        };

    }

    /**
     * =====================================================
     * Execution Simulation
     *
     * Predicts execution before any work begins.
     * =====================================================
     */

    simulateExecution(

        recommendation,

        workload = {}

    ) {

        const confidence =

            this.calculateConfidence(

                recommendation

            );

        return {

            predictedSuccessRate:

                confidence,

            predictedExecutionMs:

                recommendation.strategy.metrics

                    ?.averageExecutionMs ??

                recommendation.strategy.metadata

                    ?.estimatedDurationMs ??

                0,

            predictedProvider:

                recommendation.strategy.metadata

                    ?.provider ??

                "unknown",

            simulationTime:

                Date.now()

        };

    }

    /**
     * =====================================================
     * Adaptive Retry Plan
     * =====================================================
     */

    buildRetryPlan(

        recommendation,

        fallbackPlan = []

    ) {

        const retries =

            recommendation.strategy.metadata

                ?.recommendedRetries ?? 2;

        return {

            maxRetries: retries,

            retryDelayMs: 1000,

            exponentialBackoff: true,

            fallbackStrategies:

                fallbackPlan

        };

    }

    /**
     * =====================================================
     * Optimization Opportunities
     * =====================================================
     */

    generateOptimizations(

        recommendation,

        workload = {}

    ) {

        const suggestions = [];

        if (

            recommendation.breakdown.performance < 70

        ) {

            suggestions.push(

                "Consider a higher-performing execution strategy."

            );

        }

        if (

            workload.prioritizeCost

        ) {

            suggestions.push(

                "A lower-cost provider may satisfy this request."

            );

        }

        if (

            workload.prioritizeSpeed

        ) {

            suggestions.push(

                "Local GPU execution may reduce latency."

            );

        }

        if (

            workload.prioritizePrivacy

        ) {

            suggestions.push(

                "Offline execution may improve data privacy."

            );

        }

        return suggestions;

    }

    /**
     * =====================================================
     * Enterprise Execution Assessment
     * =====================================================
     */

    assessExecutionReadiness(

        recommendation,

        fallbackPlan,

        workload = {}

    ) {

        return {

            budget:

                this.evaluateBudget(

                    recommendation,

                    workload

                ),

            sla:

                this.evaluateSLA(

                    recommendation,

                    workload

                ),

            compliance:

                this.evaluateCompliance(

                    recommendation,

                    workload

                ),

            simulation:

                this.simulateExecution(

                    recommendation,

                    workload

                ),

            retryPlan:

                this.buildRetryPlan(

                    recommendation,

                    fallbackPlan

                ),

            optimizations:

                this.generateOptimizations(

                    recommendation,

                    workload

                )

        };

    }

    /**
     * =====================================================
     * Enterprise Execution Package
     * =====================================================
     */

    buildEnterpriseExecutionPackage(

        workload = {}

    ) {

        const plan =

            this.buildExecutionPlan(

                workload

            );

        if (

            plan.state ===

            StrategyResolutionState.BLOCKED

        ) {

            return plan;

        }

        return {

            ...plan,

            assessment:

                this.assessExecutionReadiness(

                    plan.recommendation.recommendation,

                    plan.fallbackPlan,

                    workload

                ),

            createdAt:

                Date.now()

        };

    }

        /**
     * =====================================================
     * Execution Decision Fingerprint
     *
     * Produces a deterministic representation of the
     * decision that can be audited, cached, replayed,
     * or synchronized between AstraMind instances.
     * =====================================================
     */

    createDecisionFingerprint(

        executionPackage

    ) {

        return {

            generatedAt: Date.now(),

            workload:

                clone(

                    executionPackage.recommendation.workload

                ),

            selectedStrategy:

                executionPackage.recommendation

                    .recommendation.strategy.id,

            confidence:

                executionPackage.recommendation

                    .confidence,

            fallbackCount:

                executionPackage.fallbackPlan.length,

            fingerprint:

                JSON.stringify({

                    workload:

                        executionPackage.recommendation.workload,

                    strategy:

                        executionPackage.recommendation

                            .recommendation.strategy.id,

                    confidence:

                        executionPackage.recommendation.confidence

                })

        };

    }

    /**
     * =====================================================
     * Decision Snapshot
     * =====================================================
     */

    createSnapshot(

        executionPackage

    ) {

        return {

            timestamp: Date.now(),

            fingerprint:

                this.createDecisionFingerprint(

                    executionPackage

                ),

            package:

                clone(

                    executionPackage

                )

        };

    }

    /**
     * =====================================================
     * Resolver Integrity
     * =====================================================
     */

    verifyIntegrity() {

        return {

            healthy: true,

            registryHealthy:

                this.registry

                    .health()

                    .healthy,

            cacheHealthy: true,

            diagnosticsAttached:

                !!this.diagnostics,

            eventBusAttached:

                !!this.eventBus,

            missionHistoryAttached:

                !!this.missionHistory

        };

    }

    /**
     * =====================================================
     * Health Report
     * =====================================================
     */

    health() {

        return {

            healthy:

                this.verifyIntegrity()

                    .healthy,

            cacheSize:

                this.cache.size,

            metrics:

                clone(

                    this.metrics

                ),

            timelineEntries:

                this.timeline.length

        };

    }

    /**
     * =====================================================
     * Enterprise Audit Report
     * =====================================================
     */

    exportAuditReport() {

        return {

            generatedAt: Date.now(),

            integrity:

                this.verifyIntegrity(),

            health:

                this.health(),

            metrics:

                clone(

                    this.metrics

                ),

            timeline:

                clone(

                    this.timeline

                )

        };

    }

    /**
     * =====================================================
     * State Export
     * =====================================================
     */

    exportState() {

        return {

            metrics:

                clone(

                    this.metrics

                ),

            timeline:

                clone(

                    this.timeline

                ),

            cache:

                Array.from(

                    this.cache.entries()

                )

        };

    }

    /**
     * =====================================================
     * Serialization
     * =====================================================
     */

    serialize() {

        return JSON.stringify(

            this.exportState(),

            null,

            2

        );

    }

    /**
     * =====================================================
     * Deserialization
     * =====================================================
     */

    static deserialize(

        json,

        registry,

        options = {}

    ) {

        const state =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const resolver =

            new ExecutionStrategyResolver({

                registry,

                ...options

            });

        resolver.metrics =

            clone(

                state.metrics

            );

        resolver.timeline =

            clone(

                state.timeline

            );

        resolver.cache =

            new Map(

                state.cache

            );

        return resolver;

    }

    /**
     * =====================================================
     * Diagnostics
     * =====================================================
     */

    log(

        level,

        message,

        metadata = {}

    ) {

        if (

            !this.diagnostics ||

            typeof this.diagnostics.record !== "function"

        ) {

            return;

        }

        this.diagnostics.record(

            level,

            "ExecutionStrategyResolver",

            message,

            metadata

        );

    }

    /**
     * =====================================================
     * Event Publishing
     * =====================================================
     */

    publish(

        event,

        payload = {}

    ) {

        if (

            !this.eventBus ||

            typeof this.eventBus.publish !== "function"

        ) {

            return;

        }

        this.eventBus.publish(

            event,

            payload

        );

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name:

                "ExecutionStrategyResolver",

            version:

                "3.0.0-alpha.1",

            cacheSize:

                this.cache.size,

            metrics:

                clone(

                    this.metrics

                )

        };

    }

    /**
     * =====================================================
     * Debug Interface
     * =====================================================
     */

    debug() {

        return {

            info:

                this.getInfo(),

            integrity:

                this.verifyIntegrity(),

            health:

                this.health(),

            audit:

                this.exportAuditReport(),

            timeline:

                clone(

                    this.timeline

                )

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create({

        registry,

        ...options

    }) {

        return new ExecutionStrategyResolver({

            registry,

            ...options

        });

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[ExecutionStrategyResolver Cache=${this.cache.size} Decisions=${this.metrics.resolutions}]`;

    }

}