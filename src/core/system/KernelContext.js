/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * KernelContext.js
 *
 * Description:
 * AstraMind Operating System Kernel
 *
 * The KernelContext is the authoritative runtime container
 * for AstraMind OS.
 *
 * Responsibilities:
 * • Dependency Injection
 * • Service Registry
 * • Kernel Lifecycle
 * • Runtime Coordination
 * • Health Aggregation
 * • Diagnostics
 * • System Integration
 *
 * ============================================================================
 */

import PolicyEngine from "../policy/PolicyEngine.js";
import IdGenerator from "./IdGenerator.js";
import SystemClock from "./SystemClock.js";
import DefaultEventRegistry from "./SystemEvents.js";
import RuntimeManager from "./ExecutionConstants.js";

/**
 * ============================================================================
 * Kernel State
 * ============================================================================
 */

export const KernelState = Object.freeze({

    CREATED: "created",

    BOOTING: "booting",

    INITIALIZING: "initializing",

    VALIDATING: "validating",

    STARTING: "starting",

    RUNNING: "running",

    STOPPING: "stopping",

    SHUTTING_DOWN: "shutting_down",

    STOPPED: "stopped",

    FAILED: "failed"

});

/**
 * ============================================================================
 * Service Descriptor
 * ============================================================================
 */

export class ServiceDescriptor {

    constructor({

        name,

        instance,

        singleton = true,

        lazy = false,

        replaceable = true,

        priority = 100,

        dependsOn = [],

        metadata = {}

    }) {

        this.name = name;

        this.instance = instance;

        this.singleton = singleton;

        this.lazy = lazy;

        this.replaceable = replaceable;

        this.priority = priority;

        this.dependsOn = [...dependsOn];

        this.metadata = {

            ...metadata

        };

        this.createdAt = Date.now();

        this.initialized = false;

        this.started = false;

        this.healthy = true;

        this.resolutions = 0;

    }

}

/**
 * ============================================================================
 * Kernel Context
 * ============================================================================
 */

export default class KernelContext {

    constructor({

        services = {},

        profile = "development"

    } = {}) {

        this.profile = profile;

        this.state = KernelState.CREATED;

        /**
         * ----------------------------------------------------
         * Registries
         * ----------------------------------------------------
         */

        this.serviceRegistry = new Map();

        this.singletonCache = new Map();

        /**
         * ----------------------------------------------------
         * Runtime Metadata
         * ----------------------------------------------------
         */

        this.metadata = {

            version: "3.0.0-alpha.2",

            profile,

            createdAt: Date.now()

        };

        /**
         * ----------------------------------------------------
         * Runtime Metrics
         * ----------------------------------------------------
         */

        this.metrics = {

            registrations: 0,

            resolutions: 0,

            initializations: 0,

            startups: 0,

            shutdowns: 0,

            healthChecks: 0

        };

        /**
         * ----------------------------------------------------
         * Kernel Timeline
         * ----------------------------------------------------
         */

        this.eventTimeline = [];

        /**
         * ----------------------------------------------------
         * Runtime Flags
         * ----------------------------------------------------
         */

        this.bootStartedAt = null;

        this.bootCompletedAt = null;

        /**
         * ----------------------------------------------------
         * Register Core Authorities
         * ----------------------------------------------------
         */

        this.registerCoreServices(services);

        /**
         * ----------------------------------------------------
         * Clock Reference
         * ----------------------------------------------------
         */

        this.clock = this.get("clock");

        this.record(

            "Kernel constructed."

        );

    }

    /**
     * =====================================================
     * Register Core Authorities
     * =====================================================
     */

