/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: MissionPlanner.js
 *
 * Description:
 * Converts a Mission into an executable execution plan.
 *
 * Responsibilities:
 *  - Analyze mission intent
 *  - Determine execution strategy
 *  - Select required capabilities
 *  - Build dependency graph
 *  - Estimate execution cost
 *  - Assign execution priority
 *  - Produce an immutable Mission Plan
 *
 * IMPORTANT:
 * MissionPlanner NEVER executes work.
 * It only creates execution plans.
 *
 * Sprint:
 * Sprint 1 — Kernel Foundation
 * ============================================================================
 */

import Mission, {
    MissionPriority,
    MissionStatus,
    MissionType
} from "./Mission.js";

export const PlanningStrategy = Object.freeze({

    SEQUENTIAL: "sequential",

    PARALLEL: "parallel",

    HYBRID: "hybrid"

});

export const PlanningComplexity = Object.freeze({

    LOW: "low",

    MEDIUM: "medium",

    HIGH: "high",

    EXTREME: "extreme"

});

function deepClone(obj) {

    return JSON.parse(JSON.stringify(obj));

}

function now() {

    return Date.now();

}

export default class MissionPlanner {

    constructor({

        diagnostics = null,

        capabilityRegistry = null,

        eventBus = null

    } = {}) {

        this.diagnostics = diagnostics;

        this.capabilityRegistry = capabilityRegistry;

        this.eventBus = eventBus;

    }

    /**
     * ============================================================
     * Public Entry Point
     * ============================================================
     */

    async createPlan(mission) {

        if (!(mission instanceof Mission)) {

            throw new Error(
                "MissionPlanner requires Mission instance."
            );

        }

        const started = now();

        this.log(

            "Planning mission",

            {

                missionId: mission.id,

                type: mission.type

            }

        );

        const plan = {

            missionId: mission.id,

            createdAt: started,

            strategy: PlanningStrategy.SEQUENTIAL,

            complexity: PlanningComplexity.LOW,

            estimatedDuration: 0,

            priority: mission.priority,

            requiredCapabilities: [],

            dependencies: [],

            executionGraph: [],

            providerHints: [],

            notes: []

        };

        this.detectMissionType(

            mission,

            plan

        );

        this.assignCapabilities(

            mission,

            plan

        );

        this.buildDependencies(

            mission,

            plan

        );

        this.determineStrategy(

            mission,

            plan

        );

        this.calculateComplexity(

            mission,

            plan

        );

        this.estimateExecution(

            mission,

            plan

        );

        mission.setPlanningTime(

            now() - started

        );

        mission.plan();

        this.log(

            "Mission planning complete",

            {

                missionId: mission.id,

                duration:

                    mission.metrics.planningMs

            }

        );

        return Object.freeze(

            deepClone(plan)

        );

    }

        /**
     * ============================================================
     * Mission Type Detection
     * ============================================================
     */

    detectMissionType(mission, plan) {

        switch (mission.type) {

            case MissionType.VIDEO:

                plan.notes.push(
                    "Video generation pipeline detected."
                );

                break;

            case MissionType.RESEARCH:

                plan.notes.push(
                    "Research workflow detected."
                );

                break;

            case MissionType.CONTENT:

                plan.notes.push(
                    "Content generation workflow detected."
                );

                break;

            case MissionType.FINANCE:

                plan.notes.push(
                    "Finance intelligence workflow detected."
                );

                break;

            case MissionType.BOOK:

                plan.notes.push(
                    "Book authoring workflow detected."
                );

                break;

            case MissionType.BUSINESS:

                plan.notes.push(
                    "Business strategy workflow detected."
                );

                break;

            case MissionType.ROBOTICS:

                plan.notes.push(
                    "Robotics control workflow detected."
                );

                break;

            default:

                plan.notes.push(
                    "General mission."
                );

        }

    }

    /**
     * ============================================================
     * Capability Discovery
     * ============================================================
     */

