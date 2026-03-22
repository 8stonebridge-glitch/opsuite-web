"use strict";
/**
 * AES Graph Layer — Snapshot Service
 *
 * Captures a deterministic graph snapshot and writes it through the append-only
 * artifact registry.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphSnapshotService = void 0;
const registry_1 = require("../registry");
const hash_1 = require("./hash");
class GraphSnapshotService {
    constructor(registry, truthAdapter, now = () => new Date()) {
        this.registry = registry;
        this.truthAdapter = truthAdapter;
        this.now = now;
    }
    async capture(input) {
        const truth = await this.truthAdapter.fetchFeatureSubgraph({
            feature_id: input.feature_id,
            query_profile: input.query_profile,
        });
        const normalized = (0, hash_1.normalizeGraphSubgraph)(truth);
        const snapshot = {
            graph_snapshot_id: (0, registry_1.generateArtifactId)("graph_snapshot"),
            feature_id: input.feature_id,
            captured_at: this.now().toISOString(),
            graph_truth_hash: (0, hash_1.computeGraphTruthHash)(normalized),
            query_profile: input.query_profile,
            referenced_nodes: normalized.referenced_nodes,
            referenced_edges: normalized.referenced_edges,
            critical_domain_nodes: normalized.critical_domain_nodes,
            artifact_refs: input.artifact_refs ?? [],
        };
        return this.registry.write("graph_snapshot", snapshot);
    }
}
exports.GraphSnapshotService = GraphSnapshotService;
//# sourceMappingURL=snapshot-service.js.map