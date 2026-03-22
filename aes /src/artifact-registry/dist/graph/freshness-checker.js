"use strict";
/**
 * AES Graph Layer — Freshness Checker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreshnessChecker = void 0;
const registry_1 = require("../registry");
const hash_1 = require("./hash");
function buildStalenessReason(changedNodeIds, changedEdgeIds) {
    const details = [];
    if (changedNodeIds.length > 0) {
        details.push(`nodes changed: ${changedNodeIds.join(", ")}`);
    }
    if (changedEdgeIds.length > 0) {
        details.push(`edges changed: ${changedEdgeIds.join(", ")}`);
    }
    if (details.length === 0) {
        return "Graph truth hash changed";
    }
    return details.join("; ");
}
class FreshnessChecker {
    constructor(registry, truthAdapter, now = () => new Date()) {
        this.registry = registry;
        this.truthAdapter = truthAdapter;
        this.now = now;
    }
    async checkBridge(bridge, artifactRefs = []) {
        const snapshotRecord = await this.registry.read("graph_snapshot", bridge.graph_snapshot_id);
        const snapshot = snapshotRecord.payload;
        const currentTruth = await this.truthAdapter.fetchSubgraphByIds(snapshot.referenced_nodes.map((node) => node.node_id), snapshot.referenced_edges.map((edge) => edge.edge_id), snapshot.critical_domain_nodes);
        const currentGraphTruthHash = (0, hash_1.computeGraphTruthHash)(currentTruth);
        const drift = (0, hash_1.detectGraphDrift)(snapshot, currentTruth);
        const isFresh = bridge.graph_truth_hash === currentGraphTruthHash;
        const freshnessCheck = {
            freshness_check_id: (0, registry_1.generateArtifactId)("freshness_check"),
            bridge_id: bridge.bridge_id,
            feature_id: bridge.feature_id,
            checked_at: this.now().toISOString(),
            bridge_graph_truth_hash: bridge.graph_truth_hash,
            current_graph_truth_hash: currentGraphTruthHash,
            is_fresh: isFresh,
            staleness_reason: isFresh
                ? null
                : buildStalenessReason(drift.changed_node_ids, drift.changed_edge_ids),
            artifact_refs: artifactRefs,
        };
        const record = await this.registry.write("freshness_check", freshnessCheck);
        return {
            record,
            is_fresh: isFresh,
            changed_node_ids: drift.changed_node_ids,
            changed_edge_ids: drift.changed_edge_ids,
        };
    }
}
exports.FreshnessChecker = FreshnessChecker;
//# sourceMappingURL=freshness-checker.js.map