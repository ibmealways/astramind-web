/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * PolicyEngine.js
 *
 * Description:
 * Enterprise Policy Evaluation Engine
 *
 * PolicyEngine is the constitutional authority of AstraMind OS.
 *
 * It evaluates every important decision against:
 *
 * • AI Identity
 * • Personality
 * • Operating Principles
 * • Reasoning Policies
 * • Decision Policies
 *
 * Every subsystem asks ONE question:
 *
 *      "Is this permitted?"
 *
 * PolicyEngine answers.
 *
 * ============================================================================
 */

import AIIdentity from "./AIIdentity.js";

import AIPersonalityManager from "./AIPersonality.js";

import {

    OperatingPrincipleManager

} from "./OperatingPrinciples.js";

import {

    ReasoningPolicyManager

} from "./ReasoningPolicies.js";

import {

    DecisionPolicyManager,

    DecisionAction

} from "./DecisionPolicies.js";

/**
 * ============================================================================
 * Policy Evaluation State
 * ============================================================================
 */

export const PolicyState = Object.freeze({

    ALLOWED: "allowed",

    DENIED: "denied",

    CONFIRMATION_REQUIRED: "confirmation_required",

    SIMULATION_REQUIRED: "simulation_required",

    ESCALATED: "escalated"

});

export default class PolicyEngine {

