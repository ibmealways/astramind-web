/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: MissionHistory.js
 *
 * Description:
 * Enterprise Mission History Service
 *
 * MissionHistory records the complete lifecycle of every Mission executed by
 * AstraMind OS. It provides immutable audit history, execution analytics,
 * operational intelligence, and long-term learning data.
 *
 * Responsibilities
 * ----------------
 * • Record every Mission lifecycle event
 * • Maintain immutable execution history
 * • Support audit trails
 * • Generate execution statistics
 * • Support replay metadata
 * • Feed analytics into future planning
 * • Persist mission history
 * • Enable enterprise reporting
 *
 * IMPORTANT
 * ---------
 * MissionHistory NEVER executes missions.
 * MissionHistory NEVER modifies missions.
 *
 * MissionHistory is write-once.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import Mission from "./Mission.js";

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

export default class MissionHistory {

    constructor({

        diagnostics = null,

        eventBus = null,

        storage = null

    } = {}) {

        this.id = uuid();

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

        this.storage = storage;

        /**
         * =====================================================
         * Mission Archive
         * =====================================================
         */

        this.archive = [];

        /**
         * =====================================================
         * Runtime Metrics
         * =====================================================
         */

        this.metrics = {

            totalMissions: 0,

            completed: 0,

            failed: 0,

            cancelled: 0,

            averageDurationMs: 0,

            averagePlanningMs: 0,

            averageExecutionMs: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "MissionHistory initialized."

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
     * Archive Mission
     * =====================================================
     */

    archiveMission(

        mission,

        executionSummary = {}

    ) {

        if (!(mission instanceof Mission)) {

            throw new Error(

                "MissionHistory requires Mission instance."

            );

        }

        const entry = {

            archiveId: uuid(),

            missionId: mission.id,

            missionType: mission.type,

            priority: mission.priority,

            status: mission.status,

            createdAt: mission.createdAt,

            completedAt: Date.now(),

            planningMs:

                mission.metrics?.planningMs || 0,

            executionMs:

                mission.metrics?.executionMs || 0,

            durationMs:

                Date.now() -

                mission.createdAt,

            summary:

                clone(executionSummary),

            capabilities:

                clone(

                    mission.requiredCapabilities || []

                ),

            metadata:

                clone(

                    mission.metadata || {}

                )

        };

        this.archive.push(entry);

        this.metrics.totalMissions++;

        this.record(

            "Mission archived.",

            {

                missionId:

                    mission.id

            }

        );

        this.publish(

            "mission.history.archived",

            {

                missionId:

                    mission.id

            }

        );

        this.updateMetrics(entry);

        return entry;

    }

    /**
     * =====================================================
     * Archive Access
     * =====================================================
     */

    getArchive() {

        return [

            ...this.archive

        ];

    }

    getMission(

        missionId

    ) {

        return this.archive.find(

            mission =>

                mission.missionId ===

                missionId

        ) || null;

    }

    hasMission(

        missionId

    ) {

        return this.archive.some(

            mission =>

                mission.missionId ===

                missionId

        );

    }

        /**
     * =====================================================
     * Search
     * =====================================================
     */

    search({

        missionType = null,

        status = null,

        capability = null,

        from = null,

        to = null

    } = {}) {

        return this.archive.filter(entry => {

            if (

                missionType &&

                entry.missionType !== missionType

            ) {

                return false;

            }

            if (

                status &&

                entry.status !== status

            ) {

                return false;

            }

            if (

                capability &&

                !entry.capabilities.includes(capability)

            ) {

                return false;

            }

            if (

                from &&

                entry.createdAt < from

            ) {

                return false;

            }

            if (

                to &&

                entry.createdAt > to

            ) {

                return false;

            }

            return true;

        });

    }

    /**
     * =====================================================
     * Recent Missions
     * =====================================================
     */

    getRecent(

        limit = 25

    ) {

        return [...this.archive]

            .sort(

                (a, b) =>

                    b.createdAt -

                    a.createdAt

            )

            .slice(0, limit);

    }

    /**
     * =====================================================
     * Capability Analytics
     * =====================================================
     */

    getCapabilityStatistics() {

        const stats = {};

        this.archive.forEach(entry => {

            entry.capabilities.forEach(capability => {

                if (!stats[capability]) {

                    stats[capability] = {

                        executions: 0,

                        totalDuration: 0

                    };

                }

                stats[capability].executions++;

                stats[capability].totalDuration +=

                    entry.executionMs;

            });

        });

        Object.keys(stats).forEach(capability => {

            const item = stats[capability];

            item.averageExecutionMs =

                item.executions === 0

                    ? 0

                    : Math.round(

                        item.totalDuration /

                        item.executions

                    );

        });

        return stats;

    }

    /**
     * =====================================================
     * Mission Type Analytics
     * =====================================================
     */

    getMissionTypeStatistics() {

        const stats = {};

        this.archive.forEach(entry => {

            if (!stats[entry.missionType]) {

                stats[entry.missionType] = {

                    count: 0,

                    totalDuration: 0

                };

            }

            stats[entry.missionType].count++;

            stats[entry.missionType].totalDuration +=

                entry.durationMs;

        });

        return stats;

    }

    /**
     * =====================================================
     * Success Statistics
     * =====================================================
     */

    getSuccessRate() {

        if (

            this.archive.length === 0

        ) {

            return 0;

        }

        const successful =

            this.archive.filter(entry =>

                entry.status ===

                "completed"

            ).length;

        return Number(

            (

                successful /

                this.archive.length

            ) * 100

        ).toFixed(2);

    }

    /**
     * =====================================================
     * Failure Statistics
     * =====================================================
     */

    getFailureRate() {

        if (

            this.archive.length === 0

        ) {

            return 0;

        }

        const failed =

            this.archive.filter(entry =>

                entry.status ===

                "failed"

            ).length;

        return Number(

            (

                failed /

                this.archive.length

            ) * 100

        ).toFixed(2);

    }

    /**
     * =====================================================
     * Average Duration
     * =====================================================
     */

    getAverageMissionDuration() {

        if (

            this.archive.length === 0

        ) {

            return 0;

        }

        const total =

            this.archive.reduce(

                (sum, mission) =>

                    sum +

                    mission.durationMs,

                0

            );

        return Math.round(

            total /

            this.archive.length

        );

    }

    /**
     * =====================================================
     * Average Planning Time
     * =====================================================
     */

    getAveragePlanningTime() {

        if (

            this.archive.length === 0

        ) {

            return 0;

        }

        const total =

            this.archive.reduce(

                (sum, mission) =>

                    sum +

                    mission.planningMs,

                0

            );

        return Math.round(

            total /

            this.archive.length

        );

    }

    /**
     * =====================================================
     * Average Execution Time
     * =====================================================
     */

    getAverageExecutionTime() {

        if (

            this.archive.length === 0

        ) {

            return 0;

        }

        const total =

            this.archive.reduce(

                (sum, mission) =>

                    sum +

                    mission.executionMs,

                0

            );

        return Math.round(

            total /

            this.archive.length

        );

    }

        /**
     * =====================================================
     * Mission Efficiency Score
     *
     * Produces a normalized execution score (0-100)
     * based on duration, retries, failures, and outcome.
     * =====================================================
     */

    calculateMissionScore(entry) {

        let score = 100;

        if (entry.status !== "completed") {

            score -= 40;

        }

        if (entry.executionMs > 10000) {

            score -= 10;

        }

        if (entry.executionMs > 30000) {

            score -= 15;

        }

        if (entry.summary?.retryCount) {

            score -= entry.summary.retryCount * 5;

        }

        return Math.max(0, score);

    }

    /**
     * =====================================================
     * Highest Performing Missions
     * =====================================================
     */

    getBestPerformingMissions(limit = 20) {

        return [...this.archive]

            .map(entry => ({

                ...entry,

                missionScore:

                    this.calculateMissionScore(entry)

            }))

            .sort(

                (a, b) =>

                    b.missionScore -

                    a.missionScore

            )

            .slice(0, limit);

    }

    /**
     * =====================================================
     * Mission Similarity Search
     *
     * Used by MissionPlanner to discover previous
     * successful missions before planning a new one.
     * =====================================================
     */

    findSimilarMissions(mission) {

        if (!(mission instanceof Mission)) {

            return [];

        }

        return this.archive

            .filter(entry =>

                entry.missionType === mission.type

            )

            .sort((a, b) => {

                const aMatches =

                    a.capabilities.filter(capability =>

                        mission.requiredCapabilities.includes(

                            capability

                        )

                    ).length;

                const bMatches =

                    b.capabilities.filter(capability =>

                        mission.requiredCapabilities.includes(

                            capability

                        )

                    ).length;

                return bMatches - aMatches;

            })

            .slice(0, 10);

    }

    /**
     * =====================================================
     * Capability Optimization
     * =====================================================
     */

    getOptimizationSuggestions() {

        const bottlenecks =

            this.detectExecutionBottlenecks();

        const failures =

            this.detectFailureHotspots();

        const suggestions = [];

        bottlenecks.forEach(item => {

            suggestions.push({

                type: "performance",

                capability:

                    item.capability,

                recommendation:

                    "Investigate execution latency."

            });

        });

        failures.forEach(item => {

            suggestions.push({

                type: "stability",

                capability:

                    item.capability,

                recommendation:

                    "Increase retries or improve provider selection."

            });

        });

        return suggestions;

    }

    /**
     * =====================================================
     * Provider Cost Analytics
     * =====================================================
     */

    getProviderCostAnalytics() {

        const providers = {};

        this.archive.forEach(entry => {

            const provider =

                entry.summary?.provider ||

                "unknown";

            if (!providers[provider]) {

                providers[provider] = {

                    estimatedCost: 0,

                    executions: 0

                };

            }

            providers[provider].executions++;

            providers[provider].estimatedCost +=

                entry.summary?.estimatedCost || 0;

        });

        return providers;

    }

    /**
     * =====================================================
     * Confidence Analytics
     * =====================================================
     */

    getConfidenceAnalytics() {

        if (this.archive.length === 0) {

            return {

                averageConfidence: 0

            };

        }

        let total = 0;

        this.archive.forEach(entry => {

            total +=

                entry.summary?.confidence || 0;

        });

        return {

            averageConfidence:

                Number(

                    total /

                    this.archive.length

                ).toFixed(2)

        };

    }

    /**
     * =====================================================
     * Predictive Estimates
     *
     * Uses historical mission data to estimate
     * execution characteristics for future missions.
     * =====================================================
     */

    predictMission(mission) {

        const similar =

            this.findSimilarMissions(mission);

        if (similar.length === 0) {

            return {

                confidence: 0,

                estimatedExecutionMs: 0,

                predictedSuccessRate: 0

            };

        }

        const executionAverage =

            Math.round(

                similar.reduce(

                    (sum, item) =>

                        sum + item.executionMs,

                    0

                ) /

                similar.length

            );

        const successful =

            similar.filter(item =>

                item.status === "completed"

            ).length;

        return {

            confidence:

                Math.min(

                    100,

                    similar.length * 10

                ),

            estimatedExecutionMs:

                executionAverage,

            predictedSuccessRate:

                Number(

                    (

                        successful /

                        similar.length

                    ) * 100

                ).toFixed(2)

        };

    }

    /**
     * =====================================================
     * Mission Intelligence Report
     * =====================================================
     */

    generateIntelligenceReport() {

        return {

            successRate:

                this.getSuccessRate(),

            failureRate:

                this.getFailureRate(),

            trends:

                this.getMissionTrends(),

            planner:

                this.getPlannerRecommendations(),

            optimization:

                this.getOptimizationSuggestions(),

            providers:

                this.getProviderStatistics(),

            costs:

                this.getProviderCostAnalytics(),

            confidence:

                this.getConfidenceAnalytics()

        };

    }

        /**
     * =====================================================
     * Knowledge Extraction
     *
     * Produces reusable operational knowledge that can be
     * consumed by Memory, MissionPlanner and future AI
     * optimization services.
     * =====================================================
     */

    extractKnowledge() {

        return {

            missionPatterns:

                this.getMissionPatterns(),

            capabilityRelationships:

                this.getCapabilityRelationships(),

            optimization:

                this.getOptimizationSuggestions(),

            providerPerformance:

                this.getProviderStatistics(),

            confidence:

                this.getConfidenceAnalytics(),

            trends:

                this.getMissionTrends()

        };

    }

    /**
     * =====================================================
     * Planner Feedback
     * =====================================================
     */

    generatePlannerFeedback() {

        return {

            recommendations:

                this.getOptimizationSuggestions(),

            predictions:

                this.generateIntelligenceReport(),

            successfulPatterns:

                this.getMissionPatterns(),

            bottlenecks:

                this.detectExecutionBottlenecks(),

            hotspots:

                this.detectFailureHotspots()

        };

    }

    /**
     * =====================================================
     * Replay Metadata
     *
     * Prepares completed missions for MissionReplay.js.
     * =====================================================
     */

    createReplayPackage(missionId) {

        const mission =

            this.getMission(missionId);

        if (!mission) {

            return null;

        }

        return {

            replayVersion: "1.0",

            missionId:

                mission.missionId,

            missionType:

                mission.missionType,

            capabilities:

                clone(

                    mission.capabilities

                ),

            summary:

                clone(

                    mission.summary

                ),

            metadata:

                clone(

                    mission.metadata

                ),

            durationMs:

                mission.durationMs

        };

    }

    /**
     * =====================================================
     * Enterprise Audit Export
     * =====================================================
     */

    exportAuditLog() {

        return {

            generatedAt:

                Date.now(),

            totalMissions:

                this.metrics.totalMissions,

            completed:

                this.metrics.completed,

            failed:

                this.metrics.failed,

            cancelled:

                this.metrics.cancelled,

            archive:

                clone(this.archive)

        };

    }

    /**
     * =====================================================
     * Dashboard Snapshot
     * =====================================================
     */

    getDashboardSnapshot() {

        return {

            metrics:

                clone(this.metrics),

            intelligence:

                this.generateIntelligenceReport(),

            recent:

                this.getRecent(10),

            healthiestProviders:

                this.getProviderStatistics(),

            generatedAt:

                Date.now()

        };

    }

    /**
     * =====================================================
     * Persistence
     * =====================================================
     */

    exportState() {

        return {

            id:

                this.id,

            archive:

                clone(this.archive),

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline)

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

        const history =

            new MissionHistory(options);

        history.id = data.id;

        history.archive =

            clone(data.archive);

        history.metrics =

            clone(data.metrics);

        history.timeline =

            clone(data.timeline);

        return history;

    }

    /**
     * =====================================================
     * Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            archivedMissions:

                this.archive.length,

            metrics:

                clone(this.metrics),

            storageConnected:

                !!this.storage,

            diagnosticsConnected:

                !!this.diagnostics,

            eventBusConnected:

                !!this.eventBus

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

            "MissionHistory",

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

            name: "MissionHistory",

            version: "3.0.0-alpha.1",

            archivedMissions:

                this.archive.length,

            metrics:

                clone(this.metrics)

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

            intelligence:

                this.generateIntelligenceReport(),

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(options = {}) {

        return new MissionHistory(options);

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[MissionHistory Missions=${this.archive.length}]`;

    }

}