    registerCoreServices(overrides = {}) {

        this.register({

            name: "runtime",

            instance:

                overrides.runtime ||

                RuntimeManager,

            priority: 10

        });

        this.register({

            name: "clock",

            instance:

                overrides.clock ||

                SystemClock.create(),

            priority: 20,

            dependsOn: [

                "runtime"

            ]

        });

        this.register({

            name: "events",

            instance:

                overrides.events ||

                DefaultEventRegistry,

            priority: 30,

            dependsOn: [

                "runtime",

                "clock"

            ]

        });

        this.register({

            name: "identity",

            instance:

                overrides.identity ||

                IdGenerator.create(),

            priority: 40,

            dependsOn: [

                "runtime",

                "clock"

            ]

        });

        this.register({

            name: "policy",

            instance:

                overrides.policy ||

                PolicyEngine.create(),

            priority: 50,

            dependsOn: [

                "runtime",

                "events",

                "clock",

                "identity"

            ]

        });

    }

    /**
     * =====================================================
     * Kernel Time
     * =====================================================
     */

    now() {

        return this.clock

            ? this.clock.now()

            : Date.now();

    }

    /**
     * =====================================================
     * Timeline Recording
     * =====================================================
     */

    record(

        event,

        metadata = {}

    ) {

        this.eventTimeline.push({

            timestamp:

                this.now(),

            state:

                this.state,

            event,

            metadata

        });

    }

    /**
     * =====================================================
     * Kernel Metadata
     * =====================================================
     */

    getMetadata() {

        return {

            ...this.metadata

        };

    }

    /**
     * =====================================================
     * Current State
     * =====================================================
     */

    getState() {

        return this.state;

    }

    /**
     * =====================================================
     * State Transition
     * =====================================================
     */

    setState(

        state

    ) {

        this.state = state;

        this.record(

            `Kernel state → ${state}`

        );

        return state;

    }

    /**
     * =====================================================
     * Timeline Export
     * =====================================================
     */

    getTimeline() {

        return [

            ...this.eventTimeline

        ];

    }

    /**
     * =====================================================
     * Basic Kernel Information
     * =====================================================
     */

    getInfo() {

        return {

            version:

                this.metadata.version,

            profile:

                this.profile,

            state:

                this.state,

            services:

                this.serviceRegistry.size

        };

    }

    /**
     * =====================================================
     * Register Service
     * =====================================================
     */

    register({

        name,

        instance,

        singleton = true,

        lazy = false,

        replaceable = true,

        priority = 100,

        dependsOn = [],

        metadata = {}

    }) {

        if (this.serviceRegistry.has(name)) {

            throw new Error(

                `Service already registered: ${name}`

            );

        }

        const descriptor = new ServiceDescriptor({

            name,

            instance,

            singleton,

            lazy,

            replaceable,

            priority,

            dependsOn,

            metadata

        });

        this.serviceRegistry.set(

            name,

            descriptor

        );

        this.metrics.registrations++;

        this.record(

            "Service registered.",

            {

                service: name,

                priority,

                dependsOn

            }

        );

        return descriptor;

    }

    /**
     * =====================================================
     * Register Lazy Factory
     * =====================================================
     */

    registerFactory({

        name,

        factory,

        singleton = true,

        priority = 100,

        dependsOn = [],

        metadata = {}

    }) {

        return this.register({

            name,

            instance: factory,

            singleton,

            lazy: true,

            priority,

            dependsOn,

            metadata

        });

    }

    /**
     * =====================================================
     * Resolve Service
     * =====================================================
     */

    resolve(

        name,

        requester = "unknown"

    ) {

        const descriptor =

            this.serviceRegistry.get(name);

        if (!descriptor) {

            throw new Error(

                `Unknown service: ${name}`

            );

        }

        descriptor.resolutions++;

        this.metrics.resolutions++;

        this.record(

            "Service resolved.",

            {

                service: name,

                requester

            }

        );

        if (!descriptor.lazy) {

            return descriptor.instance;

        }

        if (

            descriptor.singleton

        ) {

            if (

                !this.singletonCache.has(name)

            ) {

                this.singletonCache.set(

                    name,

                    descriptor.instance()

                );

            }

            return this.singletonCache.get(

                name

            );

        }

        return descriptor.instance();

    }

    /**
     * =====================================================
     * Alias
     * =====================================================
     */

