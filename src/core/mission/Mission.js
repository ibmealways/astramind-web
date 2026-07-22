/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: Mission.js
 *
 * Description:
 * Mission is the fundamental execution unit of AstraMind OS.
 *
 * Every user request, automation, workflow, scheduled job, autonomous process,
 * or robotic action is represented internally as a Mission.
 *
 * Missions are lifecycle-aware, stateful, serializable, diagnosable,
 * and capable of parent/child orchestration.
 *
 * The Kernel never executes prompts.
 *
 * The Kernel executes Missions.
 *
 * ----------------------------------------------------------------------------
 * Sprint:
 * Sprint 1 — Kernel Foundation
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

export const MissionStatus = Object.freeze({
    CREATED: "created",
    QUEUED: "queued",
    PLANNED: "planned",
    ROUTED: "routed",
    WAITING: "waiting",
    EXECUTING: "executing",
    PAUSED: "paused",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled"
});

export const MissionPriority = Object.freeze({
    CRITICAL: 100,
    HIGH: 75,
    NORMAL: 50,
    LOW: 25,
    BACKGROUND: 5
});

export const MissionType = Object.freeze({

    CHAT: "chat",

    CONTENT: "content",

    VIDEO: "video",

    IMAGE: "image",

    AUDIO: "audio",

    BOOK: "book",

    RESEARCH: "research",

    FINANCE: "finance",

    BUSINESS: "business",

    PUBLISHING: "publishing",

    AUTOMATION: "automation",

    SYSTEM: "system",

    ROBOTICS: "robotics"

});

function uuid() {

    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 12)
    );

}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function now() {
    return Date.now();
}

/**
 * ============================================================================
 * Mission
 * ============================================================================
 */

export default class Mission {

    constructor({

        id = uuid(),

        type = MissionType.CHAT,

        priority = MissionPriority.NORMAL,

        title = "",

        description = "",

        prompt = "",

        creator = null,

        conversationId = null,

        userId = null,

        parentMissionId = null,

        metadata = {}

    } = {}) {

        /**
         * --------------------------------------------------------
         * Identity
         * --------------------------------------------------------
         */

        this.id = id;

        this.type = type;

        this.priority = priority;

        this.title = title;

        this.description = description;

        this.prompt = prompt;

        this.userId = userId;

        this.conversationId = conversationId;

        this.creator = creator;

        this.parentMissionId = parentMissionId;

        /**
         * --------------------------------------------------------
         * Lifecycle
         * --------------------------------------------------------
         */

        this.status = MissionStatus.CREATED;

        this.progress = 0;

        this.createdAt = now();

        this.updatedAt = now();

        this.startedAt = null;

        this.completedAt = null;

        /**
         * --------------------------------------------------------
         * Relationships
         * --------------------------------------------------------
         */

        this.childMissionIds = [];

        this.dependencies = [];

        /**
         * --------------------------------------------------------
         * Capability Routing
         * --------------------------------------------------------
         */

        this.requiredCapabilities = [];

        this.assignedCapabilities = [];

        this.assignedProvider = null;

        /**
         * --------------------------------------------------------
         * Context
         * --------------------------------------------------------
         */

        this.memoryContext = [];

        this.semanticContext = [];

        this.executionContext = {};

        this.creatorContext = {};

        /**
         * --------------------------------------------------------
         * Results
         * --------------------------------------------------------
         */

        this.result = null;

        this.error = null;

        /**
         * --------------------------------------------------------
         * Retry
         * --------------------------------------------------------
         */

        this.retryCount = 0;

        this.maxRetries = 3;

        /**
         * --------------------------------------------------------
         * Diagnostics
         * --------------------------------------------------------
         */

        this.metrics = {

            planningMs: 0,

            routingMs: 0,

            executionMs: 0,

            totalMs: 0

        };

        /**
         * --------------------------------------------------------
         * Metadata
         * --------------------------------------------------------
         */

        this.metadata = deepClone(metadata);

        /**
         * --------------------------------------------------------
         * Internal History
         * --------------------------------------------------------
         */

        this.timeline = [];

        this.record(
            "Mission Created",
            MissionStatus.CREATED
        );

    }

    /**
     * ============================================================
     * Timeline Recorder
     * ============================================================
     */

    record(event, status = this.status, data = {}) {

        this.timeline.push({

            timestamp: now(),

            status,

            event,

            data

        });

        this.updatedAt = now();

    }