    assignCapabilities(mission, plan) {

        const capabilities = [];

        switch (mission.type) {

            case MissionType.CONTENT:

                capabilities.push(
                    "creatorBrain",
                    "content",
                    "memory"
                );

                break;

            case MissionType.VIDEO:

                capabilities.push(
                    "creatorBrain",
                    "research",
                    "storyboard",
                    "voiceover",
                    "timeline",
                    "captions",
                    "render",
                    "publishing"
                );

                break;

            case MissionType.BOOK:

                capabilities.push(
                    "creatorBrain",
                    "memory",
                    "research",
                    "bookEngine"
                );

                break;

            case MissionType.RESEARCH:

                capabilities.push(
                    "research",
                    "memory"
                );

                break;

            case MissionType.FINANCE:

                capabilities.push(
                    "finance",
                    "marketIntel",
                    "memory"
                );

                break;

            case MissionType.BUSINESS:

                capabilities.push(
                    "business",
                    "creatorBrain",
                    "research"
                );

                break;

            case MissionType.IMAGE:

                capabilities.push(
                    "imageGeneration"
                );

                break;

            case MissionType.AUDIO:

                capabilities.push(
                    "audio"
                );

                break;

            case MissionType.PUBLISHING:

                capabilities.push(
                    "publishing"
                );

                break;

            default:

                capabilities.push(
                    "conversation"
                );

        }

        capabilities.forEach(capability => {

            mission.requireCapability(capability);

        });

        plan.requiredCapabilities = [

            ...mission.requiredCapabilities

        ];

    }

    /**
     * ============================================================
     * Dependency Graph
     * ============================================================
     */

    buildDependencies(mission, plan) {

        const graph = [];

        const capabilities =
            mission.requiredCapabilities;

        capabilities.forEach((capability, index) => {

            graph.push({

                step: index + 1,

                capability,

                dependsOn:

                    index === 0
                        ? null
                        : capabilities[index - 1]

            });

        });

        plan.executionGraph = graph;

        plan.dependencies = graph
            .filter(step => step.dependsOn)
            .map(step => ({

                capability: step.capability,

                dependsOn: step.dependsOn

            }));

    }

    /**
     * ============================================================
     * Execution Strategy
     * ============================================================
     */

    determineStrategy(mission, plan) {

        const count =
            mission.requiredCapabilities.length;

        if (count <= 2) {

            plan.strategy =
                PlanningStrategy.SEQUENTIAL;

        }

        else if (count <= 5) {

            plan.strategy =
                PlanningStrategy.HYBRID;

        }

        else {

            plan.strategy =
                PlanningStrategy.PARALLEL;

        }

    }

    /**
     * ============================================================
     * Complexity
     * ============================================================
     */

    calculateComplexity(mission, plan) {

        const total =
            mission.requiredCapabilities.length;

        if (total <= 2) {

            plan.complexity =
                PlanningComplexity.LOW;

        }

        else if (total <= 5) {

            plan.complexity =
                PlanningComplexity.MEDIUM;

        }

        else if (total <= 8) {

            plan.complexity =
                PlanningComplexity.HIGH;

        }

        else {

            plan.complexity =
                PlanningComplexity.EXTREME;

        }

    }

    /**
     * ============================================================
     * Priority Evaluation
     * ============================================================
     */

    adjustPriority(mission, plan) {

        if (

            mission.type === MissionType.SYSTEM ||

            mission.priority >= MissionPriority.CRITICAL

        ) {

            plan.priority =
                MissionPriority.CRITICAL;

            return;

        }

        if (

            plan.complexity ===
            PlanningComplexity.EXTREME

        ) {

            plan.priority += 10;

        }

        if (

            mission.dependencies.length > 5

        ) {

            plan.priority += 5;

        }

    }

    /**
     * ============================================================
     * Provider Suggestions
     * ============================================================
     */

