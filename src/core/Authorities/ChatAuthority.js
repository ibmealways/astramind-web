/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * ChatAuthority.js
 *
 * Kernel Chat Authority
 *
 * Responsibilities
 * ----------------
 * • Conversation orchestration
 * • Intent detection
 * • Output mode resolution
 * • Role resolution
 * • Mission dispatch
 * • Authority routing
 * • HybridAI execution
 * • Conversation context
 * • Kernel response normalization
 *
 * Chat is NOT the intelligence.
 *
 * Chat is the user's interface to the AstraMind Kernel.
 * ============================================================================
 */

import { detectAgentIntent } from "../agents/agentRouter.js";

export const CHAT_ACTIONS = Object.freeze({

    CONVERSATION: "conversation",

    RESEARCH: "research",

    CONTENT: "content",

    BOOK: "book",

    FINANCE: "finance",

    MUSIC: "music",

    VIDEO: "video",

    IMAGE: "image",

    SYSTEM: "system"

});

class ConversationContext {

    constructor({

        requestId,

        payload,

        metadata = {}

    }) {

        this.requestId = requestId;

        this.message = payload.message || "";

        this.history =

            payload.history || [];

        this.outputMode =

            payload.outputMode ||

            "AUTO";

        this.metadata = {

            ...metadata

        };

        this.intent = null;

        this.role = null;

        this.mission = null;

        this.route = null;

        this.response = null;

        this.startedAt = Date.now();

        this.completedAt = null;

    }

}

export default class ChatAuthority {

