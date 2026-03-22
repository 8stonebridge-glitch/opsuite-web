import {
  ArtifactRegistry,
  BridgeCompiler,
  BridgeValidator,
  BuilderSessionAdapter,
  InMemoryStorage,
  OrchestratorCore,
  ScopeGuard,
  type Bridge,
  type GraphSnapshot,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-033",
  role: "constraint_source" as const,
};

function makeSnapshot(): GraphSnapshot {
  return {
    graph_snapshot_id: "SNAP-BUILDER-001",
    feature_id: "FEAT-BUILDER-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "sha256:builder",
    referenced_nodes: [
      {
        node_id: "NODE-BUILDER",
        label: "Feature",
        properties: { name: "builder-controls" },
      },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-BUILDER"],
    artifact_refs: [DUMMY_REF],
  };
}

async function makeValidatedBridge(
  registry: ArtifactRegistry,
  buildId = "BLD-BUILDER-001"
): Promise<Bridge> {
  const compiler = new BridgeCompiler(registry);
  const validator = new BridgeValidator(registry);
  const compiled = await compiler.compile({
    build_id: buildId,
    feature_id: "FEAT-BUILDER-001",
    graph_snapshot: makeSnapshot(),
    intent: "Builder scope guard runtime",
    scope: { paths: ["src/runtime/**"] },
    read_scope: { paths: ["src/runtime/**"] },
    write_scope: { paths: ["src/runtime/**"] },
    confidence_breakdown: {
      graph_coverage: 0.8,
      pattern_strength: 0.8,
      rule_consistency: 0.8,
      evidence_level: 0.8,
    },
    api_contracts: [
      {
        name: "save_runtime_state",
        method: "POST",
        path: "/api/runtime/state",
      },
    ],
    events: [
      {
        name: "runtime_state_saved",
      },
    ],
    db_touches: [
      {
        table: "runtime_states",
        operations: ["READ", "INSERT"],
      },
    ],
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
  buildId = "BLD-BUILDER-001"
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
    builder_session_id: "builder-guard",
    policy_evaluation: {
      hard_blocked: false,
      final_route: "DIRECT_BUILD",
      hard_vetoes: [],
    },
  });
  await orchestrator.markBuildRunningByBuilder(bridge.build_id, "builder-guard");
  return bridge;
}

describe("ScopeGuard", () => {
  test("evaluateRead allows in-scope paths and denies out-of-scope paths", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry);
    const scopeGuard = new ScopeGuard(registry);

    const allowed = await scopeGuard.evaluateRead(
      bridge.build_id,
      "src/runtime/worker.ts"
    );
    const denied = await scopeGuard.evaluateRead(
      bridge.build_id,
      "src/security/token.ts"
    );

    expect(allowed.allowed).toBe(true);
    expect(allowed.matched_scope).toBe("src/runtime/**");
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("outside the approved read_scope");
  });

  test("protected read-scope expansion creates pending request and governance escalation", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-BUILDER-002");
    const scopeGuard = new ScopeGuard(
      registry,
      {
        protected_domains: [
          {
            domain: "security",
            paths: ["src/security/**"],
          },
        ],
      },
      () => new Date("2026-03-21T14:15:00.000Z")
    );

    const request = await scopeGuard.requestReadScopeExpansion({
      build_id: bridge.build_id,
      requested_paths: ["src/security/**"],
      reason: "Need existing auth helper",
      artifact_refs: [DUMMY_REF],
    });
    const approval = await scopeGuard.approveReadScopeExpansion({
      scope_expansion_request_id:
        request.request_record.payload.scope_expansion_request_id,
      approved_paths: ["src/security/**"],
      approved_by: "governance-001",
      artifact_refs: [DUMMY_REF],
    });
    const allowed = await scopeGuard.evaluateRead(
      bridge.build_id,
      "src/security/token.ts"
    );

    expect(request.request_record.payload.status).toBe("PENDING");
    expect(request.protected_domains).toEqual(["security"]);
    expect(request.escalation_record?.payload.escalation_type).toBe("manual");
    expect(approval.request_record.payload.status).toBe("APPROVED");
    expect(approval.amendment_record.payload.approved_by).toBe("governance-001");
    expect(approval.bridge_record.payload.read_scope.paths).toContain(
      "src/security/**"
    );
    expect(approval.bridge_record.payload.read_scope_amendments).toContain(
      approval.amendment_record.payload.read_scope_amendment_id
    );
    expect(allowed.allowed).toBe(true);
  });
});

describe("BuilderSessionAdapter", () => {
  test("captureOutputs records write-scope and interface-boundary violations", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-BUILDER-003");
    const scopeGuard = new ScopeGuard(registry);
    const builderAdapter = new BuilderSessionAdapter(
      registry,
      scopeGuard,
      () => new Date("2026-03-21T14:20:00.000Z")
    );

    const result = await builderAdapter.captureOutputs({
      build_id: bridge.build_id,
      changed_files: [
        {
          path: "src/runtime/worker.ts",
          change_type: "modified",
          lines_added: 10,
          lines_removed: 2,
        },
        {
          path: "src/unauthorized/secret.ts",
          change_type: "added",
          lines_added: 5,
          lines_removed: 0,
        },
      ],
      interface_touches: {
        api_contract_names: ["create_admin_api"],
        event_names: ["unexpected_runtime_event"],
        db_tables: ["shadow_runtime_table"],
      },
      artifact_refs: [DUMMY_REF],
    });

    expect(result.hard_failure).toBe(true);
    expect(result.diff_record.payload.changed_files).toEqual([
      {
        path: "src/runtime/worker.ts",
        change_type: "modified",
        lines_added: 10,
        lines_removed: 2,
        in_write_scope: true,
      },
      {
        path: "src/unauthorized/secret.ts",
        change_type: "added",
        lines_added: 5,
        lines_removed: 0,
        in_write_scope: false,
      },
    ]);
    expect(result.diff_record.payload.path_violations).toEqual([
      {
        path: "src/unauthorized/secret.ts",
        violation_type: "outside_write_scope",
        description:
          "Path src/unauthorized/secret.ts is outside the approved write_scope.",
      },
      {
        path: "api_contract:create_admin_api",
        violation_type: "interface_boundary",
        description:
          "API contract create_admin_api is outside the bridge contract.",
      },
      {
        path: "event:unexpected_runtime_event",
        violation_type: "interface_boundary",
        description:
          "Event unexpected_runtime_event is outside the bridge contract.",
      },
      {
        path: "db:shadow_runtime_table",
        violation_type: "interface_boundary",
        description:
          "DB touch shadow_runtime_table is outside the bridge contract.",
      },
    ]);
  });

  test("captureOutputs stays clean for in-scope writes and declared interfaces", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const bridge = await makeRunningBuildContext(registry, "BLD-BUILDER-004");
    const scopeGuard = new ScopeGuard(registry);
    const builderAdapter = new BuilderSessionAdapter(registry, scopeGuard);

    const result = await builderAdapter.captureOutputs({
      build_id: bridge.build_id,
      changed_files: [
        {
          path: "src/runtime/worker.ts",
          change_type: "modified",
          lines_added: 4,
          lines_removed: 1,
        },
      ],
      interface_touches: {
        api_contract_names: ["save_runtime_state"],
        event_names: ["runtime_state_saved"],
        db_tables: ["runtime_states"],
      },
      artifact_refs: [DUMMY_REF],
    });

    expect(result.hard_failure).toBe(false);
    expect(result.diff_record.payload.path_violations).toEqual([]);
    expect(result.diff_record.payload.changed_files[0]?.in_write_scope).toBe(true);
  });
});
