/**
 * AES Graph Layer — Tests
 *
 * Proves:
 *  1. Graph truth hashing is deterministic across input order.
 *  2. Snapshot capture writes normalized GraphSnapshot artifacts.
 *  3. Freshness checks pass for unchanged truth.
 *  4. Freshness checks fail when referenced nodes or edges drift.
 */

import {
  ArtifactRegistry,
  InMemoryStorage,
  GraphSnapshotService,
  FreshnessChecker,
  InMemoryTruthAdapter,
  computeGraphTruthHash,
  type Bridge,
  type GraphEdge,
  type GraphNode,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-014",
  role: "constraint_source" as const,
};

function makeNode(
  nodeId: string,
  label: string,
  properties: Record<string, unknown>
): GraphNode {
  return {
    node_id: nodeId,
    label,
    properties,
  };
}

function makeEdge(
  edgeId: string,
  fromNodeId: string,
  toNodeId: string,
  relationship: string,
  properties: Record<string, unknown> = {}
): GraphEdge {
  return {
    edge_id: edgeId,
    from_node_id: fromNodeId,
    to_node_id: toNodeId,
    relationship,
    properties,
  };
}

function makeBridge(graphSnapshotId: string, graphTruthHash: string): Bridge {
  return {
    bridge_id: "BRG-001",
    build_id: "BLD-001",
    feature_id: "FEAT-001",
    generated_at: new Date().toISOString(),
    graph_snapshot_id: graphSnapshotId,
    graph_truth_hash: graphTruthHash,
    bridge_version: 1,
    intent: "Compile a build bridge from graph truth",
    scope: { paths: ["src/artifact-registry/**"] },
    out_of_scope: [],
    constraints: ["graph truth is primary"],
    patterns: [],
    anti_patterns: [],
    data_model: {},
    api_contracts: [],
    events: [],
    db_touches: [],
    component_boundaries: [],
    read_scope: { paths: ["src/artifact-registry/**"] },
    write_scope: { paths: ["src/artifact-registry/**"] },
    read_scope_amendments: [],
    depends_on_bridge_ids: [],
    predecessor_build_ids: [],
    dependency_type: "NONE",
    acceptance_criteria: [],
    test_cases: [],
    confidence: 0.8,
    confidence_breakdown: {
      graph_coverage: 0.8,
      pattern_strength: 0.8,
      rule_consistency: 0.8,
      evidence_level: 0.8,
    },
    artifact_refs: [DUMMY_REF],
    status: "VALIDATED",
  };
}

describe("Graph hashing", () => {
  test("computeGraphTruthHash is stable across node and edge order", () => {
    const nodeA = makeNode("NODE-1", "Feature", { name: "resume", enabled: true });
    const nodeB = makeNode("NODE-2", "Rule", { severity: "critical", order: 1 });
    const edge = makeEdge("EDGE-1", "NODE-1", "NODE-2", "CONSTRAINED_BY");

    const first = computeGraphTruthHash({
      referenced_nodes: [nodeA, nodeB],
      referenced_edges: [edge],
      critical_domain_nodes: ["NODE-2"],
    });
    const second = computeGraphTruthHash({
      referenced_nodes: [nodeB, nodeA],
      referenced_edges: [edge],
      critical_domain_nodes: ["NODE-2"],
    });

    expect(first).toBe(second);
  });
});

describe("GraphSnapshotService", () => {
  test("capture writes a normalized graph snapshot artifact", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const truthAdapter = new InMemoryTruthAdapter(
      [
        makeNode("NODE-2", "Rule", { severity: "critical" }),
        makeNode("NODE-1", "Feature", { name: "resume" }),
      ],
      [makeEdge("EDGE-1", "NODE-1", "NODE-2", "CONSTRAINED_BY")],
      {
        "FEAT-001::build_default": {
          node_ids: ["NODE-2", "NODE-1"],
          edge_ids: ["EDGE-1"],
          critical_domain_nodes: ["NODE-2"],
        },
      }
    );
    const snapshots = new GraphSnapshotService(registry, truthAdapter);

    const record = await snapshots.capture({
      feature_id: "FEAT-001",
      query_profile: "build_default",
      artifact_refs: [DUMMY_REF],
    });

    expect(record.payload.query_profile).toBe("build_default");
    expect(record.payload.referenced_nodes.map((node) => node.node_id)).toEqual([
      "NODE-1",
      "NODE-2",
    ]);
    expect(record.payload.graph_truth_hash).toBe(
      computeGraphTruthHash({
        referenced_nodes: record.payload.referenced_nodes,
        referenced_edges: record.payload.referenced_edges,
        critical_domain_nodes: record.payload.critical_domain_nodes,
      })
    );
  });
});

