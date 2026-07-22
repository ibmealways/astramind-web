/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * SystemEvents.js
 *
 * Description:
 * Enterprise System Event Catalog
 *
 * This file is the authoritative registry for every event that can
 * occur inside AstraMind OS.
 *
 * No subsystem should invent event names.
 *
 * Every published event must originate here.
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * Event Severity
 * ============================================================================
 */

export const EventSeverity = Object.freeze({

    TRACE: "trace",

    DEBUG: "debug",

    INFO: "info",

    NOTICE: "notice",

    WARNING: "warning",

    ERROR: "error",

    CRITICAL: "critical",

    FATAL: "fatal"

});

/**
 * ============================================================================
 * Event Categories
 * ============================================================================
 */

export const EventCategory = Object.freeze({

    SYSTEM: "system",

    KERNEL: "kernel",

    POLICY: "policy",

    SECURITY: "security",

    MISSION: "mission",

    WORKFLOW: "workflow",

    EXECUTION: "execution",

    CAPABILITY: "capability",

    STRATEGY: "strategy",

    MEMORY: "memory",

    RESEARCH: "research",

    FINANCE: "finance",

    CONTENT: "content",

    ROBOTICS: "robotics",

    USER: "user",

    DIAGNOSTICS: "diagnostics",

    HEALTH: "health"

});

/**
 * ============================================================================
 * Event Namespaces
 * ============================================================================
 */

export const EventNamespace = Object.freeze({

    SYSTEM: "system",

    KERNEL: "kernel",

    MISSION: "mission",

    WORKFLOW: "workflow",

    EXECUTION: "execution",

    POLICY: "policy",

    CLOCK: "clock",

    IDENTITY: "identity",

    MEMORY: "memory",

    RESEARCH: "research",

    CONTENT: "content",

    FINANCE: "finance",

    ROBOTICS: "robotics"

});

/**
 * ============================================================================
 * Core System Events
 * ============================================================================
 */

export const SystemEvents = Object.freeze({

    SYSTEM_BOOT:

        "system.boot",

    SYSTEM_READY:

        "system.ready",

    SYSTEM_SHUTDOWN:

        "system.shutdown",

    SYSTEM_RESTART:

        "system.restart",

    SYSTEM_HEALTH_CHANGED:

        "system.health.changed",

    SYSTEM_ERROR:

        "system.error",

    SYSTEM_WARNING:

        "system.warning"

});

/**
 * ============================================================================
 * Kernel Events
 * ============================================================================
 */

export const KernelEvents = Object.freeze({

    KERNEL_INITIALIZED:

        "kernel.initialized",

    KERNEL_STARTED:

        "kernel.started",

    KERNEL_STOPPED:

        "kernel.stopped",

    KERNEL_RELOADED:

        "kernel.reloaded",

    KERNEL_DIAGNOSTICS:

        "kernel.diagnostics",

    KERNEL_EXCEPTION:

        "kernel.exception"

});

/**
 * ============================================================================
 * Identity Events
 * ============================================================================
 */

export const IdentityEvents = Object.freeze({

    ID_CREATED:

        "identity.created",

    ID_REGISTERED:

        "identity.registered",

    ID_LOCKED:

        "identity.locked",

    ID_ARCHIVED:

        "identity.archived",

    ID_EXPIRED:

        "identity.expired",

    ID_DELETED:

        "identity.deleted"

});

/**
 * ============================================================================
 * Clock Events
 * ============================================================================
 */

export const ClockEvents = Object.freeze({

    CLOCK_STARTED:

        "clock.started",

    CLOCK_MODE_CHANGED:

        "clock.mode.changed",

    CLOCK_SYNCHRONIZED:

        "clock.synchronized",

    CLOCK_DRIFT_DETECTED:

        "clock.drift.detected",

    CLOCK_SIMULATION_STARTED:

        "clock.simulation.started",

    CLOCK_REPLAY_STARTED:

        "clock.replay.started"

});

/**
 * ============================================================================
 * Mission Events
 * ============================================================================
 */

export const MissionEvents = Object.freeze({

    MISSION_CREATED:
        "mission.created",

    MISSION_LOADED:
        "mission.loaded",

    MISSION_QUEUED:
        "mission.queued",

    MISSION_PLANNED:
        "mission.planned",

    MISSION_STARTED:
        "mission.started",

    MISSION_PAUSED:
        "mission.paused",

    MISSION_RESUMED:
        "mission.resumed",

    MISSION_COMPLETED:
        "mission.completed",

    MISSION_FAILED:
        "mission.failed",

    MISSION_CANCELLED:
        "mission.cancelled",

    MISSION_TIMEOUT:
        "mission.timeout",

    MISSION_ARCHIVED:
        "mission.archived",

    MISSION_DELETED:
        "mission.deleted"

});

