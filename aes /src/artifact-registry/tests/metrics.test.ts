import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  InMemoryStorage,
  TelemetryService,
  type Bridge,
  type GraphSnapshot,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-071",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-MET-001",
    feature_id: "FEAT-MET-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:metrics",
    referenced_nodes: [
      {
        node_id: "NODE-MET-001",
        label: "Feature",
        properties: { name: "metrics" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-MET-001"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-MET-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const compiled = await compiler.compile({
    build_id: buildId,
    feature_id: "FEAT-MET-001",
    graph_snapshot: makeSnapshot(),
    intent: "Metric capture flow",
    scope: { paths: ["src/metrics/**"] },
    read_scope: { paths: ["src/metrics/**"] },
    write_scope: { paths: ["src/metrics/**"] },
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

describe("TelemetryService", () => {
  test("captureBuildMetrics writes per-build metric records", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("build", {
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      status: "PASSED",
      blocked_reasons: [],
      queued_at: "2026-03-21T16:30:00.000Z",
      authorized_at: "2026-03-21T16:31:00.000Z",
      started_at: "2026-03-21T16:32:00.000Z",
      ended_at: "2026-03-21T16:33:00.000Z",
      builder_session_id: "builder-metrics",
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("validator_run", {
      validator_id: "validator-a",
      validator_run_id: "VRUN-MET-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      validated_at: "2026-03-21T16:34:00.000Z",
      status: "PASS_WITH_CONCERNS",
      evidence: [{ evidence_type: "test_run", description: "concern" }],
      violations: [],
      missing: [],
      concerns: ["Concern"],
      confidence: 0.7,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("diff_artifact", {
      diff_artifact_id: "DIFF-MET-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      captured_at: "2026-03-21T16:35:00.000Z",
      changed_files: [],
      path_violations: [
        {
          path: "src/outside.ts",
          violation_type: "outside_write_scope",
          description: "outside scope",
        },
      ],
      blob_ref: null,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("write_back_record", {
      write_back_record_id: "WBR-MET-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      decided_at: "2026-03-21T16:36:00.000Z",
      validator_consensus: "PASS_WITH_CONCERNS",
      write_back_status: "VERIFIED_RESTRICTED",
      written_back: true,
      rejection_reason: null,
      artifact_refs: [DUMMY_REF],
    });

    const telemetry = new TelemetryService(
      registry,
      () => new Date("2026-03-21T16:40:00.000Z")
    );
    const metrics = await telemetry.captureBuildMetrics(bridge.build_id);

    expect(metrics.map((record) => record.payload.metric_name)).toEqual([
      "validator_run_count",
      "validator_fail_count",
      "validator_concern_count",
      "diff_violation_count",
      "blocked_reason_count",
      "build_terminal_success",
      "write_back_restricted",
    ]);
    expect(metrics.find((record) => record.payload.metric_name === "validator_run_count")?.payload.metric_value).toBe(1);
    expect(metrics.find((record) => record.payload.metric_name === "diff_violation_count")?.payload.metric_value).toBe(1);
    expect(metrics.find((record) => record.payload.metric_name === "write_back_restricted")?.payload.metric_value).toBe(1);
  });

  test("captureFeatureMetrics writes aggregate feature metrics", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry, "BLD-MET-002");
    await registry.write("build", {
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      status: "BLOCKED",
      blocked_reasons: [
        {
          code: "RULE_BLOCK",
          message: "Blocked",
          source: "RULE-071",
          severity: "HIGH",
          detected_by: "Codex",
          timestamp: "2026-03-21T16:50:00.000Z",
        },
      ],
      queued_at: "2026-03-21T16:45:00.000Z",
      authorized_at: null,
      started_at: null,
      ended_at: "2026-03-21T16:50:00.000Z",
      builder_session_id: null,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("escalation_record", {
      escalation_record_id: "ESC-MET-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      escalated_at: "2026-03-21T16:51:00.000Z",
      escalation_reason: "Needs review",
      escalation_type: "manual",
      decision: null,
      decided_at: null,
      decided_by: null,
      rationale: null,
      artifact_refs: [DUMMY_REF],
    });

    const telemetry = new TelemetryService(
      registry,
      () => new Date("2026-03-21T16:55:00.000Z")
    );
    const metrics = await telemetry.captureFeatureMetrics(bridge.feature_id);

    expect(metrics.find((record) => record.payload.metric_name === "feature_build_count")?.payload.metric_value).toBe(1);
    expect(metrics.find((record) => record.payload.metric_name === "feature_blocked_build_count")?.payload.metric_value).toBe(1);
    expect(metrics.find((record) => record.payload.metric_name === "feature_pending_escalation_count")?.payload.metric_value).toBe(1);
  });
});
