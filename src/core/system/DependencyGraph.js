/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File:
 * DependencyGraph.js
 *
 * Dependency Authority
 *
 * Responsibilities
 * ----------------
 * • Register dependency nodes
 * • Register dependency edges
 * • Validate dependency integrity
 * • Detect dependency cycles
 * • Produce initialization order
 * • Produce shutdown order
 * • Generate diagnostics
 * • Export graph state
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * Graph Node
 * ============================================================================
 */

export class GraphNode {

    constructor({

        id,

        name,

        priority = 100,

        metadata = {},

        tags = []

    }) {

        if (!id) {
            throw new Error("GraphNode requires an id.");
        }

        this.id = id;

        this.name = name || id;

        this.priority = priority;

        this.metadata = {
            ...metadata
        };

        this.tags = [...tags];

        /*
         * Store only node IDs.
         * GraphEdge owns relationship metadata.
         */

        this.dependencies = new Set();

        this.dependents = new Set();

        this.createdAt = Date.now();

    }

}

/**
 * ============================================================================
 * Graph Edge
 * ============================================================================
 */

export class GraphEdge {

    constructor({

        from,

        to,

        required = true,

        startupPhase = "core",

        reason = "",

        metadata = {}

    }) {

        if (!from || !to) {

            throw new Error(

                "GraphEdge requires 'from' and 'to'."

            );

        }

        this.id = `${from}->${to}`;

        this.from = from;

        this.to = to;

        this.required = required;

        this.startupPhase = startupPhase;

        this.reason = reason;

        this.metadata = {

            ...metadata

        };

        this.createdAt = Date.now();

    }

}

/**
 * ============================================================================
 * Dependency Graph
 * ============================================================================
 */

export default class DependencyGraph {

