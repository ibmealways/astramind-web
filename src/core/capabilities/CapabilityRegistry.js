/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: CapabilityRegistry.js
 *
 * Description:
 * Enterprise Capability Registry
 *
 * The Capability Registry is the authoritative catalog of every capability
 * available inside AstraMind OS.
 *
 * Responsibilities
 * ----------------
 * • Register capabilities
 * • Validate capabilities
 * • Version management
 * • Dependency management
 * • Discovery
 * • Health reporting
 * • Metadata management
 * • Lifecycle management
 * • Enterprise auditing
 *
 * IMPORTANT
 * ---------
 * CapabilityRegistry NEVER executes capabilities.
 *
 * CapabilityRegistry NEVER routes capabilities.
 *
 * It is the source of truth.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

function uuid() {

    if (

        typeof crypto !== "undefined" &&

        crypto.randomUUID

    ) {

        return crypto.randomUUID();

    }

    return (

        Date.now().toString(36) +

        Math.random().toString(36).substring(2)

    );

}

function clone(value) {

    return JSON.parse(

        JSON.stringify(value)

    );

}

export const CapabilityState = Object.freeze({

    REGISTERED: "registered",

    ENABLED: "enabled",

    DISABLED: "disabled",

    DEPRECATED: "deprecated"

});

export default class CapabilityRegistry {