    get(

        name,

        requester = "unknown"

    ) {

        return this.resolve(

            name,

            requester

        );

    }

    /**
     * =====================================================
     * Replace Service
     * =====================================================
     */

    replace(

        name,

        instance

    ) {

        const descriptor =

            this.serviceRegistry.get(name);

        if (!descriptor) {

            throw new Error(

                `Unknown service: ${name}`

            );

        }

        if (

            !descriptor.replaceable

        ) {

            throw new Error(

                `Service is locked: ${name}`

            );

        }

        descriptor.instance = instance;

        descriptor.initialized = false;

        descriptor.started = false;

        descriptor.healthy = true;

        this.singletonCache.delete(name);

        this.record(

            "Service replaced.",

            {

                service: name

            }

        );

        return descriptor;

    }

    /**
     * =====================================================
     * Remove Service
     * =====================================================
     */

    unregister(name) {

        this.singletonCache.delete(name);

        this.record(

            "Service unregistered.",

            {

                service: name

            }

        );

        return this.serviceRegistry.delete(name);

    }

    /**
     * =====================================================
     * Has Service
     * =====================================================
     */

    has(name) {

        return this.serviceRegistry.has(name);

    }

    /**
     * =====================================================
     * Service Descriptor
     * =====================================================
     */

    descriptor(name) {

        return this.serviceRegistry.get(name) || null;

    }

    /**
     * =====================================================
     * Service Names
     * =====================================================
     */

    serviceNames() {

        return Array.from(

            this.serviceRegistry.keys()

        );

    }

    /**
     * =====================================================
     * Service Descriptors
     * =====================================================
     */

    descriptors() {

        return Array.from(

            this.serviceRegistry.values()

        );

    }

    /**
     * =====================================================
     * Ordered Descriptors
     *
     * Services execute according to priority.
     * Dependency-aware sorting will be added later.
     * =====================================================
     */

    orderedDescriptors() {

        return this.descriptors()

            .sort(

                (

                    a,

                    b

                ) =>

                    a.priority -

                    b.priority

            );

    }

    /**
     * =====================================================
     * List Services
     * =====================================================
     */

    listServices() {

        return this.orderedDescriptors()

            .map(

                descriptor => ({

                    name:

                        descriptor.name,

                    priority:

                        descriptor.priority,

                    singleton:

                        descriptor.singleton,

                    lazy:

                        descriptor.lazy,

                    initialized:

                        descriptor.initialized,

                    started:

                        descriptor.started,

                    healthy:

                        descriptor.healthy,

                    resolutions:

                        descriptor.resolutions,

                    dependsOn:

                        [

                            ...descriptor.dependsOn

                        ]

                })

            );

    }

    /**
     * =====================================================
     * Dependency Validation
     * =====================================================
     */

    validateDependencies() {

        const failures = [];

        for (

            const descriptor of

            this.descriptors()

        ) {

            for (

                const dependency of

                descriptor.dependsOn

            ) {

                if (

                    !this.has(dependency)

                ) {

                    failures.push({

                        service:

                            descriptor.name,

                        missing:

                            dependency

                    });

                }

            }

        }

        return {

            healthy:

                failures.length === 0,

            failures

        };

    }

    /**
     * =====================================================
     * Service Graph
     * =====================================================
     */

    dependencyGraph() {

        return this.descriptors()

            .map(

                descriptor => ({

                    service:

                        descriptor.name,

                    dependsOn:

                        [

                            ...descriptor.dependsOn

                        ],

                    priority:

                        descriptor.priority

                })

            );

    }

        /**
     * =====================================================
     * Boot Kernel
     * =====================================================
     */

