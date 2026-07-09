/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * KernelRegistry.js
 *
 * Kernel Authority Registry
 *
 * Responsibilities
 * ----------------
 * • Register Authorities
 * • Register Engines
 * • Register Services
 * • Register Providers
 * • Register Workflows
 * • Register AI Models
 * • Register Runtime Components
 * • Lifecycle Management
 * • Authority Discovery
 * * Dependency Registration
 * • Diagnostics
 * • Health Monitoring
 *
 * Every executable subsystem inside AstraMind MUST register here.
 * ============================================================================
 */

import DependencyGraph from "../system/DependencyGraph.js";

export const AUTHORITY_TYPES = Object.freeze({

    AUTHORITY: "authority",

    ENGINE: "engine",

    SERVICE: "service",

    PROVIDER: "provider",

    WORKFLOW: "workflow",

    RUNTIME: "runtime",

    SECURITY: "security",

    AI: "ai",

    MEMORY: "memory"

});

class RegistryEntry {

    constructor({

        id,

        name,

        type,

        instance,

        version = "1.0.0",

        enabled = true,

        priority = 100,

        dependencies = [],

        metadata = {}

    }) {

        this.id = id;

        this.name = name;

        this.type = type;

        this.instance = instance;

        this.version = version;

        this.enabled = enabled;

        this.priority = priority;

        this.dependencies = [...dependencies];

        this.metadata = {

            ...metadata

        };

        this.registeredAt = Date.now();

        this.initialized = false;

        this.started = false;

        this.healthy = true;

        this.executions = 0;

        this.failures = 0;

    }

}

export default class KernelRegistry {

