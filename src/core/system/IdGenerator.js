/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * IdGenerator.js
 *
 * Description:
 * Universal Identity Service
 *
 * Every object created inside AstraMind receives its identity from
 * this service.
 *
 * Goals
 * -----
 * • Human-readable IDs
 * • Globally unique identifiers
 * • Namespace support
 * • Timestamp encoding
 * • Parent-child relationships
 * • Batch generation
 * • Validation helpers
 * • Future distributed-node support
 *
 * ============================================================================
 */

import crypto from "crypto";

/**
 * ============================================================================
 * Namespaces
 * ============================================================================
 */

export const IdNamespace = Object.freeze({

    SYSTEM: "SYSTEM",

    MISSION: "MISSION",

    WORKFLOW: "WORKFLOW",

    EXECUTION: "EXECUTION",

    CAPABILITY: "CAPABILITY",

    STRATEGY: "STRATEGY",

    PROVIDER: "PROVIDER",

    USER: "USER",

    SESSION: "SESSION",

    CONVERSATION: "CONVERSATION",

    RESEARCH: "RESEARCH",

    MEMORY: "MEMORY",

    FINANCE: "FINANCE",

    ROBOT: "ROBOT",

    AUDIT: "AUDIT",

    POLICY: "POLICY",

    EVENT: "EVENT",

    DIAGNOSTIC: "DIAGNOSTIC"

});

/**
 * ============================================================================
 * Universal ID Generator
 * ============================================================================
 */

export default class IdGenerator {