    async boot() {

        if (

            this.state !== KernelState.CREATED &&

            this.state !== KernelState.STOPPED

        ) {

            throw new Error(

                `Kernel cannot boot from state '${this.state}'.`

            );

        }

        this.bootStartedAt = this.now();

        this.setState(

            KernelState.BOOTING

        );

        this.record(

            "Kernel boot sequence started."

        );

        const dependencyValidation =

            this.validateDependencies();

        if (

            !dependencyValidation.healthy

        ) {

            this.setState(

                KernelState.FAILED

            );

            throw new Error(

                "Kernel dependency validation failed."

            );

        }

        await this.initializeServices();

        await this.validateServices();

        this.bootCompletedAt = this.now();

        this.setState(

            KernelState.STARTING

        );

        await this.startServices();

        this.setState(

            KernelState.RUNNING

        );

        this.metrics.startups++;

        this.record(

            "Kernel startup complete."

        );

        return true;

    }

    /**
     * =====================================================
     * Initialization Order
     *
     * Priority is only used as a tie-breaker.
     * =====================================================
     */

    initializationOrder() {

        return this.orderedDescriptors()

            .sort((a, b) => {

                if (

                    a.dependsOn.includes(b.name)

                ) {

                    return 1;

                }

                if (

                    b.dependsOn.includes(a.name)

                ) {

                    return -1;

                }

                return a.priority - b.priority;

            });

    }

    /**
     * =====================================================
     * Initialize Services
     * =====================================================
     */