    assignProviderHints(mission, plan) {

        const providers = [];

        if (

            mission.type === MissionType.RESEARCH

        ) {

            providers.push(

                "web",

                "search"

            );

        }

        if (

            mission.type === MissionType.CONTENT ||

            mission.type === MissionType.BOOK

        ) {

            providers.push(

                "creatorBrain"

            );

        }

        if (

            mission.type === MissionType.VIDEO

        ) {

            providers.push(

                "videoPipeline"

            );

        }

        if (

            mission.type === MissionType.FINANCE

        ) {

            providers.push(

                "finance"

            );

        }

        plan.providerHints = providers;

    }

        /**
     * ============================================================
     * Execution Cost Estimation
     * ============================================================
     */

    estimateExecution(mission, plan) {

        let estimatedMs = 0;

        const weights = {

            conversation: 50,

            memory: 25,

            creatorBrain: 120,

            research: 350,

            finance: 250,

            business: 200,

            storyboard: 180,

            voiceover: 900,

            timeline: 350,

            captions: 220,

            render: 4500,

            publishing: 200,

            imageGeneration: 2500,

            audio: 1200,

            bookEngine: 800

        };

        mission.requiredCapabilities.forEach(capability => {

            estimatedMs += weights[capability] || 150;

        });

        plan.estimatedDuration = estimatedMs;

        plan.notes.push(

            `Estimated execution ${estimatedMs} ms`

        );

    }

    /**
     * ============================================================
     * Resource Planning
     * ============================================================
     */

    allocateResources(mission, plan) {

        const resources = [];

        if (mission.requiredCapabilities.includes("research")) {

            resources.push({

                type: "network",

                priority: "high"

            });

        }

        if (mission.requiredCapabilities.includes("render")) {

            resources.push({

                type: "gpu",

                priority: "critical"

            });

        }

        if (

            mission.requiredCapabilities.includes("voiceover") ||

            mission.requiredCapabilities.includes("audio")

        ) {

            resources.push({

                type: "tts",

                priority: "medium"

            });

        }

        if (

            mission.requiredCapabilities.includes("finance")

        ) {

            resources.push({

                type: "market-data",

                priority: "high"

            });

        }

        plan.resources = resources;

    }

    /**
     * ============================================================
     * Concurrency Groups
     * ============================================================
     */

    buildConcurrencyGroups(plan) {

        const groups = [];

        const independent = [];

        const sequential = [];

        plan.executionGraph.forEach(node => {

            if (!node.dependsOn) {

                independent.push(node.capability);

            } else {

                sequential.push(node.capability);

            }

        });

        if (independent.length) {

            groups.push({

                name: "parallel-group",

                mode: "parallel",

                capabilities: independent

            });

        }

        if (sequential.length) {

            groups.push({

                name: "pipeline-group",

                mode: "sequential",

                capabilities: sequential

            });

        }

        plan.concurrencyGroups = groups;

    }

    /**
     * ============================================================
     * Risk Assessment
     * ============================================================
     */

    assessRisk(mission, plan) {

        let score = 0;

        if (plan.complexity === PlanningComplexity.HIGH)
            score += 20;

        if (plan.complexity === PlanningComplexity.EXTREME)
            score += 40;

        if (mission.requiredCapabilities.includes("research"))
            score += 10;

        if (mission.requiredCapabilities.includes("render"))
            score += 25;

        if (mission.requiredCapabilities.length > 8)
            score += 20;

        plan.risk = {

            score,

            level:

                score < 20
                    ? "low"
                    : score < 45
                    ? "medium"
                    : score < 70
                    ? "high"
                    : "critical"

        };

    }

    /**
     * ============================================================
     * Fallback Planning
     * ============================================================
     */

    buildFallbackPlan(mission, plan) {

        const fallback = [];

        if (

            mission.requiredCapabilities.includes("research")

        ) {

            fallback.push({

                capability: "research",

                fallback: "webSearch"

            });

        }

        if (

            mission.requiredCapabilities.includes("voiceover")

        ) {

            fallback.push({

                capability: "voiceover",

                fallback: "localTTS"

            });

        }

        if (

            mission.requiredCapabilities.includes("render")

        ) {

            fallback.push({

                capability: "render",

                fallback: "cpuRenderer"

            });

        }

        if (

            mission.requiredCapabilities.includes("finance")

        ) {

            fallback.push({

                capability: "finance",

                fallback: "cachedMarketData"

            });

        }

        plan.fallbacks = fallback;

    }