    /**
     * ============================================================
     * Basic Validation
     * ============================================================
     */

    validate() {

        if (!this.id)
            throw new Error("Mission requires id.");

        if (!this.type)
            throw new Error("Mission requires type.");

        if (!Object.values(MissionStatus).includes(this.status))
            throw new Error("Invalid mission status.");

        if (typeof this.priority !== "number")
            throw new Error("Priority must be numeric.");

        return true;

    }

    /**
     * ============================================================
     * Status
     * ============================================================
     */

    setStatus(status) {

        if (!Object.values(MissionStatus).includes(status)) {

            throw new Error(
                `Unknown Mission Status: ${status}`
            );

        }

        this.status = status;

        this.updatedAt = now();

        this.record(
            `Status changed to ${status}`,
            status
        );

        return this;

    }

    /**
     * ============================================================
     * Progress
     * ============================================================
     */

    setProgress(percent) {

        this.progress = Math.max(
            0,
            Math.min(
                100,
                Number(percent)
            )
        );

        this.updatedAt = now();

        this.record(
            `Progress ${this.progress}%`
        );

        return this;

    }

        /**
     * ============================================================
     * Queue Management
     * ============================================================
     */

    queue() {

        this.setStatus(MissionStatus.QUEUED);

        return this;

    }

    /**
     * ============================================================
     * Planning
     * ============================================================
     */

    plan() {

        this.setStatus(MissionStatus.PLANNED);

        return this;

    }

    /**
     * ============================================================
     * Routing
     * ============================================================
     */

    route() {

        this.setStatus(MissionStatus.ROUTED);

        return this;

    }

    /**
     * ============================================================
     * Waiting
     * ============================================================
     */

    wait() {

        this.setStatus(MissionStatus.WAITING);

        return this;

    }

    /**
     * ============================================================
     * Execution
     * ============================================================
     */

    beginExecution() {

        if (!this.startedAt) {
            this.startedAt = now();
        }

        this.setStatus(MissionStatus.EXECUTING);

        return this;

    }

    /**
     * ============================================================
     * Pause
     * ============================================================
     */

    pause(reason = "") {

        this.setStatus(MissionStatus.PAUSED);

        this.record(
            "Mission paused",
            MissionStatus.PAUSED,
            { reason }
        );

        return this;

    }

    /**
     * ============================================================
     * Resume
     * ============================================================
     */

    resume() {

        this.setStatus(MissionStatus.EXECUTING);

        this.record(
            "Mission resumed",
            MissionStatus.EXECUTING
        );

        return this;

    }

    /**
     * ============================================================
     * Complete
     * ============================================================
     */

    complete(result = null) {

        this.result = result;

        this.completedAt = now();

        this.progress = 100;

        if (this.startedAt) {

            this.metrics.totalMs =
                this.completedAt - this.startedAt;

        }

        this.setStatus(MissionStatus.COMPLETED);

        this.record(
            "Mission completed",
            MissionStatus.COMPLETED
        );

        return this;

    }

    /**
     * ============================================================
     * Failure
     * ============================================================
     */

    fail(error) {

        this.error = error;

        this.completedAt = now();

        if (this.startedAt) {

            this.metrics.totalMs =
                this.completedAt - this.startedAt;

        }

        this.setStatus(MissionStatus.FAILED);

        this.record(
            "Mission failed",
            MissionStatus.FAILED,
            {
                error:
                    error?.message ??
                    String(error)
            }
        );

        return this;

    }

    /**
     * ============================================================
     * Cancel
     * ============================================================
     */

    cancel(reason = "") {

        this.completedAt = now();

        this.setStatus(MissionStatus.CANCELLED);

        this.record(
            "Mission cancelled",
            MissionStatus.CANCELLED,
            {
                reason
            }
        );

        return this;

    }

    /**
     * ============================================================
     * Retry
     * ============================================================
     */

    canRetry() {

        return this.retryCount < this.maxRetries;

    }

    retry() {

        if (!this.canRetry()) {

            throw new Error(
                "Maximum retry count exceeded."
            );

        }

        this.retryCount++;

        this.error = null;

        this.startedAt = null;

        this.completedAt = null;

        this.progress = 0;

        this.setStatus(MissionStatus.QUEUED);

        this.record(
            "Mission retry scheduled",
            MissionStatus.QUEUED,
            {
                retryCount: this.retryCount
            }
        );

        return this;

    }

