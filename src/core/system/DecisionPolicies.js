/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * DecisionPolicies.js
 *
 * Description:
 * Enterprise Decision Policy Framework
 *
 * This file governs HOW AstraMind converts validated reasoning
 * into executable actions.
 *
 * Identity defines WHO AstraMind is.
 * Personality defines HOW AstraMind communicates.
 * Operating Principles define WHAT AstraMind stands for.
 * Reasoning Policies define HOW AstraMind reaches conclusions.
 * Decision Policies define WHEN and HOW AstraMind acts.
 *
 * ============================================================================
 */

import AIIdentity from "./AIIdentity.js";
import { OperatingPrinciples } from "./OperatingPrinciples.js";
import { ReasoningPolicies } from "./ReasoningPolicies.js";

/**
 * ============================================================================
 * Decision Categories
 * ============================================================================
 */

export const DecisionCategory = Object.freeze({

    EXECUTION: "execution",

    SAFETY: "safety",

    SECURITY: "security",

    PRIVACY: "privacy",

    RESOURCE: "resource",

    AUTONOMY: "autonomy",

    GOVERNANCE: "governance",

    USER: "user"

});

/**
 * ============================================================================
 * Decision Actions
 * ============================================================================
 */

export const DecisionAction = Object.freeze({

    ALLOW: "allow",

    REQUIRE_CONFIRMATION: "require_confirmation",

    ESCALATE: "escalate",

    BLOCK: "block",

    SIMULATE: "simulate",

    DEFER: "defer"

});

/**
 * ============================================================================
 * Core Decision Policies
 * ============================================================================
 */

export const DecisionPolicies = Object.freeze([

    {
        id: "human_confirmation",

        immutable: true,

        category: DecisionCategory.AUTONOMY,

        action: DecisionAction.REQUIRE_CONFIRMATION,

        description:
            "Require user confirmation before irreversible operations."
    },

    {
        id: "safety_before_execution",

        immutable: true,

        category: DecisionCategory.SAFETY,

        action: DecisionAction.BLOCK,

        description:
            "Block execution whenever safety validation fails."
    },

    {
        id: "privacy_before_processing",

        immutable: true,

        category: DecisionCategory.PRIVACY,

        action: DecisionAction.BLOCK,

        description:
            "Reject operations that violate configured privacy requirements."
    },

    {
        id: "security_validation",

        immutable: true,

        category: DecisionCategory.SECURITY,

        action: DecisionAction.BLOCK,

        description:
            "Require security validation before protected operations."
    },

    {
        id: "confidence_threshold",

        immutable: true,

        category: DecisionCategory.EXECUTION,

        minimumConfidence: 85,

        action: DecisionAction.REQUIRE_CONFIRMATION,

        description:
            "Low-confidence reasoning requires additional review."
    },

    {
        id: "resource_budget",

        immutable: true,

        category: DecisionCategory.RESOURCE,

        action: DecisionAction.DEFER,

        description:
            "Delay execution when budgets or quotas are exceeded."
    },

    {
        id: "audit_required",

        immutable: true,

        category: DecisionCategory.GOVERNANCE,

        action: DecisionAction.ALLOW,

        audit: true,

        description:
            "Record significant decisions for traceability."
    },

    {
        id: "simulation_first",

        immutable: true,

        category: DecisionCategory.EXECUTION,

        action: DecisionAction.SIMULATE,

        description:
            "Prefer simulation when execution uncertainty is elevated."
    }

]);

/**
 * ============================================================================
 * Decision Policy Manager
 * ============================================================================
 */

export class DecisionPolicyManager {

    constructor() {

        this.identity = AIIdentity;

        this.operatingPrinciples = OperatingPrinciples;

        this.reasoningPolicies = ReasoningPolicies;

        this.policies = [...DecisionPolicies];

    }

    getAll() {

        return [...this.policies];

    }

    get(id) {

        return this.policies.find(

            policy => policy.id === id

        ) || null;

    }

    byCategory(category) {

        return this.policies.filter(

            policy =>

                policy.category === category

        );

    }

    exists(id) {

        return !!this.get(id);

    }

    /**
     * =====================================================
     * Decision Evaluation
     * =====================================================
     */

    evaluate(context = {}) {

        const outcome = {

            allowed: true,

            action: DecisionAction.ALLOW,

            triggeredPolicies: [],

            reasons: []

        };

        const confidence =

            context.confidence ?? 100;

        if (confidence < 85) {

            outcome.allowed = false;

            outcome.action =

                DecisionAction.REQUIRE_CONFIRMATION;

            outcome.triggeredPolicies.push(

                "confidence_threshold"

            );

            outcome.reasons.push(

                "Confidence below execution threshold."

            );

        }

        if (

            context.securityValidated === false

        ) {

            outcome.allowed = false;

            outcome.action =

                DecisionAction.BLOCK;

            outcome.triggeredPolicies.push(

                "security_validation"

            );

            outcome.reasons.push(

                "Security validation failed."

            );

        }

        if (

            context.privacyValidated === false

        ) {

            outcome.allowed = false;

            outcome.action =

                DecisionAction.BLOCK;

            outcome.triggeredPolicies.push(

                "privacy_before_processing"

            );

            outcome.reasons.push(

                "Privacy validation failed."

            );

        }

        if (

            context.requiresConfirmation

        ) {

            outcome.allowed = false;

            outcome.action =

                DecisionAction.REQUIRE_CONFIRMATION;

            outcome.triggeredPolicies.push(

                "human_confirmation"

            );

        }

        return outcome;

    }

    /**
     * =====================================================
     * Export
     * =====================================================
     */

    exportState() {

        return {

            identity:

                this.identity.name,

            policies:

                this.policies.length

        };

    }

    static create() {

        return new DecisionPolicyManager();

    }

}

export default DecisionPolicyManager;