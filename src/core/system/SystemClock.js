/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * SystemClock.js
 *
 * Description:
 * Universal Time Authority
 *
 * Every component inside AstraMind obtains time exclusively from this service.
 *
 * Goals
 * -----
 * • Single source of time
 * • UTC authority
 * • High-resolution timing
 * • Simulation support
 * • Replay support
 * • Mission timing
 * • Performance timing
 * • Future distributed synchronization
 *
 * ============================================================================
 */

import { performance } from "perf_hooks";

/**
 * ============================================================================
 * Clock Modes
 * ============================================================================
 */

export const ClockMode = Object.freeze({

    LIVE: "live",

    SIMULATION: "simulation",

    REPLAY: "replay"

});

/**
 * ============================================================================
 * System Clock
 * ============================================================================
 */

export default class SystemClock {

    constructor({

        mode = ClockMode.LIVE

    } = {}) {

        this.mode = mode;

        this.offset = 0;

        this.simulatedTime = null;

        this.startTime = Date.now();

        this.performanceStart = performance.now();

        this.metrics = {

            reads: 0,

            utcReads: 0,

            performanceReads: 0,

            simulations: 0,

            replays: 0

        };

        this.timeline = [];

        this.record(

            "SystemClock initialized."

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
     * Current Time
     * =====================================================
     */

    now() {

        this.metrics.reads++;

        switch (

            this.mode

        ) {

            case ClockMode.SIMULATION:

                return this.simulatedTime;

            case ClockMode.REPLAY:

                return this.simulatedTime;

            default:

                return Date.now() + this.offset;

        }

    }

    /**
     * =====================================================
     * UTC Date
     * =====================================================
     */

    utc() {

        this.metrics.utcReads++;

        return new Date(

            this.now()

        );

    }

    /**
     * =====================================================
     * ISO Timestamp
     * =====================================================
     */

    iso() {

        return this.utc()

            .toISOString();

    }

    /**
     * =====================================================
     * High Resolution Timer
     * =====================================================
     */

    performanceNow() {

        this.metrics.performanceReads++;

        return performance.now();

    }

    /**
     * =====================================================
     * Uptime
     * =====================================================
     */

    uptime() {

        return this.now() -

            this.startTime;

    }

    /**
     * =====================================================
     * Elapsed Time
     * =====================================================
     */

    elapsed(

        timestamp

    ) {

        return this.now() -

            timestamp;

    }

    /**
     * =====================================================
     * Time Since Startup
     * =====================================================
     */

    performanceElapsed() {

        return performance.now() -

            this.performanceStart;

    }

    /**
     * =====================================================
     * Current Mode
     * =====================================================
     */

    getMode() {

        return this.mode;

    }

    /**
     * =====================================================
     * Is Live
     * =====================================================
     */

    isLive() {

        return this.mode ===

            ClockMode.LIVE;

    }

    /**
     * =====================================================
     * Is Simulation
     * =====================================================
     */

    isSimulation() {

        return this.mode ===

            ClockMode.SIMULATION;

    }

    /**
     * =====================================================
     * Is Replay
     * =====================================================
     */

    isReplay() {

        return this.mode ===

            ClockMode.REPLAY;

    }

        /**
     * =====================================================
     * Set Clock Mode
     * =====================================================
     */

    setMode(mode) {

        if (

            !Object.values(ClockMode).includes(mode)

        ) {

            throw new Error(

                `Invalid clock mode: ${mode}`

            );

        }

        this.mode = mode;

        this.record(

            "Clock mode changed.",

            { mode }

        );

        return this.mode;

    }

    /**
     * =====================================================
     * Clock Offset
     * =====================================================
     */

    setOffset(milliseconds = 0) {

        this.offset = milliseconds;

        this.record(

            "Clock offset updated.",

            { milliseconds }

        );

        return this.offset;

    }

    clearOffset() {

        this.offset = 0;

        this.record(

            "Clock offset cleared."

        );

    }

    /**
     * =====================================================
     * Simulation Time
     * =====================================================
     */

    simulate(timestamp = Date.now()) {

        this.mode =

            ClockMode.SIMULATION;

        this.simulatedTime = timestamp;

        this.metrics.simulations++;

        this.record(

            "Simulation started.",

            {

                timestamp

            }

        );

        return this.simulatedTime;

    }

    /**
     * =====================================================
     * Replay Mode
     * =====================================================
     */

    replay(timestamp) {

        this.mode =

            ClockMode.REPLAY;

        this.simulatedTime = timestamp;

        this.metrics.replays++;

        this.record(

            "Replay started.",

            {

                timestamp

            }

        );

        return this.simulatedTime;

    }

    /**
     * =====================================================
     * Advance Time
     * =====================================================
     */

    advance(milliseconds) {

        if (

            this.mode === ClockMode.LIVE

        ) {

            throw new Error(

                "Cannot advance a live clock."

            );

        }

        this.simulatedTime += milliseconds;

        this.record(

            "Clock advanced.",

            {

                milliseconds,

                current:

                    this.simulatedTime

            }

        );

        return this.simulatedTime;

    }

    /**
     * =====================================================
     * Rewind Time
     * =====================================================
     */

    rewind(milliseconds) {

        if (

            this.mode === ClockMode.LIVE

        ) {

            throw new Error(

                "Cannot rewind a live clock."

            );

        }

        this.simulatedTime -= milliseconds;

        this.record(

            "Clock rewound.",

            {

                milliseconds,

                current:

                    this.simulatedTime

            }

        );

        return this.simulatedTime;

    }

    /**
     * =====================================================
     * Return To Live
     * =====================================================
     */

    live() {

        this.mode =

            ClockMode.LIVE;

        this.simulatedTime = null;

        this.record(

            "Returned to live clock."

        );

    }

    /**
     * =====================================================
     * Named Timers
     * =====================================================
     */

    startTimer(name) {

        if (!this.timers) {

            this.timers = new Map();

        }

        this.timers.set(

            name,

            this.performanceNow()

        );

        return name;

    }

    stopTimer(name) {

        if (

            !this.timers ||

            !this.timers.has(name)

        ) {

            return null;

        }

        const started =

            this.timers.get(name);

        const elapsed =

            this.performanceNow() -

            started;

        this.timers.delete(name);

        return elapsed;

    }

    /**
     * =====================================================
     * Stopwatch
     * =====================================================
     */

    stopwatch() {

        const started =

            this.performanceNow();

        return {

            stop: () =>

                this.performanceNow() -

                started

        };

    }

    /**
     * =====================================================
     * Mission Timer
     * =====================================================
     */

    createMissionTimer(

        missionId

    ) {

        return {

            missionId,

            startedAt:

                this.now(),

            performanceStarted:

                this.performanceNow()

        };

    }

    finishMissionTimer(timer) {

        return {

            missionId:

                timer.missionId,

            durationMs:

                this.now() -

                timer.startedAt,

            cpuDurationMs:

                this.performanceNow() -

                timer.performanceStarted

        };

    }

        /**
     * =====================================================
     * Scheduler Initialization
     * =====================================================
     */

    initializeScheduler() {

        if (!this.scheduledEvents) {

            this.scheduledEvents = new Map();

        }

    }

    /**
     * =====================================================
     * Schedule Once
     * =====================================================
     */

    schedule(

        name,

        executeAt,

        callback,

        metadata = {}

    ) {

        this.initializeScheduler();

        this.scheduledEvents.set(name, {

            name,

            type: "timeout",

            executeAt,

            callback,

            metadata,

            createdAt: this.now(),

            cancelled: false

        });

        this.record(

            "Event scheduled.",

            {

                name,

                executeAt

            }

        );

        return name;

    }

    /**
     * =====================================================
     * Schedule Delay
     * =====================================================
     */

    scheduleAfter(

        name,

        delayMs,

        callback,

        metadata = {}

    ) {

        return this.schedule(

            name,

            this.now() + delayMs,

            callback,

            metadata

        );

    }

    /**
     * =====================================================
     * Repeating Schedule
     * =====================================================
     */

    scheduleInterval(

        name,

        intervalMs,

        callback,

        metadata = {}

    ) {

        this.initializeScheduler();

        this.scheduledEvents.set(name, {

            name,

            type: "interval",

            intervalMs,

            nextExecution:

                this.now() + intervalMs,

            callback,

            metadata,

            createdAt:

                this.now(),

            cancelled: false

        });

        this.record(

            "Interval scheduled.",

            {

                name,

                intervalMs

            }

        );

        return name;

    }

    /**
     * =====================================================
     * Cancel Event
     * =====================================================
     */

    cancel(

        name

    ) {

        this.initializeScheduler();

        const event =

            this.scheduledEvents.get(name);

        if (!event) {

            return false;

        }

        event.cancelled = true;

        this.scheduledEvents.delete(name);

        this.record(

            "Scheduled event cancelled.",

            {

                name

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Scheduled Events
     * =====================================================
     */

    getScheduledEvents() {

        this.initializeScheduler();

        return Array.from(

            this.scheduledEvents.values()

        );

    }

    /**
     * =====================================================
     * Execute Scheduler
     *
     * Called by Kernel heartbeat.
     * =====================================================
     */

    tick() {

        this.initializeScheduler();

        const now =

            this.now();

        for (

            const event of

            this.scheduledEvents.values()

        ) {

            if (

                event.cancelled

            ) {

                continue;

            }

            if (

                event.type === "timeout"

            ) {

                if (

                    now >= event.executeAt

                ) {

                    try {

                        event.callback();

                    }

                    finally {

                        this.scheduledEvents.delete(

                            event.name

                        );

                    }

                }

            }

            else if (

                event.type === "interval"

            ) {

                if (

                    now >= event.nextExecution

                ) {

                    event.callback();

                    event.nextExecution +=

                        event.intervalMs;

                }

            }

        }

    }

    /**
     * =====================================================
     * Mission Deadline
     * =====================================================
     */

    createDeadline(

        missionId,

        durationMs

    ) {

        return {

            missionId,

            createdAt:

                this.now(),

            deadline:

                this.now() +

                durationMs

        };

    }

    /**
     * =====================================================
     * Deadline Check
     * =====================================================
     */

    deadlineExceeded(

        deadline

    ) {

        return this.now() >

            deadline.deadline;

    }

    /**
     * =====================================================
     * Remaining Time
     * =====================================================
     */

    remaining(

        deadline

    ) {

        return Math.max(

            0,

            deadline.deadline -

            this.now()

        );

    }

    /**
     * =====================================================
     * Timeline Event
     * =====================================================
     */

    addTimelineEvent(

        label,

        metadata = {}

    ) {

        this.record(

            label,

            metadata

        );

    }

    /**
     * =====================================================
     * Timeline Export
     * =====================================================
     */

    exportTimeline() {

        return [

            ...this.timeline

        ];

    }

        /**
     * =====================================================
     * Time Zone
     * =====================================================
     */

    setTimeZone(

        timeZone = "UTC"

    ) {

        this.timeZone = timeZone;

        this.record(

            "Time zone updated.",

            {

                timeZone

            }

        );

        return this.timeZone;

    }

    getTimeZone() {

        return this.timeZone || "UTC";

    }

    /**
     * =====================================================
     * Local Date
     * =====================================================
     */

    localDate() {

        return new Intl.DateTimeFormat(

            "en-US",

            {

                timeZone:

                    this.getTimeZone(),

                dateStyle: "full",

                timeStyle: "long"

            }

        ).format(

            new Date(

                this.now()

            )

        );

    }

    /**
     * =====================================================
     * Clock Synchronization
     * =====================================================
     */

    synchronize(

        authoritativeTimestamp

    ) {

        const previous =

            this.now();

        this.offset =

            authoritativeTimestamp -

            Date.now();

        this.record(

            "Clock synchronized.",

            {

                previous,

                authoritativeTimestamp,

                offset:

                    this.offset

            }

        );

        return this.offset;

    }

    /**
     * =====================================================
     * Drift Detection
     * =====================================================
     */

    detectDrift(

        authoritativeTimestamp

    ) {

        const drift =

            this.now() -

            authoritativeTimestamp;

        return {

            drift,

            absolute:

                Math.abs(drift),

            healthy:

                Math.abs(drift) < 100

        };

    }

    /**
     * =====================================================
     * Business Hours
     * =====================================================
     */

    isBusinessHours({

        startHour = 9,

        endHour = 17

    } = {}) {

        const now =

            this.utc();

        const hour =

            now.getUTCHours();

        return (

            hour >= startHour &&

            hour < endHour

        );

    }

    /**
     * =====================================================
     * Maintenance Window
     * =====================================================
     */

    isMaintenanceWindow({

        startHour = 2,

        endHour = 4

    } = {}) {

        const now =

            this.utc();

        const hour =

            now.getUTCHours();

        return (

            hour >= startHour &&

            hour < endHour

        );

    }

    /**
     * =====================================================
     * Quiet Hours
     * =====================================================
     */

    isQuietHours({

        startHour = 22,

        endHour = 7

    } = {}) {

        const now =

            this.utc();

        const hour =

            now.getUTCHours();

        if (

            startHour > endHour

        ) {

            return (

                hour >= startHour ||

                hour < endHour

            );

        }

        return (

            hour >= startHour &&

            hour < endHour

        );

    }

    /**
     * =====================================================
     * Clock Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            mode:

                this.mode,

            offset:

                this.offset,

            uptime:

                this.uptime(),

            schedulerEvents:

                this.scheduledEvents

                    ? this.scheduledEvents.size

                    : 0,

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Clock Integrity
     * =====================================================
     */

    verifyIntegrity() {

        return {

            healthy: true,

            validMode:

                Object.values(

                    ClockMode

                ).includes(

                    this.mode

                ),

            schedulerReady:

                this.scheduledEvents instanceof Map ||

                this.scheduledEvents === undefined,

            timersReady:

                this.timers instanceof Map ||

                this.timers === undefined

        };

    }

    /**
     * =====================================================
     * Scheduler Statistics
     * =====================================================
     */

    schedulerStats() {

        this.initializeScheduler();

        const events =

            Array.from(

                this.scheduledEvents.values()

            );

        return {

            total:

                events.length,

            timeouts:

                events.filter(

                    e =>

                        e.type ===

                        "timeout"

                ).length,

            intervals:

                events.filter(

                    e =>

                        e.type ===

                        "interval"

                ).length

        };

    }

    /**
     * =====================================================
     * Export Clock State
     * =====================================================
     */

    exportState() {

        return {

            mode:

                this.mode,

            offset:

                this.offset,

            nodeTime:

                this.now(),

            uptime:

                this.uptime(),

            metrics: {

                ...this.metrics

            },

            scheduler:

                this.schedulerStats(),

            timeline: [

                ...this.timeline

            ]

        };

    }

        /**
     * =====================================================
     * Temporal Fingerprint
     *
     * Creates a reproducible snapshot of the current clock
     * state for diagnostics and auditing.
     * =====================================================
     */

    fingerprint() {

        return {

            mode: this.mode,

            nodeTime: this.now(),

            uptime: this.uptime(),

            offset: this.offset,

            fingerprint: JSON.stringify({

                mode: this.mode,

                offset: this.offset,

                uptime: this.uptime()

            })

        };

    }

    /**
     * =====================================================
     * Audit Report
     * =====================================================
     */

    exportAuditReport() {

        return {

            generatedAt: this.now(),

            fingerprint: this.fingerprint(),

            health: this.health(),

            integrity: this.verifyIntegrity(),

            scheduler: this.schedulerStats(),

            metrics: {

                ...this.metrics

            },

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

    static deserialize(

        json

    ) {

        const state =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const clock =

            new SystemClock({

                mode: state.mode

            });

        clock.offset =

            state.offset;

        clock.metrics = {

            ...state.metrics

        };

        clock.timeline = [

            ...state.timeline

        ];

        return clock;

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

            service: "SystemClock",

            authority: "Temporal Authority",

            version: "3.0.0-alpha.1",

            mode: this.mode,

            uptime: this.uptime(),

            timeZone: this.getTimeZone()

        };

    }

    /**
     * =====================================================
     * Debug Interface
     * =====================================================
     */

    debug() {

        return {

            info: this.getInfo(),

            health: this.health(),

            integrity: this.verifyIntegrity(),

            statistics: this.schedulerStats(),

            metrics: {

                ...this.metrics

            },

            timeline: [

                ...this.timeline

            ]

        };

    }

    /**
     * =====================================================
     * Reset Clock
     * =====================================================
     */

    reset() {

        this.mode = ClockMode.LIVE;

        this.offset = 0;

        this.simulatedTime = null;

        this.metrics = {

            reads: 0,

            utcReads: 0,

            performanceReads: 0,

            simulations: 0,

            replays: 0

        };

        this.timeline = [];

        this.timers = new Map();

        this.scheduledEvents = new Map();

        this.record(

            "SystemClock reset."

        );

    }

    /**
     * =====================================================
     * Shutdown
     * =====================================================
     */

    shutdown() {

        this.record(

            "SystemClock shutting down."

        );

        if (this.timers) {

            this.timers.clear();

        }

        if (this.scheduledEvents) {

            this.scheduledEvents.clear();

        }

        return true;

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(

        options = {}

    ) {

        return new SystemClock(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[SystemClock Mode=${this.mode} Uptime=${this.uptime()}ms Scheduled=${this.scheduledEvents ? this.scheduledEvents.size : 0}]`;

    }

}