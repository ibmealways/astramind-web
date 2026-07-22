/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: MissionQueue.js
 *
 * Description:
 * Enterprise Mission Scheduler
 *
 * The MissionQueue manages executable MissionGraph nodes and schedules work
 * for the MissionExecutor and AstraMindKernel.
 *
 * Responsibilities
 * ----------------
 * • Queue missions
 * • Priority scheduling
 * • Parallel scheduling
 * • Worker assignment
 * • Retry scheduling
 * • Queue metrics
 * • Queue health
 * • Event publishing
 * • Diagnostics
 *
 * IMPORTANT
 * ---------
 * MissionQueue NEVER executes work.
 *
 * It only schedules work.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import MissionGraph from "./MissionGraph.js";

export const QueueStatus = Object.freeze({

    IDLE: "idle",

    RUNNING: "running",

    PAUSED: "paused",

    STOPPED: "stopped"

});

export const QueuePriority = Object.freeze({

    CRITICAL: 100,

    HIGH: 75,

    NORMAL: 50,

    LOW: 25,

    BACKGROUND: 10

});

function clone(value) {

    return JSON.parse(JSON.stringify(value));

}

export default class MissionQueue {

    constructor({

        diagnostics = null,

        eventBus = null,

        maxConcurrent = 4

    } = {}) {

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

        /**
         * =====================================================
         * Queue Storage
         * =====================================================
         */

        this.pending = [];

        this.running = [];

        this.completed = [];

        this.failed = [];

        /**
         * =====================================================
         * Scheduler
         * =====================================================
         */

        this.maxConcurrent = maxConcurrent;

        this.status = QueueStatus.IDLE;

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            queued: 0,

            dispatched: 0,

            completed: 0,

            failed: 0,

            retries: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "MissionQueue initialized."

        );

    }

    /**
     * =====================================================
     * Timeline
     * =====================================================
     */

    record(event, metadata = {}) {

        this.timeline.push({

            timestamp: Date.now(),

            event,

            metadata

        });

    }

    /**
     * =====================================================
     * Add Mission Graph
     * =====================================================
     */

    enqueue(graph) {

        if (!(graph instanceof MissionGraph)) {

            throw new Error(

                "MissionQueue requires MissionGraph."

            );

        }

        this.pending.push({

            graph,

            priority:

                graph.mission?.priority ||

                QueuePriority.NORMAL,

            queuedAt:

                Date.now()

        });

        this.sortQueue();

        this.metrics.queued++;

        this.record(

            "Mission queued",

            {

                missionId:

                    graph.mission?.id

            }

        );

        this.publish(

            "queue.enqueue",

            {

                missionId:

                    graph.mission?.id

            }

        );

        return this;

    }

    /**
     * =====================================================
     * Queue Sorting
     * =====================================================
     */

    sortQueue() {

        this.pending.sort(

            (a, b) =>

                b.priority -

                a.priority

        );

    }

    /**
     * =====================================================
     * Queue Inspection
     * =====================================================
     */

    size() {

        return this.pending.length;

    }

    isEmpty() {

        return this.pending.length === 0;

    }

    peek() {

        return this.pending[0] || null;

    }

    /**
     * =====================================================
     * Queue Status
     * =====================================================
     */

    start() {

        this.status =

            QueueStatus.RUNNING;

        this.record(

            "Queue started."

        );

        return this;

    }

    pause() {

        this.status =

            QueueStatus.PAUSED;

        this.record(

            "Queue paused."

        );

        return this;

    }

    stop() {

        this.status =

            QueueStatus.STOPPED;

        this.record(

            "Queue stopped."

        );

        return this;

    }

    isRunning() {

        return this.status ===

            QueueStatus.RUNNING;

    }

        /**
     * =====================================================
     * Queue Optimization
     * =====================================================
     */

    optimizeQueue() {

        this.sortQueue();

        this.record(
            "Queue optimized."
        );

        return this;

    }

    /**
     * =====================================================
     * Priority Aging
     *
     * Prevent starvation by slowly increasing the priority of
     * missions that have waited in the queue.
     * =====================================================
     */

    ageQueue() {

        const now = Date.now();

        this.pending.forEach(item => {

            const waitSeconds =

                Math.floor(

                    (now - item.queuedAt) / 1000

                );

            const bonus =

                Math.floor(waitSeconds / 30);

            item.effectivePriority =

                item.priority + bonus;

        });

        this.pending.sort(

            (a, b) =>

                (b.effectivePriority || b.priority) -

                (a.effectivePriority || a.priority)

        );

        return this;

    }

    /**
     * =====================================================
     * Starvation Detection
     * =====================================================
     */

    getStarvingMissions(

        thresholdMs = 60000

    ) {

        const now = Date.now();

        return this.pending.filter(item =>

            (now - item.queuedAt) >

            thresholdMs

        );

    }

    /**
     * =====================================================
     * Dynamic Concurrency
     * =====================================================
     */

    setMaxConcurrent(value) {

        if (

            typeof value !== "number" ||

            value < 1

        ) {

            throw new Error(

                "Invalid concurrency value."

            );

        }

        this.maxConcurrent = value;

        this.record(

            "Concurrency updated",

            {

                maxConcurrent: value

            }

        );

        return this;

    }

    scaleConcurrency({

        cpuLoad = 0,

        memoryLoad = 0

    } = {}) {

        if (

            cpuLoad > 90 ||

            memoryLoad > 90

        ) {

            this.maxConcurrent =

                Math.max(

                    1,

                    this.maxConcurrent - 1

                );

        }

        else if (

            cpuLoad < 50 &&

            memoryLoad < 50

        ) {

            this.maxConcurrent++;

        }

        return this;

    }

    /**
     * =====================================================
     * Queue Balancing
     * =====================================================
     */

    balance() {

        this.optimizeQueue();

        this.ageQueue();

        this.record(

            "Queue balanced."

        );

        return this;

    }

    /**
     * =====================================================
     * Throughput
     * =====================================================
     */

    getThroughput() {

        const completed =

            this.metrics.completed;

        const failed =

            this.metrics.failed;

        const total =

            completed + failed;

        return {

            completed,

            failed,

            processed: total

        };

    }

    /**
     * =====================================================
     * Estimated Wait Time
     * =====================================================
     */

    estimateWaitTime() {

        if (

            this.pending.length === 0

        ) {

            return 0;

        }

        const averageMissionMs =

            2500;

        const batches =

            Math.ceil(

                this.pending.length /

                this.maxConcurrent

            );

        return batches *

            averageMissionMs;

    }

    /**
     * =====================================================
     * Queue Load
     * =====================================================
     */

    getLoad() {

        return {

            pending:

                this.pending.length,

            running:

                this.running.length,

            completed:

                this.completed.length,

            failed:

                this.failed.length,

            capacity:

                this.maxConcurrent,

            utilization:

                this.running.length /

                this.maxConcurrent

        };

    }

    /**
     * =====================================================
     * Queue Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            status: this.status,

            metrics:

                clone(this.metrics),

            load:

                this.getLoad(),

            throughput:

                this.getThroughput(),

            waitEstimate:

                this.estimateWaitTime(),

            timestamp:

                Date.now()

        };

    }

    /**
     * =====================================================
     * Queue Monitor
     * =====================================================
     */

    monitor() {

        return {

            healthy:

                this.running.length <=

                this.maxConcurrent,

            starving:

                this.getStarvingMissions()

                    .length,

            snapshot:

                this.snapshot()

        };

    }

        /**
     * =====================================================
     * Scheduling Policies
     * =====================================================
     */

    static SchedulingPolicy = Object.freeze({

        PRIORITY: "priority",

        FIFO: "fifo",

        SHORTEST_JOB_FIRST: "shortest_job_first",

        DEADLINE: "deadline",

        WEIGHTED_FAIR: "weighted_fair",

        REAL_TIME: "real_time"

    });

    setSchedulingPolicy(

        policy = MissionQueue.SchedulingPolicy.PRIORITY

    ) {

        this.schedulingPolicy = policy;

        this.record(

            "Scheduling policy changed.",

            { policy }

        );

        return this;

    }

    getSchedulingPolicy() {

        return this.schedulingPolicy ||

            MissionQueue.SchedulingPolicy.PRIORITY;

    }

    /**
     * =====================================================
     * Scheduling Engine
     * =====================================================
     */

    schedule() {

        switch (

            this.getSchedulingPolicy()

        ) {

            case MissionQueue.SchedulingPolicy.FIFO:

                this.scheduleFIFO();

                break;

            case MissionQueue.SchedulingPolicy.SHORTEST_JOB_FIRST:

                this.scheduleShortestJob();

                break;

            case MissionQueue.SchedulingPolicy.DEADLINE:

                this.scheduleDeadline();

                break;

            case MissionQueue.SchedulingPolicy.WEIGHTED_FAIR:

                this.scheduleWeightedFair();

                break;

            case MissionQueue.SchedulingPolicy.REAL_TIME:

                this.scheduleRealtime();

                break;

            default:

                this.sortQueue();

        }

        return this;

    }

    /**
     * =====================================================
     * FIFO
     * =====================================================
     */

    scheduleFIFO() {

        this.pending.sort(

            (a, b) =>

                a.queuedAt -

                b.queuedAt

        );

    }

    /**
     * =====================================================
     * Shortest Job First
     * =====================================================
     */

    scheduleShortestJob() {

        this.pending.sort(

            (a, b) => {

                const ta =

                    a.graph?.mission?.metrics?.executionMs ||

                    0;

                const tb =

                    b.graph?.mission?.metrics?.executionMs ||

                    0;

                return ta - tb;

            }

        );

    }

    /**
     * =====================================================
     * Deadline Scheduler
     * =====================================================
     */

    scheduleDeadline() {

        this.pending.sort(

            (a, b) => {

                const da =

                    a.deadline ||

                    Number.MAX_SAFE_INTEGER;

                const db =

                    b.deadline ||

                    Number.MAX_SAFE_INTEGER;

                return da - db;

            }

        );

    }

    /**
     * =====================================================
     * Weighted Fair Scheduler
     * =====================================================
     */

    scheduleWeightedFair() {

        this.pending.sort(

            (a, b) => {

                const wa =

                    (a.priority || 1) *

                    (a.weight || 1);

                const wb =

                    (b.priority || 1) *

                    (b.weight || 1);

                return wb - wa;

            }

        );

    }

    /**
     * =====================================================
     * Real-Time Scheduler
     * =====================================================
     */

    scheduleRealtime() {

        this.pending.sort(

            (a, b) => {

                if (

                    a.graph?.mission?.priority ===

                    QueuePriority.CRITICAL

                ) return -1;

                if (

                    b.graph?.mission?.priority ===

                    QueuePriority.CRITICAL

                ) return 1;

                return (

                    a.queuedAt -

                    b.queuedAt

                );

            }

        );

    }

    /**
     * =====================================================
     * Deadline Assignment
     * =====================================================
     */

    assignDeadline(

        graph,

        timestamp

    ) {

        const item =

            this.pending.find(

                q => q.graph === graph

            );

        if (!item) return;

        item.deadline = timestamp;

    }

    /**
     * =====================================================
     * Weight Assignment
     * =====================================================
     */

    assignWeight(

        graph,

        weight = 1

    ) {

        const item =

            this.pending.find(

                q => q.graph === graph

            );

        if (!item) return;

        item.weight = weight;

    }

    /**
     * =====================================================
     * Queue Rebalance
     * =====================================================
     */

    rebalance() {

        this.balance();

        this.schedule();

        this.record(

            "Queue rebalanced."

        );

        return this;

    }

    /**
     * =====================================================
     * Dispatch Optimizer
     * =====================================================
     */

    optimizeDispatch() {

        if (

            this.availableWorkers() <= 0

        ) {

            return [];

        }

        this.schedule();

        return this.dispatch();

    }

    /**
     * =====================================================
     * Scheduler Tick
     * =====================================================
     */

    schedulerTick() {

        if (

            !this.isRunning()

        ) {

            return [];

        }

        this.rebalance();

        return this.optimizeDispatch();

    }

    /**
     * =====================================================
     * Scheduler Information
     * =====================================================
     */

    getSchedulerInfo() {

        return {

            policy:

                this.getSchedulingPolicy(),

            workers:

                this.maxConcurrent,

            utilization:

                this.getLoad().utilization,

            pending:

                this.pending.length,

            running:

                this.running.length

        };

    }

        /**
     * =====================================================
     * Queue Persistence
     * =====================================================
     */

    exportState() {

        return {

            status: this.status,

            maxConcurrent: this.maxConcurrent,

            schedulingPolicy:

                this.getSchedulingPolicy(),

            metrics: clone(this.metrics),

            pending: this.pending.map(item => ({

                priority: item.priority,

                queuedAt: item.queuedAt,

                deadline: item.deadline,

                weight: item.weight,

                graph:

                    item.graph.serialize()

            })),

            running: this.running.map(item => ({

                priority: item.priority,

                workerId: item.workerId,

                graph:

                    item.graph.serialize()

            })),

            completed: this.completed.length,

            failed: this.failed.length,

            timeline: clone(this.timeline)

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
     * Queue Restore
     * =====================================================
     */

    static deserialize(

        json,

        options = {}

    ) {

        const data =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const queue =

            new MissionQueue(options);

        queue.status = data.status;

        queue.maxConcurrent =

            data.maxConcurrent;

        queue.schedulingPolicy =

            data.schedulingPolicy;

        queue.metrics =

            clone(data.metrics);

        data.pending.forEach(item => {

            queue.pending.push({

                priority: item.priority,

                queuedAt: item.queuedAt,

                deadline: item.deadline,

                weight: item.weight,

                graph:

                    MissionGraph.deserialize(

                        item.graph

                    )

            });

        });

        data.running.forEach(item => {

            queue.running.push({

                priority: item.priority,

                workerId: item.workerId,

                graph:

                    MissionGraph.deserialize(

                        item.graph

                    )

            });

        });

        queue.timeline =

            clone(data.timeline);

        return queue;

    }

    /**
     * =====================================================
     * Queue Health
     * =====================================================
     */

    health() {

        return {

            healthy:

                this.running.length <=

                this.maxConcurrent,

            status:

                this.status,

            scheduler:

                this.getSchedulingPolicy(),

            metrics:

                clone(this.metrics),

            load:

                this.getLoad(),

            throughput:

                this.getThroughput(),

            starving:

                this.getStarvingMissions()

                    .length

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

            "MissionQueue",

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
     * Queue Reset
     * =====================================================
     */

    reset() {

        this.pending = [];

        this.running = [];

        this.completed = [];

        this.failed = [];

        this.metrics = {

            queued: 0,

            dispatched: 0,

            completed: 0,

            failed: 0,

            retries: 0

        };

        this.timeline = [];

        this.status =

            QueueStatus.IDLE;

        this.record(

            "Queue reset."

        );

        return this;

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name:

                "MissionQueue",

            version:

                "3.0.0-alpha.1",

            scheduler:

                this.getSchedulingPolicy(),

            workers:

                this.maxConcurrent,

            metrics:

                clone(this.metrics),

            load:

                this.getLoad()

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

            snapshot:

                this.snapshot(),

            timeline:

                clone(this.timeline)

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

        return new MissionQueue(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[MissionQueue Pending=${this.pending.length} Running=${this.running.length} Completed=${this.completed.length}]`;

    }

}