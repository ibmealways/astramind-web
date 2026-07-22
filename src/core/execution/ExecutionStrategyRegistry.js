/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: ExecutionStrategyRegistry.js
 *
 * Description:
 * Enterprise Execution Strategy Registry
 *
 * The Execution Strategy Registry is the central catalog of every execution
 * strategy available within AstraMind OS.
 *
 * Responsibilities
 * ----------------
 * • Register execution strategies
 * • Discover strategies
 * • Validate strategies
 * • Categorize strategies
 * • Maintain strategy metadata
 * • Version tracking
 * • Health monitoring
 * • Enterprise auditing
 *
 * IMPORTANT
 * ---------
 * ExecutionStrategyRegistry NEVER executes work.
 *
 * ExecutionStrategyRegistry NEVER routes work.
 *
 * It is the authoritative catalog of execution strategies.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

function uuid() {

    if (

        typeof crypto !== "undefined" &&

        crypto.randomUUID

    ) {

        return crypto.randomUUID();

    }

    return (

        Date.now().toString(36) +

        Math.random().toString(36).substring(2)

    );

}

function clone(value) {

    return JSON.parse(

        JSON.stringify(value)

    );

}

export const StrategyState = Object.freeze({

    REGISTERED: "registered",

    ENABLED: "enabled",

    DISABLED: "disabled",

    DEPRECATED: "deprecated"

});

export default class ExecutionStrategyRegistry {