    /**
     * ============================================================
     * Dependencies
     * ============================================================
     */

    addDependency(id) {

        if (!id) return this;

        if (!this.dependencies.includes(id)) {

            this.dependencies.push(id);

            this.record(
                "Dependency Added",
                this.status,
                {
                    missionId: id
                }
            );

        }

        return this;

    }

    removeDependency(id) {

        this.dependencies =
            this.dependencies.filter(
                dep => dep !== id
            );

        return this;

    }

    hasDependencies() {

        return this.dependencies.length > 0;

    }

    /**
     * ============================================================
     * Parent / Child Missions
     * ============================================================
     */

    addChildMission(id) {

        if (!id) return this;

        if (!this.childMissionIds.includes(id)) {

            this.childMissionIds.push(id);

            this.record(
                "Child Mission Added",
                this.status,
                {
                    missionId: id
                }
            );

        }

        return this;

    }

    removeChildMission(id) {

        this.childMissionIds =
            this.childMissionIds.filter(
                child => child !== id
            );

        return this;

    }

    hasChildren() {

        return this.childMissionIds.length > 0;

    }

    /**
     * ============================================================
     * Timing
     * ============================================================
     */

    setPlanningTime(ms) {

        this.metrics.planningMs = ms;

        return this;

    }

    setRoutingTime(ms) {

        this.metrics.routingMs = ms;

        return this;

    }

    setExecutionTime(ms) {

        this.metrics.executionMs = ms;

        return this;

    }

    /**
     * ============================================================
     * Priority
     * ============================================================
     */

    elevatePriority(priority) {

        this.priority = priority;

        this.record(
            "Priority Changed",
            this.status,
            {
                priority
            }
        );

        return this;

    }

        /**
     * ============================================================
     * Required Capabilities
     * ============================================================
     */

    requireCapability(capabilityId) {

        if (!capabilityId) return this;

        if (!this.requiredCapabilities.includes(capabilityId)) {

            this.requiredCapabilities.push(capabilityId);

            this.record(
                "Capability Required",
                this.status,
                {
                    capability: capabilityId
                }
            );

        }

        return this;

    }

    requireCapabilities(capabilities = []) {

        capabilities.forEach(capability =>
            this.requireCapability(capability)
        );

        return this;

    }

    removeCapability(capabilityId) {

        this.requiredCapabilities =
            this.requiredCapabilities.filter(
                capability => capability !== capabilityId
            );

        return this;

    }

    clearCapabilities() {

        this.requiredCapabilities = [];

        return this;

    }

    /**
     * ============================================================
     * Assigned Capabilities
     * ============================================================
     */

    assignCapability(capability) {

        if (!capability) return this;

        if (!this.assignedCapabilities.includes(capability)) {

            this.assignedCapabilities.push(capability);

            this.record(
                "Capability Assigned",
                this.status,
                {
                    capability
                }
            );

        }

        return this;

    }

    assignCapabilities(capabilities = []) {

        capabilities.forEach(capability =>
            this.assignCapability(capability)
        );

        return this;

    }

    unassignCapability(capability) {

        this.assignedCapabilities =
            this.assignedCapabilities.filter(
                item => item !== capability
            );

        return this;

    }

    clearAssignments() {

        this.assignedCapabilities = [];

        return this;

    }

    /**
     * ============================================================
     * Provider Assignment
     * ============================================================
     */

    assignProvider(provider) {

        this.assignedProvider = provider;

        this.record(
            "Provider Assigned",
            this.status,
            {
                provider
            }
        );

        return this;

    }

    getAssignedProvider() {

        return this.assignedProvider;

    }

    /**
     * ============================================================
     * Conversation Binding
     * ============================================================
     */

    bindConversation(conversationId) {

        this.conversationId = conversationId;

        this.record(
            "Conversation Linked",
            this.status,
            {
                conversationId
            }
        );

        return this;

    }

    /**
     * ============================================================
     * Creator Context
     * ============================================================
     */

    setCreatorContext(context = {}) {

        this.creatorContext = {

            ...this.creatorContext,

            ...deepClone(context)

        };

        this.record(
            "Creator Context Updated",
            this.status
        );

        return this;

    }

    getCreatorContext() {

        return deepClone(this.creatorContext);

    }

    /**
     * ============================================================
     * Memory Context
     * ============================================================
     */

    addMemory(memory) {

        if (!memory) return this;

        this.memoryContext.push(memory);

        return this;

    }

