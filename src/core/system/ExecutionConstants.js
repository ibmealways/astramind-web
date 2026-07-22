/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * ExecutionConstants.js
 *
 * Description:
 * Runtime Configuration Authority
 *
 * This file defines the default operational limits,
 * thresholds, and execution parameters used throughout
 * AstraMind OS.
 *
 * No subsystem should hardcode runtime values.
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * System Version
 * ============================================================================
 */

export const RuntimeVersion = Object.freeze({

    major: 3,

    minor: 0,

    patch: 0,

    stage: "alpha",

    build: 1

});

/**
 * ============================================================================
 * Mission Runtime
 * ============================================================================
 */

export const MissionRuntime = Object.freeze({

    MAX_ACTIVE_MISSIONS: 100,

    MAX_QUEUE_SIZE: 1000,

    DEFAULT_PRIORITY: 50,

    DEFAULT_TIMEOUT_MS: 300000,

    MAX_TIMEOUT_MS: 86400000,

    MAX_RETRIES: 3,

    AUTO_ARCHIVE_DAYS: 30

});

/**
 * ============================================================================
 * Workflow Runtime
 * ============================================================================
 */

export const WorkflowRuntime = Object.freeze({

    MAX_STEPS: 500,

    MAX_PARALLEL_STEPS: 32,

    MAX_RETRY_PER_STEP: 5,

    DEFAULT_STEP_TIMEOUT_MS: 60000,

    MAX_RECURSION_DEPTH: 50

});

/**
 * ============================================================================
 * Execution Runtime
 * ============================================================================
 */

export const ExecutionRuntime = Object.freeze({

    MAX_CONCURRENT_EXECUTIONS: 128,

    DEFAULT_EXECUTION_TIMEOUT_MS: 300000,

    HEARTBEAT_INTERVAL_MS: 1000,

    WATCHDOG_INTERVAL_MS: 5000,

    HEALTH_CHECK_INTERVAL_MS: 10000

});

/**
 * ============================================================================
 * Policy Runtime
 * ============================================================================
 */

export const PolicyRuntime = Object.freeze({

    MIN_CONFIDENCE: 85,

    MAX_POLICY_DEPTH: 25,

    MAX_POLICY_OVERRIDES: 10,

    REQUIRE_AUDIT: true

});

/**
 * ============================================================================
 * Identity Runtime
 * ============================================================================
 */

export const IdentityRuntime = Object.freeze({

    DEFAULT_NODE: "LOCAL",

    MAX_SEQUENCE: 999999,

    MAX_ID_LENGTH: 128

});

/**
 * ============================================================================
 * Temporal Runtime
 * ============================================================================
 */

export const ClockRuntime = Object.freeze({

    DEFAULT_TIMEZONE: "UTC",

    MAX_CLOCK_DRIFT_MS: 100,

    SCHEDULER_TICK_MS: 100,

    MAX_SCHEDULED_EVENTS: 10000

});

/**
 * ============================================================================
 * Event Runtime
 * ============================================================================
 */

export const EventRuntime = Object.freeze({

    MAX_EVENT_QUEUE: 10000,

    MAX_EVENT_SIZE_BYTES: 65536,

    DEFAULT_RETENTION_DAYS: 30,

    ENABLE_EVENT_AUDIT: true

});

/**
 * ============================================================================
 * Provider Runtime
 * ============================================================================
 */

export const ProviderRuntime = Object.freeze({

    DEFAULT_PROVIDER: "openai",

    ENABLE_PROVIDER_FALLBACK: true,

    MAX_PROVIDER_RETRIES: 3,

    MAX_PARALLEL_PROVIDER_REQUESTS: 16,

    PROVIDER_REQUEST_TIMEOUT_MS: 120000,

    CACHE_PROVIDER_RESPONSES: true,

    PROVIDER_CACHE_TTL_MS: 300000

});

/**
 * ============================================================================
 * Memory Runtime
 * ============================================================================
 */

export const MemoryRuntime = Object.freeze({

    MAX_MEMORY_OBJECTS: 1000000,

    SHORT_TERM_LIMIT: 1000,

    LONG_TERM_LIMIT: 500000,

    AUTO_CONSOLIDATE: true,

    CONSOLIDATION_INTERVAL_MS: 600000,

    MEMORY_INDEX_BATCH_SIZE: 500,

    ENABLE_MEMORY_COMPRESSION: true

});

/**
 * ============================================================================
 * Research Runtime
 * ============================================================================
 */

