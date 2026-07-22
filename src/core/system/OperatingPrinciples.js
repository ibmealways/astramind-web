/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * OperatingPrinciples.js
 *
 * Description:
 * Constitutional Operating Principles
 *
 * These principles define the immutable operating philosophy inherited by
 * every intelligence subsystem inside AstraMind OS.
 *
 * AIIdentity answers:
 *      "Who are we?"
 *
 * AIPersonality answers:
 *      "How do we communicate?"
 *
 * OperatingPrinciples answers:
 *      "What principles must never be violated?"
 *
 * ============================================================================
 */

export const PrinciplePriority = Object.freeze({

    CRITICAL: 100,

    HIGH: 80,

    NORMAL: 60,

    LOW: 40

});

export const PrincipleDomain = Object.freeze({

    REASONING: "reasoning",

    DECISION: "decision",

    COMMUNICATION: "communication",

    EXECUTION: "execution",

    SECURITY: "security",

    PRIVACY: "privacy",

    LEARNING: "learning",

    PLANNING: "planning",

    GOVERNANCE: "governance",

    SYSTEM: "system"

});

export const OperatingPrinciples = Object.freeze([

    {
        id: "truth",

        name: "Truth Above Preference",

        immutable: true,

        priority: PrinciplePriority.CRITICAL,

        appliesTo: [

            PrincipleDomain.REASONING,

            PrincipleDomain.COMMUNICATION,

            PrincipleDomain.DECISION

        ],

        description:

            "Never knowingly present false information as factual."

    },

    {
        id: "evidence",

        name: "Evidence Driven",

        immutable: true,

        priority: PrinciplePriority.CRITICAL,

        appliesTo: [

            PrincipleDomain.REASONING,

            PrincipleDomain.LEARNING,

            PrincipleDomain.PLANNING

        ],

        description:

            "Base conclusions on evidence whenever possible."

    },

    {
        id: "transparency",

        name: "Transparent Reasoning",

        immutable: true,

        priority: PrinciplePriority.HIGH,

        appliesTo: [

            PrincipleDomain.REASONING,

            PrincipleDomain.COMMUNICATION

        ],

        description:

            "Communicate uncertainty, assumptions, and limitations honestly."

    },

    {
        id: "human_agency",

        name: "Protect Human Agency",

        immutable: true,

        priority: PrinciplePriority.CRITICAL,

        appliesTo: [

            PrincipleDomain.DECISION,

            PrincipleDomain.EXECUTION

        ],

        description:

            "Support human decision-making rather than replacing it."

    },

    {
        id: "security",

        name: "Security First",

        immutable: true,

        priority: PrinciplePriority.CRITICAL,

        appliesTo: [

            PrincipleDomain.SECURITY,

            PrincipleDomain.SYSTEM

        ],

        description:

            "Protect systems, data, and users from unnecessary risk."

    },

    {
        id: "privacy",

        name: "Respect Privacy",

        immutable: true,

        priority: PrinciplePriority.CRITICAL,

        appliesTo: [

            PrincipleDomain.PRIVACY,

            PrincipleDomain.SYSTEM

        ],

        description:

            "Handle information responsibly and minimize unnecessary exposure."

    },

    {
        id: "simplicity",

        name: "Prefer Simplicity",

        immutable: true,

        priority: PrinciplePriority.NORMAL,

        appliesTo: [

            PrincipleDomain.PLANNING,

            PrincipleDomain.SYSTEM

        ],

        description:

            "Reduce unnecessary complexity whenever practical."

    },

    {
        id: "maintainability",

        name: "Engineer for Longevity",

        immutable: true,

        priority: PrinciplePriority.HIGH,

        appliesTo: [

            PrincipleDomain.SYSTEM,

            PrincipleDomain.EXECUTION

        ],

        description:

            "Favor modular, maintainable, and extensible designs."

    },

    {
        id: "continuous_learning",

        name: "Continuous Improvement",

        immutable: true,

        priority: PrinciplePriority.NORMAL,

        appliesTo: [

            PrincipleDomain.LEARNING,

            PrincipleDomain.SYSTEM

        ],

        description:

            "Improve through observation, measurement, and refinement."

    },

    {
        id: "accountability",

        name: "Accountability",

        immutable: true,

        priority: PrinciplePriority.HIGH,

        appliesTo: [

            PrincipleDomain.GOVERNANCE,

            PrincipleDomain.EXECUTION

        ],

        description:

            "Every significant decision should be explainable and auditable."

    }

]);

/**
 * ============================================================================
 * Operating Principle Manager
 * ============================================================================
 */

export class OperatingPrincipleManager {

    constructor() {

        this.principles = OperatingPrinciples;

    }

    getAll() {

        return [...this.principles];

    }

    get(id) {

        return this.principles.find(

            principle => principle.id === id

        ) || null;

    }

    exists(id) {

        return !!this.get(id);

    }

    byDomain(domain) {

        return this.principles.filter(

            principle =>

                principle.appliesTo.includes(domain)

        );

    }

    byPriority(priority) {

        return this.principles.filter(

            principle =>

                principle.priority >= priority

        );

    }

    immutable() {

        return this.principles.filter(

            principle =>

                principle.immutable

        );

    }

    validate(ids = []) {

        const missing = ids.filter(

            id => !this.exists(id)

        );

        return {

            valid: missing.length === 0,

            missing

        };

    }

    exportState() {

        return {

            total: this.principles.length,

            principles: this.getAll()

        };

    }

    static create() {

        return new OperatingPrincipleManager();

    }

}

/**
 * ============================================================================
 * Default Export
 * ============================================================================
 */

export default OperatingPrincipleManager;