    addMemories(memories = []) {

        memories.forEach(memory =>
            this.addMemory(memory)
        );

        return this;

    }

    clearMemory() {

        this.memoryContext = [];

        return this;

    }

    getMemory() {

        return [...this.memoryContext];

    }

    /**
     * ============================================================
     * Semantic Context
     * ============================================================
     */

    addSemanticContext(item) {

        if (!item) return this;

        this.semanticContext.push(item);

        return this;

    }

    addSemanticContexts(items = []) {

        items.forEach(item =>
            this.addSemanticContext(item)
        );

        return this;

    }

    clearSemanticContext() {

        this.semanticContext = [];

        return this;

    }

    /**
     * ============================================================
     * Execution Context
     * ============================================================
     */

    setExecutionContext(context = {}) {

        this.executionContext = {

            ...this.executionContext,

            ...deepClone(context)

        };

        return this;

    }

    updateExecutionContext(key, value) {

        this.executionContext[key] = value;

        return this;

    }

    getExecutionContext() {

        return deepClone(this.executionContext);

    }

    /**
     * ============================================================
     * Kernel Context
     * ============================================================
     */

    attachKernel(kernelId) {

        this.executionContext.kernelId = kernelId;

        this.record(
            "Kernel Attached",
            this.status,
            {
                kernelId
            }
        );

        return this;

    }

    /**
     * ============================================================
     * Workspace
     * ============================================================
     */

    setWorkspace(workspace) {

        this.executionContext.workspace = workspace;

        return this;

    }

    /**
     * ============================================================
     * Mission Owner
     * ============================================================
     */

    assignUser(userId) {

        this.userId = userId;

        return this;

    }

    /**
     * ============================================================
     * Tags
     * ============================================================
     */

    addTag(tag) {

        if (!tag) return this;

        if (!this.metadata.tags) {

            this.metadata.tags = [];

        }

        if (!this.metadata.tags.includes(tag)) {

            this.metadata.tags.push(tag);

        }

        return this;

    }

    removeTag(tag) {

        if (!this.metadata.tags) return this;

        this.metadata.tags =
            this.metadata.tags.filter(
                t => t !== tag
            );

        return this;

    }

    getTags() {

        return this.metadata.tags || [];

    }

    /**
     * ============================================================
     * Notes
     * ============================================================
     */

    addNote(note) {

        if (!note) return this;

        if (!this.metadata.notes) {

            this.metadata.notes = [];

        }

        this.metadata.notes.push({

            timestamp: now(),

            note

        });

        return this;

    }

    getNotes() {

        return this.metadata.notes || [];

    }

        /**
     * ============================================================
     * Results
     * ============================================================
     */

    setResult(result) {

        this.result = deepClone(result);

        this.record(
            "Mission Result Updated",
            this.status
        );

        return this;

    }

    getResult() {

        return deepClone(this.result);

    }

    clearResult() {

        this.result = null;

        return this;

    }

    /**
     * ============================================================
     * Error Handling
     * ============================================================
     */

    setError(error) {

        this.error = {

            message:
                error?.message ||
                String(error),

            stack:
                error?.stack || null,

            timestamp: now()

        };

        this.record(
            "Mission Error Recorded",
            this.status,
            this.error
        );

        return this;

    }

    clearError() {

        this.error = null;

        return this;

    }

    hasError() {

        return this.error !== null;

    }

    /**
     * ============================================================
     * Snapshot
     * ============================================================
     */

    snapshot() {

        return deepClone({

            id: this.id,

            status: this.status,

            progress: this.progress,

            priority: this.priority,

            type: this.type,

            timeline: this.timeline,

            metrics: this.metrics,

            metadata: this.metadata,

            executionContext: this.executionContext

        });

    }

    /**
     * ============================================================
     * Clone
     * ============================================================
     */

    clone() {

        const copy = new Mission({

            type: this.type,

            priority: this.priority,

            title: this.title,

            description: this.description,

            prompt: this.prompt,

            creator: deepClone(this.creator),

            conversationId: this.conversationId,

            userId: this.userId,

            metadata: deepClone(this.metadata)

        });

        copy.requiredCapabilities =
            deepClone(this.requiredCapabilities);

        copy.assignedCapabilities =
            deepClone(this.assignedCapabilities);

        copy.creatorContext =
            deepClone(this.creatorContext);

        copy.executionContext =
            deepClone(this.executionContext);

        copy.memoryContext =
            deepClone(this.memoryContext);

        copy.semanticContext =
            deepClone(this.semanticContext);

        return copy;

    }