export const ResearchRuntime = Object.freeze({

    MAX_CONCURRENT_SEARCHES: 10,

    MAX_SOURCES_PER_QUERY: 100,

    MAX_SUMMARIZATION_LENGTH: 25000,

    DEFAULT_SOURCE_TIMEOUT_MS: 30000,

    ENABLE_SOURCE_VALIDATION: true,

    ENABLE_DUPLICATE_FILTERING: true,

    MAX_CITATIONS: 100

});

/**
 * ============================================================================
 * Creator Brain Runtime
 * ============================================================================
 */

export const CreatorRuntime = Object.freeze({

    MAX_ACTIVE_PROJECTS: 250,

    MAX_SCENES_PER_PROJECT: 100,

    MAX_SCRIPT_LENGTH: 100000,

    ENABLE_TREND_ANALYSIS: true,

    ENABLE_VIRAL_SCORING: true,

    DEFAULT_TARGET_DURATION_SECONDS: 60,

    MAX_TARGET_DURATION_SECONDS: 3600

});

/**
 * ============================================================================
 * Content Studio Runtime
 * ============================================================================
 */

export const ContentRuntime = Object.freeze({

    MAX_RENDER_QUEUE: 100,

    MAX_VIDEO_DURATION_SECONDS: 7200,

    MAX_AUDIO_TRACKS: 64,

    MAX_CAPTION_SEGMENTS: 10000,

    ENABLE_BACKGROUND_RENDERING: true,

    ENABLE_RENDER_RECOVERY: true,

    MAX_EXPORTS_PER_BATCH: 25

});

/**
 * ============================================================================
 * Finance
 * 
 * /**
 * ============================================================================
 * Robotics Runtime
 * ============================================================================
 */

export const RoboticsRuntime = Object.freeze({

    MAX_ACTIVE_ROBOTS: 128,

    MAX_CONCURRENT_TASKS: 32,

    DEFAULT_CONTROL_FREQUENCY_HZ: 60,

    SAFETY_CHECK_INTERVAL_MS: 100,

    HEARTBEAT_INTERVAL_MS: 500,

    EMERGENCY_STOP_TIMEOUT_MS: 50,

    ENABLE_FAILSAFE: true,

    REQUIRE_POLICY_APPROVAL: true

});

/**
 * ============================================================================
 * Diagnostics Runtime
 * ============================================================================
 */

export const DiagnosticsRuntime = Object.freeze({

    ENABLE_DIAGNOSTICS: true,

    LOG_LEVEL: "INFO",

    MAX_LOG_ENTRIES: 100000,

    MAX_EXCEPTION_HISTORY: 5000,

    ENABLE_PERFORMANCE_PROFILING: true,

    ENABLE_RUNTIME_METRICS: true,

    AUTO_EXPORT_CRASH_REPORTS: true

});

/**
 * ============================================================================
 * Health Monitor Runtime
 * ============================================================================
 */

export const HealthRuntime = Object.freeze({

    ENABLE_HEALTH_MONITORING: true,

    HEALTH_CHECK_INTERVAL_MS: 5000,

    MAX_WARNING_COUNT: 100,

    MAX_CRITICAL_COUNT: 25,

    AUTO_RECOVERY_ENABLED: true,

    HEARTBEAT_TIMEOUT_MS: 15000

});

/**
 * ============================================================================
 * Security Runtime
 * ============================================================================
 */

export const SecurityRuntime = Object.freeze({

    ENABLE_SECURITY_CHECKS: true,

    REQUIRE_PERMISSION_VALIDATION: true,

    ENABLE_RATE_LIMITING: true,

    MAX_REQUESTS_PER_MINUTE: 1000,

    SESSION_TIMEOUT_MS: 3600000,

    REQUIRE_AUDIT_FOR_ADMIN_ACTIONS: true,

    ENCRYPT_SENSITIVE_DATA: true

});

/**
 * ============================================================================
 * Knowledge Runtime
 * ============================================================================
 */

export const KnowledgeRuntime = Object.freeze({

    MAX_GRAPH_NODES: 5000000,

    MAX_GRAPH_EDGES: 25000000,

    AUTO_INDEX: true,

    INDEX_BATCH_SIZE: 1000,

    ENABLE_SEMANTIC_LINKING: true,

    ENABLE_VECTOR_SEARCH: true,

    MAX_SEARCH_RESULTS: 250

});

/**
 * ============================================================================
 * Communication Runtime
 * ============================================================================
 */