describe("FreshnessChecker", () => {
  test("unchanged truth yields a fresh bridge", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const truthAdapter = new InMemoryTruthAdapter(
      [
        makeNode("NODE-1", "Feature", { name: "resume" }),
        makeNode("NODE-2", "Rule", { severity: "critical" }),
      ],
      [makeEdge("EDGE-1", "NODE-1", "NODE-2", "CONSTRAINED_BY")],
      {
        "FEAT-001::build_default": {
          node_ids: ["NODE-1", "NODE-2"],
          edge_ids: ["EDGE-1"],
          critical_domain_nodes: ["NODE-2"],
        },
      }
    );
    const snapshotService = new GraphSnapshotService(registry, truthAdapter);
    const snapshot = await snapshotService.capture({
      feature_id: "FEAT-001",
      query_profile: "build_default",
      artifact_refs: [DUMMY_REF],
    });
    const bridge = makeBridge(
      snapshot.payload.graph_snapshot_id,
      snapshot.payload.graph_truth_hash
    );
    const checker = new FreshnessChecker(registry, truthAdapter);

    const result = await checker.checkBridge(bridge, [DUMMY_REF]);

    expect(result.is_fresh).toBe(true);
    expect(result.changed_node_ids).toEqual([]);
    expect(result.changed_edge_ids).toEqual([]);
    expect(result.record.payload.staleness_reason).toBeNull();
  });

  test("node drift yields a stale bridge with changed node ids", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const truthAdapter = new InMemoryTruthAdapter(
      [
        makeNode("NODE-1", "Feature", { name: "resume" }),
        makeNode("NODE-2", "Rule", { severity: "critical" }),
      ],
      [makeEdge("EDGE-1", "NODE-1", "NODE-2", "CONSTRAINED_BY")],
      {
        "FEAT-001": {
          node_ids: ["NODE-1", "NODE-2"],
          edge_ids: ["EDGE-1"],
          critical_domain_nodes: ["NODE-2"],
        },
      }
    );
    const snapshotService = new GraphSnapshotService(registry, truthAdapter);
    const snapshot = await snapshotService.capture({
      feature_id: "FEAT-001",
      artifact_refs: [DUMMY_REF],
    });

    truthAdapter.upsertNode(
      makeNode("NODE-2", "Rule", { severity: "critical", changed: true })
    );

    const bridge = makeBridge(
      snapshot.payload.graph_snapshot_id,
      snapshot.payload.graph_truth_hash
    );
    const checker = new FreshnessChecker(registry, truthAdapter);
    const result = await checker.checkBridge(bridge, [DUMMY_REF]);

    expect(result.is_fresh).toBe(false);
    expect(result.changed_node_ids).toEqual(["NODE-2"]);
    expect(result.record.payload.staleness_reason).toContain("nodes changed");
  });

  test("edge drift yields a stale bridge with changed edge ids", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const truthAdapter = new InMemoryTruthAdapter(
      [
        makeNode("NODE-1", "Feature", { name: "resume" }),
        makeNode("NODE-2", "Rule", { severity: "critical" }),
      ],
      [makeEdge("EDGE-1", "NODE-1", "NODE-2", "CONSTRAINED_BY")],
      {
        "FEAT-001": {
          node_ids: ["NODE-1", "NODE-2"],
          edge_ids: ["EDGE-1"],
          critical_domain_nodes: ["NODE-2"],
        },
      }
    );
    const snapshotService = new GraphSnapshotService(registry, truthAdapter);
    const snapshot = await snapshotService.capture({
      feature_id: "FEAT-001",
      artifact_refs: [DUMMY_REF],
    });

    truthAdapter.removeEdge("EDGE-1");

    const bridge = makeBridge(
      snapshot.payload.graph_snapshot_id,
      snapshot.payload.graph_truth_hash
    );
    const checker = new FreshnessChecker(registry, truthAdapter);
    const result = await checker.checkBridge(bridge, [DUMMY_REF]);

    expect(result.is_fresh).toBe(false);
    expect(result.changed_edge_ids).toEqual(["EDGE-1"]);
    expect(result.record.payload.staleness_reason).toContain("edges changed");
  });
});
