import { ArtifactRegistry, ClaudeCodeSessionManager, InMemoryStorage } from "../src";

describe("session managers", () => {
  test("ClaudeCodeSessionManager launches a builder process with AES session context", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const refs = [
      {
        artifact_type: "request" as const,
        artifact_id: "REQ-SESS-001",
        role: "evidence_source" as const,
      },
    ];
    const buildRecord = await registry.write("build", {
      build_id: "BLD-SESS-001",
      bridge_id: "BRG-SESS-001",
      feature_id: "FEAT-SESS-001",
      status: "AUTHORIZED",
      blocked_reasons: [],
      queued_at: "2026-03-21T16:00:00.000Z",
      authorized_at: "2026-03-21T16:00:01.000Z",
      started_at: null,
      ended_at: null,
      builder_session_id: null,
      artifact_refs: refs,
    });
    const bridgeRecord = await registry.write("bridge", {
      bridge_id: "BRG-SESS-001",
      build_id: "BLD-SESS-001",
      feature_id: "FEAT-SESS-001",
      generated_at: "2026-03-21T16:00:00.000Z",
      graph_snapshot_id: "SNAP-SESS-001",
      graph_truth_hash: "sha256:sess",
      bridge_version: 1,
      intent: "Session smoke test",
      scope: { paths: ["src/runtime/**"] },
      out_of_scope: [],
      constraints: [],
      patterns: [],
      anti_patterns: [],
      data_model: {},
      api_contracts: [],
      events: [],
      db_touches: [],
      component_boundaries: [],
      read_scope: { paths: ["src/runtime/**"] },
      write_scope: { paths: ["src/runtime/**"] },
      read_scope_amendments: [],
      depends_on_bridge_ids: [],
      predecessor_build_ids: [],
      dependency_type: "NONE",
      acceptance_criteria: [],
      test_cases: [],
      confidence: 0.9,
      confidence_breakdown: {
        graph_coverage: 0.9,
        pattern_strength: 0.9,
        rule_consistency: 0.9,
        evidence_level: 0.9,
      },
      artifact_refs: refs,
      status: "VALIDATED",
    });

    const manager = new ClaudeCodeSessionManager();
    const session = await manager.startBuilderSession({
      build_record: buildRecord,
      bridge_record: bridgeRecord,
      cwd: process.cwd(),
      command: process.execPath,
      args: [
        "-e",
        "console.log(process.env.AES_SESSION_ROLE + ':' + process.env.AES_BUILD_ID)",
      ],
      prompt: "builder smoke test",
    });
    const completed = await manager.waitForBuilderSession(session.session_id, 5000);

    expect(completed.status).toBe("EXITED");
    expect(completed.stdout).toContain("builder:BLD-SESS-001");
    expect(completed.env.AES_SESSION_ROLE).toBe("builder");
    expect(completed.env.PATH).toBeUndefined();
  });
});