export const CommunicationRuntime = Object.freeze({

    MAX_EVENT_SUBSCRIBERS: 10000,

    MAX_MESSAGE_SIZE_BYTES: 1048576,

    ENABLE_EVENT_BATCHING: true,

    ENABLE_EVENT_COMPRESSION: true,

    MAX_PENDING_MESSAGES: 50000,

    DEFAULT_MESSAGE_TIMEOUT_MS: 30000

});

/**
 * ============================================================================
 * Kernel Runtime
 * ============================================================================
 */

export const KernelRuntime = Object.freeze({

    ENABLE_HOT_RELOAD: false,

    ENABLE_SAFE_MODE: true,

    ENABLE_MODULE_DISCOVERY: true,

    ENABLE_STARTUP_VALIDATION: true,

    ENABLE_RUNTIME_VALIDATION: true,

    ENABLE_GRACEFUL_SHUTDOWN: true,

    MAX_BOOT_TIME_MS: 30000,

    MAX_SHUTDOWN_TIME_MS: 10000

});

/**
 * ============================================================================
 * Resource Runtime
 *
 * These limits will eventually be monitored by
 * ResourceManager.js
 * ============================================================================
 */

export const ResourceRuntime = Object.freeze({

    MAX_CPU_PERCENT: 90,

    MAX_MEMORY_PERCENT: 85,

    MAX_GPU_PERCENT: 95,

    MAX_DISK_PERCENT: 90,

    MAX_NETWORK_CONNECTIONS: 10000,

    AUTO_THROTTLE: true,

    AUTO_LOAD_BALANCE: true

});

/**
 * ============================================================================
 * Runtime Profiles
 *
 * Every AstraMind deployment selects one of these profiles.
 * ============================================================================
 */

export const RuntimeProfile = Object.freeze({

    DEVELOPMENT: "development",

    TESTING: "testing",

    STAGING: "staging",

    PRODUCTION: "production",

    ENTERPRISE: "enterprise"

});

/**
 * ============================================================================
 * Runtime Configuration Manager
 * ============================================================================
 */

export class RuntimeConfigurationManager {

    constructor({

        profile = RuntimeProfile.DEVELOPMENT

    } = {}) {

        this.profile = profile;

        this.overrides = new Map();

        this.metrics = {

            lookups: 0,

            validations: 0,

            overrides: 0

        };

    }

    /**
     * =====================================================
     * Runtime Lookup
     * =====================================================
     */

    get(runtimeName) {

        this.metrics.lookups++;

        if (

            this.overrides.has(runtimeName)

        ) {

            return this.overrides.get(runtimeName);

        }

        return RuntimeRegistry[runtimeName] || null;

    }

    /**
     * =====================================================
     * Override Runtime
     * =====================================================
     */

    override(

        runtimeName,

        configuration

    ) {

        this.overrides.set(

            runtimeName,

            Object.freeze({

                ...configuration

            })

        );

        this.metrics.overrides++;

    }

    /**
     * =====================================================
     * Remove Override
     * =====================================================
     */

    clearOverride(runtimeName) {

        this.overrides.delete(

            runtimeName

        );

    }

    /**
     * =====================================================
     * Validation
     * =====================================================
     */

    validate(runtimeName) {

        this.metrics.validations++;

        return {

            valid:

                RuntimeRegistry.hasOwnProperty(

                    runtimeName

                ),

            runtime:

                runtimeName

        };

    }

    /**
     * =====================================================
     * Runtime Names
     * =====================================================
     */

    names() {

        return Object.keys(

            RuntimeRegistry

        );

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

            runtimes:

                this.names().length,

            overrides:

                this.overrides.size,

            metrics:

                {

                    ...this.metrics

                }

        };

    }

    /**
     * =====================================================
     * Export Configuration
     * =====================================================
     */

    exportConfiguration() {

        return {

            profile:

                this.profile,

            runtimes:

                RuntimeRegistry,

            overrides:

                Object.fromEntries(

                    this.overrides

                )

        };

    }

    /**
     * =====================================================
     * Serialize
     * =====================================================
     */

    serialize() {

        return JSON.stringify(

            this.exportConfiguration(),

            null,

            2

        );

    }

    /**
     * =====================================================
     * Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            profile:

                this.profile,

            registeredRuntimes:

                this.names().length,

            overrides:

                this.overrides.size

        };

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            profile:

                this.profile,

            health:

                this.health(),

            statistics:

                this.statistics(),

            runtimeNames:

                this.names()

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

        return new RuntimeConfigurationManager(

            options

        );

    }

}

/**
 * ============================================================================
 * Runtime Registry
 *
 * Single source of truth for every runtime domain.
 * ============================================================================
 */