    constructor({

        diagnostics = null,

        eventBus = null

    } = {}) {

        this.id = uuid();

        this.diagnostics = diagnostics;

        this.eventBus = eventBus;

        /**
         * =====================================================
         * Registry
         * =====================================================
         */

        this.capabilities = new Map();

        /**
         * =====================================================
         * Categories
         * =====================================================
         */

        this.categories = new Map();

        /**
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            registered: 0,

            enabled: 0,

            disabled: 0,

            deprecated: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "CapabilityRegistry initialized."

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
     * Register Capability
     * =====================================================
     */

    register({

        id,

        name,

        category,

        version = "1.0.0",

        description = "",

        dependencies = [],

        handler = null,

        metadata = {}

    }) {

        if (!id) {

            throw new Error(

                "Capability id required."

            );

        }

        if (this.capabilities.has(id)) {

            throw new Error(

                `Capability '${id}' already registered.`

            );

        }

        const capability = {

            id,

            name,

            category,

            version,

            description,

            dependencies:

                clone(dependencies),

            handler,

            metadata:

                clone(metadata),

            state:

                CapabilityState.REGISTERED,

            registeredAt:

                Date.now()

        };

        this.capabilities.set(

            id,

            capability

        );

        if (

            !this.categories.has(category)

        ) {

            this.categories.set(

                category,

                new Set()

            );

        }

        this.categories

            .get(category)

            .add(id);

        this.metrics.registered++;

        this.record(

            "Capability registered.",

            {

                id,

                category

            }

        );

        this.publish(

            "capability.registered",

            {

                capability: id

            }

        );

        return capability;

    }

    /**
     * =====================================================
     * Lookup
     * =====================================================
     */

    get(id) {

        return this.capabilities.get(id);

    }

    has(id) {

        return this.capabilities.has(id);

    }

    getAll() {

        return [

            ...this.capabilities.values()

        ];

    }

    getCategories() {

        return [

            ...this.categories.keys()

        ];

    }

    getCapabilitiesByCategory(category) {

        const ids =

            this.categories.get(category);

        if (!ids) {

            return [];

        }

        return [...ids]

            .map(id =>

                this.get(id)

            );

    }

        /**
     * =====================================================
     * Validation
     * =====================================================
     */

    validate(capabilityId) {

        const capability = this.get(capabilityId);

        if (!capability) {

            throw new Error(

                `Capability '${capabilityId}' not found.`

            );

        }

        if (

            capability.state ===

            CapabilityState.DEPRECATED

        ) {

            throw new Error(

                `Capability '${capabilityId}' is deprecated.`

            );

        }

        if (

            capability.state ===

            CapabilityState.DISABLED

        ) {

            throw new Error(

                `Capability '${capabilityId}' is disabled.`

            );

        }

        this.validateDependencies(

            capability

        );

        return true;

    }

    /**
     * =====================================================
     * Dependency Validation
     * =====================================================
     */

    validateDependencies(

        capability

    ) {

        capability.dependencies.forEach(

            dependency => {

                if (

                    !this.has(

                        dependency

                    )

                ) {

                    throw new Error(

                        `Missing dependency '${dependency}' for '${capability.id}'.`

                    );

                }

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Enable Capability
     * =====================================================
     */

    enable(

        capabilityId

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        capability.state =

            CapabilityState.ENABLED;

        this.metrics.enabled++;

        this.record(

            "Capability enabled.",

            {

                capability:

                    capabilityId

            }

        );

        this.publish(

            "capability.enabled",

            {

                capability:

                    capabilityId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Disable Capability
     * =====================================================
     */

    disable(

        capabilityId

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        capability.state =

            CapabilityState.DISABLED;

        this.metrics.disabled++;

        this.record(

            "Capability disabled.",

            {

                capability:

                    capabilityId

            }

        );

        this.publish(

            "capability.disabled",

            {

                capability:

                    capabilityId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Deprecate Capability
     * =====================================================
     */

    deprecate(

        capabilityId

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        capability.state =

            CapabilityState.DEPRECATED;

        capability.deprecatedAt =

            Date.now();

        this.metrics.deprecated++;

        this.record(

            "Capability deprecated.",

            {

                capability:

                    capabilityId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Capability Search
     * =====================================================
     */

    search({

        category = null,

        state = null,

        version = null,

        keyword = null

    } = {}) {

        return this.getAll()

            .filter(capability => {

                if (

                    category &&

                    capability.category !== category

                ) {

                    return false;

                }

                if (

                    state &&

                    capability.state !== state

                ) {

                    return false;

                }

                if (

                    version &&

                    capability.version !== version

                ) {

                    return false;

                }

                if (

                    keyword

                ) {

                    const text = [

                        capability.name,

                        capability.description,

                        ...(capability.metadata.tags || [])

                    ]

                    .join(" ")

                    .toLowerCase();

                    if (

                        !text.includes(

                            keyword.toLowerCase()

                        )

                    ) {

                        return false;

                    }

                }

                return true;

            });

    }

    /**
     * =====================================================
     * Discovery
     * =====================================================
     */

    discover() {

        return this.getAll()

            .filter(capability =>

                capability.state ===

                CapabilityState.ENABLED

            );

    }

    /**
     * =====================================================
     * Registry Health
     * =====================================================
     */

    getHealth() {

        return {

            total:

                this.capabilities.size,

            enabled:

                this.search({

                    state:

                        CapabilityState.ENABLED

                }).length,

            disabled:

                this.search({

                    state:

                        CapabilityState.DISABLED

                }).length,

            deprecated:

                this.search({

                    state:

                        CapabilityState.DEPRECATED

                }).length

        };

    }

    /**
     * =====================================================
     * Registry Statistics
     * =====================================================
     */

    getStatistics() {

        return {

            metrics:

                clone(this.metrics),

            categories:

                this.getCategories()

                    .length,

            registered:

                this.capabilities.size,

            enabled:

                this.discover()

                    .length

        };

    }   
    
    /**
     * =====================================================
     * Execution Requirements
     * =====================================================
     */

    setExecutionRequirements(

        capabilityId,

        {

            permissions = [],

            providers = [],

            models = [],

            hardware = [],

            subscriptions = [],

            internetRequired = false,

            autonomousAllowed = true,

            enterpriseOnly = false

        } = {}

    ) {

        const capability =

            this.get(capabilityId);

        if (!capability) {

            return false;

        }

        capability.requirements = {

            permissions,

            providers,

            models,

            hardware,

            subscriptions,

            internetRequired,

            autonomousAllowed,

            enterpriseOnly

        };

        this.record(

            "Execution requirements updated.",

            {

                capability: capabilityId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Get Execution Requirements
     * =====================================================
     */

    getExecutionRequirements(

        capabilityId

    ) {

        return this.get(

            capabilityId

        )?.requirements ||

        {};

    }

    /**
     * =====================================================
     * Provider Support
     * =====================================================
     */

    supportsProvider(

        capabilityId,

        provider

    ) {

        const requirements =

            this.getExecutionRequirements(

                capabilityId

            );

        if (

            !requirements.providers ||

            requirements.providers.length === 0

        ) {

            return true;

        }

        return requirements.providers.includes(

            provider

        );

    }

    /**
     * =====================================================
     * Model Support
     * =====================================================
     */

    supportsModel(

        capabilityId,

        model

    ) {

        const requirements =

            this.getExecutionRequirements(

                capabilityId

            );

        if (

            !requirements.models ||

            requirements.models.length === 0

        ) {

            return true;

        }

        return requirements.models.includes(

            model

        );

    }

    /**
     * =====================================================
     * Hardware Validation
     * =====================================================
     */

    supportsHardware(

        capabilityId,

        hardware = []

    ) {

        const requirements =

            this.getExecutionRequirements(

                capabilityId

            );

        if (

            !requirements.hardware ||

            requirements.hardware.length === 0

        ) {

            return true;

        }

        return requirements.hardware.every(

            requirement =>

                hardware.includes(

                    requirement

                )

        );

    }

    /**
     * =====================================================
     * Subscription Validation
     * =====================================================
     */

    supportsSubscription(

        capabilityId,

        subscription

    ) {

        const requirements =

            this.getExecutionRequirements(

                capabilityId

            );

        if (

            !requirements.subscriptions ||

            requirements.subscriptions.length === 0

        ) {

            return true;

        }

        return requirements.subscriptions.includes(

            subscription

        );

    }

    /**
     * =====================================================
     * Permission Validation
     * =====================================================
     */

    supportsPermissions(

        capabilityId,

        permissions = []

    ) {

        const requirements =

            this.getExecutionRequirements(

                capabilityId

            );

        if (

            !requirements.permissions ||

            requirements.permissions.length === 0

        ) {

            return true;

        }

        return requirements.permissions.every(

            permission =>

                permissions.includes(

                    permission

                )

        );

    }

    /**
     * =====================================================
     * Autonomous Execution
     * =====================================================
     */

    supportsAutonomousExecution(

        capabilityId

    ) {

        return this.getExecutionRequirements(

            capabilityId

        ).autonomousAllowed !== false;

    }

    /**
     * =====================================================
     * Enterprise Validation
     * =====================================================
     */

    requiresEnterprise(

        capabilityId

    ) {

        return !!this.getExecutionRequirements(

            capabilityId

        ).enterpriseOnly;

    }

    /**
     * =====================================================
     * Internet Requirement
     * =====================================================
     */

    requiresInternet(

        capabilityId

    ) {

        return !!this.getExecutionRequirements(

            capabilityId

        ).internetRequired;

    }

    /**
     * =====================================================
     * Execution Contract
     * =====================================================
     */

    getExecutionContract(

        capabilityId

    ) {

        const capability =

            this.get(capabilityId);

        if (!capability) {

            return null;

        }

        return {

            id:

                capability.id,

            version:

                capability.version,

            state:

                capability.state,

            dependencies:

                clone(

                    capability.dependencies

                ),

            requirements:

                clone(

                    capability.requirements ||

                    {}

                )

        };

    }

    /**
     * =====================================================
     * Capability Readiness
     * =====================================================
     */

    isExecutionReady(

        capabilityId

    ) {

        try {

            this.validate(

                capabilityId

            );

            return true;

        }

        catch {

            return false;

        }

    }

        /**
     * =====================================================
     * Capability Installation
     * =====================================================
     */

    install(manifest = {}) {

        if (!manifest.id) {

            throw new Error(

                "Capability manifest requires id."

            );

        }

        this.register({

            id: manifest.id,

            name: manifest.name,

            category: manifest.category,

            version: manifest.version,

            description: manifest.description,

            dependencies: manifest.dependencies,

            handler: manifest.handler,

            metadata: manifest.metadata

        });

        this.setExecutionRequirements(

            manifest.id,

            manifest.requirements || {}

        );

        this.enable(

            manifest.id

        );

        this.record(

            "Capability installed.",

            {

                capability: manifest.id

            }

        );

        return this.get(

            manifest.id

        );

    }

    /**
     * =====================================================
     * Capability Removal
     * =====================================================
     */

    uninstall(capabilityId) {

        const capability =

            this.get(capabilityId);

        if (!capability) {

            return false;

        }

        this.capabilities.delete(

            capabilityId

        );

        if (

            this.categories.has(

                capability.category

            )

        ) {

            this.categories

                .get(

                    capability.category

                )

                .delete(

                    capabilityId

                );

        }

        this.record(

            "Capability uninstalled.",

            {

                capability:

                    capabilityId

            }

        );

        this.publish(

            "capability.uninstalled",

            {

                capability:

                    capabilityId

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Capability Upgrade
     * =====================================================
     */

    upgrade(

        capabilityId,

        version,

        metadata = {}

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        capability.version =

            version;

        capability.metadata = {

            ...capability.metadata,

            ...metadata

        };

        capability.updatedAt =

            Date.now();

        this.record(

            "Capability upgraded.",

            {

                capability:

                    capabilityId,

                version

            }

        );

        return capability;

    }

    /**
     * =====================================================
     * Dependency Resolution
     * =====================================================
     */

    resolveDependencies(

        capabilityId,

        resolved = new Set(),

        unresolved = new Set()

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return resolved;

        }

        unresolved.add(

            capabilityId

        );

        for (

            const dependency of capability.dependencies

        ) {

            if (

                !resolved.has(

                    dependency

                )

            ) {

                if (

                    unresolved.has(

                        dependency

                    )

                ) {

                    throw new Error(

                        `Circular capability dependency detected: ${dependency}`

                    );

                }

                this.resolveDependencies(

                    dependency,

                    resolved,

                    unresolved

                );

            }

        }

        unresolved.delete(

            capabilityId

        );

        resolved.add(

            capabilityId

        );

        return resolved;

    }

    /**
     * =====================================================
     * Capability Aliases
     * =====================================================
     */

    registerAlias(

        capabilityId,

        alias

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        if (

            !capability.aliases

        ) {

            capability.aliases = [];

        }

        if (

            !capability.aliases.includes(

                alias

            )

        ) {

            capability.aliases.push(

                alias

            );

        }

        return true;

    }

    findByAlias(

        alias

    ) {

        return this.getAll().find(

            capability =>

                capability.aliases?.includes(

                    alias

                )

        ) || null;

    }

    /**
     * =====================================================
     * Capability Tags
     * =====================================================
     */

    addTags(

        capabilityId,

        tags = []

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return false;

        }

        capability.metadata.tags =

            [

                ...(capability.metadata.tags || []),

                ...tags

            ];

        capability.metadata.tags =

            [

                ...new Set(

                    capability.metadata.tags

                )

            ];

        return true;

    }

    /**
     * =====================================================
     * Capability Usage Metrics
     * =====================================================
     */

    incrementUsage(

        capabilityId

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return;

        }

        capability.metrics ??= {

            executions: 0,

            failures: 0,

            totalExecutionMs: 0

        };

        capability.metrics.executions++;

    }

    recordExecution(

        capabilityId,

        duration,

        success = true

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return;

        }

        capability.metrics ??= {

            executions: 0,

            failures: 0,

            totalExecutionMs: 0

        };

        capability.metrics.executions++;

        capability.metrics.totalExecutionMs +=

            duration;

        if (!success) {

            capability.metrics.failures++;

        }

        capability.metrics.averageExecutionMs =

            Math.round(

                capability.metrics.totalExecutionMs /

                capability.metrics.executions

            );

    }

    /**
     * =====================================================
     * Capability Manifest
     * =====================================================
     */

    exportManifest(

        capabilityId

    ) {

        const capability =

            this.get(

                capabilityId

            );

        if (!capability) {

            return null;

        }

        return clone(

            capability

        );

    }

    /**
     * =====================================================
     * Registry Manifest
     * =====================================================
     */

    exportRegistryManifest() {

        return this.getAll()

            .map(capability =>

                this.exportManifest(

                    capability.id

                )

            );

    }

        /**
     * =====================================================
     * Registry Integrity Verification
     * =====================================================
     */

    verifyIntegrity() {

        const issues = [];

        this.getAll().forEach(capability => {

            try {

                this.validate(capability.id);

            }

            catch (error) {

                issues.push({

                    capability: capability.id,

                    issue: error.message

                });

            }

        });

        return {

            healthy: issues.length === 0,

            issues

        };

    }

    /**
     * =====================================================
     * Dependency Health Scan
     * =====================================================
     */

    scanDependencies() {

        const report = [];

        this.getAll().forEach(capability => {

            capability.dependencies.forEach(dependency => {

                report.push({

                    capability: capability.id,

                    dependency,

                    installed: this.has(dependency)

                });

            });

        });

        return report;

    }

    /**
     * =====================================================
     * Compatibility Matrix
     * =====================================================
     */

    generateCompatibilityMatrix() {

        const matrix = {};

        this.getAll().forEach(capability => {

            matrix[capability.id] = {

                version:

                    capability.version,

                dependencies:

                    clone(capability.dependencies),

                requirements:

                    clone(capability.requirements || {}),

                compatible:

                    this.isExecutionReady(

                        capability.id

                    )

            };

        });

        return matrix;

    }

    /**
     * =====================================================
     * Registry Fingerprint
     *
     * Used for synchronization between AstraMind nodes.
     * =====================================================
     */

    getFingerprint() {

        return {

            registryId: this.id,

            capabilityCount:

                this.capabilities.size,

            generatedAt:

                Date.now(),

            capabilities:

                this.getAll()

                    .map(capability => ({

                        id:

                            capability.id,

                        version:

                            capability.version,

                        state:

                            capability.state

                    }))

        };

    }

    /**
     * =====================================================
     * Dependency Graph Export
     * =====================================================
     */

    exportDependencyGraph() {

        return this.getAll().map(capability => ({

            id:

                capability.id,

            dependsOn:

                clone(capability.dependencies)

        }));

    }

    /**
     * =====================================================
     * Registry Snapshot
     * =====================================================
     */

    snapshot() {

        return {

            id:

                this.id,

            timestamp:

                Date.now(),

            metrics:

                clone(this.metrics),

            capabilities:

                this.exportRegistryManifest()

        };

    }

    /**
     * =====================================================
     * Restore Snapshot
     * =====================================================
     */

    restore(snapshot) {

        this.capabilities.clear();

        this.categories.clear();

        this.metrics = clone(snapshot.metrics);

        snapshot.capabilities.forEach(capability => {

            this.capabilities.set(

                capability.id,

                clone(capability)

            );

            if (

                !this.categories.has(

                    capability.category

                )

            ) {

                this.categories.set(

                    capability.category,

                    new Set()

                );

            }

            this.categories

                .get(

                    capability.category

                )

                .add(

                    capability.id

                );

        });

        this.record(

            "Registry restored from snapshot."

        );

        return this;

    }

    /**
     * =====================================================
     * Registry Health
     * =====================================================
     */

    health() {

        const integrity =

            this.verifyIntegrity();

        return {

            healthy:

                integrity.healthy,

            integrity,

            statistics:

                this.getStatistics(),

            categories:

                this.getCategories(),

            fingerprint:

                this.getFingerprint()

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

            "CapabilityRegistry",

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
     * Serialization
     * =====================================================
     */

    exportState() {

        return {

            id:

                this.id,

            metrics:

                clone(this.metrics),

            timeline:

                clone(this.timeline),

            registry:

                this.exportRegistryManifest()

        };

    }

    serialize() {

        return JSON.stringify(

            this.exportState(),

            null,

            2

        );

    }

    static deserialize(

        json,

        options = {}

    ) {

        const data =

            typeof json === "string"

                ? JSON.parse(json)

                : json;

        const registry =

            new CapabilityRegistry(options);

        registry.id = data.id;

        registry.metrics = clone(data.metrics);

        registry.timeline = clone(data.timeline);

        data.registry.forEach(capability => {

            registry.capabilities.set(

                capability.id,

                capability

            );

            if (

                !registry.categories.has(

                    capability.category

                )

            ) {

                registry.categories.set(

                    capability.category,

                    new Set()

                );

            }

            registry.categories

                .get(

                    capability.category

                )

                .add(

                    capability.id

                );

        });

        return registry;

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name:

                "CapabilityRegistry",

            version:

                "3.0.0-alpha.1",

            registryId:

                this.id,

            statistics:

                this.getStatistics()

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

            timeline:

                clone(this.timeline)

        };

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(options = {}) {

        return new CapabilityRegistry(options);

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[CapabilityRegistry Capabilities=${this.capabilities.size} Categories=${this.categories.size}]`;

    }

}