/**
 * ============================================================================
 * Workflow Events
 * ============================================================================
 */

export const WorkflowEvents = Object.freeze({

    WORKFLOW_CREATED:
        "workflow.created",

    WORKFLOW_SELECTED:
        "workflow.selected",

    WORKFLOW_STARTED:
        "workflow.started",

    WORKFLOW_STEP_STARTED:
        "workflow.step.started",

    WORKFLOW_STEP_COMPLETED:
        "workflow.step.completed",

    WORKFLOW_STEP_FAILED:
        "workflow.step.failed",

    WORKFLOW_COMPLETED:
        "workflow.completed",

    WORKFLOW_FAILED:
        "workflow.failed",

    WORKFLOW_CANCELLED:
        "workflow.cancelled",

    WORKFLOW_RESTARTED:
        "workflow.restarted"

});

/**
 * ============================================================================
 * Execution Events
 * ============================================================================
 */

export const ExecutionEvents = Object.freeze({

    EXECUTION_CREATED:
        "execution.created",

    EXECUTION_PREPARING:
        "execution.preparing",

    EXECUTION_STARTED:
        "execution.started",

    EXECUTION_PROGRESS:
        "execution.progress",

    EXECUTION_PAUSED:
        "execution.paused",

    EXECUTION_RESUMED:
        "execution.resumed",

    EXECUTION_COMPLETED:
        "execution.completed",

    EXECUTION_FAILED:
        "execution.failed",

    EXECUTION_CANCELLED:
        "execution.cancelled",

    EXECUTION_TIMEOUT:
        "execution.timeout"

});

/**
 * ============================================================================
 * Capability Events
 * ============================================================================
 */

export const CapabilityEvents = Object.freeze({

    CAPABILITY_REGISTERED:
        "capability.registered",

    CAPABILITY_UNREGISTERED:
        "capability.unregistered",

    CAPABILITY_RESOLVED:
        "capability.resolved",

    CAPABILITY_SELECTED:
        "capability.selected",

    CAPABILITY_INITIALIZED:
        "capability.initialized",

    CAPABILITY_EXECUTED:
        "capability.executed",

    CAPABILITY_COMPLETED:
        "capability.completed",

    CAPABILITY_FAILED:
        "capability.failed",

    CAPABILITY_DISABLED:
        "capability.disabled"

});

/**
 * ============================================================================
 * Execution Strategy Events
 * ============================================================================
 */

export const StrategyEvents = Object.freeze({

    STRATEGY_REGISTERED:
        "strategy.registered",

    STRATEGY_SELECTED:
        "strategy.selected",

    STRATEGY_ACTIVATED:
        "strategy.activated",

    STRATEGY_EVALUATED:
        "strategy.evaluated",

    STRATEGY_CHANGED:
        "strategy.changed",

    STRATEGY_COMPLETED:
        "strategy.completed",

    STRATEGY_FAILED:
        "strategy.failed"

});

/**
 * ============================================================================
 * Policy Events
 * ============================================================================
 */

export const PolicyEvents = Object.freeze({

    POLICY_EVALUATION_STARTED:
        "policy.evaluation.started",

    POLICY_EVALUATION_COMPLETED:
        "policy.evaluation.completed",

    POLICY_APPROVED:
        "policy.approved",

    POLICY_DENIED:
        "policy.denied",

    POLICY_CONFIRMATION_REQUIRED:
        "policy.confirmation.required",

    POLICY_SIMULATION_REQUIRED:
        "policy.simulation.required",

    POLICY_CONFLICT_DETECTED:
        "policy.conflict.detected",

    POLICY_OVERRIDE_APPLIED:
        "policy.override.applied",

    POLICY_AUDIT_CREATED:
        "policy.audit.created"

});

/**
 * ============================================================================
 * Governance Events
 * ============================================================================
 */

export const GovernanceEvents = Object.freeze({

    GOVERNANCE_REPORT_CREATED:
        "governance.report.created",

    GOVERNANCE_HEALTH_CHANGED:
        "governance.health.changed",

    GOVERNANCE_INTEGRITY_FAILED:
        "governance.integrity.failed",

    GOVERNANCE_VERSION_CHANGED:
        "governance.version.changed"

});

/**
 * ============================================================================
 * Research Engine Events
 * ============================================================================
 */