    constructor({

        nodeId = "LOCAL"

    } = {}) {

        this.nodeId = nodeId;

        this.sequence = 0;

        this.metrics = {

            generated: 0,

            batches: 0,

            validations: 0

        };

        this.timeline = [];

        this.record(

            "IdGenerator initialized."

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

            timestamp:

                Date.now(),

            event,

            metadata

        });

    }

    /**
     * =====================================================
     * Sequence
     * =====================================================
     */

    nextSequence() {

        this.sequence++;

        if (

            this.sequence > 999999

        ) {

            this.sequence = 1;

        }

        return this.sequence;

    }

    /**
     * =====================================================
     * Timestamp
     * =====================================================
     */

    timestamp() {

        const now = new Date();

        const yyyy = now.getUTCFullYear();

        const mm =

            String(

                now.getUTCMonth() + 1

            ).padStart(2, "0");

        const dd =

            String(

                now.getUTCDate()

            ).padStart(2, "0");

        const hh =

            String(

                now.getUTCHours()

            ).padStart(2, "0");

        const min =

            String(

                now.getUTCMinutes()

            ).padStart(2, "0");

        const ss =

            String(

                now.getUTCSeconds()

            ).padStart(2, "0");

        return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;

    }

    /**
     * =====================================================
     * Random Component
     * =====================================================
     */

    random(

        length = 8

    ) {

        return crypto

            .randomBytes(

                Math.ceil(length / 2)

            )

            .toString("hex")

            .toUpperCase()

            .substring(

                0,

                length

            );

    }

    /**
     * =====================================================
     * Generate Universal ID
     * =====================================================
     */

    generate(

        namespace = IdNamespace.SYSTEM

    ) {

        this.metrics.generated++;

        const id = [

            namespace,

            this.timestamp(),

            this.nodeId,

            this.nextSequence(),

            this.random()

        ].join("-");

        this.record(

            "ID generated.",

            {

                namespace,

                id

            }

        );

        return id;

    }

    /**
     * =====================================================
     * Convenience Methods
     * =====================================================
     */

    mission() {

        return this.generate(

            IdNamespace.MISSION

        );

    }

    workflow() {

        return this.generate(

            IdNamespace.WORKFLOW

        );

    }

    execution() {

        return this.generate(

            IdNamespace.EXECUTION

        );

    }

    capability() {

        return this.generate(

            IdNamespace.CAPABILITY

        );

    }

    strategy() {

        return this.generate(

            IdNamespace.STRATEGY

        );

    }

    provider() {

        return this.generate(

            IdNamespace.PROVIDER

        );

    }

        /**
     * =====================================================
     * Parent / Child Identity
     * =====================================================
     */

    generateChild(

        parentId,

        namespace = IdNamespace.SYSTEM

    ) {

        return {

            id:

                this.generate(

                    namespace

                ),

            parentId,

            createdAt:

                Date.now()

        };

    }

    /**
     * =====================================================
     * Batch Generation
     * =====================================================
     */

    generateBatch(

        namespace,

        quantity = 1

    ) {

        this.metrics.batches++;

        const ids = [];

        for (

            let i = 0;

            i < quantity;

            i++

        ) {

            ids.push(

                this.generate(

                    namespace

                )

            );

        }

        this.record(

            "Batch generated.",

            {

                namespace,

                quantity

            }

        );

        return ids;

    }

    /**
     * =====================================================
     * Namespace Validation
     * =====================================================
     */

    isNamespace(

        namespace

    ) {

        return Object.values(

            IdNamespace

        ).includes(

            namespace

        );

    }

    /**
     * =====================================================
     * Validate ID
     * =====================================================
     */

    validate(

        id

    ) {

        this.metrics.validations++;

        if (

            typeof id !== "string"

        ) {

            return false;

        }

        const parts =

            id.split("-");

        if (

            parts.length < 5

        ) {

            return false;

        }

        return this.isNamespace(

            parts[0]

        );

    }

    /**
     * =====================================================
     * Parse ID
     * =====================================================
     */

    parse(

        id

    ) {

        if (

            !this.validate(id)

        ) {

            return null;

        }

        const [

            namespace,

            timestamp,

            node,

            sequence,

            random

        ] = id.split("-");

        return {

            id,

            namespace,

            timestamp,

            node,

            sequence:

                Number(sequence),

            random

        };

    }

    /**
     * =====================================================
     * Metadata
     * =====================================================
     */

    metadata(

        id

    ) {

        const parsed =

            this.parse(

                id

            );

        if (

            !parsed

        ) {

            return null;

        }

        return {

            namespace:

                parsed.namespace,

            node:

                parsed.node,

            sequence:

                parsed.sequence,

            timestamp:

                parsed.timestamp

        };

    }

    /**
     * =====================================================
     * Namespace Helpers
     * =====================================================
     */

    isMissionId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.MISSION;

    }

    isWorkflowId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.WORKFLOW;

    }

    isExecutionId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.EXECUTION;

    }

    isCapabilityId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.CAPABILITY;

    }

    isStrategyId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.STRATEGY;

    }

    isProviderId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.PROVIDER;

    }

    isConversationId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.CONVERSATION;

    }

    isResearchId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.RESEARCH;

    }

    isMemoryId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.MEMORY;

    }

    isFinanceId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.FINANCE;

    }

    isAuditId(id) {

        return this.parse(id)?.namespace ===

            IdNamespace.AUDIT;

    }

        /**
     * =====================================================
     * Identity Status
     * =====================================================
     */

    static Status = Object.freeze({

        ACTIVE: "active",

        LOCKED: "locked",

        ARCHIVED: "archived",

        DELETED: "deleted",

        EXPIRED: "expired"

    });

    /**
     * =====================================================
     * Identity Registry
     * =====================================================
     */

    initializeRegistry() {

        if (!this.registry) {

            this.registry = new Map();

        }

    }

    /**
     * =====================================================
     * Register Identity
     * =====================================================
     */

    register(identity) {

        this.initializeRegistry();

        if (

            this.registry.has(identity.id)

        ) {

            throw new Error(

                `Duplicate identity detected: ${identity.id}`

            );

        }

        identity.status =

            IdGenerator.Status.ACTIVE;

        identity.registeredAt =

            Date.now();

        this.registry.set(

            identity.id,

            identity

        );

        this.record(

            "Identity registered.",

            {

                id: identity.id

            }

        );

        return identity;

    }

    /**
     * =====================================================
     * Lookup Identity
     * =====================================================
     */

    lookup(id) {

        this.initializeRegistry();

        return this.registry.get(id) || null;

    }

    /**
     * =====================================================
     * Identity Exists
     * =====================================================
     */

    exists(id) {

        this.initializeRegistry();

        return this.registry.has(id);

    }

    /**
     * =====================================================
     * Lock Identity
     * =====================================================
     */

    lock(id) {

        const identity =

            this.lookup(id);

        if (!identity) {

            return false;

        }

        identity.status =

            IdGenerator.Status.LOCKED;

        identity.lockedAt =

            Date.now();

        return true;

    }

    /**
     * =====================================================
     * Archive Identity
     * =====================================================
     */

    archive(id) {

        const identity =

            this.lookup(id);

        if (!identity) {

            return false;

        }

        identity.status =

            IdGenerator.Status.ARCHIVED;

        identity.archivedAt =

            Date.now();

        return true;

    }

    /**
     * =====================================================
     * Delete Identity
     * =====================================================
     */

    remove(id) {

        const identity =

            this.lookup(id);

        if (!identity) {

            return false;

        }

        identity.status =

            IdGenerator.Status.DELETED;

        identity.deletedAt =

            Date.now();

        this.registry.delete(id);

        return true;

    }

    /**
     * =====================================================
     * Expiration
     * =====================================================
     */

    expire(id) {

        const identity =

            this.lookup(id);

        if (!identity) {

            return false;

        }

        identity.status =

            IdGenerator.Status.EXPIRED;

        identity.expiredAt =

            Date.now();

        return true;

    }

    /**
     * =====================================================
     * Time-To-Live
     * =====================================================
     */

    setTTL(

        id,

        milliseconds

    ) {

        const identity =

            this.lookup(id);

        if (!identity) {

            return false;

        }

        identity.ttl = milliseconds;

        identity.expiresAt =

            Date.now() +

            milliseconds;

        return true;

    }

    /**
     * =====================================================
     * Cleanup Expired
     * =====================================================
     */

    cleanupExpired() {

        this.initializeRegistry();

        let removed = 0;

        const now = Date.now();

        for (

            const [

                id,

                identity

            ] of this.registry.entries()

        ) {

            if (

                identity.expiresAt &&

                identity.expiresAt <= now

            ) {

                identity.status =

                    IdGenerator.Status.EXPIRED;

                this.registry.delete(id);

                removed++;

            }

        }

        this.record(

            "Expired identities cleaned.",

            {

                removed

            }

        );

        return removed;

    }

    /**
     * =====================================================
     * Active Identities
     * =====================================================
     */

    active() {

        this.initializeRegistry();

        return Array.from(

            this.registry.values()

        ).filter(

            identity =>

                identity.status ===

                IdGenerator.Status.ACTIVE

        );

    }

    /**
     * =====================================================
     * Registry Statistics
     * =====================================================
     */

    registryStats() {

        this.initializeRegistry();

        return {

            total:

                this.registry.size,

            active:

                this.active().length,

            generated:

                this.metrics.generated,

            batches:

                this.metrics.batches,

            validations:

                this.metrics.validations

        };

    }

        /**
     * =====================================================
     * Identity Fingerprint
     *
     * Creates a reproducible identity descriptor that can
     * later be upgraded to cryptographic hashing.
     * =====================================================
     */

    fingerprint(identity) {

        return {

            id: identity.id,

            namespace: identity.namespace,

            nodeId: identity.nodeId,

            createdAt: identity.createdAt,

            fingerprint: JSON.stringify({

                id: identity.id,

                namespace: identity.namespace,

                nodeId: identity.nodeId,

                createdAt: identity.createdAt

            })

        };

    }

    /**
     * =====================================================
     * Audit Report
     * =====================================================
     */

    exportAuditReport() {

        this.initializeRegistry();

        return {

            generatedAt: Date.now(),

            nodeId: this.nodeId,

            metrics: {

                ...this.metrics

            },

            registry: {

                total: this.registry.size,

                active: this.active().length

            },

            timeline: [

                ...this.timeline

            ]

        };

    }

    /**
     * =====================================================
     * Health
     * =====================================================
     */

    health() {

        this.initializeRegistry();

        return {

            healthy: true,

            nodeId: this.nodeId,

            registrySize: this.registry.size,

            activeIdentities: this.active().length,

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Integrity Verification
     * =====================================================
     */

    verifyIntegrity() {

        this.initializeRegistry();

        const duplicateIds = new Set();

        for (const id of this.registry.keys()) {

            if (duplicateIds.has(id)) {

                return {

                    healthy: false,

                    reason: `Duplicate identity detected: ${id}`

                };

            }

            duplicateIds.add(id);

        }

        return {

            healthy: true,

            registryHealthy: true,

            metricsHealthy: true,

            timelineHealthy: true

        };

    }

    /**
     * =====================================================
     * Export State
     * =====================================================
     */

    exportState() {

        this.initializeRegistry();

        return {

            nodeId: this.nodeId,

            sequence: this.sequence,

            metrics: {

                ...this.metrics

            },

            registry: Array.from(

                this.registry.entries()

            ),

            timeline: [

                ...this.timeline

            ]

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

    static deserialize(json) {

        const state =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const generator =

            new IdGenerator({

                nodeId: state.nodeId

            });

        generator.sequence =

            state.sequence;

        generator.metrics = {

            ...state.metrics

        };

        generator.timeline = [

            ...state.timeline

        ];

        generator.registry =

            new Map(

                state.registry

            );

        return generator;

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

        this.record(

            `[${level}] ${message}`,

            metadata

        );

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name: "IdGenerator",

            service: "Universal Identity Service",

            nodeId: this.nodeId,

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            info: this.getInfo(),

            integrity:

                this.verifyIntegrity(),

            health:

                this.health(),

            statistics:

                this.registryStats(),

            timeline: [

                ...this.timeline

            ]

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(options = {}) {

        return new IdGenerator(

            options

        );

    }

    /**
     * =====================================================
     * Reset
     * =====================================================
     */

    reset() {

        this.sequence = 0;

        this.metrics = {

            generated: 0,

            batches: 0,

            validations: 0

        };

        this.timeline = [];

        this.registry = new Map();

        this.record(

            "Identity service reset."

        );

    }

    /**
     * =====================================================
     * Shutdown
     * =====================================================
     */

    shutdown() {

        this.record(

            "Identity service shutting down."

        );

        return true;

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[IdGenerator Node=${this.nodeId} Generated=${this.metrics.generated} Registry=${this.registry ? this.registry.size : 0}]`;

    }

}