    /**
     * ============================================================
     * JSON Export
     * ============================================================
     */

    toJSON() {

        return {

            id: this.id,

            type: this.type,

            priority: this.priority,

            title: this.title,

            description: this.description,

            prompt: this.prompt,

            userId: this.userId,

            conversationId: this.conversationId,

            parentMissionId: this.parentMissionId,

            status: this.status,

            progress: this.progress,

            createdAt: this.createdAt,

            updatedAt: this.updatedAt,

            startedAt: this.startedAt,

            completedAt: this.completedAt,

            childMissionIds: deepClone(this.childMissionIds),

            dependencies: deepClone(this.dependencies),

            requiredCapabilities:
                deepClone(this.requiredCapabilities),

            assignedCapabilities:
                deepClone(this.assignedCapabilities),

            assignedProvider:
                this.assignedProvider,

            creatorContext:
                deepClone(this.creatorContext),

            executionContext:
                deepClone(this.executionContext),

            memoryContext:
                deepClone(this.memoryContext),

            semanticContext:
                deepClone(this.semanticContext),

            result:
                deepClone(this.result),

            error:
                deepClone(this.error),

            retryCount:
                this.retryCount,

            maxRetries:
                this.maxRetries,

            metrics:
                deepClone(this.metrics),

            metadata:
                deepClone(this.metadata),

            timeline:
                deepClone(this.timeline)

        };

    }

    /**
     * ============================================================
     * Serialize
     * ============================================================
     */

    serialize() {

        return JSON.stringify(
            this.toJSON(),
            null,
            2
        );

    }

    /**
     * ============================================================
     * Deserialize
     * ============================================================
     */

    static deserialize(json) {

        const data =
            typeof json === "string"
                ? JSON.parse(json)
                : json;

        const mission = new Mission({

            id: data.id,

            type: data.type,

            priority: data.priority,

            title: data.title,

            description: data.description,

            prompt: data.prompt,

            creator: data.creator,

            conversationId: data.conversationId,

            userId: data.userId,

            parentMissionId: data.parentMissionId,

            metadata: data.metadata

        });

        Object.assign(mission, deepClone(data));

        return mission;

    }

    /**
     * ============================================================
     * Persistence
     * ============================================================
     */

    save(storage = localStorage) {

        storage.setItem(

            `mission:${this.id}`,

            this.serialize()

        );

        this.record(
            "Mission Saved",
            this.status
        );

        return this;

    }

    static load(id, storage = localStorage) {

        const raw =
            storage.getItem(
                `mission:${id}`
            );

        if (!raw) return null;

        return Mission.deserialize(raw);

    }

    static delete(id, storage = localStorage) {

        storage.removeItem(
            `mission:${id}`
        );

    }

    /**
     * ============================================================
     * History Replay
     * ============================================================
     */

    replayTimeline(callback) {

        if (typeof callback !== "function") {

            return;

        }

        this.timeline.forEach(entry => {

            callback(deepClone(entry));

        });

    }

    /**
     * ============================================================
     * Synchronization
     * ============================================================
     */

    synchronizeFrom(otherMission) {

        if (!(otherMission instanceof Mission)) {

            throw new Error(
                "Mission synchronization requires Mission."
            );

        }

        Object.assign(

            this,

            deepClone(
                otherMission.toJSON()
            )

        );

        this.record(
            "Mission synchronized"
        );

        return this;

    }

    /**
     * ============================================================
     * Distributed Execution
     * ============================================================
     */

    assignNode(nodeId) {

        this.executionContext.nodeId =
            nodeId;

        return this;

    }

    getAssignedNode() {

        return this.executionContext.nodeId;

    }

        /**
     * ============================================================
     * Diagnostics Integration
     * ============================================================
     */

    attachDiagnostics(diagnostics) {

        this.executionContext.diagnostics = diagnostics;

        this.record(
            "Diagnostics Attached",
            this.status
        );

        return this;

    }

    log(level, message, metadata = {}) {

        const diagnostics =
            this.executionContext.diagnostics;

        if (
            diagnostics &&
            typeof diagnostics.record === "function"
        ) {
            diagnostics.record(
                level,
                "mission",
                message,
                {
                    missionId: this.id,
                    ...metadata
                }
            );
        }

        return this;

    }

