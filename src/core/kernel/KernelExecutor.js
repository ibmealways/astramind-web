/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * KernelExecutor.js
 *
 * Kernel Execution Authority
 *
 * Responsibilities
 * ----------------
 * • Execute every Authority
 * • Coordinate Kernel execution
 * • Enforce Policy
 * • Resolve execution strategy
 * • Generate Request IDs
 * • Record execution timing
 * • Publish lifecycle events
 * • Normalize responses
 * * Capture metrics
 *
 * Every executable request inside AstraMind flows through this Authority.
 * ============================================================================
 */

import KernelRegistry from "./KernelRegistry.js";
import IDGenerator from "../system/IDGenerator.js";
import SystemClock from "../system/SystemClock.js";
import SystemEvents from "../system/SystemEvents.js";
import PolicyEngine from "../policy/PolicyEngine.js";
import ExecutionStrategyResolver from "../execution/ExecutionStrategyResolver.js";

export const EXECUTION_STATUS = Object.freeze({

    PENDING: "pending",

    RUNNING: "running",

    SUCCESS: "success",

    FAILED: "failed",

    CANCELLED: "cancelled"

});

/**
 * ============================================================================
 * Execution Context
 * ============================================================================
 */

class ExecutionContext {

    constructor({

        authority,

        action,

        payload = {},

        metadata = {}

    }) {

        this.requestId = IDGenerator.requestId();

        this.authority = authority;

        this.action = action;

        this.payload = payload;

        this.metadata = {

            ...metadata

        };

        this.status = EXECUTION_STATUS.PENDING;

        this.startedAt = null;

        this.completedAt = null;

        this.executionTime = 0;

        this.strategy = null;

        this.response = null;

        this.error = null;

    }

}

/**
 * ============================================================================
 * Kernel Executor
 * ============================================================================
 */

export default class KernelExecutor {