export const ResearchEvents = Object.freeze({

    RESEARCH_SESSION_CREATED:
        "research.session.created",

    RESEARCH_STARTED:
        "research.started",

    RESEARCH_QUERY_RECEIVED:
        "research.query.received",

    RESEARCH_SOURCE_DISCOVERED:
        "research.source.discovered",

    RESEARCH_SOURCE_VALIDATED:
        "research.source.validated",

    RESEARCH_ANALYSIS_STARTED:
        "research.analysis.started",

    RESEARCH_ANALYSIS_COMPLETED:
        "research.analysis.completed",

    RESEARCH_SUMMARY_GENERATED:
        "research.summary.generated",

    RESEARCH_FAILED:
        "research.failed",

    RESEARCH_CANCELLED:
        "research.cancelled"

});

/**
 * ============================================================================
 * Memory Engine Events
 * ============================================================================
 */

export const MemoryEvents = Object.freeze({

    MEMORY_CREATED:
        "memory.created",

    MEMORY_UPDATED:
        "memory.updated",

    MEMORY_ACCESSED:
        "memory.accessed",

    MEMORY_RETRIEVED:
        "memory.retrieved",

    MEMORY_INDEXED:
        "memory.indexed",

    MEMORY_ARCHIVED:
        "memory.archived",

    MEMORY_FORGOTTEN:
        "memory.forgotten",

    MEMORY_RESTORED:
        "memory.restored",

    MEMORY_CONSOLIDATED:
        "memory.consolidated"

});

/**
 * ============================================================================
 * Finance Intelligence Events
 * ============================================================================
 */

export const FinanceEvents = Object.freeze({

    FINANCE_SESSION_STARTED:
        "finance.session.started",

    MARKET_SCAN_STARTED:
        "finance.market.scan.started",

    MARKET_SCAN_COMPLETED:
        "finance.market.scan.completed",

    SIGNAL_GENERATED:
        "finance.signal.generated",

    SIGNAL_CONFIRMED:
        "finance.signal.confirmed",

    RISK_ANALYSIS_COMPLETED:
        "finance.risk.analysis.completed",

    PORTFOLIO_UPDATED:
        "finance.portfolio.updated",

    TRADE_SIMULATION_STARTED:
        "finance.trade.simulation.started",

    TRADE_EXECUTION_REQUESTED:
        "finance.trade.execution.requested",

    TRADE_EXECUTION_COMPLETED:
        "finance.trade.execution.completed"

});

/**
 * ============================================================================
 * Content Studio Events
 * ============================================================================
 */

export const ContentEvents = Object.freeze({

    CONTENT_REQUESTED:
        "content.requested",

    STORYBOARD_STARTED:
        "content.storyboard.started",

    STORYBOARD_COMPLETED:
        "content.storyboard.completed",

    SCRIPT_GENERATED:
        "content.script.generated",

    SCENE_GENERATED:
        "content.scene.generated",

    VOICEOVER_GENERATED:
        "content.voiceover.generated",

    CAPTIONS_GENERATED:
        "content.captions.generated",

    VIDEO_RENDER_STARTED:
        "content.video.render.started",

    VIDEO_RENDER_COMPLETED:
        "content.video.render.completed",

    CONTENT_PUBLISHED:
        "content.published"

});

/**
 * ============================================================================
 * Creator Brain Events
 * ============================================================================
 */

export const CreatorBrainEvents = Object.freeze({

    CREATOR_BRAIN_INITIALIZED:
        "creatorbrain.initialized",

    IDEA_GENERATED:
        "creatorbrain.idea.generated",

    TREND_DISCOVERED:
        "creatorbrain.trend.discovered",

    TREND_ANALYZED:
        "creatorbrain.trend.analyzed",

    VIRAL_SCORE_CALCULATED:
        "creatorbrain.viral.score.calculated",

    CONTENT_PLAN_CREATED:
        "creatorbrain.content.plan.created",

    CONTENT_PIPELINE_STARTED:
        "creatorbrain.pipeline.started",

    CONTENT_PIPELINE_COMPLETED:
        "creatorbrain.pipeline.completed"

});

/**
 * ============================================================================
 * Provider Events
 * ============================================================================
 */

export const ProviderEvents = Object.freeze({

    PROVIDER_SELECTED:
        "provider.selected",

    PROVIDER_CONNECTED:
        "provider.connected",

    PROVIDER_DISCONNECTED:
        "provider.disconnected",

    PROVIDER_REQUEST_STARTED:
        "provider.request.started",

    PROVIDER_REQUEST_COMPLETED:
        "provider.request.completed",

    PROVIDER_REQUEST_FAILED:
        "provider.request.failed",

    PROVIDER_FALLBACK_STARTED:
        "provider.fallback.started",

    PROVIDER_SWITCHED:
        "provider.switched"

});