    /**
     * ============================================================
     * Optimization Pass
     * ============================================================
     */

    optimizePlan(plan) {

        const uniqueCapabilities = [

            ...new Set(plan.requiredCapabilities)

        ];

        plan.requiredCapabilities = uniqueCapabilities;

        plan.executionGraph.sort(

            (a, b) => a.step - b.step

        );

        if (

            plan.strategy === PlanningStrategy.PARALLEL &&

            plan.executionGraph.length < 3

        ) {

            plan.strategy =

                PlanningStrategy.HYBRID;

        }

        plan.notes.push(

            "Execution plan optimized."

        );

    }

    /**
     * ============================================================
     * Planning Pipeline
     * ============================================================
     */

    finalizePlanning(mission, plan) {

        this.adjustPriority(

            mission,

            plan

        );

        this.assignProviderHints(

            mission,

            plan

        );

        this.allocateResources(

            mission,

            plan

        );

        this.buildConcurrencyGroups(

            plan

        );

        this.assessRisk(

            mission,

            plan

        );

        this.buildFallbackPlan(

            mission,

            plan

        );

        this.optimizePlan(

            plan

        );

    }

        /**
     * ============================================================
     * Mission Graph Validation
     * ============================================================
     */

    validatePlan(mission, plan) {

        if (!plan.requiredCapabilities.length) {

            throw new Error(
                "Mission plan contains no capabilities."
            );

        }

        const capabilitySet = new Set();

        for (const capability of plan.requiredCapabilities) {

            if (capabilitySet.has(capability)) {

                this.log(
                    "Duplicate capability removed.",
                    { capability }
                );

            }

            capabilitySet.add(capability);

        }

        if (!plan.executionGraph.length) {

            throw new Error(
                "Execution graph was not generated."
            );

        }

        return true;

    }

    /**
     * ============================================================
     * Build Execution Stages
     * ============================================================
     */

    buildExecutionStages(plan) {

        const stages = [];

        let stageNumber = 1;

        for (const group of plan.concurrencyGroups) {

            stages.push({

                id: `stage-${stageNumber++}`,

                mode: group.mode,

                capabilities: [...group.capabilities],

                completed: false,

                estimatedDuration:

                    Math.round(

                        plan.estimatedDuration /

                        plan.concurrencyGroups.length

                    )

            });

        }

        plan.executionStages = stages;

    }

    /**
     * ============================================================
     * Build Mission Timeline
     * ============================================================
     */

    buildTimeline(plan) {

        let elapsed = 0;

        const timeline = [];

        for (const stage of plan.executionStages) {

            timeline.push({

                stage: stage.id,

                beginsAt: elapsed,

                duration: stage.estimatedDuration,

                endsAt:

                    elapsed +

                    stage.estimatedDuration

            });

            elapsed += stage.estimatedDuration;

        }

        plan.timeline = timeline;

    }

    /**
     * ============================================================
     * Build Capability Manifest
     * ============================================================
     */

    buildCapabilityManifest(plan) {

        plan.capabilityManifest =

            plan.requiredCapabilities.map(

                capability => ({

                    id: capability,

                    provider: null,

                    initialized: false,

                    healthy: true

                })

            );

    }

    /**
     * ============================================================
     * Resource Summary
     * ============================================================
     */

    summarizeResources(plan) {

        const summary = {

            gpu: false,

            network: false,

            tts: false,

            finance: false

        };

        plan.resources.forEach(resource => {

            switch (resource.type) {

                case "gpu":

                    summary.gpu = true;

                    break;

                case "network":

                    summary.network = true;

                    break;

                case "tts":

                    summary.tts = true;

                    break;

                case "market-data":

                    summary.finance = true;

                    break;

            }

        });

        plan.resourceSummary = summary;

    }

    /**
     * ============================================================
     * Build Planning Report
     * ============================================================
     */