    constructor({

        registry,

        policyEngine,

        eventBus,

        clock,

        strategyResolver

    } = {}) {

        this.registry =

            registry ||

            KernelRegistry.create();

        this.policyEngine =

            policyEngine ||

            PolicyEngine.create();

        this.events =

            eventBus ||

            SystemEvents.create();

        this.clock =

            clock ||

            SystemClock.create();

        this.strategyResolver =

            strategyResolver ||

            ExecutionStrategyResolver.create();

        /*
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            executions: 0,

            successes: 0,

            failures: 0,

            averageExecutionTime: 0

        };

        /*
         * =====================================================
         * Active Requests
         * =====================================================
         */

        this.activeExecutions = new Map();

        /*
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "Kernel Executor initialized."

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
     * Active Execution Count
     * =====================================================
     */

    activeCount() {

        return this.activeExecutions.size;

    }

    /**
     * =====================================================
     * Lookup Active Execution
     * =====================================================
     */

    getExecution(requestId) {

        return this.activeExecutions.get(requestId) || null;

    }

    /**
     * =====================================================
     * Cancel Execution
     * =====================================================
     */

    cancel(requestId) {

        const execution =

            this.activeExecutions.get(requestId);

        if (!execution) {

            return false;

        }

        execution.status =

            EXECUTION_STATUS.CANCELLED;

        execution.completedAt =

            this.clock.now();

        this.record(

            "Execution cancelled.",

            {

                requestId

            }

        );

        this.activeExecutions.delete(requestId);

        return true;

    }

    /**
     * =====================================================
     * Begin Execution
     *
     * Main Kernel entry point.
     * =====================================================
     */

    async execute({

        authority,

        action,

        payload = {},

        metadata = {}

    }) {

        const context =

            new ExecutionContext({

                authority,

                action,

                payload,

                metadata

            });

        this.activeExecutions.set(

            context.requestId,

            context

        );

        this.metrics.executions++;

        context.startedAt =

            this.clock.now();

        context.status =

            EXECUTION_STATUS.RUNNING;

        this.record(

            "Execution started.",

            {

                requestId:

                    context.requestId,

                authority,

                action

            }

        );

        this.events.publish(

            "kernel.execution.started",

            {

                requestId:

                    context.requestId,

                authority,

                action

            }

        );

                /*
         * =====================================================
         * Resolve Authority
         * =====================================================
         */

        const authorityEntry =

            this.registry.get(authority);

        if (!authorityEntry) {

            context.status =

                EXECUTION_STATUS.FAILED;

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.error =

                new Error(

                    `Unknown authority: ${authority}`

                );

            this.metrics.failures++;

            this.record(

                "Unknown authority.",

                {

                    authority,

                    requestId:

                        context.requestId

                }

            );

            this.activeExecutions.delete(

                context.requestId

            );

            throw context.error;

        }

        /*
         * =====================================================
         * Authority Enabled?
         * =====================================================
         */

        if (!authorityEntry.enabled) {

            context.status =

                EXECUTION_STATUS.FAILED;

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.error =

                new Error(

                    `Authority '${authority}' is disabled.`

                );

            this.metrics.failures++;

            this.activeExecutions.delete(

                context.requestId

            );

            throw context.error;

        }

        /*
         * =====================================================
         * Policy Validation
         * =====================================================
         */

        const policyResult =

            await this.policyEngine.evaluate({

                authority,

                action,

                payload,

                metadata

            });

        if (!policyResult.allowed) {

            context.status =

                EXECUTION_STATUS.FAILED;

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.error =

                new Error(

                    policyResult.reason ||

                    "Execution denied by PolicyEngine."

                );

            this.metrics.failures++;

            this.record(

                "Execution denied.",

                {

                    authority,

                    action,

                    requestId:

                        context.requestId

                }

            );

            this.events.publish(

                "kernel.execution.denied",

                {

                    authority,

                    action,

                    requestId:

                        context.requestId

                }

            );

            this.activeExecutions.delete(

                context.requestId

            );

            throw context.error;

        }

        /*
         * =====================================================
         * Resolve Strategy
         * =====================================================
         */

        context.strategy =

            await this.strategyResolver.resolve({

                authority,

                action,

                payload,

                metadata

            });

        this.record(

            "Execution strategy resolved.",

            {

                authority,

                strategy:

                    context.strategy

            }

        );

        /*
         * =====================================================
         * Authority Execute()
         * =====================================================
         */

        const executable =

            authorityEntry.instance;

        if (

            !executable ||

            typeof executable.execute !==

            "function"

        ) {

            context.status =

                EXECUTION_STATUS.FAILED;

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.error =

                new Error(

                    `Authority '${authority}' does not expose execute().`

                );

            this.metrics.failures++;

            this.activeExecutions.delete(

                context.requestId

            );

            throw context.error;

        }

        this.registry.recordExecution(

            authority,

            true

        );

        this.record(

            "Dispatching authority execution.",

            {

                authority,

                requestId:

                    context.requestId

            }

        );

                /*
         * =====================================================
         * Execute Authority
         * =====================================================
         */

        try {

            const result =

                await executable.execute({

                    requestId:

                        context.requestId,

                    authority,

                    action,

                    payload,

                    metadata,

                    strategy:

                        context.strategy,

                    clock:

                        this.clock,

                    events:

                        this.events,

                    registry:

                        this.registry,

                    executor:

                        this

                });

            /*
             * ===============================================
             * Complete Execution
             * ===============================================
             */

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.status =

                EXECUTION_STATUS.SUCCESS;

            context.response = result;

            this.metrics.successes++;

            /*
             * Running Average
             */

            this.metrics.averageExecutionTime =

                (

                    (

                        this.metrics.averageExecutionTime *

                        (this.metrics.successes - 1)

                    ) +

                    context.executionTime

                ) /

                this.metrics.successes;

            this.record(

                "Execution completed.",

                {

                    requestId:

                        context.requestId,

                    authority,

                    executionTime:

                        context.executionTime

                }

            );

            this.events.publish(

                "kernel.execution.completed",

                {

                    requestId:

                        context.requestId,

                    authority,

                    executionTime:

                        context.executionTime

                }

            );

            this.activeExecutions.delete(

                context.requestId

            );

            /*
             * ===============================================
             * AstraMind Standard Response Envelope
             * ===============================================
             */

            return {

                success: true,

                requestId:

                    context.requestId,

                authority,

                action,

                status:

                    context.status,

                strategy:

                    context.strategy,

                executionTime:

                    context.executionTime,

                startedAt:

                    context.startedAt,

                completedAt:

                    context.completedAt,

                timestamp:

                    Date.now(),

                data: result,

                diagnostics: {

                    kernel:

                        "KernelExecutor",

                    activeExecutions:

                        this.activeCount()

                },

                warnings: [],

                errors: []

            };

        }

        /*
         * =====================================================
         * Execution Failure
         * =====================================================
         */

        catch (error) {

            context.completedAt =

                this.clock.now();

            context.executionTime =

                context.completedAt -

                context.startedAt;

            context.status =

                EXECUTION_STATUS.FAILED;

            context.error = error;

            this.metrics.failures++;

            this.registry.recordExecution(

                authority,

                false

            );

            this.record(

                "Execution failed.",

                {

                    requestId:

                        context.requestId,

                    authority,

                    error:

                        error.message

                }

            );

            this.events.publish(

                "kernel.execution.failed",

                {

                    requestId:

                        context.requestId,

                    authority,

                    error:

                        error.message

                }

            );

            this.activeExecutions.delete(

                context.requestId

            );

            return {

                success: false,

                requestId:

                    context.requestId,

                authority,

                action,

                status:

                    context.status,

                strategy:

                    context.strategy,

                executionTime:

                    context.executionTime,

                startedAt:

                    context.startedAt,

                completedAt:

                    context.completedAt,

                timestamp:

                    Date.now(),

                data: null,

                diagnostics: {

                    kernel:

                        "KernelExecutor",

                    activeExecutions:

                        this.activeCount()

                },

                warnings: [],

                errors: [

                    {

                        message:

                            error.message,

                        stack:

                            process.env.NODE_ENV ===

                            "development"

                                ? error.stack

                                : undefined

                    }

                ]

            };

        }

    }

        /**
     * =====================================================
     * Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            activeExecutions:

                this.activeCount(),

            metrics: {

                ...this.metrics

            },

            registry:

                this.registry.health(),

            timestamp:

                this.clock.now()

        };

    }

    /**
     * =====================================================
     * Statistics
     * =====================================================
     */

    statistics() {

        return {

            kernel: "KernelExecutor",

            executions:

                this.metrics.executions,

            successes:

                this.metrics.successes,

            failures:

                this.metrics.failures,

            successRate:

                this.metrics.executions === 0

                    ? 100

                    : Number(

                        (

                            (this.metrics.successes /

                            this.metrics.executions) *

                            100

                        ).toFixed(2)

                    ),

            averageExecutionTime:

                this.metrics.averageExecutionTime,

            activeExecutions:

                this.activeCount()

        };

    }

    /**
     * =====================================================
     * Diagnostics
     * =====================================================
     */

    diagnostics() {

        return {

            statistics:

                this.statistics(),

            registry:

                this.registry.summary(),

            dependencyGraph:

                this.registry

                    .dependencyGraph

                    .summary(),

            activeRequests:

                [

                    ...this.activeExecutions.values()

                ].map(context => ({

                    requestId:

                        context.requestId,

                    authority:

                        context.authority,

                    action:

                        context.action,

                    status:

                        context.status,

                    startedAt:

                        context.startedAt

                })),

            timeline:

                [

                    ...this.timeline

                ]

        };

    }

    /**
     * =====================================================
     * Report
     * =====================================================
     */

    report() {

        return {

            health:

                this.health(),

            statistics:

                this.statistics(),

            diagnostics:

                this.diagnostics()

        };

    }

    /**
     * =====================================================
     * Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            timestamp:

                this.clock.now(),

            activeExecutions:

                this.activeCount(),

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

            executions: 0,

            successes: 0,

            failures: 0,

            averageExecutionTime: 0

        };

        this.record(

            "Execution metrics reset."

        );

    }

    /**
     * =====================================================
     * Clear Active Executions
     * =====================================================
     */

    clear() {

        this.activeExecutions.clear();

        this.timeline = [];

        this.resetMetrics();

        this.record(

            "Executor cleared."

        );

    }

    /**
     * =====================================================
     * Serialize
     * =====================================================
     */

    serialize(pretty = true) {

        return JSON.stringify(

            {

                statistics:

                    this.statistics(),

                health:

                    this.health(),

                timeline:

                    this.timeline

            },

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

        return new KernelExecutor(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[KernelExecutor Active=${this.activeCount()} Executions=${this.metrics.executions} Successes=${this.metrics.successes} Failures=${this.metrics.failures}]`;

    }

}