/**
 * ============================================================================
 * Knowledge Base Events
 * ============================================================================
 */

export const KnowledgeEvents = Object.freeze({

    KNOWLEDGE_IMPORTED:
        "knowledge.imported",

    KNOWLEDGE_UPDATED:
        "knowledge.updated",

    KNOWLEDGE_INDEXED:
        "knowledge.indexed",

    KNOWLEDGE_SEARCH_STARTED:
        "knowledge.search.started",

    KNOWLEDGE_SEARCH_COMPLETED:
        "knowledge.search.completed",

    KNOWLEDGE_LINK_CREATED:
        "knowledge.link.created",

    KNOWLEDGE_GRAPH_UPDATED:
        "knowledge.graph.updated",

    KNOWLEDGE_ARCHIVED:
        "knowledge.archived"

});

/**
 * ============================================================================
 * Event Priority
 * ============================================================================
 */

export const EventPriority = Object.freeze({

    LOW: 10,

    NORMAL: 25,

    HIGH: 50,

    CRITICAL: 75,

    EMERGENCY: 100

});

/**
 * ============================================================================
 * Event Retention
 * ============================================================================
 */

export const EventRetention = Object.freeze({

    NONE: "none",

    SHORT: "24_hours",

    DAILY: "7_days",

    WEEKLY: "30_days",

    MONTHLY: "365_days",

    PERMANENT: "permanent"

});

/**
 * ============================================================================
 * Event Registry Metadata
 *
 * Every enterprise event can optionally define metadata that
 * downstream services (Audit, EventBus, Diagnostics,
 * Analytics, HealthMonitor) can consume.
 * ============================================================================
 */

export const EventRegistry = Object.freeze({

    [SystemEvents.SYSTEM_BOOT]: {

        category: EventCategory.SYSTEM,

        severity: EventSeverity.INFO,

        priority: EventPriority.HIGH,

        retention: EventRetention.PERMANENT,

        audit: true,

        version: 1

    },

    [SystemEvents.SYSTEM_ERROR]: {

        category: EventCategory.SYSTEM,

        severity: EventSeverity.ERROR,

        priority: EventPriority.CRITICAL,

        retention: EventRetention.PERMANENT,

        audit: true,

        version: 1

    },

    [KernelEvents.KERNEL_INITIALIZED]: {

        category: EventCategory.KERNEL,

        severity: EventSeverity.INFO,

        priority: EventPriority.NORMAL,

        retention: EventRetention.MONTHLY,

        audit: true,

        version: 1

    },

    [MissionEvents.MISSION_STARTED]: {

        category: EventCategory.MISSION,

        severity: EventSeverity.INFO,

        priority: EventPriority.HIGH,

        retention: EventRetention.MONTHLY,

        audit: true,

        version: 1

    },

    [MissionEvents.MISSION_COMPLETED]: {

        category: EventCategory.MISSION,

        severity: EventSeverity.INFO,

        priority: EventPriority.HIGH,

        retention: EventRetention.MONTHLY,

        audit: true,

        version: 1

    },

    [ExecutionEvents.EXECUTION_FAILED]: {

        category: EventCategory.EXECUTION,

        severity: EventSeverity.ERROR,

        priority: EventPriority.CRITICAL,

        retention: EventRetention.PERMANENT,

        audit: true,

        version: 1

    },

    [PolicyEvents.POLICY_DENIED]: {

        category: EventCategory.POLICY,

        severity: EventSeverity.WARNING,

        priority: EventPriority.CRITICAL,

        retention: EventRetention.PERMANENT,

        audit: true,

        version: 1

    },

    [IdentityEvents.ID_CREATED]: {

        category: EventCategory.SYSTEM,

        severity: EventSeverity.DEBUG,

        priority: EventPriority.NORMAL,

        retention: EventRetention.MONTHLY,

        audit: false,

        version: 1

    },

    [ClockEvents.CLOCK_SYNCHRONIZED]: {

        category: EventCategory.SYSTEM,

        severity: EventSeverity.INFO,

        priority: EventPriority.NORMAL,

        retention: EventRetention.WEEKLY,

        audit: true,

        version: 1

    }

});

/**
 * ============================================================================
 * Event Payload Schemas
 *
 * These schemas describe expected payloads.
 * Future versions can validate payloads automatically.
 * ============================================================================
 */

export const EventPayloadSchemas = Object.freeze({

    "mission.started": [

        "missionId",

        "workflowId",

        "timestamp"

    ],

    "execution.failed": [

        "executionId",

        "reason",

        "timestamp"

    ],

    "policy.denied": [

        "policy",

        "reason",

        "timestamp"

    ],

    "identity.created": [

        "id",

        "namespace",

        "createdAt"

    ]

});