    buildPlanningReport(mission, plan) {

        plan.report = {

            missionId: mission.id,

            strategy: plan.strategy,

            complexity: plan.complexity,

            estimatedDuration:

                plan.estimatedDuration,

            capabilityCount:

                plan.requiredCapabilities.length,

            dependencyCount:

                plan.dependencies.length,

            stageCount:

                plan.executionStages.length,

            providerHints:

                [...plan.providerHints],

            generatedAt:

                new Date().toISOString()

        };

    }

    /**
     * ============================================================
     * Publish Planning Event
     * ============================================================
     */

    publishPlanningEvent(mission, plan) {

        if (

            !this.eventBus ||

            typeof this.eventBus.publish !== "function"

        ) {

            return;

        }

        this.eventBus.publish(

            "mission.planned",

            {

                missionId: mission.id,

                plan: plan.report

            }

        );

    }

    /**
     * ============================================================
     * Diagnostics
     * ============================================================
     */

    log(message, metadata = {}) {

        if (

            !this.diagnostics ||

            typeof this.diagnostics.info !== "function"

        ) {

            return;

        }

        this.diagnostics.info(

            message,

            metadata

        );

    }

    /**
     * ============================================================
     * Final Planning Pass
     * ============================================================
     */

    finalize(mission, plan) {

        this.validatePlan(

            mission,

            plan

        );

        this.buildExecutionStages(

            plan

        );

        this.buildTimeline(

            plan

        );

        this.buildCapabilityManifest(

            plan

        );

        this.summarizeResources(

            plan

        );

        this.buildPlanningReport(

            mission,

            plan

        );

        this.publishPlanningEvent(

            mission,

            plan

        );

        this.log(

            "Mission plan finalized.",

            {

                missionId: mission.id,

                strategy: plan.strategy,

                complexity: plan.complexity

            }

        );

        return plan;

    }

        /**
     * ============================================================
     * Full Planning Pipeline
     * ============================================================
     *
     * Executes the complete planning lifecycle.
     * This is the primary entry point the Kernel will call.
     */

    async planMission(mission) {

        if (!(mission instanceof Mission)) {

            throw new Error(
                "MissionPlanner.planMission() requires Mission instance."
            );

        }

        const started = now();

        this.log(
            "Mission planning pipeline started.",
            {
                missionId: mission.id
            }
        );

        const plan = await this.createPlan(mission);

        this.finalizePlanning(
            mission,
            plan
        );

        this.finalize(
            mission,
            plan
        );

        mission.setPlanningTime(
            now() - started
        );

        mission.record(
            "Mission planning complete.",
            MissionStatus.PLANNED
        );

        this.log(
            "Mission successfully planned.",
            {
                missionId: mission.id,
                planningTime:
                    mission.metrics.planningMs
            }
        );

        return Object.freeze(
            deepClone(plan)
        );

    }

    /**
     * ============================================================
     * Planner Capability Check
     * ============================================================
     */

    supportsMissionType(type) {

        return Object.values(
            MissionType
        ).includes(type);

    }

    /**
     * ============================================================
     * Planner Information
     * ============================================================
     */

    getPlannerInfo() {

        return {

            name: "MissionPlanner",

            version: "3.0.0-alpha.1",

            supports:

                Object.values(
                    MissionType
                ),

            strategies:

                Object.values(
                    PlanningStrategy
                ),

            complexities:

                Object.values(
                    PlanningComplexity
                )

        };

    }

    /**
     * ============================================================
     * Health
     * ============================================================
     */

    health() {

        return {

            healthy: true,

            planner: "MissionPlanner",

            version: "3.0.0-alpha.1",

            capabilityRegistry:

                !!this.capabilityRegistry,

            diagnostics:

                !!this.diagnostics,

            eventBus:

                !!this.eventBus

        };

    }

    /**
     * ============================================================
     * Reset
     * ============================================================
     */

    reset() {

        this.log(
            "Mission planner reset."
        );

        return this;

    }

    /**
     * ============================================================
     * Static Factory
     * ============================================================
     */

    static create(options = {}) {

        return new MissionPlanner(options);

    }

}