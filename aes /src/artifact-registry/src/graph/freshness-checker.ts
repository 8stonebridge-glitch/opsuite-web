/**
 * AES Graph Layer — Freshness Checker
 */

import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  FreshnessCheck,
  GraphSnapshot,
  StoredRecord,
} from "../types";
import { computeGraphTruthHash, detectGraphDrift } from "./hash";
import type { GraphTruthAdapter } from "./truth-adapter";

export interface FreshnessEvaluation {
  record: StoredRecord<FreshnessCheck>;
  is_fresh: boolean;
  changed_node_ids: string[];
  changed_edge_ids: string[];
}

function buildStalenessReason(
  changedNodeIds: string[],
  changedEdgeIds: string[]
): string {
  const details: string[] = [];

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

export class FreshnessChecker {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly truthAdapter: GraphTruthAdapter,
    private readonly now: () => Date = () => new Date()
  ) {}

  async checkBridge(
    bridge: Bridge,
    artifactRefs: ArtifactRef[] = []
  ): Promise<FreshnessEvaluation> {
    const snapshotRecord = await this.registry.read<GraphSnapshot>(
      "graph_snapshot",
      bridge.graph_snapshot_id
    );
    const snapshot = snapshotRecord.payload;

    const currentTruth = await this.truthAdapter.fetchSubgraphByIds(
      snapshot.referenced_nodes.map((node) => node.node_id),
      snapshot.referenced_edges.map((edge) => edge.edge_id),
      snapshot.critical_domain_nodes
    );
    const currentGraphTruthHash = computeGraphTruthHash(currentTruth);
    const drift = detectGraphDrift(snapshot, currentTruth);
    const isFresh = bridge.graph_truth_hash === currentGraphTruthHash;

    const freshnessCheck: FreshnessCheck = {
      freshness_check_id: generateArtifactId("freshness_check"),
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
