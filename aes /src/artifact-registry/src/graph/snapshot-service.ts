/**
 * AES Graph Layer — Snapshot Service
 *
 * Captures a deterministic graph snapshot and writes it through the append-only
 * artifact registry.
 */

import { ArtifactRegistry, generateArtifactId } from "../registry";
import type { ArtifactRef, GraphSnapshot, StoredRecord } from "../types";
import { computeGraphTruthHash, normalizeGraphSubgraph } from "./hash";
import type { GraphTruthAdapter } from "./truth-adapter";

export interface CaptureSnapshotInput {
  feature_id: string;
  query_profile?: string;
  artifact_refs?: ArtifactRef[];
}

export class GraphSnapshotService {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly truthAdapter: GraphTruthAdapter,
    private readonly now: () => Date = () => new Date()
  ) {}

  async capture(
    input: CaptureSnapshotInput
  ): Promise<StoredRecord<GraphSnapshot>> {
    const truth = await this.truthAdapter.fetchFeatureSubgraph({
      feature_id: input.feature_id,
      query_profile: input.query_profile,
    });
    const normalized = normalizeGraphSubgraph(truth);

    const snapshot: GraphSnapshot = {
      graph_snapshot_id: generateArtifactId("graph_snapshot"),
      feature_id: input.feature_id,
      captured_at: this.now().toISOString(),
      graph_truth_hash: computeGraphTruthHash(normalized),
      query_profile: input.query_profile,
      referenced_nodes: normalized.referenced_nodes,
      referenced_edges: normalized.referenced_edges,
      critical_domain_nodes: normalized.critical_domain_nodes,
      artifact_refs: input.artifact_refs ?? [],
    };

    return this.registry.write("graph_snapshot", snapshot);
  }
}