    constructor({

        name = "Kernel Dependency Graph"

    } = {}) {

        this.name = name;

        /*
         * =====================================================
         * Storage
         * =====================================================
         */

        this.nodes = new Map();

        this.edges = new Map();

        /*
         * =====================================================
         * Metrics
         * =====================================================
         */

        this.metrics = {

            nodeRegistrations: 0,

            edgeRegistrations: 0,

            nodeLookups: 0,

            graphValidations: 0,

            topologicalSorts: 0

        };

        /*
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "Dependency graph initialized."

        );

    }

    /**
     * =====================================================
     * Timeline Recording
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
     * Register Node
     * =====================================================
     */

    registerNode({

        id,

        name,

        priority = 100,

        metadata = {},

        tags = []

    }) {

        if (this.nodes.has(id)) {

            throw new Error(

                `Dependency node '${id}' already exists.`

            );

        }

        const node = new GraphNode({

            id,

            name,

            priority,

            metadata,

            tags

        });

        this.nodes.set(

            id,

            node

        );

        this.metrics.nodeRegistrations++;

        this.record(

            "Node registered.",

            {

                id

            }

        );

        return node;

    }

    /**
     * =====================================================
     * Register Dependency
     * =====================================================
     */

    registerDependency({

        service,

        dependency,

        required = true,

        startupPhase = "core",

        reason = "",

        metadata = {}

    }) {

        const serviceNode = this.nodes.get(service);

        const dependencyNode = this.nodes.get(dependency);

        if (!serviceNode) {

            throw new Error(

                `Unknown service '${service}'.`

            );

        }

        if (!dependencyNode) {

            throw new Error(

                `Unknown dependency '${dependency}'.`

            );

        }

        const edge = new GraphEdge({

            from: dependency,

            to: service,

            required,

            startupPhase,

            reason,

            metadata

        });

        this.edges.set(

            edge.id,

            edge

        );

        serviceNode.dependencies.add(

            dependency

        );

        dependencyNode.dependents.add(

            service

        );

        this.metrics.edgeRegistrations++;

        this.record(

            "Dependency registered.",

            {

                service,

                dependency

            }

        );

        return edge;

    }

    /**
     * =====================================================
     * Node Lookup
     * =====================================================
     */

    getNode(id) {

        this.metrics.nodeLookups++;

        return this.nodes.get(id) || null;

    }

    /**
     * =====================================================
     * Edge Lookup
     * =====================================================
     */

    getEdge(

        from,

        to

    ) {

        return this.edges.get(

            `${from}->${to}`

        ) || null;

    }

    /**
     * =====================================================
     * Existence
     * =====================================================
     */

    hasNode(id) {

        return this.nodes.has(id);

    }

    hasEdge(

        from,

        to

    ) {

        return this.edges.has(

            `${from}->${to}`

        );

    }

    /**
     * =====================================================
     * Counts
     * =====================================================
     */

    nodeCount() {

        return this.nodes.size;

    }

    edgeCount() {

        return this.edges.size;

    }

    /**
     * =====================================================
     * Timeline
     * =====================================================
     */

    getTimeline() {

        return [

            ...this.timeline

        ];

    }

        /**
     * =====================================================
     * Remove Dependency
     * =====================================================
     */

    removeDependency({

        service,

        dependency

    }) {

        const edgeId = `${dependency}->${service}`;

        const edge = this.edges.get(edgeId);

        if (!edge) {

            return false;

        }

        const serviceNode = this.nodes.get(service);

        const dependencyNode = this.nodes.get(dependency);

        if (serviceNode) {

            serviceNode.dependencies.delete(dependency);

        }

        if (dependencyNode) {

            dependencyNode.dependents.delete(service);

        }

        this.edges.delete(edgeId);

        this.record(

            "Dependency removed.",

            {

                service,

                dependency

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Remove Node
     * =====================================================
     */

    removeNode(id) {

        const node = this.nodes.get(id);

        if (!node) {

            return false;

        }

        for (const dependency of [...node.dependencies]) {

            this.removeDependency({

                service: id,

                dependency

            });

        }

        for (const dependent of [...node.dependents]) {

            this.removeDependency({

                service: dependent,

                dependency: id

            });

        }

        this.nodes.delete(id);

        this.record(

            "Node removed.",

            {

                id

            }

        );

        return true;

    }

    /**
     * =====================================================
     * Clear Graph
     * =====================================================
     */

    clear() {

        this.nodes.clear();

        this.edges.clear();

        this.timeline = [];

        this.metrics = {

            nodeRegistrations: 0,

            edgeRegistrations: 0,

            nodeLookups: 0,

            graphValidations: 0,

            topologicalSorts: 0

        };

        this.record(

            "Graph cleared."

        );

    }

    /**
     * =====================================================
     * Validate Graph
     * =====================================================
     */

    validate() {

        this.metrics.graphValidations++;

        const errors = [];

        for (const edge of this.edges.values()) {

            if (!this.nodes.has(edge.from)) {

                errors.push({

                    type: "missing_source",

                    edge: edge.id

                });

            }

            if (!this.nodes.has(edge.to)) {

                errors.push({

                    type: "missing_target",

                    edge: edge.id

                });

            }

        }

        return {

            valid: errors.length === 0,

            errors

        };

    }

    /**
     * =====================================================
     * Root Nodes
     * =====================================================
     */

    rootNodes() {

        return [...this.nodes.values()]

            .filter(

                node =>

                    node.dependencies.size === 0

            );

    }

    /**
     * =====================================================
     * Leaf Nodes
     * =====================================================
     */

    leafNodes() {

        return [...this.nodes.values()]

            .filter(

                node =>

                    node.dependents.size === 0

            );

    }

    /**
     * =====================================================
     * Dependencies
     * =====================================================
     */

    dependencies(id) {

        const node = this.getNode(id);

        if (!node) {

            return [];

        }

        return [...node.dependencies];

    }

    /**
     * =====================================================
     * Dependents
     * =====================================================
     */

    dependents(id) {

        const node = this.getNode(id);

        if (!node) {

            return [];

        }

        return [...node.dependents];

    }

    /**
     * =====================================================
     * Export Nodes
     * =====================================================
     */

    exportNodes() {

        return [...this.nodes.values()]

            .map(node => ({

                id: node.id,

                name: node.name,

                priority: node.priority,

                metadata: {

                    ...node.metadata

                },

                tags: [

                    ...node.tags

                ],

                dependencies: [

                    ...node.dependencies

                ],

                dependents: [

                    ...node.dependents

                ]

            }));

    }

    /**
     * =====================================================
     * Export Edges
     * =====================================================
     */

    exportEdges() {

        return [...this.edges.values()]

            .map(edge => ({

                id: edge.id,

                from: edge.from,

                to: edge.to,

                required: edge.required,

                startupPhase: edge.startupPhase,

                reason: edge.reason,

                metadata: {

                    ...edge.metadata

                }

            }));

    }

        /**
     * =====================================================
     * Compute In-Degree Map
     * (Kahn's Algorithm)
     * =====================================================
     */

    computeInDegree() {

        const inDegree = new Map();

        for (const node of this.nodes.values()) {

            inDegree.set(

                node.id,

                node.dependencies.size

            );

        }

        return inDegree;

    }

    /**
     * =====================================================
     * Topological Sort
     * =====================================================
     */

    topologicalSort() {

        this.metrics.topologicalSorts++;

        const inDegree = this.computeInDegree();

        const queue = [];

        const ordered = [];

        /*
         * Root nodes
         */

        for (const node of this.nodes.values()) {

            if (

                inDegree.get(node.id) === 0

            ) {

                queue.push(node);

            }

        }

        /*
         * Stable ordering
         */

        queue.sort(

            (a, b) =>

                a.priority - b.priority

        );

        while (queue.length > 0) {

            const current = queue.shift();

            ordered.push(current);

            for (

                const dependentId of

                current.dependents

            ) {

                const remaining =

                    inDegree.get(dependentId) - 1;

                inDegree.set(

                    dependentId,

                    remaining

                );

                if (

                    remaining === 0

                ) {

                    queue.push(

                        this.getNode(

                            dependentId

                        )

                    );

                    queue.sort(

                        (a, b) =>

                            a.priority -

                            b.priority

                    );

                }

            }

        }

        if (

            ordered.length !==

            this.nodeCount()

        ) {

            throw new Error(

                "Circular dependency detected."

            );

        }

        return ordered;

    }

    /**
     * =====================================================
     * Initialization Order
     * =====================================================
     */

    initializationOrder() {

        return this

            .topologicalSort()

            .map(

                node => node.id

            );

    }

    /**
     * =====================================================
     * Shutdown Order
     * =====================================================
     */

    shutdownOrder() {

        return [

            ...this.initializationOrder()

        ].reverse();

    }

    /**
     * =====================================================
     * Detect Circular Dependencies
     * =====================================================
     */

    hasCircularDependencies() {

        try {

            this.topologicalSort();

            return false;

        }

        catch {

            return true;

        }

    }

    /**
     * =====================================================
     * Execution Plan
     * =====================================================
     */

    executionPlan() {

        return this

            .topologicalSort()

            .map(node => ({

                id:

                    node.id,

                name:

                    node.name,

                priority:

                    node.priority,

                dependencies:

                    [

                        ...node.dependencies

                    ],

                dependents:

                    [

                        ...node.dependents

                    ]

            }));

    }

    /**
     * =====================================================
     * Startup Groups
     *
     * Nodes that can start together.
     * =====================================================
     */

    startupGroups() {

        const groups = [];

        const visited = new Set();

        const inDegree = this.computeInDegree();

        while (

            visited.size < this.nodeCount()

        ) {

            const currentGroup = [];

            for (

                const node of

                this.nodes.values()

            ) {

                if (

                    visited.has(node.id)

                ) {

                    continue;

                }

                if (

                    inDegree.get(node.id) === 0

                ) {

                    currentGroup.push(node);

                }

            }

            if (

                currentGroup.length === 0

            ) {

                break;

            }

            currentGroup.sort(

                (a, b) =>

                    a.priority -

                    b.priority

            );

            groups.push(

                currentGroup.map(

                    node => node.id

                )

            );

            for (

                const node of

                currentGroup

            ) {

                visited.add(

                    node.id

                );

                for (

                    const dependent of

                    node.dependents

                ) {

                    inDegree.set(

                        dependent,

                        inDegree.get(

                            dependent

                        ) - 1

                    );

                }

            }

        }

        return groups;

    }

    /**
     * =====================================================
     * Graph Depth
     *
     * Longest dependency chain.
     * =====================================================
     */

    graphDepth() {

        const memo = new Map();

        const depth = (id) => {

            if (

                memo.has(id)

            ) {

                return memo.get(id);

            }

            const node =

                this.getNode(id);

            if (

                !node ||

                node.dependencies.size === 0

            ) {

                memo.set(id, 1);

                return 1;

            }

            let maxDepth = 0;

            for (

                const dependency of

                node.dependencies

            ) {

                maxDepth = Math.max(

                    maxDepth,

                    depth(dependency)

                );

            }

            memo.set(

                id,

                maxDepth + 1

            );

            return maxDepth + 1;

        };

        let overall = 0;

        for (

            const node of

            this.nodes.values()

        ) {

            overall = Math.max(

                overall,

                depth(node.id)

            );

        }

        return overall;

    }

        /**
     * =====================================================
     * Graph Statistics
     * =====================================================
     */

    statistics() {

        return {

            name: this.name,

            nodes: this.nodeCount(),

            edges: this.edgeCount(),

            roots: this.rootNodes().length,

            leaves: this.leafNodes().length,

            depth: this.graphDepth(),

            circularDependencies:

                this.hasCircularDependencies(),

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Health Check
     * =====================================================
     */

    health() {

        const validation = this.validate();

        return {

            healthy:

                validation.valid &&

                !this.hasCircularDependencies(),

            validation,

            statistics:

                this.statistics()

        };

    }

    /**
     * =====================================================
     * Graph Report
     * =====================================================
     */

    report() {

        return {

            statistics:

                this.statistics(),

            health:

                this.health(),

            executionPlan:

                this.executionPlan(),

            startupGroups:

                this.startupGroups(),

            initializationOrder:

                this.initializationOrder(),

            shutdownOrder:

                this.shutdownOrder()

        };

    }

    /**
     * =====================================================
     * Graph Diagnostics
     * =====================================================
     */

    diagnostics() {

        return {

            graphName:

                this.name,

            nodeCount:

                this.nodeCount(),

            edgeCount:

                this.edgeCount(),

            graphDepth:

                this.graphDepth(),

            roots:

                this.rootNodes()

                    .map(node => node.id),

            leaves:

                this.leafNodes()

                    .map(node => node.id),

            startupGroups:

                this.startupGroups(),

            circularDependencies:

                this.hasCircularDependencies(),

            metrics: {

                ...this.metrics

            }

        };

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            report:

                this.report(),

            diagnostics:

                this.diagnostics(),

            nodes:

                this.exportNodes(),

            edges:

                this.exportEdges(),

            timeline:

                this.getTimeline()

        };

    }

    /**
     * =====================================================
     * Node Diagnostics
     * =====================================================
     */

    nodeDiagnostics(id) {

        const node = this.getNode(id);

        if (!node) {

            return null;

        }

        return {

            id:

                node.id,

            name:

                node.name,

            priority:

                node.priority,

            metadata: {

                ...node.metadata

            },

            tags: [

                ...node.tags

            ],

            dependencies: [

                ...node.dependencies

            ],

            dependents: [

                ...node.dependents

            ]

        };

    }

    /**
     * =====================================================
     * Find Orphan Nodes
     *
     * Nodes with no incoming or outgoing relationships.
     * =====================================================
     */

    orphanNodes() {

        return [

            ...this.nodes.values()

        ]

        .filter(node =>

            node.dependencies.size === 0 &&

            node.dependents.size === 0

        )

        .map(node => node.id);

    }

    /**
     * =====================================================
     * Graph Summary
     * =====================================================
     */

    summary() {

        return {

            graph:

                this.name,

            healthy:

                this.health().healthy,

            nodes:

                this.nodeCount(),

            edges:

                this.edgeCount(),

            roots:

                this.rootNodes().length,

            leaves:

                this.leafNodes().length,

            depth:

                this.graphDepth()

        };

    }

    /**
     * =====================================================
     * Visualization Model
     *
     * UI-ready graph representation.
     * =====================================================
     */

    visualization() {

        return {

            nodes:

                this.exportNodes(),

            edges:

                this.exportEdges()

        };

    }

    /**
     * =====================================================
     * Verify Integrity
     *
     * Standard Kernel Authority API.
     * =====================================================
     */

    verifyIntegrity() {

        const validation = this.validate();

        return {

            healthy:

                validation.valid &&

                !this.hasCircularDependencies(),

            errors:

                validation.errors

        };

    }

        /**
     * =====================================================
     * Export Graph
     * =====================================================
     */

    exportGraph() {

        return {

            name: this.name,

            statistics: this.statistics(),

            nodes: this.exportNodes(),

            edges: this.exportEdges(),

            timeline: this.getTimeline()

        };

    }

    /**
     * =====================================================
     * Snapshot
     *
     * Lightweight runtime snapshot.
     * =====================================================
     */

    snapshot() {

        return {

            timestamp: Date.now(),

            graph: this.name,

            healthy: this.health().healthy,

            nodeCount: this.nodeCount(),

            edgeCount: this.edgeCount(),

            graphDepth: this.graphDepth()

        };

    }

    /**
     * =====================================================
     * Serialize
     * =====================================================
     */

    serialize(pretty = true) {

        return JSON.stringify(

            this.exportGraph(),

            null,

            pretty ? 2 : 0

        );

    }

    /**
     * =====================================================
     * Deserialize
     * =====================================================
     */

    static deserialize(data) {

        const graphData =

            typeof data === "string"

                ? JSON.parse(data)

                : data;

        const graph = new DependencyGraph({

            name:

                graphData.name

        });

        /*
         * Rebuild Nodes
         */

        for (const node of graphData.nodes || []) {

            graph.registerNode({

                id: node.id,

                name: node.name,

                priority: node.priority,

                metadata: node.metadata,

                tags: node.tags

            });

        }

        /*
         * Rebuild Dependencies
         */

        for (const edge of graphData.edges || []) {

            graph.registerDependency({

                service: edge.to,

                dependency: edge.from,

                required: edge.required,

                startupPhase: edge.startupPhase,

                reason: edge.reason,

                metadata: edge.metadata

            });

        }

        /*
         * Restore Timeline
         */

        if (

            Array.isArray(graphData.timeline)

        ) {

            graph.timeline = [

                ...graphData.timeline

            ];

        }

        return graph;

    }

    /**
     * =====================================================
     * Clone
     * =====================================================
     */

    clone() {

        return DependencyGraph.deserialize(

            this.exportGraph()

        );

    }

    /**
     * =====================================================
     * Reset Metrics
     * =====================================================
     */

    resetMetrics() {

        this.metrics = {

            nodeRegistrations: 0,

            edgeRegistrations: 0,

            nodeLookups: 0,

            graphValidations: 0,

            topologicalSorts: 0

        };

        this.record(

            "Metrics reset."

        );

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static create(options = {}) {

        return new DependencyGraph(

            options

        );

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[DependencyGraph "${this.name}" Nodes=${this.nodeCount()} Edges=${this.edgeCount()} Healthy=${this.health().healthy}]`;

    }

}
