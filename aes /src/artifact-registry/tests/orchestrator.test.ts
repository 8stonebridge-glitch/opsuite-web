/**
 * AES Orchestrator Layer — Tests
 *
 * Proves:
 *  1. Builds queue append-only.
 *  2. Authorization requires VALIDATED bridge, fresh truth, and ready dependencies.
 *  3. Authorization writes AUTHORIZED build + EXECUTING bridge.
 *  4. Blocking writes BLOCKED build when authorization fails.
 *  5. Builder can move AUTHORIZED -> RUNNING.
 *  6. Validator consensus drives terminal build and bridge states.
 */

import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  InMemoryStorage,
  OrchestratorCore,
  type Bridge,
  type DependencyRecord,
  type EscalationRecord,
  type FreshnessCheck,
  type GraphSnapshot,
  type ValidatorRun,
  type WriteBackRecord,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-014",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-001",
    feature_id: "FEAT-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:abc123",
    query_profile: "build_default",
    referenced_nodes: [
      {
        node_id: "NODE-1",
        label: "Feature",
        properties: { name: "resume" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-1"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const draftBridge = (
    await compiler.compile({
      build_id: buildId,
      feature_id: "FEAT-001",
      graph_snapshot: makeSnapshot(),
      intent: "Implement onboarding resume",
      scope: { paths: ["src/features/onboarding/**"] },
      read_scope: { paths: ["src/features/onboarding/**"] },
      write_scope: { paths: ["src/features/onboarding/**"] },
      confidence_breakdown: {
        graph_coverage: 0.8,
        pattern_strength: 0.8,
        rule_consistency: 0.8,
        evidence_level: 0.8,
      },
      artifact_refs: [DUMMY_REF],
    })
  ).payload;

  return (
    await validator.validate({
      bridge: draftBridge,
      dependencies_satisfied: true,
      is_fresh: true,
    })
  ).record.payload;
}

function makeFreshnessCheck(
  bridgeId: string,
  isFresh = true
): FreshnessCheck {
  return {
    freshness_check_id: `FRESH-${bridgeId}`,
    bridge_id: bridgeId,
    feature_id: "FEAT-001",
    checked_at: new Date().toISOString(),
    bridge_graph_truth_hash: "sha256:abc123",
    current_graph_truth_hash: isFresh ? "sha256:abc123" : "sha256:def456",
    is_fresh: isFresh,
    staleness_reason: isFresh ? null : "Critical graph truth changed",
    artifact_refs: [DUMMY_REF],
  };
}

function makeDependencyRecord(
  bridgeId: string,
  allSatisfied: boolean
): DependencyRecord {
  return {
    dependency_record_id: `DEP-${bridgeId}`,
    bridge_id: bridgeId,
    feature_id: "FEAT-001",
    evaluated_at: new Date().toISOString(),
    depends_on_bridge_ids: ["BRG-UPSTREAM"],
    predecessor_build_ids: ["BLD-UPSTREAM"],
    dependency_type: "HARD",
    all_satisfied: allSatisfied,
    unsatisfied_dependencies: allSatisfied
      ? []
      : [{ bridge_id: "BRG-UPSTREAM", reason: "Bridge BRG-UPSTREAM not in EXECUTED state" }],
    artifact_refs: [DUMMY_REF],
  };
}

function makeValidatorRun(
  buildId: string,
  bridgeId: string,
  status: ValidatorRun["status"]
): ValidatorRun {
  return {
    validator_id: `validator-${status}`,
    validator_run_id: `${status}-${Math.random().toString(16).slice(2)}`,
    build_id: buildId,
    bridge_id: bridgeId,
    validated_at: new Date().toISOString(),
    status,
    evidence: [
      {
        evidence_type: "test_run",
        description: `Validator outcome ${status}`,
      },
    ],
    violations: [],
    missing: [],
    concerns: [],
    confidence: 0.8,
    artifact_refs: [DUMMY_REF],
  };
}

describe("OrchestratorCore", () => {
  test("queueBuild writes a QUEUED build", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new OrchestratorCore(registry, () => new Date("2026-03-21T12:00:00.000Z"));

    const record = await orchestrator.queueBuild({
      build_id: "BLD-001",
      bridge_id: "BRG-001",
      feature_id: "FEAT-001",
      artifact_refs: [DUMMY_REF],
    });

    expect(record.payload.status).toBe("QUEUED");
    expect(record.payload.blocked_reasons).toEqual([]);
    expect(record.payload.queued_at).toBe("2026-03-21T12:00:00.000Z");
  });

  test("authorizeBuild writes AUTHORIZED build and EXECUTING bridge when gates pass", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
    const orchestrator = new OrchestratorCore(registry, () => new Date("2026-03-21T12:01:00.000Z"));
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });

    const result = await orchestrator.authorizeBuild(bridge.build_id, {
      builder_session_id: "builder-001",
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.build_record.payload.status).toBe("AUTHORIZED");
    expect(result.build_record.payload.blocked_reasons).toEqual([]);
    expect(result.build_record.payload.builder_session_id).toBe("builder-001");
    expect(result.bridge_record?.payload.status).toBe("EXECUTING");
  });

  test("authorizeBuild writes BLOCKED build when freshness fails", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, false));
    const orchestrator = new OrchestratorCore(registry);
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });

    const result = await orchestrator.authorizeBuild(bridge.build_id, {
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.build_record.payload.status).toBe("BLOCKED");
    expect(result.build_record.payload.blocked_reasons).toEqual([
      {
        code: "BRIDGE_NOT_FRESH",
        message: "Critical graph truth changed",
        source: "RULE-014",
        severity: "HIGH",
        detected_by: "Codex",
        timestamp: result.build_record.payload.blocked_reasons[0]?.timestamp,
      },
    ]);
    expect(result.reasons[0]).toContain("Critical graph truth changed");
  });

  test("authorizeBuild writes BLOCKED build when dependencies are unsatisfied", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    const bridgeWithDeps = {
      ...bridge,
      depends_on_bridge_ids: ["BRG-UPSTREAM"],
      dependency_type: "HARD" as const,
    };
    await registry.write("bridge", bridgeWithDeps);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
    await registry.write("dependency_record", makeDependencyRecord(bridge.bridge_id, false));
    const orchestrator = new OrchestratorCore(registry);
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });

    const result = await orchestrator.authorizeBuild(bridge.build_id, {
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.build_record.payload.status).toBe("BLOCKED");
    expect(
      result.build_record.payload.blocked_reasons.some(
        (reason) => reason.code === "DEPENDENCY_NOT_SATISFIED"
      )
    ).toBe(true);
    expect(
      result.reasons.some((reason) =>
        reason.includes("BRG-UPSTREAM not in EXECUTED state")
      )
    ).toBe(true);
  });

  test("authorizeBuild persists multiple blocked reasons when several gates fail", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    const bridgeWithDeps = {
      ...bridge,
      depends_on_bridge_ids: ["BRG-UPSTREAM"],
      dependency_type: "HARD" as const,
    };
    await registry.write("bridge", bridgeWithDeps);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, false));
    await registry.write("dependency_record", makeDependencyRecord(bridge.bridge_id, false));
    const orchestrator = new OrchestratorCore(registry, () => new Date("2026-03-21T10:45:00.000Z"));
    await orchestrator.queueBuild({
      build_id: bridge.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      artifact_refs: [DUMMY_REF],
    });

    const result = await orchestrator.authorizeBuild(bridge.build_id, {
      policy_evaluation: {
        hard_blocked: false,
        final_route: "DIRECT_BUILD",
        hard_vetoes: [],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.blocked_reasons).toHaveLength(2);
    expect(result.build_record.payload.blocked_reasons).toEqual([
      {
        code: "BRIDGE_NOT_FRESH",
        message: "Critical graph truth changed",
        source: "RULE-014",
        severity: "HIGH",
        detected_by: "Codex",
        timestamp: "2026-03-21T10:45:00.000Z",
      },
      {
        code: "DEPENDENCY_NOT_SATISFIED",
        message: "Bridge BRG-UPSTREAM not in EXECUTED state",
        source: "BRG-UPSTREAM",
        severity: "HIGH",
        detected_by: "Codex",
        timestamp: "2026-03-21T10:45:00.000Z",
      },
    ]);
  });

  test("markBuildRunningByBuilder appends RUNNING build", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
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

    const running = await orchestrator.markBuildRunningByBuilder(
      bridge.build_id,
      "builder-001"
    );

    expect(running.payload.status).toBe("RUNNING");
    expect(running.payload.builder_session_id).toBe("builder-001");
    expect(running.payload.started_at).not.toBeNull();
  });

  test("finalizeBuildFromValidators appends PASSED build and EXECUTED bridge", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
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
    await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-001");
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "PASS")
    );
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "PASS_WITH_CONCERNS")
    );

    const result = await orchestrator.finalizeBuildFromValidators(bridge.build_id);

    expect(result.outcome).toBe("PASSED");
    expect(result.validator_outcome).toBe("PASS_WITH_CONCERNS");
    expect(result.build_record.payload.status).toBe("PASSED");
    expect(result.bridge_record.payload.status).toBe("EXECUTED");
    const writeBackRecords = await registry.latestByType<WriteBackRecord>(
      "write_back_record"
    );
    expect(writeBackRecords).toHaveLength(1);
    expect(writeBackRecords[0]?.payload.write_back_status).toBe(
      "VERIFIED_RESTRICTED"
    );
  });

  test("finalizeBuildFromValidators appends FAILED build when consensus fails", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry);
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
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
    await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-001");
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "FAIL")
    );

    const result = await orchestrator.finalizeBuildFromValidators(bridge.build_id);

    expect(result.outcome).toBe("FAILED");
    expect(result.build_record.payload.status).toBe("FAILED");
    expect(result.bridge_record.payload.status).toBe("EXECUTED");
    const writeBackRecords = await registry.latestByType<WriteBackRecord>(
      "write_back_record"
    );
    expect(writeBackRecords).toHaveLength(1);
    expect(writeBackRecords[0]?.payload.write_back_status).toBeNull();
  });

  test("finalizeBuildFromValidators escalates through the new post-build path", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeValidatedBridge(registry, "BLD-ESCALATE-001");
    await registry.write("freshness_check", makeFreshnessCheck(bridge.bridge_id, true));
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
    await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-001");
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "PASS")
    );
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "PASS_WITH_CONCERNS")
    );
    await registry.write(
      "validator_run",
      makeValidatorRun(bridge.build_id, bridge.bridge_id, "FAIL")
    );

    await expect(
      orchestrator.finalizeBuildFromValidators(bridge.build_id)
    ).rejects.toThrow("requires escalation before terminalization");

    const escalationRecords = await registry.latestByType<EscalationRecord>(
      "escalation_record"
    );
    expect(escalationRecords).toHaveLength(1);
    expect(escalationRecords[0]?.payload.escalation_type).toBe(
      "validator_disagreement"
    );
  });
});