export const RuntimeRegistry = Object.freeze({

    MissionRuntime,

    WorkflowRuntime,

    ExecutionRuntime,

    PolicyRuntime,

    IdentityRuntime,

    ClockRuntime,

    EventRuntime,

    ProviderRuntime,

    MemoryRuntime,

    ResearchRuntime,

    CreatorRuntime,

    ContentRuntime,

    FinanceRuntime,

    RoboticsRuntime,

    DiagnosticsRuntime,

    HealthRuntime,

    SecurityRuntime,

    KnowledgeRuntime,

    CommunicationRuntime,

    KernelRuntime,

    ResourceRuntime

});

/**
 * ============================================================================
 * Default Runtime Configuration Manager
 * ============================================================================
 */

export const RuntimeManager =

    RuntimeConfigurationManager.create({

        profile:

            RuntimeProfile.DEVELOPMENT

    });

    /**
 * ============================================================================
 * Runtime Compatibility
 * ============================================================================
 */

export const RuntimeCompatibility = Object.freeze({

    VERSION: "3.0.0-alpha.1",

    MINIMUM_KERNEL_VERSION: "3.0.0-alpha.1",

    MINIMUM_POLICY_VERSION: "3.0.0-alpha.1",

    MINIMUM_RUNTIME_VERSION: "3.0.0-alpha.1"

});

/**
 * ============================================================================
 * Runtime Configuration Manager (continued)
 * ============================================================================
 */

RuntimeConfigurationManager.prototype.verifyCompatibility = function () {

    return {

        compatible: true,

        profile: this.profile,

        versions: RuntimeCompatibility

    };

};

/**
 * =====================================================
 * Runtime Integrity
 * =====================================================
 */

RuntimeConfigurationManager.prototype.verifyIntegrity = function () {

    const missing = [];

    for (const runtimeName of this.names()) {

        if (!RuntimeRegistry[runtimeName]) {

            missing.push(runtimeName);

        }

    }

    return {

        healthy: missing.length === 0,

        missing,

        totalRegistered: this.names().length

    };

};

/**
 * =====================================================
 * Profile Switching
 * =====================================================
 */

RuntimeConfigurationManager.prototype.setProfile = function (

    profile

) {

    if (

        !Object.values(

            RuntimeProfile

        ).includes(profile)

    ) {

        throw new Error(

            `Unknown runtime profile: ${profile}`

        );

    }

    this.profile = profile;

    return this.profile;

};

/**
 * =====================================================
 * Environment Loading
 *
 * Environment variables override runtime defaults.
 * =====================================================
 */

RuntimeConfigurationManager.prototype.loadEnvironment = function (

    env = process.env

) {

    return {

        NODE_ENV:

            env.NODE_ENV ||

            "development",

        ASTRAMIND_PROFILE:

            env.ASTRAMIND_PROFILE ||

            this.profile

    };

};

/**
 * =====================================================
 * Reset
 * =====================================================
 */

RuntimeConfigurationManager.prototype.reset = function () {

    this.profile =

        RuntimeProfile.DEVELOPMENT;

    this.overrides.clear();

    this.metrics = {

        lookups: 0,

        validations: 0,

        overrides: 0

    };

};

/**
 * =====================================================
 * Deserialization
 * =====================================================
 */

RuntimeConfigurationManager.deserialize = function (

    json

) {

    const state =

        typeof json === "string"

            ? JSON.parse(json)

            : json;

    const manager =

        new RuntimeConfigurationManager({

            profile:

                state.profile

        });

    if (state.overrides) {

        for (

            const [

                key,

                value

            ] of Object.entries(

                state.overrides

            )

        ) {

            manager.override(

                key,

                value

            );

        }

    }

    return manager;

};

/**
 * =====================================================
 * Shutdown
 * =====================================================
 */

RuntimeConfigurationManager.prototype.shutdown = function () {

    this.overrides.clear();

    return true;

};

/**
 * =====================================================
 * String Representation
 * =====================================================
 */

RuntimeConfigurationManager.prototype.toString = function () {

    return `[RuntimeConfigurationManager Profile=${this.profile} Runtimes=${this.names().length} Overrides=${this.overrides.size}]`;

};

/**
 * ============================================================================
 * Default Export
 * ============================================================================
 */

export default RuntimeManager;