    constructor({

        hybridAI = null,

        newsEngine = null,

        financeEngine = null,

        contentEngine = null,

        bookEngine = null,

        musicEngine = null,

        missionPlanner = null,

        memoryAuthority = null

    } = {}) {

        this.name = "Chat";

        this.version = "3.0.0";

        this.type = "authority";

        this.hybridAI = hybridAI;

        this.newsEngine = newsEngine;

        this.financeEngine = financeEngine;

        this.contentEngine = contentEngine;

        this.bookEngine = bookEngine;

        this.musicEngine = musicEngine;

        this.missionPlanner = missionPlanner;

        this.memoryAuthority = memoryAuthority;

        /*
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            conversations: 0,

            research: 0,

            finance: 0,

            books: 0,

            content: 0,

            music: 0,

            video: 0,

            failures: 0

        };

        /*
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "ChatAuthority initialized."

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
     * Lifecycle
     * =====================================================
     */

    async initialize() {

        this.record(

            "ChatAuthority initialized."

        );

        return true;

    }

    async start() {

        this.record(

            "ChatAuthority started."

        );

        return true;

    }

    async shutdown() {

        this.record(

            "ChatAuthority shutdown."

        );

        return true;

    }

    /**
     * =====================================================
     * Kernel Entry Point
     * =====================================================
     */

    async execute(kernelContext) {

        this.metrics.conversations++;

        const conversation =

            new ConversationContext({

                requestId:

                    kernelContext.requestId,

                payload:

                    kernelContext.payload,

                metadata:

                    kernelContext.metadata

            });

        this.record(

            "Conversation started.",

            {

                requestId:

                    conversation.requestId

            }

        );

        /*
         * ===============================================
         * Execution Pipeline
         * ===============================================
         */

        conversation.intent =

            await this.detectIntent(

                conversation

            );

        conversation.role =

            await this.resolveRole(

                conversation

            );

        conversation.mission =

            await this.resolveMission(

                conversation

            );

        conversation.route =

            await this.resolveRoute(

                conversation

            );

        return await this.dispatch(

            conversation,

            kernelContext

        );

    }

        /**
     * =====================================================
     * Detect Intent
     * =====================================================
     */

    async detectIntent(conversation) {

        const detectedIntent =

            detectAgentIntent(

                conversation.message

            );

        this.record(

            "Intent detected.",

            {

                requestId:

                    conversation.requestId,

                intent:

                    detectedIntent?.primaryAgent

            }

        );

        return detectedIntent;

    }

    /**
     * =====================================================
     * Resolve Role
     * =====================================================
     */

    async resolveRole(conversation) {

        const intent =

            conversation.intent?.primaryAgent ||

            "chat";

        switch (intent) {

            case "finance":

                return {

                    name:

                        "Finance Advisor",

                    authority:

                        "FinanceAuthority"

                };

            case "book":

                return {

                    name:

                        "Book Writer",

                    authority:

                        "BookAuthority"

                };

            case "content":

                return {

                    name:

                        "Content Creator",

                    authority:

                        "ContentAuthority"

                };

            case "news":

                return {

                    name:

                        "Research Analyst",

                    authority:

                        "ResearchAuthority"

                };

            case "music":

                return {

                    name:

                        "Music Producer",

                    authority:

                        "MusicAuthority"

                };

            default:

                return {

                    name:

                        "General Assistant",

                    authority:

                        "HybridAI"

                };

        }

    }

    /**
     * =====================================================
     * Resolve Mission
     * =====================================================
     */

    async resolveMission(conversation) {

        /*
         * Mission Planner Authority
         * will eventually replace
         * this logic.
         */

        return {

            authority:

                conversation.role.authority,

            objective:

                conversation.message,

            outputMode:

                conversation.outputMode

        };

    }

    /**
     * =====================================================
     * Resolve Route
     * =====================================================
     */

    async resolveRoute(conversation) {

        return {

            authority:

                conversation.role.authority,

            mission:

                conversation.mission

        };

    }

    /**
     * =====================================================
     * Dispatch
     *
     * Current Version:
     *
     * Dispatches to internal
     * engines until every
     * subsystem becomes its
     * own Authority.
     * =====================================================
     */

    async dispatch(

        conversation,

        kernelContext

    ) {

        this.record(

            "Mission dispatched.",

            {

                authority:

                    conversation.route.authority,

                requestId:

                    conversation.requestId

            }

        );

        switch (

            conversation.route.authority

        ) {

            /*
             * =====================================
             * Finance
             * =====================================
             */

            case "FinanceAuthority":

                this.metrics.finance++;

                if (

                    this.financeEngine &&

                    typeof this.financeEngine.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.financeEngine.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

            /*
             * =====================================
             * Book
             * =====================================
             */

            case "BookAuthority":

                this.metrics.books++;

                if (

                    this.bookEngine &&

                    typeof this.bookEngine.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.bookEngine.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

            /*
             * =====================================
             * Content
             * =====================================
             */

            case "ContentAuthority":

                this.metrics.content++;

                if (

                    this.contentEngine &&

                    typeof this.contentEngine.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.contentEngine.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

             /*
             * =====================================
             * Research
             * =====================================
             */

            case "ResearchAuthority":

                this.metrics.research++;

                if (

                    this.newsEngine &&

                    typeof this.newsEngine.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.newsEngine.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

            /*
             * =====================================
             * Music
             * =====================================
             */

            case "MusicAuthority":

                this.metrics.music++;

                if (

                    this.musicEngine &&

                    typeof this.musicEngine.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.musicEngine.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

            /*
             * =====================================
             * Future Mission Planner
             * =====================================
             */

            case "MissionPlanner":

                if (

                    this.missionPlanner &&

                    typeof this.missionPlanner.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.missionPlanner.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

            /*
             * =====================================
             * HybridAI
             * =====================================
             */

            case "HybridAI":

            default:

                if (

                    this.hybridAI &&

                    typeof this.hybridAI.execute ===

                    "function"

                ) {

                    try {

    const result =
        await this.hybridAI.execute(
            kernelContext
        );

    return this.buildResponse(
        conversation,
        result
    );

} catch (error) {

    return this.buildError(
        conversation,
        error
    );

}

                }

                break;

        }

        /*
         * ===============================================
         * No Authority Available
         * ===============================================
         */

        throw new Error(

            `No execution engine available for '${conversation.route.authority}'.`

        );

    }

    /**
     * =====================================================
     * Build Standard Kernel Response
     * =====================================================
     */

    buildResponse(

        conversation,

        data

    ) {

        conversation.completedAt =

            Date.now();

        return {

            success: true,

            authority: this.name,

            version: this.version,

            requestId:

                conversation.requestId,

            mission:

                conversation.mission,

            role:

                conversation.role,

            route:

                conversation.route,

            startedAt:

                conversation.startedAt,

            completedAt:

                conversation.completedAt,

            executionTime:

                conversation.completedAt -

                conversation.startedAt,

            data,

            diagnostics: {

                authority:

                    this.name,

                metrics: {

                    ...this.metrics

                }

            }

        };

    }

    /**
     * =====================================================
     * Build Error Response
     * =====================================================
     */

    buildError(

        conversation,

        error

    ) {

        this.metrics.failures++;

        conversation.completedAt =

            Date.now();

        this.record(

            "Conversation failed.",

            {

                requestId:

                    conversation.requestId,

                error:

                    error.message

            }

        );

        return {

            success: false,

            authority: this.name,

            version: this.version,

            requestId:

                conversation.requestId,

            mission:

                conversation.mission,

            route:

                conversation.route,

            startedAt:

                conversation.startedAt,

            completedAt:

                conversation.completedAt,

            executionTime:

                conversation.completedAt -

                conversation.startedAt,

            error: {

                message:

                    error.message

            }

        };

    }

        /**
     * =====================================================
     * Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            authority: this.name,

            version: this.version,

            metrics: {

                ...this.metrics

            },

            timelineEvents:

                this.timeline.length

        };

    }

    /**
     * =====================================================
     * Statistics
     * =====================================================
     */

    statistics() {

        const total =

            this.metrics.conversations;

        return {

            authority:

                this.name,

            conversations:

                total,

            finance:

                this.metrics.finance,

            research:

                this.metrics.research,

            books:

                this.metrics.books,

            content:

                this.metrics.content,

            music:

                this.metrics.music,

            video:

                this.metrics.video,

            failures:

                this.metrics.failures,

            successRate:

                total === 0

                    ? 100

                    : Number(

                        (

                            (

                                (total -

                                this.metrics.failures)

                                /

                                total

                            ) * 100

                        ).toFixed(2)

                    )

        };

    }

    /**
     * =====================================================
     * Diagnostics
     * =====================================================
     */

    diagnostics() {

        return {

            authority:

                this.name,

            version:

                this.version,

            statistics:

                this.statistics(),

            timeline:

                [

                    ...this.timeline

                ],

            engines: {

                hybridAI:

                    !!this.hybridAI,

                finance:

                    !!this.financeEngine,

                research:

                    !!this.newsEngine,

                content:

                    !!this.contentEngine,

                books:

                    !!this.bookEngine,

                music:

                    !!this.musicEngine,

                missionPlanner:

                    !!this.missionPlanner,

                memory:

                    !!this.memoryAuthority

            }

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

            authority:

                this.name,

            timestamp:

                Date.now(),

            statistics:

                this.statistics()

        };

    }

    /**
     * =====================================================
     * Reset Metrics
     * =====================================================
     */

    resetMetrics() {

        this.metrics = {

            conversations: 0,

            research: 0,

            finance: 0,

            books: 0,

            content: 0,

            music: 0,

            video: 0,

            failures: 0

        };

        this.record(

            "Metrics reset."

        );

    }

    /**
     * =====================================================
     * Clear Timeline
     * =====================================================
     */

    clearTimeline() {

        this.timeline = [];

        this.record(

            "Timeline cleared."

        );

    }

    /**
     * =====================================================
     * Serialize
     * =====================================================
     */

    serialize(pretty = true) {

        return JSON.stringify(

            this.report(),

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

        return new ChatAuthority(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[ChatAuthority Conversations=${this.metrics.conversations} SuccessRate=${this.statistics().successRate}%]`;

    }

}