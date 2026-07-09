/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: MissionExecutor.js
 *
 * Description:
 * Enterprise Mission Execution Engine
 *
 * MissionExecutor is responsible for executing executable nodes supplied
 * by MissionQueue. It coordinates capability execution while remaining
 * completely independent of business logic.
 *
 * Responsibilities
 * ----------------
 * • Execute MissionGraph nodes
 * • Coordinate capabilities
 * • Manage execution lifecycle
 * • Handle retries
 * • Report progress
 * • Update MissionGraph
 * • Publish events
 * • Record diagnostics
 *
 * IMPORTANT
 * ---------
 * MissionExecutor NEVER decides WHAT to execute.
 *
 * MissionQueue decides.
 *
 * MissionExecutor simply executes.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import MissionGraph, {
    NodeState
} from "./MissionGraph.js";

export const ExecutionStatus = Object.freeze({

    IDLE: "idle",

    RUNNING: "running",

    PAUSED: "paused",

    STOPPED: "stopped"

});

function now() {

    return Date.now();

}

function clone(value) {

    return JSON.parse(JSON.stringify(value));

}

export default class MissionExecutor {

    constructor({

        capabilityRouter = null,

        diagnostics = null,

        eventBus = null

    } = {}) {

        this.capabilityRouter =

            capabilityRouter;

        this.diagnostics =

            diagnostics;

        this.eventBus =

            eventBus;

        /**
         * =====================================================
         * Runtime
         * =====================================================
         */

        this.status =

            ExecutionStatus.IDLE;

        this.activeExecutions =

            new Map();

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            started: 0,

            completed: 0,

            failed: 0,

            retries: 0,

            averageExecutionMs: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "MissionExecutor initialized."

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

            timestamp: now(),

            event,

            metadata

        });

    }

    /**
     * =====================================================
     * Lifecycle
     * =====================================================
     */

    start() {

        this.status =

            ExecutionStatus.RUNNING;

        this.record(

            "Executor started."

        );

        return this;

    }

    pause() {

        this.status =

            ExecutionStatus.PAUSED;

        this.record(

            "Executor paused."

        );

        return this;

    }

    stop() {

        this.status =

            ExecutionStatus.STOPPED;

        this.record(

            "Executor stopped."

        );

        return this;

    }

    isRunning() {

        return this.status ===

            ExecutionStatus.RUNNING;

    }

    /**
     * =====================================================
     * Execute Graph
     * =====================================================
     */

    async executeGraph(graph) {

        if (!(graph instanceof MissionGraph)) {

            throw new Error(

                "MissionExecutor requires MissionGraph."

            );

        }

        if (!this.isRunning()) {

            throw new Error(

                "MissionExecutor is not running."

            );

        }

        const executable =

            graph.getExecutableNodes();

        const results = [];

        for (const node of executable) {

            const result =

                await this.executeNode(

                    graph,

                    node

                );

            results.push(result);

        }

        return results;

    }

    /**
     * =====================================================
     * Execute Node
     * =====================================================
     */

    async executeNode(

        graph,

        node

    ) {

        graph.markRunning(

            node.id

        );

        this.metrics.started++;

        const started = now();

        this.activeExecutions.set(

            node.id,

            {

                startedAt: started,

                graph

            }

        );

        this.publish(

            "executor.node.started",

            {

                missionId:

                    graph.mission?.id,

                nodeId:

                    node.id

            }

        );

        this.record(

            "Node execution started",

            {

                nodeId:

                    node.id

            }

        );

        // Capability execution will be implemented
        // in Part 2.

        return {

            node,

            startedAt: started

        };

    }

        /**
     * =====================================================
     * Capability Execution
     * =====================================================
     */

    async invokeCapability(

        graph,

        node

    ) {

        if (

            !this.capabilityRouter ||

            typeof this.capabilityRouter.execute !== "function"

        ) {

            throw new Error(

                "CapabilityRouter unavailable."

            );

        }

        const mission = graph.mission;

        return this.capabilityRouter.execute({

            mission,

            node,

            capability: node.capability,

            graph

        });

    }

    /**
     * =====================================================
     * Execute Single Node
     * =====================================================
     */

    async executeNode(

        graph,

        node

    ) {

        graph.markRunning(

            node.id

        );

        const started = now();

        this.metrics.started++;

        this.activeExecutions.set(

            node.id,

            {

                graph,

                startedAt: started

            }

        );

        this.publish(

            "executor.node.started",

            {

                missionId:

                    graph.mission?.id,

                nodeId:

                    node.id,

                capability:

                    node.capability

            }

        );

        this.log(

            "info",

            "Node execution started.",

            {

                nodeId:

                    node.id

            }

        );

        try {

            const result =

                await this.invokeCapability(

                    graph,

                    node

                );

            graph.markCompleted(

                node.id

            );

            this.completeExecution(

                node.id,

                started

            );

            this.metrics.completed++;

            this.publish(

                "executor.node.completed",

                {

                    missionId:

                        graph.mission?.id,

                    nodeId:

                        node.id

                }

            );

            this.record(

                "Node execution completed",

                {

                    nodeId:

                        node.id

                }

            );

            return {

                success: true,

                nodeId:

                    node.id,

                capability:

                    node.capability,

                result,

                duration:

                    now() - started

            };

        }

        catch (error) {

            graph.markFailed(

                node.id,

                error

            );

            this.completeExecution(

                node.id,

                started

            );

            this.metrics.failed++;

            this.publish(

                "executor.node.failed",

                {

                    missionId:

                        graph.mission?.id,

                    nodeId:

                        node.id,

                    error:

                        error.message

                }

            );

            this.log(

                "error",

                "Node execution failed.",

                {

                    nodeId:

                        node.id,

                    error:

                        error.message

                }

            );

            return {

                success: false,

                nodeId:

                    node.id,

                capability:

                    node.capability,

                error,

                duration:

                    now() - started

            };

        }

    }

    /**
     * =====================================================
     * Retry Node
     * =====================================================
     */

    async retryNode(

        graph,

        node,

        retries = 3

    ) {

        let attempt = 0;

        while (

            attempt < retries

        ) {

            attempt++;

            this.metrics.retries++;

            this.record(

                "Retry attempt",

                {

                    nodeId:

                        node.id,

                    attempt

                }

            );

            const result =

                await this.executeNode(

                    graph,

                    node

                );

            if (

                result.success

            ) {

                return result;

            }

        }

        return {

            success: false,

            nodeId:

                node.id,

            retries

        };

    }

    /**
     * =====================================================
     * Complete Execution
     * =====================================================
     */

    completeExecution(

        nodeId,

        started

    ) {

        this.activeExecutions.delete(

            nodeId

        );

        const duration =

            now() - started;

        const completed =

            this.metrics.completed;

        this.metrics.averageExecutionMs =

            completed === 0

                ? duration

                : (

                    (

                        this.metrics.averageExecutionMs *

                        (completed - 1)

                    ) +

                    duration

                ) /

                completed;

    }

    /**
     * =====================================================
     * Active Execution
     * =====================================================
     */

    isExecuting(

        nodeId

    ) {

        return this.activeExecutions.has(

            nodeId

        );

    }

    getActiveExecutions() {

        return [

            ...this.activeExecutions.entries()

        ].map(

            ([id, execution]) => ({

                nodeId: id,

                startedAt:

                    execution.startedAt,

                duration:

                    now() -

                    execution.startedAt

            })

        );

    }

        /**
     * =====================================================
     * Execution Policies
     * =====================================================
     */

    static ExecutionPolicy = Object.freeze({

        FAIL_FAST: "fail_fast",

        CONTINUE_ON_FAILURE: "continue_on_failure",

        RETRY_FAILED_BRANCHES: "retry_failed_branches",

        BEST_EFFORT: "best_effort"

    });

    setExecutionPolicy(

        policy = MissionExecutor.ExecutionPolicy.FAIL_FAST

    ) {

        this.executionPolicy = policy;

        this.record(

            "Execution policy updated.",

            { policy }

        );

        return this;

    }

    getExecutionPolicy() {

        return this.executionPolicy ||

            MissionExecutor.ExecutionPolicy.FAIL_FAST;

    }

    /**
     * =====================================================
     * Mission Failure Handler
     * =====================================================
     */

    async handleExecutionFailure(

        graph,

        node,

        error

    ) {

        const policy =

            this.getExecutionPolicy();

        this.record(

            "Handling execution failure.",

            {

                nodeId: node.id,

                policy,

                error:

                    error.message

            }

        );

        switch (policy) {

            case MissionExecutor.ExecutionPolicy.FAIL_FAST:

                graph.markFailed(

                    node.id,

                    error

                );

                this.cancelMission(

                    graph

                );

                break;

            case MissionExecutor.ExecutionPolicy.CONTINUE_ON_FAILURE:

                graph.markFailed(

                    node.id,

                    error

                );

                break;

            case MissionExecutor.ExecutionPolicy.RETRY_FAILED_BRANCHES:

                return this.retryFailedBranch(

                    graph,

                    node

                );

            case MissionExecutor.ExecutionPolicy.BEST_EFFORT:

                graph.markFailed(

                    node.id,

                    error

                );

                this.record(

                    "Continuing remaining branches."

                );

                break;

            default:

                graph.markFailed(

                    node.id,

                    error

                );

        }

        return false;

    }

    /**
     * =====================================================
     * Retry Failed Branch
     * =====================================================
     */

    async retryFailedBranch(

        graph,

        node

    ) {

        const retryGraph =

            graph.buildRetryGraph();

        const retryNode =

            retryGraph.find(

                n =>

                    n.id === node.id

            );

        if (!retryNode) {

            return false;

        }

        this.metrics.retries++;

        this.record(

            "Retrying failed branch.",

            {

                nodeId:

                    node.id

            }

        );

        return this.retryNode(

            graph,

            node

        );

    }

    /**
     * =====================================================
     * Branch Recovery
     * =====================================================
     */

    async recoverBranch(

        graph,

        nodeId

    ) {

        const node =

            graph.getNode(

                nodeId

            );

        if (!node) {

            return false;

        }

        node.state =

            NodeState.READY;

        node.error = null;

        this.record(

            "Branch recovered.",

            {

                nodeId

            }

        );

        return this.executeNode(

            graph,

            node

        );

    }

    /**
     * =====================================================
     * Mission Recovery
     * =====================================================
     */

    async recoverMission(

        graph

    ) {

        const failed =

            graph.getNodes()

                .filter(

                    node =>

                        node.state ===

                        NodeState.FAILED

                );

        const results = [];

        for (

            const node of failed

        ) {

            results.push(

                await this.recoverBranch(

                    graph,

                    node.id

                )

            );

        }

        return results;

    }

    /**
     * =====================================================
     * Execution Monitor
     * =====================================================
     */

    monitorExecution() {

        return {

            status:

                this.status,

            active:

                this.activeExecutions.size,

            metrics:

                clone(

                    this.metrics

                ),

            policy:

                this.getExecutionPolicy(),

            runningNodes:

                this.getActiveExecutions()

        };

    }

    /**
     * =====================================================
     * Mission Completion Check
     * =====================================================
     */

    isMissionFinished(

        graph

    ) {

        return (

            graph.isComplete() ||

            graph.hasFailures()

        );

    }

    /**
     * =====================================================
     * Execution Summary
     * =====================================================
     */

    buildExecutionSummary(

        graph

    ) {

        return {

            missionId:

                graph.mission?.id,

            completed:

                graph.isComplete(),

            failed:

                graph.hasFailures(),

            executionPolicy:

                this.getExecutionPolicy(),

            metrics:

                this.getExecutionStatistics(),

            graph:

                graph.getMetrics()

        };

    }

    /**
     * =====================================================
     * Publish Mission Completion
     * =====================================================
     */

    publishMissionSummary(

        graph

    ) {

        this.publish(

            "executor.mission.completed",

            this.buildExecutionSummary(

                graph

            )

        );

    }

        /**
     * =====================================================
     * Health Check
     * =====================================================
     */

    health() {

        return {

            healthy:

                this.status !==

                ExecutionStatus.STOPPED,

            status:

                this.status,

            activeExecutions:

                this.activeExecutions.size,

            metrics:

                clone(this.metrics),

            capabilityRouter:

                !!this.capabilityRouter,

            diagnostics:

                !!this.diagnostics,

            eventBus:

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

            typeof this.diagnostics.record !== "function"

        ) {

            return;

        }

        this.diagnostics.record(

            level,

            "MissionExecutor",

            message,

            {

                executorStatus: this.status,

                ...metadata

            }

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

            typeof this.eventBus.publish !== "function"

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
     * Execution Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            status:

                this.status,

            metrics:

                clone(this.metrics),

            active:

                this.getActiveExecutions(),

            timestamp:

                now()

        };

    }

    /**
     * =====================================================
     * Reset Executor
     * =====================================================
     */

    reset() {

        this.activeExecutions.clear();

        this.metrics = {

            started: 0,

            completed: 0,

            failed: 0,

            retries: 0,

            averageExecutionMs: 0

        };

        this.timeline = [];

        this.status =

            ExecutionStatus.IDLE;

        this.record(

            "MissionExecutor reset."

        );

        return this;

    }

    /**
     * =====================================================
     * Serialization
     * =====================================================
     */

    exportState() {

        return {

            status:

                this.status,

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline),

            activeExecutions:

                this.getActiveExecutions(),

            executionPolicy:

                this.getExecutionPolicy()

        };

    }

    serialize() {

        return JSON.stringify(

            this.exportState(),

            null,

            2

        );

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name: "MissionExecutor",

            version: "3.0.0-alpha.1",

            executionPolicy:

                this.getExecutionPolicy(),

            status:

                this.status,

            activeExecutions:

                this.activeExecutions.size,

            metrics:

                clone(this.metrics)

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

            snapshot:

                this.snapshot(),

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Static Factory
     * =====================================================
     */

    static create(options = {}) {

        return new MissionExecutor(options);

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[MissionExecutor Status=${this.status} Active=${this.activeExecutions.size}]`;

    }

}