/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: MissionGraph.js
 *
 * Description:
 * MissionGraph is AstraMind OS's Directed Acyclic Graph (DAG) engine.
 *
 * It transforms a Mission Plan into an executable dependency graph that
 * the MissionQueue and AstraMind Kernel can schedule.
 *
 * Responsibilities
 * ----------------
 * • Build execution graph
 * • Validate dependency graph
 * • Detect cycles
 * • Discover executable nodes
 * • Unlock downstream nodes
 * • Support parallel execution
 * • Support distributed execution
 * • Support retry planning
 * • Support graph serialization
 *
 * IMPORTANT
 * ---------
 * MissionGraph NEVER executes work.
 *
 * It only models execution.
 *
 * Sprint:
 * Sprint 1
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

import Mission from "./Mission.js";

export const NodeState = Object.freeze({

    PENDING: "pending",

    READY: "ready",

    RUNNING: "running",

    COMPLETED: "completed",

    FAILED: "failed",

    CANCELLED: "cancelled"

});

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

    return JSON.parse(JSON.stringify(value));

}

export default class MissionGraph {

    constructor({

        mission = null,

        diagnostics = null,

        eventBus = null

    } = {}) {

        if (
            mission &&
            !(mission instanceof Mission)
        ) {

            throw new Error(
                "MissionGraph requires Mission instance."
            );

        }

        this.id = uuid();

        this.mission = mission;

        this.eventBus = eventBus;

        this.diagnostics = diagnostics;

        /**
         * =====================================================
         * Graph Storage
         * =====================================================
         */

        this.nodes = new Map();

        this.edges = new Map();

        this.reverseEdges = new Map();

        /**
         * =====================================================
         * Statistics
         * =====================================================
         */

        this.statistics = {

            nodeCount: 0,

            edgeCount: 0,

            completed: 0,

            running: 0,

            failed: 0,

            pending: 0,

            ready: 0

        };

        /**
         * =====================================================
         * Timeline
         * =====================================================
         */

        this.timeline = [];

        this.record(

            "MissionGraph initialized."

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
     * Node Creation
     * =====================================================
     */

    addNode({

        id,

        capability,

        metadata = {}

    }) {

        if (!id) {

            throw new Error(

                "Graph node requires id."

            );

        }

        if (this.nodes.has(id)) {

            return this.nodes.get(id);

        }

        const node = {

            id,

            capability,

            state: NodeState.PENDING,

            metadata: clone(metadata),

            createdAt: Date.now(),

            updatedAt: Date.now()

        };

        this.nodes.set(id, node);

        this.edges.set(id, new Set());

        this.reverseEdges.set(id, new Set());

        this.statistics.nodeCount++;

        this.statistics.pending++;

        this.record(

            "Node added",

            {

                id,

                capability

            }

        );

        return node;

    }

    /**
     * =====================================================
     * Dependency Edge
     * =====================================================
     */

    addEdge(from, to) {

        if (

            !this.nodes.has(from) ||

            !this.nodes.has(to)

        ) {

            throw new Error(

                "Graph edge references missing node."

            );

        }

        this.edges

            .get(from)

            .add(to);

        this.reverseEdges

            .get(to)

            .add(from);

        this.statistics.edgeCount++;

        this.record(

            "Dependency added",

            {

                from,

                to

            }

        );

    }

    /**
     * =====================================================
     * Node Lookup
     * =====================================================
     */

    getNode(id) {

        return this.nodes.get(id);

    }

    getNodes() {

        return [

            ...this.nodes.values()

        ];

    }

    hasNode(id) {

        return this.nodes.has(id);

    }

    /**
     * =====================================================
     * Dependencies
     * =====================================================
     */

    getDependencies(id) {

        return [

            ...(this.reverseEdges.get(id) ||

                [])

        ];

    }

    /**
     * =====================================================
     * Dependents
     * =====================================================
     */

    getDependents(id) {

        return [

            ...(this.edges.get(id) ||

                [])

        ];

    }

        /**
     * =====================================================
     * Build Graph From Mission Plan
     * =====================================================
     */

    build(plan) {

        if (!plan) {

            throw new Error(
                "MissionGraph.build() requires plan."
            );

        }

        this.record(
            "Building execution graph."
        );

        // Create Nodes

        plan.executionGraph.forEach(node => {

            this.addNode({

                id: node.capability,

                capability: node.capability,

                metadata: {

                    step: node.step

                }

            });

        });

        // Create Dependency Edges

        plan.executionGraph.forEach(node => {

            if (node.dependsOn) {

                this.addEdge(

                    node.dependsOn,

                    node.capability

                );

            }

        });

        this.validate();

        this.initializeReadyNodes();

        this.record(
            "Mission graph built successfully."
        );

        return this;

    }

    /**
     * =====================================================
     * Graph Validation
     * =====================================================
     */

    validate() {

        if (this.detectCycles()) {

            throw new Error(

                "MissionGraph contains circular dependency."

            );

        }

        return true;

    }

    /**
     * =====================================================
     * Cycle Detection
     * =====================================================
     */

    detectCycles() {

        const visited = new Set();

        const stack = new Set();

        const visit = (nodeId) => {

            if (stack.has(nodeId)) {

                return true;

            }

            if (visited.has(nodeId)) {

                return false;

            }

            visited.add(nodeId);

            stack.add(nodeId);

            const children = this.getDependents(nodeId);

            for (const child of children) {

                if (visit(child)) {

                    return true;

                }

            }

            stack.delete(nodeId);

            return false;

        };

        for (const node of this.nodes.keys()) {

            if (visit(node)) {

                return true;

            }

        }

        return false;

    }

    /**
     * =====================================================
     * Root Nodes
     * =====================================================
     */

    getRootNodes() {

        return this.getNodes()

            .filter(node =>

                this.getDependencies(node.id)

                    .length === 0

            );

    }

    /**
     * =====================================================
     * Leaf Nodes
     * =====================================================
     */

    getLeafNodes() {

        return this.getNodes()

            .filter(node =>

                this.getDependents(node.id)

                    .length === 0

            );

    }

    /**
     * =====================================================
     * Ready Nodes
     * =====================================================
     */

    initializeReadyNodes() {

        this.getRootNodes()

            .forEach(node => {

                node.state =

                    NodeState.READY;

            });

        this.refreshStatistics();

    }

    getReadyNodes() {

        return this.getNodes()

            .filter(node =>

                node.state ===

                NodeState.READY

            );

    }

    /**
     * =====================================================
     * Executable Nodes
     * =====================================================
     */

    getExecutableNodes() {

        return this.getReadyNodes()

            .filter(node => {

                const deps =

                    this.getDependencies(

                        node.id

                    );

                return deps.every(dep =>

                    this.getNode(dep)

                        ?.state ===

                    NodeState.COMPLETED

                );

            });

    }

    /**
     * =====================================================
     * Parallel Branch Discovery
     * =====================================================
     */

    discoverParallelBranches() {

        const branches = [];

        const ready =

            this.getExecutableNodes();

        if (ready.length > 1) {

            branches.push({

                mode: "parallel",

                nodes:

                    ready.map(

                        n => n.id

                    )

            });

        }

        return branches;

    }

    /**
     * =====================================================
     * Statistics
     * =====================================================
     */

    refreshStatistics() {

        const stats = {

            nodeCount:

                this.nodes.size,

            edgeCount: 0,

            pending: 0,

            ready: 0,

            running: 0,

            completed: 0,

            failed: 0

        };

        this.edges.forEach(edges => {

            stats.edgeCount +=

                edges.size;

        });

        this.nodes.forEach(node => {

            switch (node.state) {

                case NodeState.PENDING:

                    stats.pending++;

                    break;

                case NodeState.READY:

                    stats.ready++;

                    break;

                case NodeState.RUNNING:

                    stats.running++;

                    break;

                case NodeState.COMPLETED:

                    stats.completed++;

                    break;

                case NodeState.FAILED:

                    stats.failed++;

                    break;

            }

        });

        this.statistics = stats;

    }

        /**
     * =====================================================
     * Node State Management
     * =====================================================
     */

    setNodeState(nodeId, state) {

        const node = this.getNode(nodeId);

        if (!node) {

            throw new Error(
                `Unknown node: ${nodeId}`
            );

        }

        node.state = state;

        node.updatedAt = Date.now();

        this.record(
            "Node state changed",
            {
                nodeId,
                state
            }
        );

        this.refreshStatistics();

        return node;

    }

    markRunning(nodeId) {

        return this.setNodeState(
            nodeId,
            NodeState.RUNNING
        );

    }

    markCompleted(nodeId) {

        const node = this.setNodeState(
            nodeId,
            NodeState.COMPLETED
        );

        this.unlockDependents(nodeId);

        return node;

    }

    markFailed(nodeId, error = null) {

        const node = this.setNodeState(
            nodeId,
            NodeState.FAILED
        );

        node.error = error;

        this.record(
            "Node failed",
            {
                nodeId,
                error
            }
        );

        this.propagateFailure(nodeId);

        return node;

    }

    markCancelled(nodeId) {

        return this.setNodeState(
            nodeId,
            NodeState.CANCELLED
        );

    }

    /**
     * =====================================================
     * Dependency Resolution
     * =====================================================
     */

    unlockDependents(nodeId) {

        const dependents =
            this.getDependents(nodeId);

        dependents.forEach(childId => {

            const deps =
                this.getDependencies(childId);

            const ready = deps.every(dep => {

                const dependency =
                    this.getNode(dep);

                return (

                    dependency &&

                    dependency.state ===
                        NodeState.COMPLETED

                );

            });

            if (ready) {

                this.setNodeState(
                    childId,
                    NodeState.READY
                );

                this.record(
                    "Dependency satisfied",
                    {
                        nodeId: childId
                    }
                );

            }

        });

    }

    /**
     * =====================================================
     * Failure Propagation
     * =====================================================
     */

    propagateFailure(nodeId) {

        const dependents =
            this.getDependents(nodeId);

        dependents.forEach(childId => {

            const child =
                this.getNode(childId);

            if (

                child &&

                child.state ===
                    NodeState.PENDING

            ) {

                child.blocked = true;

                child.blockedBy = nodeId;

            }

        });

    }

    /**
     * =====================================================
     * Retry Graph
     * =====================================================
     */

    buildRetryGraph() {

        const retry = [];

        this.getNodes()

            .filter(node =>

                node.state ===
                    NodeState.FAILED

            )

            .forEach(node => {

                retry.push({

                    id: node.id,

                    capability:
                        node.capability,

                    dependencies:

                        this.getDependencies(
                            node.id
                        )

                });

            });

        return retry;

    }

    /**
     * =====================================================
     * Topological Sort
     * =====================================================
     */

    topologicalSort() {

        const visited = new Set();

        const order = [];

        const visit = nodeId => {

            if (visited.has(nodeId)) {

                return;

            }

            visited.add(nodeId);

            this.getDependents(nodeId)

                .forEach(visit);

            order.unshift(nodeId);

        };

        this.getRootNodes()

            .forEach(node =>

                visit(node.id)

            );

        return order;

    }

    /**
     * =====================================================
     * Critical Path
     * =====================================================
     */

    getCriticalPath() {

        return this.topologicalSort();

    }

    /**
     * =====================================================
     * Parallel Execution Groups
     * =====================================================
     */

    getParallelExecutionGroups() {

        const groups = [];

        let ready =
            this.getExecutableNodes();

        while (ready.length) {

            groups.push(

                ready.map(

                    node => node.id

                )

            );

            ready = [];

        }

        return groups;

    }

    /**
     * =====================================================
     * Distributed Metadata
     * =====================================================
     */

    assignExecutionNode(nodeId, workerId) {

        const node =
            this.getNode(nodeId);

        if (!node) return;

        node.worker = workerId;

        node.updatedAt = Date.now();

        this.record(
            "Worker assigned",
            {
                nodeId,
                workerId
            }
        );

    }

    /**
     * =====================================================
     * Queue Snapshot
     * =====================================================
     */

    getQueueSnapshot() {

        return {

            ready:

                this.getExecutableNodes()

                    .map(

                        n => n.id

                    ),

            running:

                this.getNodes()

                    .filter(

                        n =>

                            n.state ===
                            NodeState.RUNNING

                    )

                    .map(

                        n => n.id

                    ),

            completed:

                this.getNodes()

                    .filter(

                        n =>

                            n.state ===
                            NodeState.COMPLETED

                    )

                    .map(

                        n => n.id

                    ),

            failed:

                this.getNodes()

                    .filter(

                        n =>

                            n.state ===
                            NodeState.FAILED

                    )

                    .map(

                        n => n.id

                    )

        };

    }

        /**
     * =====================================================
     * Graph Execution Policies
     * =====================================================
     */

    static ExecutionPolicy = Object.freeze({

        FAIL_FAST: "fail_fast",

        BEST_EFFORT: "best_effort",

        CONTINUE_ON_FAILURE: "continue_on_failure",

        RETRY_FAILED_BRANCHES: "retry_failed_branches"

    });

    setExecutionPolicy(

        policy = MissionGraph.ExecutionPolicy.FAIL_FAST

    ) {

        this.executionPolicy = policy;

        this.record(

            "Execution policy updated",

            { policy }

        );

        return this;

    }

    getExecutionPolicy() {

        return this.executionPolicy ||

            MissionGraph.ExecutionPolicy.FAIL_FAST;

    }

    /**
     * =====================================================
     * Branch Discovery
     * =====================================================
     */

    getExecutionBranches() {

        const roots = this.getRootNodes();

        return roots.map(root =>

            this.walkBranch(root.id)

        );

    }

    walkBranch(startNode) {

        const branch = [];

        const visit = nodeId => {

            branch.push(nodeId);

            this.getDependents(nodeId)

                .forEach(visit);

        };

        visit(startNode);

        return branch;

    }

    /**
     * =====================================================
     * Branch Completion
     * =====================================================
     */

    isBranchComplete(startNode) {

        return this.walkBranch(startNode)

            .every(id =>

                this.getNode(id)?.state ===

                NodeState.COMPLETED

            );

    }

    /**
     * =====================================================
     * Mission Completion
     * =====================================================
     */

    isComplete() {

        return this.getNodes()

            .every(node =>

                node.state ===

                NodeState.COMPLETED

            );

    }

    hasFailures() {

        return this.getNodes()

            .some(node =>

                node.state ===

                NodeState.FAILED

            );

    }

    /**
     * =====================================================
     * Execution Readiness
     * =====================================================
     */

    canExecute() {

        if (

            this.detectCycles()

        ) {

            return false;

        }

        return this.getExecutableNodes()

            .length > 0;

    }

    /**
     * =====================================================
     * Graph Metrics
     * =====================================================
     */

    getMetrics() {

        return {

            ...this.statistics,

            roots:

                this.getRootNodes().length,

            leaves:

                this.getLeafNodes().length,

            executable:

                this.getExecutableNodes().length,

            branches:

                this.getExecutionBranches().length,

            complete:

                this.isComplete(),

            failed:

                this.hasFailures()

        };

    }

    /**
     * =====================================================
     * Graph Health
     * =====================================================
     */

    health() {

        const issues = [];

        if (this.detectCycles()) {

            issues.push(

                "Circular dependency detected."

            );

        }

        if (

            this.nodes.size === 0

        ) {

            issues.push(

                "Graph contains no nodes."

            );

        }

        return {

            healthy:

                issues.length === 0,

            issues,

            metrics:

                this.getMetrics()

        };

    }

    /**
     * =====================================================
     * Visualization Metadata
     * =====================================================
     */

    exportVisualization() {

        return {

            nodes:

                this.getNodes().map(node => ({

                    id: node.id,

                    label:

                        node.capability,

                    state:

                        node.state

                })),

            edges:

                [...this.edges.entries()]

                    .flatMap(

                        ([from, children]) =>

                            [...children].map(to => ({

                                from,

                                to

                            }))

                    )

        };

    }

    /**
     * =====================================================
     * Serialization
     * =====================================================
     */

    toJSON() {

        return {

            id: this.id,

            missionId:

                this.mission?.id,

            nodes:

                this.getNodes(),

            edges:

                [...this.edges.entries()].map(

                    ([id, set]) => ({

                        id,

                        children:

                            [...set]

                    })

                ),

            statistics:

                this.statistics,

            timeline:

                this.timeline

        };

    }

    serialize() {

        return JSON.stringify(

            this.toJSON(),

            null,

            2

        );

    }

    /**
     * =====================================================
     * Snapshot
     * =====================================================
     */

    snapshot() {

        return JSON.parse(

            this.serialize()

        );

    }

    /**
     * =====================================================
     * Debug
     * =====================================================
     */

    debug() {

        return {

            graphId:

                this.id,

            metrics:

                this.getMetrics(),

            health:

                this.health(),

            timeline:

                [...this.timeline]

        };

    }

        /**
     * =====================================================
     * Graph Reset
     * =====================================================
     */

    reset() {

        this.nodes.forEach(node => {

            node.state = NodeState.PENDING;

            node.error = null;

            node.worker = null;

            node.updatedAt = Date.now();

        });

        this.timeline = [];

        this.initializeReadyNodes();

        this.record(
            "MissionGraph reset."
        );

        return this;

    }

    /**
     * =====================================================
     * Graph Clone
     * =====================================================
     */

    clone() {

        const graph = new MissionGraph({

            mission: this.mission,

            diagnostics: this.diagnostics,

            eventBus: this.eventBus

        });

        graph.executionPolicy = this.executionPolicy;

        this.getNodes().forEach(node => {

            graph.addNode({

                id: node.id,

                capability: node.capability,

                metadata: clone(node.metadata)

            });

            Object.assign(

                graph.getNode(node.id),

                clone(node)

            );

        });

        this.edges.forEach((children, from) => {

            children.forEach(to => {

                graph.addEdge(from, to);

            });

        });

        graph.timeline = clone(this.timeline);

        graph.refreshStatistics();

        return graph;

    }

    /**
     * =====================================================
     * Graph Restore
     * =====================================================
     */

    static deserialize(data) {

        const json =

            typeof data === "string"

                ? JSON.parse(data)

                : data;

        const graph = new MissionGraph();

        graph.id = json.id;

        json.nodes.forEach(node => {

            graph.addNode({

                id: node.id,

                capability: node.capability,

                metadata: node.metadata

            });

            Object.assign(

                graph.getNode(node.id),

                clone(node)

            );

        });

        json.edges.forEach(edge => {

            edge.children.forEach(child => {

                graph.addEdge(

                    edge.id,

                    child

                );

            });

        });

        graph.statistics =

            clone(json.statistics);

        graph.timeline =

            clone(json.timeline);

        return graph;

    }

    /**
     * =====================================================
     * Event Publishing
     * =====================================================
     */

    publish(event, payload = {}) {

        if (

            !this.eventBus ||

            typeof this.eventBus.publish !==
                "function"

        ) {

            return;

        }

        this.eventBus.publish(

            event,

            {

                graphId: this.id,

                missionId:

                    this.mission?.id,

                ...payload

            }

        );

    }

    /**
     * =====================================================
     * Diagnostics
     * =====================================================
     */

    log(level, message, metadata = {}) {

        if (

            !this.diagnostics ||

            typeof this.diagnostics.record !==
                "function"

        ) {

            return;

        }

        this.diagnostics.record(

            level,

            "MissionGraph",

            message,

            {

                graphId: this.id,

                missionId:

                    this.mission?.id,

                ...metadata

            }

        );

    }

    /**
     * =====================================================
     * Enterprise Validation
     * =====================================================
     */

    verify() {

        const health = this.health();

        if (!health.healthy) {

            throw new Error(

                health.issues.join("\n")

            );

        }

        return true;

    }

    /**
     * =====================================================
     * Factory
     * =====================================================
     */

    static fromMissionPlan(

        mission,

        plan,

        options = {}

    ) {

        const graph =

            new MissionGraph({

                mission,

                ...options

            });

        graph.build(plan);

        return graph;

    }

    /**
     * =====================================================
     * Information
     * =====================================================
     */

    getInfo() {

        return {

            name: "MissionGraph",

            version: "3.0.0-alpha.1",

            graphId: this.id,

            missionId:

                this.mission?.id,

            policy:

                this.getExecutionPolicy(),

            metrics:

                this.getMetrics()

        };

    }

    /**
     * =====================================================
     * String Representation
     * =====================================================
     */

    toString() {

        return `[MissionGraph ${this.id}] Nodes=${this.statistics.nodeCount} Edges=${this.statistics.edgeCount}`;

    }

}