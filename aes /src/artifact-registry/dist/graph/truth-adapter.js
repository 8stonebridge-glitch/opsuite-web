"use strict";
/**
 * AES Graph Layer — Truth Adapter
 *
 * Defines the read-only graph access seam used by the snapshot and freshness
 * services. The initial in-memory adapter keeps this layer deterministic and
 * testable without requiring a live Neo4j instance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTruthAdapter = void 0;
function featureViewKey(featureId, queryProfile) {
    return queryProfile ? `${featureId}::${queryProfile}` : featureId;
}
function cloneValue(value) {
    if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
/**
 * Read-only in-memory adapter for deterministic tests and local orchestration
 * development. Callers can mutate graph contents only through the explicit
 * helper methods below.
 */
class InMemoryTruthAdapter {
    constructor(nodes = [], edges = [], featureViews = {}) {
        this.nodeMap = new Map();
        this.edgeMap = new Map();
        this.featureViews = new Map();
        for (const node of nodes) {
            this.upsertNode(node);
        }
        for (const edge of edges) {
            this.upsertEdge(edge);
        }
        for (const [key, view] of Object.entries(featureViews)) {
            this.featureViews.set(key, cloneValue(view));
        }
    }
    async fetchFeatureSubgraph(query) {
        const exactView = this.featureViews.get(featureViewKey(query.feature_id, query.query_profile));
        const fallbackView = this.featureViews.get(query.feature_id);
        const view = exactView ?? fallbackView;
        if (!view) {
            throw new Error(`No feature view configured for ${featureViewKey(query.feature_id, query.query_profile)}`);
        }
        return this.materializeSubgraph(view.node_ids, view.edge_ids, view.critical_domain_nodes, true);
    }
    async fetchSubgraphByIds(nodeIds, edgeIds, criticalDomainNodeIds = []) {
        return this.materializeSubgraph(nodeIds, edgeIds, criticalDomainNodeIds, false);
    }
    async fetchCanonicalConstraints(_featureId) {
        const rules = [];
        const bundles = [];
        const presets = [];
        for (const node of this.nodeMap.values()) {
            if (node.properties["authority_tier"] !== "CANONICAL")
                continue;
            if (node.label === "GovernanceRule") {
                rules.push({
                    node_id: node.node_id,
                    name: String(node.properties["name"] ?? ""),
                    severity: String(node.properties["severity"] ?? ""),
                    enforced_by: String(node.properties["enforced_by"] ?? ""),
                    authority_tier: "CANONICAL",
                });
            }
            else if (node.label === "ValidatorBundle" &&
                node.properties["enforceable"] === true) {
                bundles.push({
                    node_id: node.node_id,
                    bundle_name: String(node.properties["bundle_name"] ?? ""),
                    blocking_validators: Array.isArray(node.properties["blocking_validators"])
                        ? node.properties["blocking_validators"]
                        : [],
                    authority_tier: "CANONICAL",
                });
            }
            else if (node.label === "BridgePreset" &&
                node.properties["enforceable"] === true) {
                presets.push({
                    node_id: node.node_id,
                    preset_name: String(node.properties["preset_name"] ?? ""),
                    required_outcomes: Array.isArray(node.properties["required_outcomes"])
                        ? node.properties["required_outcomes"]
                        : [],
                    authority_tier: "CANONICAL",
                });
            }
        }
        return { governance_rules: rules, validator_bundles: bundles, bridge_presets: presets };
    }
    upsertNode(node) {
        this.nodeMap.set(node.node_id, cloneValue(node));
    }
    upsertEdge(edge) {
        this.edgeMap.set(edge.edge_id, cloneValue(edge));
    }
    removeNode(nodeId) {
        this.nodeMap.delete(nodeId);
    }
    removeEdge(edgeId) {
        this.edgeMap.delete(edgeId);
    }
    setFeatureView(featureId, view, queryProfile) {
        this.featureViews.set(featureViewKey(featureId, queryProfile), cloneValue(view));
    }
    materializeSubgraph(nodeIds, edgeIds, criticalDomainNodeIds, strict) {
        const referenced_nodes = nodeIds.flatMap((nodeId) => {
            const node = this.nodeMap.get(nodeId);
            if (!node) {
                if (strict) {
                    throw new Error(`Unknown graph node: ${nodeId}`);
                }
                return [];
            }
            return [cloneValue(node)];
        });
        const referenced_edges = edgeIds.flatMap((edgeId) => {
            const edge = this.edgeMap.get(edgeId);
            if (!edge) {
                if (strict) {
                    throw new Error(`Unknown graph edge: ${edgeId}`);
                }
                return [];
            }
            return [cloneValue(edge)];
        });
        return {
            referenced_nodes,
            referenced_edges,
            critical_domain_nodes: criticalDomainNodeIds.filter((nodeId) => referenced_nodes.some((node) => node.node_id === nodeId)),
        };
    }
}
exports.InMemoryTruthAdapter = InMemoryTruthAdapter;
//# sourceMappingURL=truth-adapter.js.map