    constructor({

        diagnostics = null,

        eventBus = null

    } = {}) {

        this.identity = AIIdentity;

        this.personality =

            new AIPersonalityManager();

        this.operatingPrinciples =

            new OperatingPrincipleManager();

        this.reasoningPolicies =

            new ReasoningPolicyManager();

        this.decisionPolicies =

            new DecisionPolicyManager();

        this.diagnostics =

            diagnostics;

        this.eventBus =

            eventBus;

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            evaluations: 0,

            approvals: 0,

            denials: 0,

            confirmations: 0,

            simulations: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "PolicyEngine initialized."

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
     * Evaluate
     * =====================================================
     */

    evaluate(

        context = {}

    ) {

        this.metrics.evaluations++;

        const decision =

            this.decisionPolicies.evaluate(

                context

            );

        let state =

            PolicyState.ALLOWED;

        switch (

            decision.action

        ) {

            case DecisionAction.BLOCK:

                state =

                    PolicyState.DENIED;

                this.metrics.denials++;

                break;

            case DecisionAction.REQUIRE_CONFIRMATION:

                state =

                    PolicyState.CONFIRMATION_REQUIRED;

                this.metrics.confirmations++;

                break;

            case DecisionAction.SIMULATE:

                state =

                    PolicyState.SIMULATION_REQUIRED;

                this.metrics.simulations++;

                break;

            default:

                this.metrics.approvals++;

        }

        const result = {

            state,

            decision,

            evaluatedAt:

                Date.now(),

            personality:

                this.personality

                    .getActiveType(),

            identity:

                this.identity.name

        };

        this.record(

            "Policy evaluated.",

            {

                state,

                action:

                    decision.action

            }

        );

        return result;

    }

    /**
     * =====================================================
     * Convenience
     * =====================================================
     */

    allows(

        context = {}

    ) {

        return (

            this.evaluate(

                context

            ).state ===

            PolicyState.ALLOWED

        );

    }

    requiresConfirmation(

        context = {}

    ) {

        return (

            this.evaluate(

                context

            ).state ===

            PolicyState.CONFIRMATION_REQUIRED

        );

    }

    requiresSimulation(

        context = {}

    ) {

        return (

            this.evaluate(

                context

            ).state ===

            PolicyState.SIMULATION_REQUIRED

        );

    }

        /**
     * =====================================================
     * Operating Principle Evaluation
     * =====================================================
     */

    evaluateOperatingPrinciples(

        context = {}

    ) {

        const violations = [];

        const principles =

            this.operatingPrinciples.getAll();

        for (

            const principle of principles

        ) {

            if (

                principle.id === "truth" &&

                context.truthVerified === false

            ) {

                violations.push({

                    principle:

                        principle.id,

                    severity:

                        "critical",

                    message:

                        "Truth verification failed."

                });

            }

            if (

                principle.id === "privacy" &&

                context.privacyValidated === false

            ) {

                violations.push({

                    principle:

                        principle.id,

                    severity:

                        "critical",

                    message:

                        "Privacy requirements not satisfied."

                });

            }

            if (

                principle.id === "security" &&

                context.securityValidated === false

            ) {

                violations.push({

                    principle:

                        principle.id,

                    severity:

                        "critical",

                    message:

                        "Security validation failed."

                });

            }

        }

        return {

            passed:

                violations.length === 0,

            violations

        };

    }

    /**
     * =====================================================
     * Reasoning Policy Evaluation
     * =====================================================
     */

    evaluateReasoningPolicies(

        reasoningResult = {}

    ) {

        return this.reasoningPolicies.validate(

            reasoningResult

        );

    }

    /**
     * =====================================================
     * Decision Policy Evaluation
     * =====================================================
     */

    evaluateDecisionPolicies(

        context = {}

    ) {

        return this.decisionPolicies.evaluate(

            context

        );

    }

    /**
     * =====================================================
     * Multi-Stage Evaluation
     * =====================================================
     */

    evaluatePolicies(

        context = {}

    ) {

        const principleReport =

            this.evaluateOperatingPrinciples(

                context

            );

        if (

            !principleReport.passed

        ) {

            return {

                state:

                    PolicyState.DENIED,

                stage:

                    "Operating Principles",

                report:

                    principleReport

            };

        }

        const reasoningReport =

            this.evaluateReasoningPolicies(

                context.reasoning ||

                {}

            );

        if (

            !reasoningReport.valid

        ) {

            return {

                state:

                    PolicyState.CONFIRMATION_REQUIRED,

                stage:

                    "Reasoning Policies",

                report:

                    reasoningReport

            };

        }

        const decisionReport =

            this.evaluateDecisionPolicies(

                context

            );

        return {

            state:

                decisionReport.allowed

                    ? PolicyState.ALLOWED

                    : PolicyState.CONFIRMATION_REQUIRED,

            stage:

                "Decision Policies",

            report:

                decisionReport

        };

    }

    /**
     * =====================================================
     * Policy Conflict Detection
     * =====================================================
     */

    detectConflicts(

        context = {}

    ) {

        const conflicts = [];

        if (

            context.requiresConfirmation &&

            context.autonomous === true

        ) {

            conflicts.push({

                type:

                    "autonomy",

                message:

                    "Autonomous execution requires user confirmation."

            });

        }

        if (

            context.securityValidated === false &&

            context.forceExecution === true

        ) {

            conflicts.push({

                type:

                    "security",

                message:

                    "Forced execution conflicts with security policy."

            });

        }

        return conflicts;

    }

    /**
     * =====================================================
     * Risk Score
     * =====================================================
     */

    calculateRisk(

        context = {}

    ) {

        let score = 0;

        if (

            context.confidence < 80

        ) {

            score += 25;

        }

        if (

            context.securityValidated === false

        ) {

            score += 35;

        }

        if (

            context.privacyValidated === false

        ) {

            score += 25;

        }

        if (

            context.autonomous

        ) {

            score += 10;

        }

        if (

            context.forceExecution

        ) {

            score += 15;

        }

        return {

            score,

            level:

                score < 20

                    ? "low"

                    : score < 50

                        ? "medium"

                        : "high"

        };

    }

    /**
     * =====================================================
     * Policy Recommendation
     * =====================================================
     */

    recommend(

        context = {}

    ) {

        const evaluation =

            this.evaluatePolicies(

                context

            );

        return {

            evaluation,

            conflicts:

                this.detectConflicts(

                    context

                ),

            risk:

                this.calculateRisk(

                    context

                )

        };

    }

        /**
     * =====================================================
     * Policy Inheritance
     *
     * Policies inherit from:
     *
     * Global
     * ↓
     * Domain
     * ↓
     * Mission
     * ↓
     * Session
     * =====================================================
     */

    buildPolicyContext(context = {}) {

        return {

            global:

                this.operatingPrinciples.getAll(),

            reasoning:

                this.reasoningPolicies.enabled(),

            decision:

                this.decisionPolicies.getAll(),

            domain:

                context.domainPolicies || [],

            mission:

                context.missionPolicies || [],

            session:

                context.sessionPolicies || []

        };

    }

    /**
     * =====================================================
     * Policy Priority
     * =====================================================
     */

    determinePriority(policy) {

        if (

            policy.priority !== undefined

        ) {

            return policy.priority;

        }

        if (

            policy.immutable

        ) {

            return 100;

        }

        return 50;

    }

    /**
     * =====================================================
     * Resolve Policy Order
     * =====================================================
     */

    resolvePolicyOrder(

        policies = []

    ) {

        return [

            ...policies

        ]

        .sort(

            (a, b) =>

                this.determinePriority(b)

                -

                this.determinePriority(a)

        );

    }

    /**
     * =====================================================
     * Conditional Policies
     * =====================================================
     */

    evaluateConditions(

        policy,

        context = {}

    ) {

        if (

            typeof policy.condition !==

            "function"

        ) {

            return true;

        }

        return policy.condition(

            context

        );

    }

    /**
     * =====================================================
     * Active Policies
     * =====================================================
     */

    collectActivePolicies(

        context = {}

    ) {

        const policyContext =

            this.buildPolicyContext(

                context

            );

        const allPolicies = [

            ...policyContext.global,

            ...policyContext.reasoning,

            ...policyContext.decision,

            ...policyContext.domain,

            ...policyContext.mission,

            ...policyContext.session

        ];

        return this.resolvePolicyOrder(

            allPolicies

        )

        .filter(policy =>

            this.evaluateConditions(

                policy,

                context

            )

        );

    }

    /**
     * =====================================================
     * Policy Overrides
     * =====================================================
     */

    resolveOverrides(

        activePolicies = []

    ) {

        const overrides = [];

        const immutable =

            activePolicies.filter(

                policy =>

                    policy.immutable

            );

        activePolicies.forEach(policy => {

            if (

                immutable.some(

                    p =>

                        p.id === policy.id

                )

            ) {

                return;

            }

            if (

                policy.overrideOf

            ) {

                overrides.push({

                    policy:

                        policy.id,

                    overrides:

                        policy.overrideOf

                });

            }

        });

        return overrides;

    }

    /**
     * =====================================================
     * Policy Version
     * =====================================================
     */

    getPolicyVersion() {

        return {

            constitutional:

                "3.0.0",

            reasoning:

                "3.0.0",

            decision:

                "3.0.0"

        };

    }

    /**
     * =====================================================
     * Evaluation Trace
     * =====================================================
     */

    createEvaluationTrace(

        context,

        result

    ) {

        return {

            timestamp:

                Date.now(),

            policyVersion:

                this.getPolicyVersion(),

            activePolicies:

                this.collectActivePolicies(

                    context

                ).map(

                    policy =>

                        policy.id

                ),

            result,

            contextSummary: {

                confidence:

                    context.confidence,

                autonomous:

                    context.autonomous,

                domain:

                    context.domain,

                mission:

                    context.mission

            }

        };

    }

    /**
     * =====================================================
     * Policy Governance Report
     * =====================================================
     */

    generateGovernanceReport(

        context = {}

    ) {

        const recommendation =

            this.recommend(

                context

            );

        const trace =

            this.createEvaluationTrace(

                context,

                recommendation

            );

        return {

            recommendation,

            trace,

            overrides:

                this.resolveOverrides(

                    this.collectActivePolicies(

                        context

                    )

                ),

            generatedAt:

                Date.now()

        };

    }

        /**
     * =====================================================
     * Policy Decision Fingerprint
     *
     * Produces a deterministic representation of every
     * constitutional decision.
     * =====================================================
     */

    createDecisionFingerprint(

        governanceReport

    ) {

        return {

            generatedAt:

                Date.now(),

            policyVersion:

                this.getPolicyVersion(),

            state:

                governanceReport

                    .recommendation

                    .evaluation

                    .state,

            fingerprint:

                JSON.stringify({

                    state:

                        governanceReport

                            .recommendation

                            .evaluation

                            .state,

                    policyVersion:

                        this.getPolicyVersion(),

                    timestamp:

                        Date.now()

                })

        };

    }

    /**
     * =====================================================
     * Constitutional Snapshot
     * =====================================================
     */

    createSnapshot(

        context = {}

    ) {

        const report =

            this.generateGovernanceReport(

                context

            );

        return {

            timestamp:

                Date.now(),

            fingerprint:

                this.createDecisionFingerprint(

                    report

                ),

            report:

                clone(report)

        };

    }

    /**
     * =====================================================
     * Policy History
     * =====================================================
     */

    addHistory(

        report

    ) {

        this.timeline.push({

            timestamp:

                Date.now(),

            type:

                "governance",

            report

        });

    }

    /**
     * =====================================================
     * Audit Record
     * =====================================================
     */

    createAuditRecord(

        context = {}

    ) {

        const report =

            this.generateGovernanceReport(

                context

            );

        this.addHistory(

            report

        );

        return {

            auditId:

                `AUDIT-${Date.now()}`,

            generatedAt:

                Date.now(),

            report

        };

    }

    /**
     * =====================================================
     * Constitutional Health
     * =====================================================
     */

    health() {

        return {

            healthy: true,

            evaluations:

                this.metrics.evaluations,

            approvals:

                this.metrics.approvals,

            denials:

                this.metrics.denials,

            confirmations:

                this.metrics.confirmations,

            simulations:

                this.metrics.simulations,

            timelineEntries:

                this.timeline.length

        };

    }

    /**
     * =====================================================
     * Integrity Verification
     * =====================================================
     */

    verifyIntegrity() {

        return {

            healthy: true,

            identity:

                !!this.identity,

            personality:

                !!this.personality,

            operatingPrinciples:

                !!this.operatingPrinciples,

            reasoningPolicies:

                !!this.reasoningPolicies,

            decisionPolicies:

                !!this.decisionPolicies

        };

    }

    /**
     * =====================================================
     * Constitutional Report
     * =====================================================
     */

    exportConstitutionalReport() {

        return {

            generatedAt:

                Date.now(),

            identity:

                this.identity,

            policyVersion:

                this.getPolicyVersion(),

            metrics:

                clone(

                    this.metrics

                ),

            integrity:

                this.verifyIntegrity(),

            health:

                this.health(),

            timeline:

                clone(

                    this.timeline

                )

        };

    }

    /**
     * =====================================================
     * State Export
     * =====================================================
     */

    exportState() {

        return {

            metrics:

                clone(

                    this.metrics

                ),

            timeline:

                clone(

                    this.timeline

                ),

            policyVersion:

                this.getPolicyVersion()

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
     * Restore State
     * =====================================================
     */

    static deserialize(

        json,

        options = {}

    ) {

        const state =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const engine =

            new PolicyEngine(

                options

            );

        engine.metrics =

            clone(

                state.metrics

            );

        engine.timeline =

            clone(

                state.timeline

            );

        return engine;

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

            "PolicyEngine",

            message,

            metadata

        );

    }

    /**
     * =====================================================
     * Publish Events
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
     * Version Compatibility
     * =====================================================
     */

    verifyCompatibility() {

        const versions = {

            identity:

                this.identity.version,

            personality:

                "3.0.0-alpha.1",

            operatingPrinciples:

                "3.0.0-alpha.1",

            reasoningPolicies:

                "3.0.0-alpha.1",

            decisionPolicies:

                "3.0.0-alpha.1"

        };

        const uniqueVersions = [

            ...new Set(

                Object.values(versions)

            )

        ];

        return {

            compatible:

                uniqueVersions.length === 1,

            versions

        };

    }

    /**
     * =====================================================
     * Policy Statistics
     * =====================================================
     */

    getStatistics() {

        return {

            evaluations:

                this.metrics.evaluations,

            approvals:

                this.metrics.approvals,

            denials:

                this.metrics.denials,

            confirmations:

                this.metrics.confirmations,

            simulations:

                this.metrics.simulations,

            principleCount:

                this.operatingPrinciples.getAll().length,

            reasoningPolicyCount:

                this.reasoningPolicies.getAll().length,

            decisionPolicyCount:

                this.decisionPolicies.getAll().length

        };

    }

    /**
     * =====================================================
     * Timeline Query
     * =====================================================
     */

    getTimeline({

        limit = 100,

        event = null

    } = {}) {

        let entries = [

            ...this.timeline

        ];

        if (event) {

            entries = entries.filter(

                item =>

                    item.event === event ||

                    item.type === event

            );

        }

        return entries.slice(

            -limit

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

            "Policy timeline cleared."

        );

    }

    /**
     * =====================================================
     * Reset Metrics
     * =====================================================
     */

    resetMetrics() {

        this.metrics = {

            evaluations: 0,

            approvals: 0,

            denials: 0,

            confirmations: 0,

            simulations: 0

        };

        this.record(

            "Policy metrics reset."

        );

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name:

                "PolicyEngine",

            platform:

                this.identity.platform,

            version:

                this.identity.version,

            constitutionalLayer:

                true,

            activePersonality:

                this.personality.getActiveType(),

            statistics:

                this.getStatistics()

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

            compatibility:

                this.verifyCompatibility(),

            integrity:

                this.verifyIntegrity(),

            health:

                this.health(),

            statistics:

                this.getStatistics(),

            timeline:

                this.getTimeline()

        };

    }

    /**
     * =====================================================
     * Shutdown
     * =====================================================
     */

    shutdown() {

        this.record(

            "PolicyEngine shutting down."

        );

        this.publish(

            "policy.engine.shutdown",

            {}

        );

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

        return new PolicyEngine(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[PolicyEngine Evaluations=${this.metrics.evaluations} Policies=${this.decisionPolicies.getAll().length}]`;

    }

}