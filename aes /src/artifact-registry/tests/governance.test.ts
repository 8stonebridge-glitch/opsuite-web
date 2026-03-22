import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  GovernanceGateway,
  InMemoryStorage,
  OrchestratorCore,
  ScopeGuard,
  ValidatorCoordinator,
  type Bridge,
  type GraphSnapshot,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-051",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-GOV-001",
    feature_id: "FEAT-GOV-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:gov",
    referenced_nodes: [
      {
        node_id: "NODE-GOV-001",
        label: "Feature",
        properties: { name: "governance" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-GOV-001"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-GOV-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const compiled = await compiler.compile({
    build_id: buildId,
    feature_id: "FEAT-GOV-001",
    graph_snapshot: makeSnapshot(),
    intent: "Governance workflow",
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

async function makeRunningBuildContext(
  registry: ArtifactRegistry,
  buildId = "BLD-GOV-001"
): Promise<Bridge> {
  const bridge = await makeValidatedBridge(registry, buildId);
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
    builder_session_id: "builder-gov",
    policy_evaluation: {
      hard_blocked: false,
      final_route: "DIRECT_BUILD",
      hard_vetoes: [],
    },
  });
  await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-gov");
  return bridge;
}

describe("GovernanceGateway", () => {
  test("pendingDecisionQueue includes pending and deferred escalations", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    await registry.write("escalation_record", {
      escalation_record_id: "ESC-OPEN-001",
      build_id: "BLD-001",
      bridge_id: "BRG-001",
      feature_id: "FEAT-001",
      escalated_at: "2026-03-21T15:00:00.000Z",
      escalation_reason: "Open escalation",
      escalation_type: "manual",
      decision: null,
      decided_at: null,
      decided_by: null,
      rationale: null,
      artifact_refs: [
        { artifact_type: "build", artifact_id: "BLD-001", role: "escalation_source" },
      ],
    });
    await registry.write("escalation_record", {
      escalation_record_id: "ESC-DEFER-001",
      build_id: "BLD-002",
      bridge_id: "BRG-002",
      feature_id: "FEAT-002",
      escalated_at: "2026-03-21T15:01:00.000Z",
      escalation_reason: "Deferred escalation",
      escalation_type: "manual",
      decision: null,
      decided_at: null,
      decided_by: null,
      rationale: null,
      artifact_refs: [
        { artifact_type: "build", artifact_id: "BLD-002", role: "escalation_source" },
      ],
    });
    await registry.write("escalation_record", {
      escalation_record_id: "ESC-DEFER-001",
      build_id: "BLD-002",
      bridge_id: "BRG-002",
      feature_id: "FEAT-002",
      escalated_at: "2026-03-21T15:01:00.000Z",
      escalation_reason: "Deferred escalation",
      escalation_type: "manual",
      decision: "DEFERRED",
      decided_at: "2026-03-21T15:02:00.000Z",
      decided_by: "governance-1",
      rationale: "Need more context",
      artifact_refs: [
        { artifact_type: "build", artifact_id: "BLD-002", role: "escalation_source" },
      ],
    });
    await registry.write("escalation_record", {
      escalation_record_id: "ESC-CLOSED-001",
      build_id: "BLD-003",
      bridge_id: "BRG-003",
      feature_id: "FEAT-003",
      escalated_at: "2026-03-21T15:03:00.000Z",
      escalation_reason: "Closed escalation",
      escalation_type: "manual",
      decision: "APPROVED",
      decided_at: "2026-03-21T15:04:00.000Z",
      decided_by: "governance-2",
      rationale: "Approved",
      artifact_refs: [
        { artifact_type: "build", artifact_id: "BLD-003", role: "escalation_source" },
      ],
    });

    const gateway = new GovernanceGateway(registry);
    const queue = await gateway.pendingDecisionQueue();

    expect(queue.map((record) => record.payload.escalation_record_id)).toEqual([
      "ESC-OPEN-001",
      "ESC-DEFER-001",
    ]);
  });

  test("approveEscalation resolves linked protected scope expansion and closes escalation", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-GOV-APPROVE");
    const scopeGuard = new ScopeGuard(
      registry,
      {
        protected_domains: [{ domain: "security", paths: ["src/security/**"] }],
      },
      () => new Date("2026-03-21T15:10:00.000Z")
    );
    const request = await scopeGuard.requestReadScopeExpansion({
      build_id: bridge.build_id,
      requested_paths: ["src/security/**"],
      reason: "Need security helper",
      artifact_refs: [DUMMY_REF],
    });
    const gateway = new GovernanceGateway(
      registry,
      { scope_guard: scopeGuard },
      () => new Date("2026-03-21T15:12:00.000Z")
    );

    const context = await gateway.decisionContext(
      request.escalation_record!.payload.escalation_record_id
    );
    const result = await gateway.approveEscalation({
      escalation_record_id: request.escalation_record!.payload.escalation_record_id,
      decided_by: "governance-approve",
      rationale: "Approved exact requested scope",
    });
    const queue = await gateway.pendingDecisionQueue();

    expect(
      context.related_scope_expansion_request?.payload.scope_expansion_request_id
    ).toBe(request.request_record.payload.scope_expansion_request_id);
    expect(result.escalation_record.payload.decision).toBe("APPROVED");
    expect(result.scope_expansion_request_record?.payload.status).toBe("APPROVED");
    expect(result.read_scope_amendment_record?.payload.approved_by).toBe(
      "governance-approve"
    );
    expect(result.bridge_record?.payload.read_scope.paths).toContain(
      "src/security/**"
    );
    expect(queue).toEqual([]);
  });

  test("rejectEscalation rejects linked scope expansion and keeps audit trail", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-GOV-REJECT");
    const scopeGuard = new ScopeGuard(
      registry,
      {
        protected_domains: [{ domain: "finance", paths: ["src/finance/**"] }],
      },
      () => new Date("2026-03-21T15:20:00.000Z")
    );
    const request = await scopeGuard.requestReadScopeExpansion({
      build_id: bridge.build_id,
      requested_paths: ["src/finance/**"],
      reason: "Need finance helper",
      artifact_refs: [DUMMY_REF],
    });
    const gateway = new GovernanceGateway(
      registry,
      { scope_guard: scopeGuard },
      () => new Date("2026-03-21T15:22:00.000Z")
    );

    const result = await gateway.rejectEscalation({
      escalation_record_id: request.escalation_record!.payload.escalation_record_id,
      decided_by: "governance-reject",
      rationale: "Protected finance domain denied",
    });

    expect(result.escalation_record.payload.decision).toBe("REJECTED");
    expect(result.scope_expansion_request_record?.payload.status).toBe("REJECTED");
    expect(result.read_scope_amendment_record).toBeUndefined();
  });

  test("decisionContext includes validator runs for disagreement escalations", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-GOV-ESCALATE");
    const coordinator = new ValidatorCoordinator(
      registry,
      () => new Date("2026-03-21T15:30:00.000Z")
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
      concerns: ["Concern"],
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
          rule: "RULE-051",
          severity: "HARD",
          description: "Disagreement",
        },
      ],
    });
    const finalization = await coordinator.finalizeBuild(bridge.build_id);
    const gateway = new GovernanceGateway(registry);

    expect(finalization.state).toBe("ESCALATED");
    if (finalization.state !== "ESCALATED") {
      throw new Error("Expected escalation");
    }

    const context = await gateway.decisionContext(
      finalization.escalation_record.payload.escalation_record_id
    );
    const deferred = await gateway.deferEscalation({
      escalation_record_id:
        finalization.escalation_record.payload.escalation_record_id,
      decided_by: "governance-defer",
      rationale: "Need human review",
    });
    const queue = await gateway.pendingDecisionQueue();

    expect(context.related_validator_runs).toHaveLength(3);
    expect(context.escalation_history).toHaveLength(1);
    expect(deferred.escalation_record.payload.decision).toBe("DEFERRED");
    expect(queue.map((record) => record.payload.escalation_record_id)).toEqual([
      finalization.escalation_record.payload.escalation_record_id,
    ]);
  });
});
