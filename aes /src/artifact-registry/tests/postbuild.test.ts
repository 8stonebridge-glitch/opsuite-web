import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  InMemoryStorage,
  OrchestratorCore,
  ValidatorCoordinator,
  WriteBackManager,
  type Bridge,
  type GraphSnapshot,
  type ValidatorAdapter,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-021",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-VAL-001",
    feature_id: "FEAT-POSTBUILD",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:postbuild",
    referenced_nodes: [
      {
        node_id: "NODE-POSTBUILD",
        label: "Feature",
        properties: { name: "postbuild" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-POSTBUILD"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-POSTBUILD-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const compiled = await compiler.compile({
    build_id: buildId,
    feature_id: "FEAT-POSTBUILD",
    graph_snapshot: makeSnapshot(),
    intent: "Validate and write back a build",
    scope: { paths: ["src/runtime/**"] },
    read_scope: { paths: ["src/runtime/**"] },
    write_scope: { paths: ["src/runtime/**"] },
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

function passAdapter(validatorId: string): ValidatorAdapter {
  return {
    validator_id: validatorId,
    async validate() {
      return {
        status: "PASS",
        evidence: [
          {
            evidence_type: "test_run",
            description: `${validatorId} observed passing tests`,
          },
        ],
        confidence: 0.9,
      };
    },
  };
}

describe("ValidatorCoordinator", () => {
  test("executeValidators queues, runs, completes, finalizes, and writes VERIFIED", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", {
      freshness_check_id: `FRESH-${bridge.bridge_id}`,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: new Date().toISOString(),
      bridge_graph_truth_hash: bridge.graph_truth_hash,
      current_graph_truth_hash: bridge.graph_truth_hash,
      is_fresh: true,
      staleness_reason: null,
      artifact_refs: [DUMMY_REF],
    });
    const orchestrator = new OrchestratorCore(registry);
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });
    await orchestrator.authorizeBuild(bridge.build_id, {
      builder_session_id: "builder-postbuild",
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });
    await orchestrator.markBuildRunningByBuilder(
      bridge.build_id,
      "builder-postbuild"
    );

    const coordinator = new ValidatorCoordinator(
      registry,
      () => new Date("2026-03-21T13:00:00.000Z")
    );
    const result = await coordinator.executeValidators(bridge.build_id, [
      passAdapter("validator-a"),
      passAdapter("validator-b"),
    ]);

    expect(result.validator_runs).toHaveLength(2);
    expect(result.finalization.state).toBe("FINALIZED");
    if (result.finalization.state === "FINALIZED") {
      expect(result.finalization.outcome).toBe("PASSED");
      expect(result.finalization.validator_outcome).toBe("PASS");
      expect(result.finalization.build_record.payload.status).toBe("PASSED");
      expect(result.finalization.bridge_record.payload.status).toBe("EXECUTED");
      expect(result.finalization.write_back_record.payload.write_back_status).toBe(
        "VERIFIED"
      );
    }
  });

  test("finalizeBuild escalates when terminal validator runs disagree", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry, "BLD-POSTBUILD-002");
    await registry.write("freshness_check", {
      freshness_check_id: `FRESH-${bridge.bridge_id}`,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: new Date().toISOString(),
      bridge_graph_truth_hash: bridge.graph_truth_hash,
      current_graph_truth_hash: bridge.graph_truth_hash,
      is_fresh: true,
      staleness_reason: null,
      artifact_refs: [DUMMY_REF],
    });
    const orchestrator = new OrchestratorCore(registry);
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });
    await orchestrator.authorizeBuild(bridge.build_id, {
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });
    await orchestrator.markBuildRunningByBuilder(
      bridge.build_id,
      "builder-postbuild"
    );

    const coordinator = new ValidatorCoordinator(
      registry,
      () => new Date("2026-03-21T13:05:00.000Z")
    );
    const queuedA = await coordinator.queueValidatorRun({
      validator_id: "validator-a",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      artifact_refs: [DUMMY_REF],
    });
    await coordinator.markValidatorRunning(queuedA.payload.validator_run_id);
    await coordinator.completeValidatorRun({
      validator_run_id: queuedA.payload.validator_run_id,
      status: "PASS",
      evidence: [{ evidence_type: "test_run", description: "pass" }],
      confidence: 0.8,
    });
    const queuedB = await coordinator.queueValidatorRun({
      validator_id: "validator-b",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      artifact_refs: [DUMMY_REF],
    });
    await coordinator.markValidatorRunning(queuedB.payload.validator_run_id);
    await coordinator.completeValidatorRun({
      validator_run_id: queuedB.payload.validator_run_id,
      status: "PASS_WITH_CONCERNS",
      evidence: [{ evidence_type: "diff", description: "concern" }],
      confidence: 0.7,
      concerns: ["Boundary concern"],
    });
    const queuedC = await coordinator.queueValidatorRun({
      validator_id: "validator-c",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      artifact_refs: [DUMMY_REF],
    });
    await coordinator.markValidatorRunning(queuedC.payload.validator_run_id);
    await coordinator.completeValidatorRun({
      validator_run_id: queuedC.payload.validator_run_id,
      status: "FAIL",
      evidence: [{ evidence_type: "runtime_observation", description: "fail" }],
      confidence: 0.6,
      violations: [
        {
          rule: "RULE-021",
          severity: "HARD",
          description: "Disagreement force escalation",
        },
      ],
    });

    const result = await coordinator.finalizeBuild(bridge.build_id);

    expect(result.state).toBe("ESCALATED");
    if (result.state === "ESCALATED") {
      expect(result.escalation_record.payload.escalation_type).toBe(
        "validator_disagreement"
      );
      expect(result.escalation_record.payload.decision).toBeNull();
    }
  });
});

describe("WriteBackManager", () => {
  test("recordForBuild writes VERIFIED_RESTRICTED for PASS_WITH_CONCERNS", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry, "BLD-POSTBUILD-003");
    await registry.write("build", {
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      status: "PASSED",
      blocked_reasons: [],
      queued_at: "2026-03-21T12:00:00.000Z",
      authorized_at: "2026-03-21T12:01:00.000Z",
      started_at: "2026-03-21T12:02:00.000Z",
      ended_at: "2026-03-21T12:03:00.000Z",
      builder_session_id: "builder-writeback",
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("validator_run", {
      validator_id: "validator-a",
      validator_run_id: "VRUN-PASS-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      validated_at: "2026-03-21T12:04:00.000Z",
      status: "PASS",
      evidence: [{ evidence_type: "test_run", description: "pass" }],
      violations: [],
      missing: [],
      concerns: [],
      confidence: 0.9,
      artifact_refs: [DUMMY_REF],
    });
    await registry.write("validator_run", {
      validator_id: "validator-b",
      validator_run_id: "VRUN-CONCERN-1",
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      validated_at: "2026-03-21T12:04:30.000Z",
      status: "PASS_WITH_CONCERNS",
      evidence: [{ evidence_type: "diff", description: "minor concern" }],
      violations: [],
      missing: [],
      concerns: ["Non-blocking concern"],
      confidence: 0.7,
      artifact_refs: [DUMMY_REF],
    });

    const manager = new WriteBackManager(
      registry,
      () => new Date("2026-03-21T12:05:00.000Z")
    );
    const result = await manager.recordForBuild(bridge.build_id, {
      validator_outcome: "PASS_WITH_CONCERNS",
    });

    expect(result.write_back_record.payload.write_back_status).toBe(
      "VERIFIED_RESTRICTED"
    );
    expect(result.write_back_record.payload.written_back).toBe(true);
  });
});