    constructor({

        diagnostics = null,

        eventBus = null

    } = {}) {

        this.id = uuid();

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

        /**
         * =====================================================
         * Registry
         * =====================================================
         */

        this.strategies = new Map();

        /**
         * =====================================================
         * Categories
         * =====================================================
         */

        this.categories = new Map();

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            registered: 0,

            enabled: 0,

            disabled: 0,

            deprecated: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "ExecutionStrategyRegistry initialized."

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
     * Register Strategy
     * =====================================================
     */

    register({

        id,

        name,

        category,

        version = "1.0.0",

        description = "",

        priority = 100,

        supportedCapabilities = [],

        supportedEnvironments = [],

        handler = null,

        metadata = {}

    }) {

        if (!id) {

            throw new Error(

                "Strategy id required."

            );

        }

        if (

            this.strategies.has(id)

        ) {

            throw new Error(

                `Execution strategy '${id}' already registered.`

            );

        }

        const strategy = {

            id,

            name,

            category,

            version,

            description,

            priority,

            supportedCapabilities:

                clone(supportedCapabilities),

            supportedEnvironments:

                clone(supportedEnvironments),

            handler,

            metadata:

                clone(metadata),

            state:

                StrategyState.REGISTERED,

            registeredAt:

                Date.now()

        };

        this.strategies.set(

            id,

            strategy

        );

        if (

            !this.categories.has(category)

        ) {

            this.categories.set(

                category,

                new Set()

            );

        }

        this.categories

            .get(category)

            .add(id);

        this.metrics.registered++;

        this.record(

            "Execution strategy registered.",

            {

                strategy: id,

                category

            }

        );

        this.publish(

            "execution.strategy.registered",

            {

                strategy: id

            }

        );

        return strategy;

    }

    /**
     * =====================================================
     * Lookup
     * =====================================================
     */

    get(strategyId) {

        return this.strategies.get(

            strategyId

        );

    }

    has(strategyId) {

        return this.strategies.has(

            strategyId

        );

    }

    getAll() {

        return [

            ...this.strategies.values()

        ];

    }

    getCategories() {

        return [

            ...this.categories.keys()

        ];

    }

    getStrategiesByCategory(category) {

        const ids =

            this.categories.get(category);

        if (!ids) {

            return [];

        }

        return [...ids]

            .map(id =>

                this.get(id)

            );

    }

        /**
     * =====================================================
     * Strategy Validation
     * =====================================================
     */

    validate(strategyId) {

        const strategy = this.get(strategyId);

        if (!strategy) {

            throw new Error(

                `Execution strategy '${strategyId}' not found.`

            );

        }

        if (

            strategy.state ===

            StrategyState.DISABLED

        ) {

            throw new Error(

                `Execution strategy '${strategyId}' is disabled.`

            );

        }

        if (

            strategy.state ===

            StrategyState.DEPRECATED

        ) {

            throw new Error(

                `Execution strategy '${strategyId}' is deprecated.`

            );

        }

        return true;

    }

    /**
     * =====================================================
     * Enable Strategy
     * =====================================================
     */

    enable(strategyId) {

        const strategy = this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.state = StrategyState.ENABLED;

        strategy.enabledAt = Date.now();

        this.metrics.enabled++;

        this.record(

            "Execution strategy enabled.",

            {

                strategy: strategyId

            }

        );

        this.publish(

            "execution.strategy.enabled",

            {

                strategy: strategyId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Disable Strategy
     * =====================================================
     */

    disable(strategyId) {

        const strategy = this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.state = StrategyState.DISABLED;

        strategy.disabledAt = Date.now();

        this.metrics.disabled++;

        this.record(

            "Execution strategy disabled.",

            {

                strategy: strategyId

            }

        );

        this.publish(

            "execution.strategy.disabled",

            {

                strategy: strategyId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Deprecate Strategy
     * =====================================================
     */

    deprecate(strategyId) {

        const strategy = this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.state = StrategyState.DEPRECATED;

        strategy.deprecatedAt = Date.now();

        this.metrics.deprecated++;

        this.record(

            "Execution strategy deprecated.",

            {

                strategy: strategyId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Strategy Discovery
     * =====================================================
     */

    discover({

        category = null,

        state = StrategyState.ENABLED,

        capability = null,

        environment = null

    } = {}) {

        return this.getAll()

            .filter(strategy => {

                if (

                    state &&

                    strategy.state !== state

                ) {

                    return false;

                }

                if (

                    category &&

                    strategy.category !== category

                ) {

                    return false;

                }

                if (

                    capability &&

                    !strategy.supportedCapabilities.includes(

                        capability

                    )

                ) {

                    return false;

                }

                if (

                    environment &&

                    !strategy.supportedEnvironments.includes(

                        environment

                    )

                ) {

                    return false;

                }

                return true;

            });

    }

    /**
     * =====================================================
     * Match Strategy
     * =====================================================
     */

    match({

        capability,

        environment

    }) {

        const matches = this.discover({

            capability,

            environment

        });

        return matches.sort(

            (a, b) =>

                a.priority - b.priority

        );

    }

    /**
     * =====================================================
     * Best Strategy
     * =====================================================
     */

    select({

        capability,

        environment

    }) {

        return this.match({

            capability,

            environment

        })[0] || null;

    }

    /**
     * =====================================================
     * Registry Health
     * =====================================================
     */

    getHealth() {

        return {

            total:

                this.strategies.size,

            enabled:

                this.discover().length,

            disabled:

                this.discover({

                    state:

                        StrategyState.DISABLED

                }).length,

            deprecated:

                this.discover({

                    state:

                        StrategyState.DEPRECATED

                }).length

        };

    }

    /**
     * =====================================================
     * Registry Statistics
     * =====================================================
     */

    getStatistics() {

        return {

            metrics:

                clone(this.metrics),

            totalStrategies:

                this.strategies.size,

            categories:

                this.categories.size,

            enabled:

                this.discover().length

        };

    }

        /**
     * =====================================================
     * Record Strategy Execution
     * =====================================================
     */

    recordExecution(

        strategyId,

        {

            success = true,

            durationMs = 0,

            provider = null

        } = {}

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.metrics ??= {

            executions: 0,

            successes: 0,

            failures: 0,

            totalExecutionMs: 0,

            averageExecutionMs: 0

        };

        strategy.metrics.executions++;

        strategy.metrics.totalExecutionMs +=

            durationMs;

        strategy.metrics.averageExecutionMs =

            Math.round(

                strategy.metrics.totalExecutionMs /

                strategy.metrics.executions

            );

        if (success) {

            strategy.metrics.successes++;

        }

        else {

            strategy.metrics.failures++;

        }

        strategy.lastExecution = {

            timestamp: Date.now(),

            success,

            durationMs,

            provider

        };

        this.record(

            "Execution strategy metrics updated.",

            {

                strategy: strategyId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Success Rate
     * =====================================================
     */

    getSuccessRate(

        strategyId

    ) {

        const strategy =

            this.get(strategyId);

        if (

            !strategy ||

            !strategy.metrics ||

            strategy.metrics.executions === 0

        ) {

            return 0;

        }

        return Number(

            (

                strategy.metrics.successes /

                strategy.metrics.executions

            ) * 100

        ).toFixed(2);

    }

    /**
     * =====================================================
     * Performance Score
     * =====================================================
     */

    calculatePerformanceScore(

        strategyId

    ) {

        const strategy =

            this.get(strategyId);

        if (

            !strategy ||

            !strategy.metrics

        ) {

            return 0;

        }

        let score = 100;

        score +=

            Number(

                this.getSuccessRate(

                    strategyId

                )

            ) * 0.5;

        score -=

            strategy.metrics.averageExecutionMs /

            1000;

        score -=

            strategy.metrics.failures * 2;

        return Math.max(

            Math.round(score),

            0

        );

    }

    /**
     * =====================================================
     * Strategy Affinity
     * =====================================================
     */

    calculateAffinity(

        strategyId,

        workload = {}

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return 0;

        }

        let affinity = 0;

        if (

            workload.environment &&

            strategy.supportedEnvironments.includes(

                workload.environment

            )

        ) {

            affinity += 25;

        }

        if (

            workload.capability &&

            strategy.supportedCapabilities.includes(

                workload.capability

            )

        ) {

            affinity += 35;

        }

        affinity +=

            this.calculatePerformanceScore(

                strategyId

            ) * 0.4;

        return Math.round(

            affinity

        );

    }

    /**
     * =====================================================
     * Fallback Chain
     * =====================================================
     */

    buildFallbackChain(

        workload = {}

    ) {

        return this.match(workload)

            .sort(

                (a, b) =>

                    this.calculateAffinity(

                        b.id,

                        workload

                    ) -

                    this.calculateAffinity(

                        a.id,

                        workload

                    )

            )

            .map(

                (strategy, index) => ({

                    strategy:

                        strategy.id,

                    priority:

                        index + 1,

                    affinity:

                        this.calculateAffinity(

                            strategy.id,

                            workload

                        )

                })

            );

    }

    /**
     * =====================================================
     * Load-Aware Selection
     * =====================================================
     */

    selectOptimal(

        workload = {}

    ) {

        const chain =

            this.buildFallbackChain(

                workload

            );

        return chain[0] || null;

    }

    /**
     * =====================================================
     * Adaptive Priority
     * =====================================================
     */

    rebalancePriorities() {

        this.getAll()

            .sort(

                (a, b) =>

                    this.calculatePerformanceScore(

                        b.id

                    ) -

                    this.calculatePerformanceScore(

                        a.id

                    )

            )

            .forEach(

                (strategy, index) => {

                    strategy.priority =

                        index + 1;

                }

            );

        this.record(

            "Execution strategy priorities rebalanced."

        );

        return true;

    }

    /**
     * =====================================================
     * Strategy Leaderboard
     * =====================================================
     */

    getLeaderboard() {

        return this.getAll()

            .map(strategy => ({

                id:

                    strategy.id,

                name:

                    strategy.name,

                score:

                    this.calculatePerformanceScore(

                        strategy.id

                    ),

                successRate:

                    this.getSuccessRate(

                        strategy.id

                    ),

                averageExecutionMs:

                    strategy.metrics?.averageExecutionMs ||

                    0

            }))

            .sort(

                (a, b) =>

                    b.score -

                    a.score

            );

    }

        /**
     * =====================================================
     * Install Strategy
     * =====================================================
     */

    install(manifest = {}) {

        if (!manifest.id) {

            throw new Error(

                "Execution strategy manifest requires an id."

            );

        }

        const strategy = this.register({

            id: manifest.id,

            name: manifest.name,

            category: manifest.category,

            version: manifest.version,

            description: manifest.description,

            priority: manifest.priority,

            supportedCapabilities:

                manifest.supportedCapabilities || [],

            supportedEnvironments:

                manifest.supportedEnvironments || [],

            handler: manifest.handler,

            metadata: manifest.metadata || {}

        });

        strategy.manifest = clone(manifest);

        strategy.installedAt = Date.now();

        this.enable(strategy.id);

        this.record(

            "Execution strategy installed.",

            {

                strategy: strategy.id

            }

        );

        return strategy;

    }

    /**
     * =====================================================
     * Uninstall Strategy
     * =====================================================
     */

    uninstall(strategyId) {

        const strategy = this.get(strategyId);

        if (!strategy) {

            return false;

        }

        this.strategies.delete(strategyId);

        if (

            this.categories.has(strategy.category)

        ) {

            this.categories

                .get(strategy.category)

                .delete(strategyId);

        }

        this.record(

            "Execution strategy uninstalled.",

            {

                strategy: strategyId

            }

        );

        this.publish(

            "execution.strategy.uninstalled",

            {

                strategy: strategyId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Upgrade Strategy
     * =====================================================
     */

    upgrade(

        strategyId,

        version,

        metadata = {}

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.version = version;

        strategy.metadata = {

            ...strategy.metadata,

            ...metadata

        };

        strategy.updatedAt = Date.now();

        this.record(

            "Execution strategy upgraded.",

            {

                strategy: strategyId,

                version

            }

        );

        return strategy;

    }

    /**
     * =====================================================
     * Strategy Dependencies
     * =====================================================
     */

    setDependencies(

        strategyId,

        dependencies = []

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.dependencies =

            clone(dependencies);

        return true;

    }

    resolveDependencies(

        strategyId,

        resolved = new Set(),

        unresolved = new Set()

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return resolved;

        }

        unresolved.add(strategyId);

        for (

            const dependency of

            strategy.dependencies || []

        ) {

            if (

                !resolved.has(dependency)

            ) {

                if (

                    unresolved.has(dependency)

                ) {

                    throw new Error(

                        `Circular execution strategy dependency detected: ${dependency}`

                    );

                }

                this.resolveDependencies(

                    dependency,

                    resolved,

                    unresolved

                );

            }

        }

        unresolved.delete(strategyId);

        resolved.add(strategyId);

        return resolved;

    }

    /**
     * =====================================================
     * Strategy Aliases
     * =====================================================
     */

    registerAlias(

        strategyId,

        alias

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.aliases ??= [];

        if (

            !strategy.aliases.includes(alias)

        ) {

            strategy.aliases.push(alias);

        }

        return true;

    }

    findByAlias(alias) {

        return this.getAll().find(

            strategy =>

                strategy.aliases?.includes(alias)

        ) || null;

    }

    /**
     * =====================================================
     * Strategy Tags
     * =====================================================
     */

    addTags(

        strategyId,

        tags = []

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.metadata.tags ??= [];

        strategy.metadata.tags = [

            ...new Set([

                ...strategy.metadata.tags,

                ...tags

            ])

        ];

        return true;

    }

    /**
     * =====================================================
     * Execution Quotas
     * =====================================================
     */

    configureQuota(

        strategyId,

        {

            maxConcurrent = Infinity,

            maxPerMinute = Infinity

        } = {}

    ) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return false;

        }

        strategy.quota = {

            maxConcurrent,

            maxPerMinute

        };

        return true;

    }

    /**
     * =====================================================
     * Rate Limit Validation
     * =====================================================
     */

    validateQuota(strategyId) {

        const strategy =

            this.get(strategyId);

        if (

            !strategy ||

            !strategy.quota

        ) {

            return true;

        }

        strategy.runtime ??= {

            active: 0,

            minuteExecutions: 0

        };

        return (

            strategy.runtime.active <

            strategy.quota.maxConcurrent &&

            strategy.runtime.minuteExecutions <

            strategy.quota.maxPerMinute

        );

    }

    /**
     * =====================================================
     * Export Manifest
     * =====================================================
     */

    exportManifest(strategyId) {

        const strategy =

            this.get(strategyId);

        if (!strategy) {

            return null;

        }

        return clone(strategy);

    }

    /**
     * =====================================================
     * Export Registry Manifest
     * =====================================================
     */

    exportRegistryManifest() {

        return this.getAll()

            .map(strategy =>

                this.exportManifest(

                    strategy.id

                )

            );

    }

        /**
     * =====================================================
     * Registry Integrity Verification
     * =====================================================
     */

    verifyIntegrity() {

        const issues = [];

        this.getAll().forEach(strategy => {

            try {

                this.validate(strategy.id);

            }

            catch (error) {

                issues.push({

                    strategy: strategy.id,

                    issue: error.message

                });

            }

        });

        return {

            healthy: issues.length === 0,

            issues

        };

    }

    /**
     * =====================================================
     * Compatibility Matrix
     * =====================================================
     */

    generateCompatibilityMatrix() {

        const matrix = {};

        this.getAll().forEach(strategy => {

            matrix[strategy.id] = {

                version:

                    strategy.version,

                state:

                    strategy.state,

                capabilities:

                    clone(strategy.supportedCapabilities),

                environments:

                    clone(strategy.supportedEnvironments),

                dependencies:

                    clone(strategy.dependencies || []),

                compatible:

                    strategy.state ===

                    StrategyState.ENABLED

            };

        });

        return matrix;

    }

    /**
     * =====================================================
     * Strategy Fingerprint
     * =====================================================
     */

    getFingerprint() {

        return {

            registryId:

                this.id,

            generatedAt:

                Date.now(),

            strategyCount:

                this.strategies.size,

            fingerprint:

                this.getAll()

                    .map(strategy => ({

                        id:

                            strategy.id,

                        version:

                            strategy.version,

                        state:

                            strategy.state

                    }))

        };

    }

    /**
     * =====================================================
     * Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            id:

                this.id,

            timestamp:

                Date.now(),

            metrics:

                clone(this.metrics),

            registry:

                this.exportRegistryManifest()

        };

    }

    /**
     * =====================================================
     * Restore Snapshot
     * =====================================================
     */

    restore(snapshot) {

        this.strategies.clear();

        this.categories.clear();

        this.metrics =

            clone(snapshot.metrics);

        snapshot.registry.forEach(strategy => {

            this.strategies.set(

                strategy.id,

                clone(strategy)

            );

            if (

                !this.categories.has(

                    strategy.category

                )

            ) {

                this.categories.set(

                    strategy.category,

                    new Set()

                );

            }

            this.categories

                .get(

                    strategy.category

                )

                .add(

                    strategy.id

                );

        });

        this.record(

            "Execution strategy registry restored."

        );

        return this;

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

            integrity:

                this.verifyIntegrity(),

            statistics:

                this.getStatistics(),

            health:

                this.getHealth(),

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Registry Health
     * =====================================================
     */

    health() {

        return {

            healthy:

                this.verifyIntegrity().healthy,

            strategyCount:

                this.strategies.size,

            categories:

                this.categories.size,

            integrity:

                this.verifyIntegrity(),

            statistics:

                this.getStatistics()

        };

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

            "ExecutionStrategyRegistry",

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
     * Serialization
     * =====================================================
     */

    exportState() {

        return {

            id:

                this.id,

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline),

            registry:

                this.exportRegistryManifest()

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

        options = {}

    ) {

        const data =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const registry =

            new ExecutionStrategyRegistry(

                options

            );

        registry.id =

            data.id;

        registry.metrics =

            clone(data.metrics);

        registry.timeline =

            clone(data.timeline);

        data.registry.forEach(strategy => {

            registry.strategies.set(

                strategy.id,

                strategy

            );

            if (

                !registry.categories.has(

                    strategy.category

                )

            ) {

                registry.categories.set(

                    strategy.category,

                    new Set()

                );

            }

            registry.categories

                .get(

                    strategy.category

                )

                .add(

                    strategy.id

                );

        });

        return registry;

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name:

                "ExecutionStrategyRegistry",

            version:

                "3.0.0-alpha.1",

            registryId:

                this.id,

            strategyCount:

                this.strategies.size,

            statistics:

                this.getStatistics()

        };

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            info:

                this.getInfo(),

            health:

                this.health(),

            audit:

                this.exportAuditReport(),

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(

        options = {}

    ) {

        return new ExecutionStrategyRegistry(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[ExecutionStrategyRegistry Strategies=${this.strategies.size} Categories=${this.categories.size}]`;

    }

}