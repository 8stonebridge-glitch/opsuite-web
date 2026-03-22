import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  GovernanceGateway,
  InMemoryStorage,
  OperatorConsoleService,
  OrchestratorCore,
  ScopeGuard,
  type Bridge,
  type GraphSnapshot,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-061",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-OP-001",
    feature_id: "FEAT-OP-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:operator",
    referenced_nodes: [
      {
        node_id: "NODE-OP-001",
        label: "Feature",
        properties: { name: "operator" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-OP-001"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-OP-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const compiled = await compiler.compile({
    build_id: buildId,
    feature_id: "FEAT-OP-001",
    graph_snapshot: makeSnapshot(),
    intent: "Operator console flow",
    scope: { paths: ["src/operator/**"] },
    read_scope: { paths: ["src/operator/**"] },
    write_scope: { paths: ["src/operator/**"] },
    confidence_breakdown: {
      graph_coverage: 0.8,
      pattern_strength: 0.8,
      rule_consistency: 0.8,
      evidence_level: 0.8,
    },
    artifact_refs: [DUMMY_REF],
  });

  return (
    await validator.validate({
      bridge: compiled.payload,
      dependencies_satisfied: true,
      is_fresh: true,
    })
  ).record.payload;
}

describe("OperatorConsoleService", () => {
  test("attentionQueue surfaces blocked builds, pending escalations, restricted write-backs, and stale bridges", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    const blockedBridge = await makeValidatedBridge(registry, "BLD-OP-BLOCKED");
    await registry.write("build", {
      build_id: blockedBridge.build_id,
      bridge_id: blockedBridge.bridge_id,
      feature_id: blockedBridge.feature_id,
      status: "BLOCKED",
      blocked_reasons: [
        {
          code: "RULE_BLOCK",
          message: "Blocked for review",
          source: "RULE-061",
          severity: "HIGH",
          detected_by: "Codex",
          timestamp: "2026-03-21T16:10:00.000Z",
        },
      ],
      queued_at: "2026-03-21T16:00:00.000Z",
      authorized_at: null,
      started_at: null,
      ended_at: "2026-03-21T16:10:00.000Z",
      builder_session_id: null,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("write_back_record", {
      write_back_record_id: "WBR-OP-001",
      build_id: blockedBridge.build_id,
      bridge_id: blockedBridge.bridge_id,
      feature_id: blockedBridge.feature_id,
      decided_at: "2026-03-21T16:11:00.000Z",
      validator_consensus: "PASS_WITH_CONCERNS",
      write_back_status: "VERIFIED_RESTRICTED",
      written_back: true,
      rejection_reason: null,
      artifact_refs: [DUMMY_REF],
    });
    const scopeGuard = new ScopeGuard(
      registry,
      {
        protected_domains: [{ domain: "security", paths: ["src/security/**"] }],
      },
      () => new Date("2026-03-21T16:12:00.000Z")
    );
    const orchestrator = new OrchestratorCore(registry);
    await registry.write("freshness_check", {
      freshness_check_id: `FRESH-${bridge.bridge_id}`,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: "2026-03-21T16:02:00.000Z",
      bridge_graph_truth_hash: bridge.graph_truth_hash,
      current_graph_truth_hash: bridge.graph_truth_hash,
      is_fresh: true,
      staleness_reason: null,
      artifact_refs: [DUMMY_REF],
    });
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });
    await orchestrator.authorizeBuild(bridge.build_id, {
      builder_session_id: "builder-op",
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });
    await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-op");
    await scopeGuard.requestReadScopeExpansion({
      build_id: bridge.build_id,
      requested_paths: ["src/security/**"],
      reason: "Need security helper",
      artifact_refs: [DUMMY_REF],
    });

    const service = new OperatorConsoleService(
      registry,
      { governance_gateway: new GovernanceGateway(registry, { scope_guard: scopeGuard }) }
    );
    const queue = await service.attentionQueue({
      current_graph_truth_hash: "sha256:operator-new",
    });

    expect(queue.blocked_builds).toHaveLength(1);
    expect(queue.pending_escalations).toHaveLength(1);
    expect(queue.verified_restricted_write_backs).toHaveLength(1);
    expect(queue.stale_bridges).toHaveLength(2);
  });

  test("buildReplay and featureAudit provide replayable timelines", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry, "BLD-OP-002");
    const orchestrator = new OrchestratorCore(registry);
    await registry.write("freshness_check", {
      freshness_check_id: `FRESH-${bridge.bridge_id}`,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: "2026-03-21T16:20:00.000Z",
      bridge_graph_truth_hash: bridge.graph_truth_hash,
      current_graph_truth_hash: bridge.graph_truth_hash,
      is_fresh: true,
      staleness_reason: null,
      artifact_refs: [DUMMY_REF],
    });
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("diff_artifact", {
      diff_artifact_id: "DIFF-OP-001",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      captured_at: "2026-03-21T16:21:00.000Z",
      changed_files: [],
      path_violations: [],
      blob_ref: null,
      artifact_refs: [DUMMY_REF],
    });

    const service = new OperatorConsoleService(registry);
    const replay = await service.buildReplay(bridge.build_id);
    const audit = await service.featureAudit(bridge.feature_id);

    expect(replay.timeline.length).toBeGreaterThanOrEqual(3);
    expect(replay.snapshot_replay.some((record) => record.artifact_type === "bridge")).toBe(true);
    expect(audit.builds.some((record) => record.payload.build_id === bridge.build_id)).toBe(true);
    expect(audit.bridges.some((record) => record.payload.bridge_id === bridge.bridge_id)).toBe(true);
  });
});
