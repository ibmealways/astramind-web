/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: CapabilityResolver.js
 *
 * Description:
 * Enterprise Capability Resolution Engine
 *
 * The CapabilityResolver transforms a capability request into a validated,
 * executable execution contract.
 *
 * It sits between MissionExecutor and CapabilityRouter.
 *
 * Responsibilities
 * ----------------
 * • Resolve capabilities
 * • Validate execution readiness
 * • Resolve dependencies
 * • Validate permissions
 * • Validate subscription tier
 * • Validate provider compatibility
 * • Validate model compatibility
 * • Validate hardware requirements
 * • Produce execution contracts
 *
 * IMPORTANT
 * ---------
 * CapabilityResolver NEVER executes capabilities.
 *
 * CapabilityResolver NEVER performs routing.
 *
 * It only resolves execution readiness.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import CapabilityRegistry from "./CapabilityRegistry.js";

function clone(value) {

    return JSON.parse(

        JSON.stringify(value)

    );

}

export const ResolutionState = Object.freeze({

    READY: "ready",

    BLOCKED: "blocked",

    INVALID: "invalid",

    UNKNOWN: "unknown"

});

export default class CapabilityResolver {

    constructor({

        registry,

        diagnostics = null,

        eventBus = null

    } = {}) {

        if (

            !(registry instanceof CapabilityRegistry)

        ) {

            throw new Error(

                "CapabilityResolver requires CapabilityRegistry."

            );

        }

        this.registry = registry;

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

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

            blocked: 0,

            invalid: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "CapabilityResolver initialized."

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
     * Resolve Capability
     * =====================================================
     */

    resolve(

        capabilityId,

        context = {}

    ) {

        this.metrics.resolutions++;

        if (

            this.cache.has(capabilityId)

        ) {

            this.metrics.cacheHits++;

            return this.cache.get(

                capabilityId

            );

        }

        const capability =

            this.registry.get(

                capabilityId

            );

        if (!capability) {

            this.metrics.invalid++;

            return {

                state:

                    ResolutionState.UNKNOWN,

                reason:

                    "Capability not registered."

            };

        }

        const contract =

            this.buildExecutionContract(

                capability,

                context

            );

        this.cache.set(

            capabilityId,

            contract

        );

        this.record(

            "Capability resolved.",

            {

                capability:

                    capabilityId

            }

        );

        return contract;

    }

    /**
     * =====================================================
     * Build Execution Contract
     * =====================================================
     */

    buildExecutionContract(

        capability,

        context

    ) {

        return {

            state:

                ResolutionState.READY,

            capabilityId:

                capability.id,

            version:

                capability.version,

            handler:

                capability.handler,

            dependencies:

                clone(

                    capability.dependencies

                ),

            requirements:

                clone(

                    capability.requirements ||

                    {}

                ),

            context

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

        capabilityId

    ) {

        this.cache.delete(

            capabilityId

        );

    }

    /**
     * =====================================================
     * Lookup
     * =====================================================
     */

    hasResolved(

        capabilityId

    ) {

        return this.cache.has(

            capabilityId

        );

    }

    getResolved(

        capabilityId

    ) {

        return this.cache.get(

            capabilityId

        );

    }

        /**
     * =====================================================
     * Validate Execution Contract
     * =====================================================
     */

    validate(

        capabilityId,

        context = {}

    ) {

        const capability =

            this.registry.get(capabilityId);

        if (!capability) {

            return this.block(

                capabilityId,

                "Capability not registered."

            );

        }

        try {

            this.registry.validate(

                capabilityId

            );

        }

        catch (error) {

            return this.block(

                capabilityId,

                error.message

            );

        }

        if (

            !this.validatePermissions(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Permission denied."

            );

        }

        if (

            !this.validateSubscription(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Subscription requirement not met."

            );

        }

        if (

            !this.validateProvider(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Provider unsupported."

            );

        }

        if (

            !this.validateModel(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Model unsupported."

            );

        }

        if (

            !this.validateHardware(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Hardware requirements not satisfied."

            );

        }

        if (

            !this.validateInternet(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Internet connectivity required."

            );

        }

        if (

            !this.validateAutonomous(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Autonomous execution prohibited."

            );

        }

        if (

            !this.validateEnterprise(

                capability,

                context

            )

        ) {

            return this.block(

                capabilityId,

                "Enterprise authorization required."

            );

        }

        return this.resolve(

            capabilityId,

            context

        );

    }

    /**
     * =====================================================
     * Permission Validation
     * =====================================================
     */

    validatePermissions(

        capability,

        context

    ) {

        const permissions =

            context.permissions || [];

        return this.registry.supportsPermissions(

            capability.id,

            permissions

        );

    }

    /**
     * =====================================================
     * Subscription Validation
     * =====================================================
     */

    validateSubscription(

        capability,

        context

    ) {

        return this.registry.supportsSubscription(

            capability.id,

            context.subscription ||

            "free"

        );

    }

    /**
     * =====================================================
     * Provider Validation
     * =====================================================
     */

    validateProvider(

        capability,

        context

    ) {

        return this.registry.supportsProvider(

            capability.id,

            context.provider ||

            "default"

        );

    }

    /**
     * =====================================================
     * Model Validation
     * =====================================================
     */

    validateModel(

        capability,

        context

    ) {

        return this.registry.supportsModel(

            capability.id,

            context.model ||

            "default"

        );

    }

    /**
     * =====================================================
     * Hardware Validation
     * =====================================================
     */

    validateHardware(

        capability,

        context

    ) {

        return this.registry.supportsHardware(

            capability.id,

            context.hardware || []

        );

    }

    /**
     * =====================================================
     * Internet Validation
     * =====================================================
     */

    validateInternet(

        capability,

        context

    ) {

        if (

            !this.registry.requiresInternet(

                capability.id

            )

        ) {

            return true;

        }

        return !!context.internet;

    }

    /**
     * =====================================================
     * Autonomous Validation
     * =====================================================
     */

    validateAutonomous(

        capability,

        context

    ) {

        if (

            !context.autonomous

        ) {

            return true;

        }

        return this.registry.supportsAutonomousExecution(

            capability.id

        );

    }

    /**
     * =====================================================
     * Enterprise Validation
     * =====================================================
     */

    validateEnterprise(

        capability,

        context

    ) {

        if (

            !this.registry.requiresEnterprise(

                capability.id

            )

        ) {

            return true;

        }

        return !!context.enterprise;

    }

    /**
     * =====================================================
     * Resolution Blocking
     * =====================================================
     */

    block(

        capabilityId,

        reason

    ) {

        this.metrics.blocked++;

        this.record(

            "Capability blocked.",

            {

                capability:

                    capabilityId,

                reason

            }

        );

        return {

            state:

                ResolutionState.BLOCKED,

            capabilityId,

            reason,

            executable: false

        };

    }

        /**
     * =====================================================
     * Resolve Dependency Tree
     * =====================================================
     */

    resolveDependencyTree(

        capabilityId,

        resolved = [],

        visited = new Set()

    ) {

        if (

            visited.has(capabilityId)

        ) {

            return resolved;

        }

        visited.add(

            capabilityId

        );

        const capability =

            this.registry.get(

                capabilityId

            );

        if (!capability) {

            return resolved;

        }

        capability.dependencies.forEach(

            dependency => {

                this.resolveDependencyTree(

                    dependency,

                    resolved,

                    visited

                );

            }

        );

        resolved.push(

            capabilityId

        );

        return resolved;

    }

    /**
     * =====================================================
     * Execution Order
     * =====================================================
     */

    buildExecutionOrder(

        capabilityId

    ) {

        const order =

            this.resolveDependencyTree(

                capabilityId

            );

        return [

            ...new Set(order)

        ];

    }

    /**
     * =====================================================
     * Execution Plan
     * =====================================================
     */

    buildExecutionPlan(

        capabilityId,

        context = {}

    ) {

        const contract =

            this.validate(

                capabilityId,

                context

            );

        if (

            contract.state !==

            ResolutionState.READY

        ) {

            return contract;

        }

        return {

            state:

                ResolutionState.READY,

            executionOrder:

                this.buildExecutionOrder(

                    capabilityId

                ),

            contract,

            timestamp:

                Date.now()

        };

    }

    /**
     * =====================================================
     * Provider Ranking
     * =====================================================
     */

    rankProviders(

        capabilityId,

        availableProviders = []

    ) {

        const requirements =

            this.registry.getExecutionRequirements(

                capabilityId

            );

        const preferred =

            requirements.providers || [];

        return [

            ...availableProviders

        ]

        .sort(

            (a, b) => {

                const aScore =

                    preferred.includes(a)

                        ? 1

                        : 0;

                const bScore =

                    preferred.includes(b)

                        ? 1

                        : 0;

                return bScore - aScore;

            }

        );

    }

    /**
     * =====================================================
     * Select Best Provider
     * =====================================================
     */

    selectProvider(

        capabilityId,

        availableProviders = []

    ) {

        return this.rankProviders(

            capabilityId,

            availableProviders

        )[0] || null;

    }

    /**
     * =====================================================
     * Resolution Confidence
     * =====================================================
     */

    calculateConfidence(

        capabilityId

    ) {

        let confidence = 100;

        const capability =

            this.registry.get(

                capabilityId

            );

        if (!capability) {

            return 0;

        }

        if (

            capability.dependencies.length > 5

        ) {

            confidence -= 10;

        }

        if (

            capability.state !==

            "enabled"

        ) {

            confidence -= 20;

        }

        if (

            capability.requirements?.internetRequired

        ) {

            confidence -= 5;

        }

        if (

            capability.requirements?.enterpriseOnly

        ) {

            confidence -= 5;

        }

        return Math.max(

            confidence,

            0

        );

    }

    /**
     * =====================================================
     * Conflict Detection
     * =====================================================
     */

    detectConflicts(

        capabilityId

    ) {

        const capability =

            this.registry.get(

                capabilityId

            );

        if (!capability) {

            return [];

        }

        const conflicts = [];

        const requirements =

            capability.requirements || {};

        if (

            requirements.providers?.length > 1 &&

            requirements.models?.length === 0

        ) {

            conflicts.push({

                type:

                    "provider",

                message:

                    "Multiple providers specified without preferred model."

            });

        }

        if (

            requirements.enterpriseOnly &&

            requirements.autonomousAllowed

        ) {

            conflicts.push({

                type:

                    "policy",

                message:

                    "Enterprise-only capability allows autonomous execution."

            });

        }

        return conflicts;

    }

    /**
     * =====================================================
     * Policy Override
     * =====================================================
     */

    applyPolicyOverride(

        contract,

        overrides = {}

    ) {

        return {

            ...contract,

            requirements: {

                ...contract.requirements,

                ...overrides

            },

            overridden: true

        };

    }

    /**
     * =====================================================
     * Resolution Cache (TTL)
     * =====================================================
     */

    cacheResolution(

        capabilityId,

        contract,

        ttl = 300000

    ) {

        this.cache.set(

            capabilityId,

            {

                expires:

                    Date.now() + ttl,

                contract

            }

        );

    }

    getCachedResolution(

        capabilityId

    ) {

        const entry =

            this.cache.get(

                capabilityId

            );

        if (!entry) {

            return null;

        }

        if (

            Date.now() >

            entry.expires

        ) {

            this.cache.delete(

                capabilityId

            );

            return null;

        }

        return entry.contract;

    }

        /**
     * =====================================================
     * Execution Affinity
     *
     * Determines the preferred execution environment.
     * =====================================================
     */

    determineExecutionAffinity(

        capabilityId,

        environment = {}

    ) {

        const requirements =

            this.registry.getExecutionRequirements(

                capabilityId

            );

        const affinity = {

            location: "cloud",

            realtime: false,

            distributed: false,

            gpuRequired: false,

            preferredProvider: null

        };

        if (

            requirements.hardware?.includes("gpu")

        ) {

            affinity.gpuRequired = true;

            affinity.location =

                environment.localGPU

                    ? "local"

                    : "cloud";

        }

        if (

            requirements.autonomousAllowed

        ) {

            affinity.realtime = true;

        }

        if (

            requirements.providers?.length

        ) {

            affinity.preferredProvider =

                requirements.providers[0];

        }

        return affinity;

    }

    /**
     * =====================================================
     * Distributed Execution
     * =====================================================
     */

    supportsDistributedExecution(

        capabilityId

    ) {

        const capability =

            this.registry.get(

                capabilityId

            );

        return !!capability?.metadata

            ?.distributed;

    }

    /**
     * =====================================================
     * Load Balancing
     * =====================================================
     */

    chooseExecutionNode(

        nodes = []

    ) {

        if (

            nodes.length === 0

        ) {

            return null;

        }

        return nodes.reduce(

            (best, current) =>

                current.load < best.load

                    ? current

                    : best

        );

    }

    /**
     * =====================================================
     * Capability Health
     * =====================================================
     */

    evaluateCapabilityHealth(

        capabilityId

    ) {

        const capability =

            this.registry.get(

                capabilityId

            );

        if (!capability) {

            return {

                healthy: false,

                score: 0

            };

        }

        const metrics =

            capability.metrics || {};

        let score = 100;

        if (

            metrics.failures > 0

        ) {

            score -=

                Math.min(

                    metrics.failures * 2,

                    30

                );

        }

        if (

            metrics.averageExecutionMs >

            10000

        ) {

            score -= 15;

        }

        return {

            healthy:

                score >= 70,

            score,

            metrics

        };

    }

    /**
     * =====================================================
     * Provider Fallback Chain
     * =====================================================
     */

    buildProviderFallbackChain(

        capabilityId,

        availableProviders = []

    ) {

        const ranked =

            this.rankProviders(

                capabilityId,

                availableProviders

            );

        return ranked.map(

            (provider, index) => ({

                provider,

                priority:

                    index + 1

            })

        );

    }

    /**
     * =====================================================
     * Execution Environment
     * =====================================================
     */

    determineExecutionEnvironment(

        capabilityId,

        context = {}

    ) {

        return {

            affinity:

                this.determineExecutionAffinity(

                    capabilityId,

                    context.environment || {}

                ),

            distributed:

                this.supportsDistributedExecution(

                    capabilityId

                ),

            health:

                this.evaluateCapabilityHealth(

                    capabilityId

                ),

            fallbackProviders:

                this.buildProviderFallbackChain(

                    capabilityId,

                    context.providers || []

                )

        };

    }

    /**
     * =====================================================
     * Resolution Diagnostics
     * =====================================================
     */

    diagnoseResolution(

        capabilityId,

        context = {}

    ) {

        return {

            capabilityId,

            validation:

                this.validate(

                    capabilityId,

                    context

                ),

            confidence:

                this.calculateConfidence(

                    capabilityId

                ),

            conflicts:

                this.detectConflicts(

                    capabilityId

                ),

            environment:

                this.determineExecutionEnvironment(

                    capabilityId,

                    context

                )

        };

    }

    /**
     * =====================================================
     * Resolve Complete Execution Plan
     * =====================================================
     */

    resolveExecution(

        capabilityId,

        context = {}

    ) {

        const plan =

            this.buildExecutionPlan(

                capabilityId,

                context

            );

        if (

            plan.state !==

            ResolutionState.READY

        ) {

            return plan;

        }

        return {

            ...plan,

            diagnostics:

                this.diagnoseResolution(

                    capabilityId,

                    context

                ),

            executionEnvironment:

                this.determineExecutionEnvironment(

                    capabilityId,

                    context

                )

        };

    }

        /**
     * =====================================================
     * Execution Fingerprint
     *
     * Produces a deterministic execution fingerprint
     * for auditing, caching and distributed synchronization.
     * =====================================================
     */

    createExecutionFingerprint(

        capabilityId,

        context = {}

    ) {

        const contract =

            this.registry.getExecutionContract(

                capabilityId

            );

        return {

            generatedAt:

                Date.now(),

            capabilityId,

            version:

                contract?.version,

            provider:

                context.provider || null,

            model:

                context.model || null,

            subscription:

                context.subscription || null,

            autonomous:

                !!context.autonomous,

            fingerprint:

                JSON.stringify({

                    capabilityId,

                    version: contract?.version,

                    provider: context.provider,

                    model: context.model,

                    subscription: context.subscription

                })

        };

    }

    /**
     * =====================================================
     * Resolution Snapshot
     * =====================================================
     */

    createSnapshot(

        capabilityId,

        context = {}

    ) {

        return {

            timestamp:

                Date.now(),

            capability:

                capabilityId,

            resolution:

                this.resolveExecution(

                    capabilityId,

                    context

                ),

            fingerprint:

                this.createExecutionFingerprint(

                    capabilityId,

                    context

                )

        };

    }

    /**
     * =====================================================
     * Policy Evaluation Report
     * =====================================================
     */

    evaluatePolicies(

        capabilityId,

        context = {}

    ) {

        return {

            permissions:

                this.validatePermissions(

                    this.registry.get(capabilityId),

                    context

                ),

            subscription:

                this.validateSubscription(

                    this.registry.get(capabilityId),

                    context

                ),

            provider:

                this.validateProvider(

                    this.registry.get(capabilityId),

                    context

                ),

            model:

                this.validateModel(

                    this.registry.get(capabilityId),

                    context

                ),

            hardware:

                this.validateHardware(

                    this.registry.get(capabilityId),

                    context

                ),

            internet:

                this.validateInternet(

                    this.registry.get(capabilityId),

                    context

                ),

            enterprise:

                this.validateEnterprise(

                    this.registry.get(capabilityId),

                    context

                ),

            autonomous:

                this.validateAutonomous(

                    this.registry.get(capabilityId),

                    context

                )

        };

    }

    /**
     * =====================================================
     * Resolver Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            registryHealthy:

                this.registry.health().healthy,

            cachedContracts:

                this.cache.size,

            metrics:

                clone(this.metrics),

            timelineEntries:

                this.timeline.length

        };

    }

    /**
     * =====================================================
     * Integrity Verification
     * =====================================================
     */

    verifyIntegrity() {

        const registryHealth =

            this.registry.health();

        return {

            healthy:

                registryHealth.healthy,

            registry:

                registryHealth,

            cacheHealthy: true,

            resolverHealthy: true

        };

    }

    /**
     * =====================================================
     * Enterprise Audit Report
     * =====================================================
     */

    exportAuditReport() {

        return {

            generatedAt:

                Date.now(),

            metrics:

                clone(this.metrics),

            integrity:

                this.verifyIntegrity(),

            registryStatistics:

                this.registry.getStatistics(),

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Serialization
     * =====================================================
     */

    exportState() {

        return {

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline),

            cache:

                Array.from(

                    this.cache.entries()

                )

        };

    }

    serialize() {

        return JSON.stringify(

            this.exportState(),

            null,

            2

        );

    }

    static deserialize(

        json,

        registry,

        options = {}

    ) {

        const data =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const resolver =

            new CapabilityResolver({

                registry,

                ...options

            });

        resolver.metrics =

            clone(data.metrics);

        resolver.timeline =

            clone(data.timeline);

        resolver.cache =

            new Map(data.cache);

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

            typeof this.diagnostics.record !==

            "function"

        ) {

            return;

        }

        this.diagnostics.record(

            level,

            "CapabilityResolver",

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

            typeof this.eventBus.publish !==

            "function"

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

                "CapabilityResolver",

            version:

                "3.0.0-alpha.1",

            metrics:

                clone(this.metrics),

            cacheSize:

                this.cache.size

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

            health:

                this.health(),

            integrity:

                this.verifyIntegrity(),

            audit:

                this.exportAuditReport()

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

        return new CapabilityResolver({

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

        return `[CapabilityResolver Cache=${this.cache.size} Resolutions=${this.metrics.resolutions}]`;

    }

}