    constructor({

        kernelName = "AstraMind Kernel"

    } = {}) {

        this.kernelName = kernelName;

        /*
         * =====================================================
         * Registry Storage
         * =====================================================
         */

        this.registry = new Map();

        this.typeIndex = new Map();

        /*
         * =====================================================
         * Dependency Authority
         * =====================================================
         */

        this.dependencyGraph =

            new DependencyGraph({

                name: "Kernel Authority Graph"

            });

        /*
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            registrations: 0,

            removals: 0,

            lookups: 0,

            executions: 0

        };

        /*
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "Kernel Registry initialized."

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
     * Register Authority
     * =====================================================
     */

    register({

        id,

        name,

        type = AUTHORITY_TYPES.AUTHORITY,

        instance,

        version,

        enabled = true,

        priority = 100,

        dependencies = [],

        metadata = {}

    }) {

        if (

            this.registry.has(id)

        ) {

            throw new Error(

                `Registry entry already exists: ${id}`

            );

        }

        const entry =

            new RegistryEntry({

                id,

                name,

                type,

                instance,

                version,

                enabled,

                priority,

                dependencies,

                metadata

            });

        this.registry.set(

            id,

            entry

        );

        /*
         * Build type index.
         */

        if (

            !this.typeIndex.has(type)

        ) {

            this.typeIndex.set(

                type,

                new Set()

            );

        }

        this.typeIndex

            .get(type)

            .add(id);

        /*
         * Register with Dependency Graph.
         */

        this.dependencyGraph.registerNode({

            id,

            name,

            priority,

            metadata

        });

        for (

            const dependency of

            dependencies

        ) {

            this.dependencyGraph.registerDependency({

                service: id,

                dependency

            });

        }

        this.metrics.registrations++;

        this.record(

            "Authority registered.",

            {

                id,

                type

            }

        );

        return entry;

    }

        /**
     * =====================================================
     * Lookup Authority
     * =====================================================
     */

    get(id) {

        this.metrics.lookups++;

        return this.registry.get(id) || null;

    }

    /**
     * =====================================================
     * Alias
     * =====================================================
     */

    resolve(id) {

        return this.get(id);

    }

    /**
     * =====================================================
     * Has Authority
     * =====================================================
     */

    has(id) {

        return this.registry.has(id);

    }

    /**
     * =====================================================
     * Remove Authority
     * =====================================================
     */

    unregister(id) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        /*
         * Remove dependency node first.
         */

        this.dependencyGraph.removeNode(id);

        /*
         * Remove from type index.
         */

        const typeSet = this.typeIndex.get(entry.type);

        if (typeSet) {

            typeSet.delete(id);

            if (typeSet.size === 0) {

                this.typeIndex.delete(entry.type);

            }

        }

        this.registry.delete(id);

        this.metrics.removals++;

        this.record(

            "Authority unregistered.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Replace Authority Instance
     * =====================================================
     */

    replace(

        id,

        instance

    ) {

        const entry = this.registry.get(id);

        if (!entry) {

            throw new Error(

                `Unknown authority: ${id}`

            );

        }

        entry.instance = instance;

        entry.initialized = false;

        entry.started = false;

        entry.healthy = true;

        this.record(

            "Authority replaced.",

            {

                id

            }

        );

        return entry;

    }

    /**
     * =====================================================
     * Enable Authority
     * =====================================================
     */

    enable(id) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.enabled = true;

        this.record(

            "Authority enabled.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Disable Authority
     * =====================================================
     */

    disable(id) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.enabled = false;

        this.record(

            "Authority disabled.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Initialization State
     * =====================================================
     */

    markInitialized(id) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.initialized = true;

        this.record(

            "Authority initialized.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Started State
     * =====================================================
     */

    markStarted(id) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.started = true;

        this.record(

            "Authority started.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Healthy State
     * =====================================================
     */

    markHealthy(

        id,

        healthy = true

    ) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.healthy = healthy;

        this.record(

            "Authority health updated.",

            {

                id,

                healthy

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Execution Metrics
     * =====================================================
     */

    recordExecution(

        id,

        success = true

    ) {

        const entry = this.registry.get(id);

        if (!entry) {

            return false;

        }

        entry.executions++;

        this.metrics.executions++;

        if (!success) {

            entry.failures++;

        }

        return true;

    }

    /**
     * =====================================================
     * Registered IDs
     * =====================================================
     */

    ids() {

        return [

            ...this.registry.keys()

        ];

    }

    /**
     * =====================================================
     * Registry Entries
     * =====================================================
     */

    entries() {

        return [

            ...this.registry.values()

        ];

    }

    /**
     * =====================================================
     * Authorities By Type
     * =====================================================
     */

    byType(type) {

        const ids =

            this.typeIndex.get(type);

        if (!ids) {

            return [];

        }

        return [

            ...ids

        ].map(

            id => this.registry.get(id)

        );

    }

    /**
     * =====================================================
     * Enabled Authorities
     * =====================================================
     */

    enabledAuthorities() {

        return this.entries()

            .filter(

                authority =>

                    authority.enabled

            );

    }

        /**
     * =====================================================
     * Initialization Order
     *
     * Uses DependencyGraph authority.
     * =====================================================
     */

    initializationOrder() {

        return this.dependencyGraph

            .initializationOrder()

            .map(id => this.get(id))

            .filter(Boolean);

    }

    /**
     * =====================================================
     * Shutdown Order
     * =====================================================
     */

    shutdownOrder() {

        return this.dependencyGraph

            .shutdownOrder()

            .map(id => this.get(id))

            .filter(Boolean);

    }

    /**
     * =====================================================
     * Initialize Authorities
     * =====================================================
     */

    async initializeAll() {

        const initialized = [];

        for (

            const authority of

            this.initializationOrder()

        ) {

            if (

                !authority.enabled ||

                authority.initialized

            ) {

                continue;

            }

            if (

                authority.instance &&

                typeof authority.instance.initialize === "function"

            ) {

                await authority.instance.initialize();

            }

            authority.initialized = true;

            initialized.push(

                authority.id

            );

            this.record(

                "Authority initialized.",

                {

                    id: authority.id

                }

            );

        }

        return initialized;

    }

    /**
     * =====================================================
     * Start Authorities
     * =====================================================
     */

    async startAll() {

        const started = [];

        for (

            const authority of

            this.initializationOrder()

        ) {

            if (

                !authority.enabled ||

                authority.started

            ) {

                continue;

            }

            if (

                authority.instance &&

                typeof authority.instance.start === "function"

            ) {

                await authority.instance.start();

            }

            authority.started = true;

            started.push(

                authority.id

            );

            this.record(

                "Authority started.",

                {

                    id: authority.id

                }

            );

        }

        return started;

    }

    /**
     * =====================================================
     * Shutdown Authorities
     * =====================================================
     */

    async shutdownAll() {

        const stopped = [];

        for (

            const authority of

            this.shutdownOrder()

        ) {

            if (

                authority.instance &&

                typeof authority.instance.shutdown === "function"

            ) {

                await authority.instance.shutdown();

            }

            authority.started = false;

            authority.initialized = false;

            stopped.push(

                authority.id

            );

            this.record(

                "Authority shutdown.",

                {

                    id: authority.id

                }

            );

        }

        return stopped;

    }

    /**
     * =====================================================
     * Registry Health
     * =====================================================
     */

    health() {

        const authorities =

            this.entries();

        return {

            kernel:

                this.kernelName,

            healthy:

                authorities.every(

                    authority => authority.healthy

                ),

            authorityCount:

                authorities.length,

            initialized:

                authorities.filter(

                    authority => authority.initialized

                ).length,

            started:

                authorities.filter(

                    authority => authority.started

                ).length,

            enabled:

                authorities.filter(

                    authority => authority.enabled

                ).length,

            dependencyGraph:

                this.dependencyGraph.health(),

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Validate Registry
     * =====================================================
     */

    validate() {

        const dependencyValidation =

            this.dependencyGraph.validate();

        const duplicateNames = [];

        const names = new Set();

        for (

            const authority of

            this.entries()

        ) {

            if (

                names.has(authority.name)

            ) {

                duplicateNames.push(

                    authority.name

                );

            }

            names.add(

                authority.name

            );

        }

        return {

            valid:

                dependencyValidation.valid &&

                duplicateNames.length === 0,

            dependencyValidation,

            duplicateNames

        };

    }

    /**
     * =====================================================
     * Verify Integrity
     * =====================================================
     */

    verifyIntegrity() {

        const validation =

            this.validate();

        return {

            healthy:

                validation.valid,

            validation,

            dependencyGraph:

                this.dependencyGraph.verifyIntegrity()

        };

    }

    /**
     * =====================================================
     * Registry Summary
     * =====================================================
     */

    summary() {

        return {

            kernel:

                this.kernelName,

            authorities:

                this.registry.size,

            healthy:

                this.health().healthy,

            initialized:

                this.health().initialized,

            started:

                this.health().started,

            enabled:

                this.health().enabled

        };

    }

        /**
     * =====================================================
     * Registry Diagnostics
     * =====================================================
     */

    diagnostics() {

        return {

            kernel: this.kernelName,

            timestamp: Date.now(),

            summary: this.summary(),

            validation: this.validate(),

            dependencyGraph:

                this.dependencyGraph.statistics(),

            authorities:

                this.entries().map(entry => ({

                    id: entry.id,

                    name: entry.name,

                    type: entry.type,

                    version: entry.version,

                    enabled: entry.enabled,

                    initialized: entry.initialized,

                    started: entry.started,

                    healthy: entry.healthy,

                    priority: entry.priority,

                    executions: entry.executions,

                    failures: entry.failures,

                    dependencies: [

                        ...entry.dependencies

                    ]

                })),

            metrics: {

                ...this.metrics

            },

            timeline: [

                ...this.timeline

            ]

        };

    }

    /**
     * =====================================================
     * Registry Report
     * =====================================================
     */

    report() {

        return {

            kernel: this.kernelName,

            summary: this.summary(),

            health: this.health(),

            integrity: this.verifyIntegrity(),

            diagnostics: this.diagnostics()

        };

    }

    /**
     * =====================================================
     * Export Registry
     * =====================================================
     */

    exportRegistry() {

        return {

            kernelName: this.kernelName,

            authorities: this.entries().map(entry => ({

                id: entry.id,

                name: entry.name,

                type: entry.type,

                version: entry.version,

                enabled: entry.enabled,

                priority: entry.priority,

                dependencies: [

                    ...entry.dependencies

                ],

                metadata: {

                    ...entry.metadata

                }

            })),

            metrics: {

                ...this.metrics

            },

            dependencyGraph:

                this.dependencyGraph.exportGraph()

        };

    }

    /**
     * =====================================================
     * Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            timestamp: Date.now(),

            kernel: this.kernelName,

            authorityCount: this.registry.size,

            summary: this.summary(),

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Reset Metrics
     * =====================================================
     */

    resetMetrics() {

        this.metrics = {

            registrations: 0,

            removals: 0,

            lookups: 0,

            executions: 0

        };

        this.record(

            "Registry metrics reset."

        );

    }

    /**
     * =====================================================
     * Clear Registry
     * =====================================================
     */

    async clear() {

        await this.shutdownAll();

        this.registry.clear();

        this.typeIndex.clear();

        this.dependencyGraph.clear();

        this.timeline = [];

        this.resetMetrics();

        this.record(

            "Registry cleared."

        );

    }

    /**
     * =====================================================
     * Serialize
     * =====================================================
     */

    serialize(pretty = true) {

        return JSON.stringify(

            this.exportRegistry(),

            null,

            pretty ? 2 : 0

        );

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(options = {}) {

        return new KernelRegistry(options);

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[KernelRegistry "${this.kernelName}" Authorities=${this.registry.size} Healthy=${this.health().healthy}]`;

    }

}