/**
 * ============================================================================
 * Event Compatibility
 * ============================================================================
 */

export const EventCompatibility = Object.freeze({

    version: "3.0.0-alpha.1",

    minimumSupportedVersion:

        "3.0.0-alpha.1"

});

/**
 * ============================================================================
 * Event Registry Helpers
 * ============================================================================
 */

export function getEventMetadata(eventName) {

    return EventRegistry[eventName] || null;

}

export function hasMetadata(eventName) {

    return eventName in EventRegistry;

}

export function requiresAudit(eventName) {

    return getEventMetadata(eventName)?.audit === true;

}

export function getPriority(eventName) {

    return getEventMetadata(eventName)?.priority ??

        EventPriority.NORMAL;

}

export function getRetention(eventName) {

    return getEventMetadata(eventName)?.retention ??

        EventRetention.NONE;

}

export function getPayloadSchema(eventName) {

    return EventPayloadSchemas[eventName] ||

        [];

}

export function isKnownEvent(eventName) {

    return hasMetadata(eventName);

}

/**
 * ============================================================================
 * Event Registry Manager
 * ============================================================================
 */

export class EventRegistryManager {

    constructor() {

        this.registry = new Map(
            Object.entries(EventRegistry)
        );

        this.metrics = {

            lookups: 0,

            validations: 0,

            registrations: 0

        };

    }

    /**
     * =====================================================
     * Registry Operations
     * =====================================================
     */

    get(eventName) {

        this.metrics.lookups++;

        return this.registry.get(eventName) || null;

    }

    has(eventName) {

        return this.registry.has(eventName);

    }

    register(eventName, metadata) {

        this.registry.set(

            eventName,

            Object.freeze({

                ...metadata

            })

        );

        this.metrics.registrations++;

        return true;

    }

    unregister(eventName) {

        return this.registry.delete(eventName);

    }

    /**
     * =====================================================
     * Event Validation
     * =====================================================
     */

    validate(eventName, payload = {}) {

        this.metrics.validations++;

        const metadata = this.get(eventName);

        if (!metadata) {

            return {

                valid: false,

                reason: "Unknown event."

            };

        }

        const schema =

            getPayloadSchema(eventName);

        const missing = [];

        for (const field of schema) {

            if (!(field in payload)) {

                missing.push(field);

            }

        }

        return {

            valid:

                missing.length === 0,

            missing,

            metadata

        };

    }

    /**
     * =====================================================
     * Statistics
     * =====================================================
     */

    statistics() {

        return {

            totalEvents:

                this.registry.size,

            lookups:

                this.metrics.lookups,

            validations:

                this.metrics.validations,

            registrations:

                this.metrics.registrations

        };

    }

    /**
     * =====================================================
     * Categories
     * =====================================================
     */

    byCategory(category) {

        const events = [];

        for (

            const [

                name,

                metadata

            ] of this.registry.entries()

        ) {

            if (

                metadata.category === category

            ) {

                events.push({

                    name,

                    metadata

                });

            }

        }

        return events;

    }

    /**
     * =====================================================
     * Severity
     * =====================================================
     */

    bySeverity(severity) {

        const events = [];

        for (

            const [

                name,

                metadata

            ] of this.registry.entries()

        ) {

            if (

                metadata.severity === severity

            ) {

                events.push({

                    name,

                    metadata

                });

            }

        }

        return events;

    }

    /**
     * =====================================================
     * Export Registry
     * =====================================================
     */

    exportRegistry() {

        return {

            compatibility:

                EventCompatibility,

            statistics:

                this.statistics(),

            events:

                Object.fromEntries(

                    this.registry

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

            this.exportRegistry(),

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

            registeredEvents:

                this.registry.size,

            compatibility:

                EventCompatibility.version

        };

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            health:

                this.health(),

            statistics:

                this.statistics(),

            compatibility:

                EventCompatibility,

            categories:

                Object.values(

                    EventCategory

                )

        };

    }

    /**
     * =====================================================
     * Reset Metrics
     * =====================================================
     */

    resetMetrics() {

        this.metrics = {

            lookups: 0,

            validations: 0,

            registrations: 0

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create() {

        return new EventRegistryManager();

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[EventRegistryManager Events=${this.registry.size}]`;

    }

}

/**
 * ============================================================================
 * Default Registry
 * ============================================================================
 */

export const DefaultEventRegistry =

    EventRegistryManager.create();

export default DefaultEventRegistry;