    async initializeServices() {

        this.setState(

            KernelState.INITIALIZING

        );

        for (

            const descriptor of

            this.initializationOrder()

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelInitialize"

                );

            if (

                typeof service.initialize ===

                "function"

            ) {

                await service.initialize();

            }

            descriptor.initialized = true;

            this.metrics.initializations++;

            this.record(

                "Service initialized.",

                {

                    service:

                        descriptor.name

                }

            );

        }

    }

    /**
     * =====================================================
     * Validate Services
     * =====================================================
     */

    async validateServices() {

        this.setState(

            KernelState.VALIDATING

        );

        const failures = [];

        for (

            const descriptor of

            this.initializationOrder()

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelValidation"

                );

            if (

                typeof service.verifyIntegrity ===

                "function"

            ) {

                const result =

                    await service.verifyIntegrity();

                descriptor.healthy =

                    result.healthy !== false;

                if (

                    result.healthy === false

                ) {

                    failures.push({

                        service:

                            descriptor.name,

                        result

                    });

                }

            }

        }

        if (

            failures.length

        ) {

            this.setState(

                KernelState.FAILED

            );

            throw new Error(

                `Kernel validation failed (${failures.length} services).`

            );

        }

        this.record(

            "Kernel validation successful."

        );

    }

    /**
     * =====================================================
     * Start Services
     * =====================================================
     */

    async startServices() {

        for (

            const descriptor of

            this.initializationOrder()

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelStart"

                );

            if (

                typeof service.start ===

                "function"

            ) {

                await service.start();

            }

            descriptor.started = true;

            this.record(

                "Service started.",

                {

                    service:

                        descriptor.name

                }

            );

        }

    }

    /**
     * =====================================================
     * Ready
     * =====================================================
     */

    isReady() {

        return (

            this.state ===

            KernelState.RUNNING

        );

    }

    /**
     * =====================================================
     * Restart
     * =====================================================
     */

    async restart() {

        this.record(

            "Kernel restart requested."

        );

        await this.shutdown();

        await this.boot();

    }

    /**
     * =====================================================
     * Shutdown
     * =====================================================
     */

    async shutdown() {

        if (

            this.state ===

            KernelState.STOPPED

        ) {

            return;

        }

        this.setState(

            KernelState.STOPPING

        );

        const services =

            [...this.initializationOrder()]

                .reverse();

        for (

            const descriptor of

            services

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelShutdown"

                );

            if (

                typeof service.shutdown ===

                "function"

            ) {

                await service.shutdown();

            }

            descriptor.started = false;

            descriptor.initialized = false;

            this.record(

                "Service stopped.",

                {

                    service:

                        descriptor.name

                }

            );

        }

        this.setState(

            KernelState.SHUTTING_DOWN

        );

        this.metrics.shutdowns++;

        this.setState(

            KernelState.STOPPED

        );

        this.record(

            "Kernel shutdown complete."

        );

    }

    /**
     * =====================================================
     * Boot Duration
     * =====================================================
     */

    bootDuration() {

        if (

            !this.bootStartedAt ||

            !this.bootCompletedAt

        ) {

            return 0;

        }

        return (

            this.bootCompletedAt -

            this.bootStartedAt

        );

    }

    /**
     * =====================================================
     * Uptime
     * =====================================================
     */

    uptime() {

        if (

            this.state !==

            KernelState.RUNNING

        ) {

            return 0;

        }

        return (

            this.now() -

            this.bootCompletedAt

        );

    }

        /**
     * =====================================================
     * Kernel Health
     * =====================================================
     */

    health() {

        this.metrics.healthChecks++;

        const services = [];

        let healthy = true;

        for (const descriptor of this.initializationOrder()) {

            const service = this.resolve(

                descriptor.name,

                "KernelHealth"

            );

            let report = {

                healthy: true

            };

            if (

                typeof service.health === "function"

            ) {

                report = service.health();

            }

            descriptor.healthy =

                report.healthy !== false;

            if (!descriptor.healthy) {

                healthy = false;

            }

            services.push({

                name: descriptor.name,

                priority: descriptor.priority,

                initialized: descriptor.initialized,

                started: descriptor.started,

                healthy: descriptor.healthy,

                report

            });

        }

        return {

            healthy,

            kernelState: this.state,

            profile: this.profile,

            uptime: this.uptime(),

            services

        };

    }

    /**
     * =====================================================
     * Service Health
     * =====================================================
     */

    serviceHealth(name) {

        const descriptor =

            this.descriptor(name);

        if (!descriptor) {

            return null;

        }

        const service =

            this.resolve(

                name,

                "KernelServiceHealth"

            );

        if (

            typeof service.health === "function"

        ) {

            return service.health();

        }

        return {

            healthy: true

        };

    }

    /**
     * =====================================================
     * Kernel Diagnostics
     * =====================================================
     */

    diagnostics() {

        const diagnostics = [];

        for (

            const descriptor of

            this.initializationOrder()

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelDiagnostics"

                );

            diagnostics.push({

                service:

                    descriptor.name,

                diagnostics:

                    typeof service.debug === "function"

                        ? service.debug()

                        : {}

            });

        }

        return diagnostics;

    }

    /**
     * =====================================================
     * Kernel Integrity
     * =====================================================
     */

    verifyIntegrity() {

        const failures = [];

        for (

            const descriptor of

            this.initializationOrder()

        ) {

            const service =

                this.resolve(

                    descriptor.name,

                    "KernelIntegrity"

                );

            if (

                typeof service.verifyIntegrity ===

                "function"

            ) {

                const result =

                    service.verifyIntegrity();

                if (

                    result.healthy === false

                ) {

                    failures.push({

                        service:

                            descriptor.name,

                        result

                    });

                }

            }

        }

        return {

            healthy:

                failures.length === 0,

            failures

        };

    }

    /**
     * =====================================================
     * Runtime Statistics
     * =====================================================
     */

    statistics() {

        return {

            profile:

                this.profile,

            state:

                this.state,

            bootDuration:

                this.bootDuration(),

            uptime:

                this.uptime(),

            metrics: {

                ...this.metrics

            },

            services:

                this.serviceRegistry.size

        };

    }

    /**
     * =====================================================
     * Dependency Report
     * =====================================================
     */

    dependencyReport() {

        return this.initializationOrder()

            .map(descriptor => ({

                service:

                    descriptor.name,

                priority:

                    descriptor.priority,

                dependsOn:

                    [

                        ...descriptor.dependsOn

                    ],

                healthy:

                    descriptor.healthy,

                initialized:

                    descriptor.initialized,

                started:

                    descriptor.started,

                resolutions:

                    descriptor.resolutions

            }));

    }

    /**
     * =====================================================
     * Kernel Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            timestamp:

                this.now(),

            version:

                this.metadata.version,

            profile:

                this.profile,

            state:

                this.state,

            uptime:

                this.uptime(),

            healthy:

                this.health().healthy,

            services:

                this.serviceRegistry.size

        };

    }

    /**
     * =====================================================
     * Kernel Report
     * =====================================================
     */

    report() {

        return {

            metadata:

                this.getMetadata(),

            info:

                this.getInfo(),

            statistics:

                this.statistics(),

            health:

                this.health(),

            integrity:

                this.verifyIntegrity(),

            dependencies:

                this.dependencyReport()

        };

    }

    /**
     * =====================================================
     * Kernel Debug
     * =====================================================
     */

    debug() {

        return {

            report:

                this.report(),

            diagnostics:

                this.diagnostics(),

            timeline:

                this.getTimeline()

        };

    }

    /**
     * =====================================================
     * Service Debug
     * =====================================================
     */

    serviceDebug(name) {

        const descriptor =

            this.descriptor(name);

        if (!descriptor) {

            return null;

        }

        const service =

            this.resolve(

                name,

                "KernelServiceDebug"

            );

        return typeof service.debug === "function"

            ? service.debug()

            : {};

    }

        /**
     * =====================================================
     * Export Kernel State
     * =====================================================
     */

    exportState() {

        return {

            metadata: this.getMetadata(),

            info: this.getInfo(),

            statistics: this.statistics(),

            health: this.health(),

            profile: this.profile,

            state: this.state,

            services: this.listServices(),

            timeline: this.getTimeline()

        };

    }

    /**
     * =====================================================
     * Kernel Snapshot
     *
     * Lightweight snapshot intended for dashboards,
     * monitoring, recovery checkpoints, and telemetry.
     * =====================================================
     */

    snapshot() {

        return {

            timestamp: this.now(),

            version: this.metadata.version,

            profile: this.profile,

            state: this.state,

            uptime: this.uptime(),

            services: this.serviceRegistry.size,

            healthy: this.health().healthy

        };

    }

    /**
     * =====================================================
     * Serialize
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
     * Deserialize
     *
     * Runtime service instances are recreated from the
     * constructor. Only kernel state and metadata are
     * restored.
     * =====================================================
     */

    static deserialize(

        json,

        options = {}

    ) {

        const state =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const kernel =

            new KernelContext({

                profile: state.profile,

                ...options

            });

        kernel.state = state.state;

        kernel.metrics = {

            ...state.statistics.metrics

        };

        kernel.eventTimeline = [

            ...state.timeline

        ];

        return kernel;

    }

    /**
     * =====================================================
     * Reset Kernel
     * =====================================================
     */

    reset() {

        this.state = KernelState.CREATED;

        this.metrics = {

            registrations: 0,

            resolutions: 0,

            initializations: 0,

            startups: 0,

            shutdowns: 0,

            healthChecks: 0

        };

        this.eventTimeline = [];

        this.singletonCache.clear();

        this.bootStartedAt = null;

        this.bootCompletedAt = null;

        this.record(

            "Kernel reset."

        );

    }

    /**
     * =====================================================
     * Destroy Kernel
     * =====================================================
     */

    async destroy() {

        await this.shutdown();

        this.serviceRegistry.clear();

        this.singletonCache.clear();

        this.eventTimeline = [];

        this.state = KernelState.STOPPED;

    }

    /**
     * =====================================================
     * Public Kernel API
     *
     * Safe interface exposed to external subsystems.
     * =====================================================
     */

    api() {

        return Object.freeze({

            get: this.get.bind(this),

            has: this.has.bind(this),

            resolve: this.resolve.bind(this),

            health: this.health.bind(this),

            report: this.report.bind(this),

            statistics: this.statistics.bind(this),

            snapshot: this.snapshot.bind(this)

        });

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(

        options = {}

    ) {

        return new KernelContext(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[KernelContext profile=${this.profile} state=${this.state} services=${this.serviceRegistry.size}]`;

    }

}