    /**
     * ============================================================
     * Health
     * ============================================================
     */

    health() {

        const issues = [];

        if (!this.id)
            issues.push("Missing mission id.");

        if (!this.type)
            issues.push("Missing mission type.");

        if (!this.status)
            issues.push("Missing mission status.");

        if (this.progress < 0 || this.progress > 100)
            issues.push("Invalid progress value.");

        return {

            healthy: issues.length === 0,

            issues,

            status: this.status,

            progress: this.progress,

            retryCount: this.retryCount,

            timelineEvents: this.timeline.length

        };

    }

    /**
     * ============================================================
     * Performance
     * ============================================================
     */

    getPerformanceMetrics() {

        return {

            planningMs:
                this.metrics.planningMs,

            routingMs:
                this.metrics.routingMs,

            executionMs:
                this.metrics.executionMs,

            totalMs:
                this.metrics.totalMs

        };

    }

    getExecutionDuration() {

        if (!this.startedAt)
            return 0;

        if (this.completedAt)
            return this.completedAt - this.startedAt;

        return now() - this.startedAt;

    }

    /**
     * ============================================================
     * Readiness
     * ============================================================
     */

    isReady() {

        return (

            this.validate() &&

            this.status === MissionStatus.PLANNED &&

            this.requiredCapabilities.length > 0

        );

    }

    isRunning() {

        return this.status === MissionStatus.EXECUTING;

    }

    isFinished() {

        return [

            MissionStatus.COMPLETED,

            MissionStatus.FAILED,

            MissionStatus.CANCELLED

        ].includes(this.status);

    }

    /**
     * ============================================================
     * Mission Summary
     * ============================================================
     */

    summary() {

        return {

            id: this.id,

            title: this.title,

            type: this.type,

            status: this.status,

            priority: this.priority,

            progress: this.progress,

            provider: this.assignedProvider,

            capabilities:

                [...this.requiredCapabilities],

            duration:

                this.getExecutionDuration(),

            retries:

                this.retryCount,

            children:

                this.childMissionIds.length

        };

    }

    /**
     * ============================================================
     * Event Payload
     * ============================================================
     */

    toEventPayload() {

        return {

            missionId: this.id,

            type: this.type,

            status: this.status,

            priority: this.priority,

            progress: this.progress,

            timestamp: now()

        };

    }

    /**
     * ============================================================
     * Mission Score
     * ============================================================
     */

    score() {

        let score = 100;

        score -= this.retryCount * 10;

        if (this.status === MissionStatus.FAILED)
            score -= 25;

        if (this.status === MissionStatus.CANCELLED)
            score -= 15;

        if (this.progress < 100 &&
            this.status === MissionStatus.COMPLETED)
            score -= 20;

        return Math.max(score, 0);

    }

    /**
     * ============================================================
     * Reset
     * ============================================================
     */

    reset() {

        this.status = MissionStatus.CREATED;

        this.progress = 0;

        this.startedAt = null;

        this.completedAt = null;

        this.retryCount = 0;

        this.result = null;

        this.error = null;

        this.metrics = {

            planningMs: 0,

            routingMs: 0,

            executionMs: 0,

            totalMs: 0

        };

        this.timeline = [];

        this.record(
            "Mission Reset",
            MissionStatus.CREATED
        );

        return this;

    }

    /**
     * ============================================================
     * String Representation
     * ============================================================
     */

    toString() {

        return `[Mission ${this.id}] ${this.type} :: ${this.status}`;

    }

    /**
     * ============================================================
     * Debug Object
     * ============================================================
     */

    debug() {

        return {

            summary: this.summary(),

            health: this.health(),

            metrics: this.getPerformanceMetrics(),

            timeline: [...this.timeline]

        };

    }

    /**
     * ============================================================
     * Kernel Compatibility
     * ============================================================
     */

    exportForKernel() {

        return {

            missionId: this.id,

            priority: this.priority,

            status: this.status,

            requiredCapabilities:

                [...this.requiredCapabilities],

            assignedCapabilities:

                [...this.assignedCapabilities],

            provider:

                this.assignedProvider,

            context:

                this.getExecutionContext(),

            summary:

                this.summary()

        };

    }

    /**
     * ============================================================
     * Final Validation
     * ============================================================
     */

    finalize() {

        this.validate();

        this.record(
            "Mission Finalized",
            this.status
        );

        return this;

    }

}