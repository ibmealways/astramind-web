/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * ReasoningPolicies.js
 *
 * Description:
 * Enterprise Reasoning Policy Framework
 *
 * This file defines HOW AstraMind reasons.
 *
 * OperatingPrinciples define immutable constitutional values.
 *
 * ReasoningPolicies define the methodology used to transform
 * observations into conclusions.
 *
 * These policies are inherited by every reasoning engine,
 * planner, resolver, workflow, capability, and future AI module.
 *
 * ============================================================================
 */

import AIIdentity from "./AIIdentity.js";
import { OperatingPrinciples } from "./OperatingPrinciples.js";

/**
 * ============================================================================
 * Reasoning Categories
 * ============================================================================
 */

export const ReasoningCategory = Object.freeze({

    FACTUAL: "factual",

    ANALYTICAL: "analytical",

    SCIENTIFIC: "scientific",

    ENGINEERING: "engineering",

    PROBABILISTIC: "probabilistic",

    ETHICAL: "ethical",

    STRATEGIC: "strategic",

    DIAGNOSTIC: "diagnostic",

    CREATIVE: "creative"

});

/**
 * ============================================================================
 * Confidence Levels
 * ============================================================================
 */

export const ConfidenceLevel = Object.freeze({

    VERIFIED: 100,

    HIGH: 90,

    MEDIUM: 75,

    LOW: 50,

    UNKNOWN: 0

});

/**
 * ============================================================================
 * Core Reasoning Policies
 * ============================================================================
 */

export const ReasoningPolicies = Object.freeze([

    {
        id: "verify_facts",

        category: ReasoningCategory.FACTUAL,

        immutable: true,

        enabled: true,

        description:
            "Verify factual claims before presenting them as true.",

        confidenceRequired:
            ConfidenceLevel.HIGH
    },

    {
        id: "separate_fact_from_assumption",

        category: ReasoningCategory.ANALYTICAL,

        immutable: true,

        enabled: true,

        description:
            "Clearly distinguish verified facts from assumptions, estimates, and hypotheses."
    },

    {
        id: "explain_uncertainty",

        category: ReasoningCategory.SCIENTIFIC,

        immutable: true,

        enabled: true,

        description:
            "Explicitly communicate uncertainty whenever confidence is below verification thresholds."
    },

    {
        id: "prefer_evidence",

        category: ReasoningCategory.SCIENTIFIC,

        immutable: true,

        enabled: true,

        description:
            "Prefer evidence over intuition whenever evidence is available."
    },

    {
        id: "consider_multiple_hypotheses",

        category: ReasoningCategory.ANALYTICAL,

        immutable: true,

        enabled: true,

        description:
            "Evaluate multiple plausible explanations before selecting a conclusion."
    },

    {
        id: "challenge_assumptions",

        category: ReasoningCategory.ENGINEERING,

        immutable: true,

        enabled: true,

        description:
            "Identify hidden assumptions and evaluate whether they remain valid."
    },

    {
        id: "optimize_for_long_term",

        category: ReasoningCategory.STRATEGIC,

        immutable: true,

        enabled: true,

        description:
            "Favor long-term system stability over short-term optimization."
    },

    {
        id: "document_reasoning",

        category: ReasoningCategory.DIAGNOSTIC,

        immutable: true,

        enabled: true,

        description:
            "Record important reasoning steps for explainability and auditing."
    },

    {
        id: "protect_human_judgment",

        category: ReasoningCategory.ETHICAL,

        immutable: true,

        enabled: true,

        description:
            "Provide recommendations while preserving meaningful human oversight."
    }

]);

/**
 * ============================================================================
 * Reasoning Policy Manager
 * ============================================================================
 */

export class ReasoningPolicyManager {

    constructor() {

        this.identity = AIIdentity;

        this.operatingPrinciples = OperatingPrinciples;

        this.policies = [...ReasoningPolicies];

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

    enabled() {

        return this.policies.filter(

            policy =>

                policy.enabled

        );

    }

    exists(id) {

        return !!this.get(id);

    }

    validate(reasoningResult = {}) {

        const violations = [];

        if (

            reasoningResult.confidence !== undefined &&

            reasoningResult.confidence < ConfidenceLevel.HIGH &&

            !reasoningResult.uncertaintyExplained

        ) {

            violations.push(

                "Low-confidence conclusion without uncertainty explanation."

            );

        }

        if (

            reasoningResult.assumptions?.length > 0 &&

            !reasoningResult.assumptionsReviewed

        ) {

            violations.push(

                "Assumptions identified but not reviewed."

            );

        }

        return {

            valid:

                violations.length === 0,

            violations

        };

    }

    exportState() {

        return {

            identity:

                this.identity.name,

            policyCount:

                this.policies.length,

            enabledPolicies:

                this.enabled().length

        };

    }

    static create() {

        return new ReasoningPolicyManager();

    }

}

export default ReasoningPolicyManager;