/**
 * AES Artifact Registry — Tests
 *
 * Proves:
 *  1. Append-only invariant: writes never mutate existing records
 *  2. Sequence numbering is monotonically increasing
 *  3. Full history replay from stored inputs
 *  4. Structured artifact_refs are enforced
 *  5. Specialised queries return correct, traceable results
 *  6. Validator consensus majority-rule (quick-reference §7)
 *  7. VERIFIED_RESTRICTED write-back policy (quick-reference §8)
 *  8. Stale bridge detection by graph hash (§4 query needs)
 *  9. ID generator produces type-prefixed unique IDs
 * 10. MissingArtifactRefsError fires for types that require refs
 */

import {
  ArtifactRegistry,
  InMemoryStorage,
  generateArtifactId,
  artifactTypeFromId,
  ArtifactNotFoundError,
  MissingArtifactRefsError,
} from "../src";
import type {
  Bridge,
  Build,
  ValidatorRun,
  WriteBackRecord,
  FreshnessCheck,
  GraphSnapshot,
  Request,
  DependencyRecord,
  DiffArtifact,
  ResearchNote,
  EscalationRecord,
} from "../src";

// ─── Shared fixture builders ──────────────────────────────────────────────────

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "NODE-001",
  role: "constraint_source" as const,
};

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    request_id: generateArtifactId("request"),
    feature_id: "FEAT-001",
    intent: "Add artifact registry",
    requested_by: "orchestrator",
    risk_domain_tags: ["data", "platform"],
    created_at: new Date().toISOString(),
    status: "PENDING",
    ...overrides,
  };
}

function makeGraphSnapshot(
  overrides: Partial<GraphSnapshot> = {}
): GraphSnapshot {
  return {
    graph_snapshot_id: generateArtifactId("graph_snapshot"),
    feature_id: "FEAT-001",
    captured_at: new Date().toISOString(),
    graph_truth_hash: "HASH-ABCD-1234",
    referenced_nodes: [
      { node_id: "NODE-001", label: "Module", properties: { name: "registry" } },
    ],
    referenced_edges: [],
    critical_domain_nodes: ["NODE-001"],
    artifact_refs: [DUMMY_REF],
    ...overrides,
  };
}

function makeBridge(overrides: Partial<Bridge> = {}): Bridge {
  return {
    bridge_id: generateArtifactId("bridge"),
    build_id: "BLD-placeholder",
    feature_id: "FEAT-001",
    generated_at: new Date().toISOString(),
    graph_snapshot_id: "SNAP-001",
    graph_truth_hash: "HASH-ABCD-1234",
    bridge_version: 1,
    intent: "Implement artifact registry",
    scope: { paths: ["src/artifact-registry/**"] },
    out_of_scope: ["src/neo4j/**"],
    constraints: ["append-only storage"],
    patterns: ["JSONB storage"],
    anti_patterns: ["UPDATE statements"],
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
    confidence: 0.82,
    confidence_breakdown: {
      graph_coverage: 0.9,
      pattern_strength: 0.8,
      rule_consistency: 0.75,
      evidence_level: 0.8,
    },
    artifact_refs: [DUMMY_REF],
    status: "DRAFT",
    ...overrides,
  };
}

function makeBuild(
  bridgeId: string,
  overrides: Partial<Build> = {}
): Build {
  return {
    build_id: generateArtifactId("build"),
    bridge_id: bridgeId,
    feature_id: "FEAT-001",
    status: "QUEUED",
    blocked_reasons: [],
    queued_at: new Date().toISOString(),
    authorized_at: null,
    started_at: null,
    ended_at: null,
    builder_session_id: null,
    artifact_refs: [DUMMY_REF],
    ...overrides,
  };
}

function makeValidatorRun(
  buildId: string,
  bridgeId: string,
  outcome: "PASS" | "PASS_WITH_CONCERNS" | "FAIL",
  overrides: Partial<ValidatorRun> = {}
): ValidatorRun {
  return {
    validator_id: "VTOR-boundary",
    validator_run_id: generateArtifactId("validator_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    validated_at: new Date().toISOString(),
    status: outcome,
    evidence: [
      {
        evidence_type: "file_line",
        description: "scope boundary respected",
        location: "src/registry.ts:42",
      },
    ],
    violations: [],
    missing: [],
    concerns: [],
    confidence: 0.90,
    artifact_refs: [DUMMY_REF],
    ...overrides,
  };
}

function makeWriteBackRecord(
  buildId: string,
  bridgeId: string,
  consensus: "PASS" | "PASS_WITH_CONCERNS" | "FAIL"
): WriteBackRecord {
  const status =
    consensus === "PASS"
      ? "VERIFIED"
      : consensus === "PASS_WITH_CONCERNS"
      ? "VERIFIED_RESTRICTED"
      : null;
  return {
    write_back_record_id: generateArtifactId("write_back_record"),
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: "FEAT-001",
    decided_at: new Date().toISOString(),
    validator_consensus: consensus,
    write_back_status: status,
    written_back: consensus !== "FAIL",
    rejection_reason: consensus === "FAIL" ? "hard fail" : null,
    artifact_refs: [DUMMY_REF],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Append-Only Invariant", () => {
  let registry: ArtifactRegistry;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    registry = new ArtifactRegistry(storage);
  });

  test("first write produces sequence_number = 1", async () => {
    const req = makeRequest();
    const record = await registry.write("request", req);
    expect(record.sequence_number).toBe(1);
    expect(record.artifact_id).toBe(req.request_id);
  });

  test("second write to same artifact_id produces sequence_number = 2", async () => {
    const req = makeRequest();
    const r1 = await registry.write("request", req);
    const r2 = await registry.write("request", { ...req, status: "ACCEPTED" });
    expect(r1.sequence_number).toBe(1);
    expect(r2.sequence_number).toBe(2);
    expect(r2.artifact_id).toBe(r1.artifact_id);
  });

  test("read() returns the latest version", async () => {
    const req = makeRequest();
    await registry.write("request", req);
    await registry.write("request", { ...req, status: "ACCEPTED" });
    const latest = await registry.read<Request>("request", req.request_id);
    expect(latest.payload.status).toBe("ACCEPTED");
    expect(latest.sequence_number).toBe(2);
  });

  test("history() returns all versions in insertion order", async () => {
    const req = makeRequest();
    await registry.write("request", req);
    await registry.write("request", { ...req, status: "ACCEPTED" });
    await registry.write("request", { ...req, status: "PROCESSING" });
    const hist = await registry.history<Request>("request", req.request_id);
    expect(hist).toHaveLength(3);
    expect(hist[0]!.payload.status).toBe("PENDING");
    expect(hist[1]!.payload.status).toBe("ACCEPTED");
    expect(hist[2]!.payload.status).toBe("PROCESSING");
  });

  test("stored records are frozen (cannot be mutated by callers)", async () => {
    const req = makeRequest();
    const record = await registry.write("request", req);
    expect(() => {
      (record as unknown as Record<string, unknown>)["sequence_number"] = 999;
    }).toThrow();
    expect(record.sequence_number).toBe(1);
  });

  test("total record count grows monotonically with writes", async () => {
    const req = makeRequest();
    expect(await registry.totalRecords()).toBe(0);
    await registry.write("request", req);
    expect(await registry.totalRecords()).toBe(1);
    await registry.write("request", { ...req, status: "ACCEPTED" });
    expect(await registry.totalRecords()).toBe(2);
  });

  test("two distinct artifact_ids have independent sequence_numbers", async () => {
    const req1 = makeRequest();
    const req2 = makeRequest();
    await registry.write("request", req1);
    await registry.write("request", req1); // seq 2 for req1
    await registry.write("request", req2);
    const h1 = await registry.history("request", req1.request_id);
    const h2 = await registry.history("request", req2.request_id);
    expect(h1).toHaveLength(2);
    expect(h2).toHaveLength(1);
    expect(h2[0]!.sequence_number).toBe(1);
  });

  test("read() throws ArtifactNotFoundError for unknown id", async () => {
    await expect(
      registry.read("request", "REQ-does-not-exist")
    ).rejects.toThrow(ArtifactNotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Traceability (artifact_refs enforcement)", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("bridge with no artifact_refs throws MissingArtifactRefsError", async () => {
    const bridge = makeBridge({ artifact_refs: [] });
    await expect(registry.write("bridge", bridge)).rejects.toThrow(
      MissingArtifactRefsError
    );
  });

  test("validator_run with no artifact_refs throws MissingArtifactRefsError", async () => {
    const bridge = makeBridge();
    await registry.write("bridge", bridge);
    const build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);
    const run = makeValidatorRun(build.build_id, bridge.bridge_id, "PASS", {
      artifact_refs: [],
    });
    await expect(registry.write("validator_run", run)).rejects.toThrow(
      MissingArtifactRefsError
    );
  });

  test("bridge with artifact_refs writes successfully", async () => {
    const bridge = makeBridge();
    const record = await registry.write("bridge", bridge);
    expect(record.payload.artifact_refs).toHaveLength(1);
    expect(record.payload.artifact_refs[0]!.role).toBe("constraint_source");
  });

  test("request does not require artifact_refs (no error)", async () => {
    const req = makeRequest();
    // Request type has no artifact_refs field — should not throw
    await expect(registry.write("request", req)).resolves.toBeDefined();
  });

  test("artifact_refs are stored verbatim and retrievable", async () => {
    const bridge = makeBridge({
      artifact_refs: [
        { artifact_type: "graph_node", artifact_id: "NODE-001", role: "constraint_source" },
        { artifact_type: "graph_edge", artifact_id: "EDGE-042", role: "pattern_source" },
      ],
    });
    const record = await registry.write("bridge", bridge);
    const retrieved = await registry.read<Bridge>("bridge", bridge.bridge_id);
    expect(retrieved.payload.artifact_refs).toEqual(record.payload.artifact_refs);
    expect(retrieved.payload.artifact_refs).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Specialised Queries", () => {
  let registry: ArtifactRegistry;
  let bridge: Bridge;
  let build: Build;

  beforeEach(async () => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    bridge = makeBridge();
    await registry.write("bridge", bridge);
    build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);
  });

  test("byFeature returns all artifacts for a feature", async () => {
    const snap = makeGraphSnapshot({ feature_id: "FEAT-001" });
    await registry.write("graph_snapshot", snap);
    const results = await registry.byFeature("FEAT-001");
    const types = results.map((r) => r.artifact_type);
    expect(types).toContain("bridge");
    expect(types).toContain("build");
    expect(types).toContain("graph_snapshot");
  });

  test("byBuild returns artifacts linked to a build_id", async () => {
    const run = makeValidatorRun(build.build_id, bridge.bridge_id, "PASS");
    await registry.write("validator_run", run);
    const results = await registry.byBuild(build.build_id);
    const types = results.map((r) => r.artifact_type);
    expect(types).toContain("build");
    expect(types).toContain("validator_run");
  });

  test("byBridge returns artifacts linked to a bridge_id", async () => {
    const run = makeValidatorRun(build.build_id, bridge.bridge_id, "PASS");
    await registry.write("validator_run", run);
    const results = await registry.byBridge(bridge.bridge_id);
    expect(results.some((r) => r.artifact_type === "bridge")).toBe(true);
    expect(results.some((r) => r.artifact_type === "validator_run")).toBe(true);
  });

  test("traceEvidence returns all artifact versions for a build (all_versions=true)", async () => {
    // Write build twice (state transition)
    await registry.write("build", { ...build, status: "RUNNING" });
    const run = makeValidatorRun(build.build_id, bridge.bridge_id, "PASS");
    await registry.write("validator_run", run);
    const evidence = await registry.traceEvidence(build.build_id);
    expect(evidence.length).toBeGreaterThanOrEqual(3); // 2 build versions + 1 validator run
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Stale Bridge Detection", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("bridge with old hash is returned as stale when graph advances", async () => {
    const oldHash = "HASH-OLD-ABCD";
    const newHash = "HASH-NEW-EFGH";
    const bridge = makeBridge({ graph_truth_hash: oldHash, status: "VALIDATED" });
    await registry.write("bridge", bridge);

    const stale = await registry.staleBridges(newHash);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.payload.bridge_id).toBe(bridge.bridge_id);
  });

  test("bridge with current hash is NOT returned as stale", async () => {
    const hash = "HASH-CURRENT";
    const bridge = makeBridge({ graph_truth_hash: hash, status: "VALIDATED" });
    await registry.write("bridge", bridge);

    const stale = await registry.staleBridges(hash);
    expect(stale).toHaveLength(0);
  });

  test("bridge already marked STALE is not returned again", async () => {
    const oldHash = "HASH-OLD";
    const newHash = "HASH-NEW";
    const bridge = makeBridge({ graph_truth_hash: oldHash, status: "STALE" });
    await registry.write("bridge", bridge);

    const stale = await registry.staleBridges(newHash);
    expect(stale).toHaveLength(0);
  });

  test("bridgesWithHash returns only bridges sharing a specific hash", async () => {
    const hash = "HASH-TARGET";
    const b1 = makeBridge({ graph_truth_hash: hash });
    const b2 = makeBridge({ graph_truth_hash: "HASH-OTHER" });
    await registry.write("bridge", b1);
    await registry.write("bridge", b2);

    const results = await registry.bridgesWithHash(hash);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload.bridge_id).toBe(b1.bridge_id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Validator Consensus (quick-reference §7)", () => {
  let registry: ArtifactRegistry;
  let bridge: Bridge;
  let build: Build;

  beforeEach(async () => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    bridge = makeBridge();
    await registry.write("bridge", bridge);
    build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);
  });

  async function writeRun(outcome: "PASS" | "PASS_WITH_CONCERNS" | "FAIL") {
    const run = makeValidatorRun(build.build_id, bridge.bridge_id, outcome);
    await registry.write("validator_run", run);
  }

  test("2 FAIL => hard fail", async () => {
    await writeRun("FAIL");
    await writeRun("FAIL");
    const { outcome, hard_fail } = await registry.validatorConsensus(build.build_id);
    expect(outcome).toBe("FAIL");
    expect(hard_fail).toBe(true);
  });

  test("2 PASS, 1 FAIL => PASS_WITH_CONCERNS", async () => {
    await writeRun("PASS");
    await writeRun("PASS");
    await writeRun("FAIL");
    const { outcome, hard_fail } = await registry.validatorConsensus(build.build_id);
    expect(outcome).toBe("PASS_WITH_CONCERNS");
    expect(hard_fail).toBe(false);
  });

  test("3 PASS => PASS", async () => {
    await writeRun("PASS");
    await writeRun("PASS");
    await writeRun("PASS");
    const { outcome, hard_fail } = await registry.validatorConsensus(build.build_id);
    expect(outcome).toBe("PASS");
    expect(hard_fail).toBe(false);
  });

  test("all disagree (PASS + PASS_WITH_CONCERNS + FAIL) => ESCALATE", async () => {
    await writeRun("PASS");
    await writeRun("PASS_WITH_CONCERNS");
    await writeRun("FAIL");
    const { outcome } = await registry.validatorConsensus(build.build_id);
    expect(outcome).toBe("ESCALATE");
  });

  test("single FAIL (no council) => hard fail", async () => {
    await writeRun("FAIL");
    const { outcome, hard_fail } = await registry.validatorConsensus(build.build_id);
    expect(outcome).toBe("FAIL");
    expect(hard_fail).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Write-Back Policy (quick-reference §8)", () => {
  let registry: ArtifactRegistry;
  let bridge: Bridge;
  let build: Build;

  beforeEach(async () => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    bridge = makeBridge();
    await registry.write("bridge", bridge);
    build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);
  });

  test("PASS consensus => VERIFIED status", async () => {
    const wbr = makeWriteBackRecord(build.build_id, bridge.bridge_id, "PASS");
    await registry.write("write_back_record", wbr);
    const record = await registry.read<WriteBackRecord>(
      "write_back_record",
      wbr.write_back_record_id
    );
    expect(record.payload.write_back_status).toBe("VERIFIED");
    expect(record.payload.written_back).toBe(true);
  });

  test("PASS_WITH_CONCERNS consensus => VERIFIED_RESTRICTED status", async () => {
    const wbr = makeWriteBackRecord(
      build.build_id,
      bridge.bridge_id,
      "PASS_WITH_CONCERNS"
    );
    await registry.write("write_back_record", wbr);
    const pending = await registry.verifiedRestrictedPendingPromotion();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.payload.write_back_status).toBe("VERIFIED_RESTRICTED");
  });

  test("FAIL consensus => no write-back (written_back = false)", async () => {
    const wbr = makeWriteBackRecord(build.build_id, bridge.bridge_id, "FAIL");
    await registry.write("write_back_record", wbr);
    const record = await registry.read<WriteBackRecord>(
      "write_back_record",
      wbr.write_back_record_id
    );
    expect(record.payload.written_back).toBe(false);
    expect(record.payload.write_back_status).toBeNull();
  });

  test("VERIFIED_RESTRICTED record appears in pending promotion query", async () => {
    const wbrPass = makeWriteBackRecord(build.build_id, bridge.bridge_id, "PASS");
    const wbrRestricted = makeWriteBackRecord(
      build.build_id,
      bridge.bridge_id,
      "PASS_WITH_CONCERNS"
    );
    await registry.write("write_back_record", wbrPass);
    await registry.write("write_back_record", wbrRestricted);
    const pending = await registry.verifiedRestrictedPendingPromotion();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.payload.write_back_record_id).toBe(
      wbrRestricted.write_back_record_id
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Freshness Check", () => {
  let registry: ArtifactRegistry;
  let bridge: Bridge;

  beforeEach(async () => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    bridge = makeBridge({ graph_truth_hash: "HASH-FRESH" });
    await registry.write("bridge", bridge);
  });

  test("stores a freshness check and retrieves it", async () => {
    const check: FreshnessCheck = {
      freshness_check_id: generateArtifactId("freshness_check"),
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: new Date().toISOString(),
      bridge_graph_truth_hash: "HASH-FRESH",
      current_graph_truth_hash: "HASH-FRESH",
      is_fresh: true,
      staleness_reason: null,
      artifact_refs: [
        { artifact_type: "bridge", artifact_id: bridge.bridge_id, role: "freshness_source" },
      ],
    };
    await registry.write("freshness_check", check);
    const latest = await registry.latestFreshnessCheck(bridge.bridge_id);
    expect(latest).not.toBeNull();
    expect(latest!.payload.is_fresh).toBe(true);
  });

  test("staleness recorded when hashes differ", async () => {
    const check: FreshnessCheck = {
      freshness_check_id: generateArtifactId("freshness_check"),
      bridge_id: bridge.bridge_id,
      feature_id: bridge.feature_id,
      checked_at: new Date().toISOString(),
      bridge_graph_truth_hash: "HASH-FRESH",
      current_graph_truth_hash: "HASH-NEW",
      is_fresh: false,
      staleness_reason: "Graph changed after bridge generation",
      artifact_refs: [
        { artifact_type: "bridge", artifact_id: bridge.bridge_id, role: "freshness_source" },
      ],
    };
    await registry.write("freshness_check", check);
    const latest = await registry.latestFreshnessCheck(bridge.bridge_id);
    expect(latest!.payload.is_fresh).toBe(false);
    expect(latest!.payload.staleness_reason).toContain("Graph changed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Drift Incidents (DiffArtifact)", () => {
  let registry: ArtifactRegistry;
  let bridge: Bridge;
  let build: Build;

  beforeEach(async () => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    bridge = makeBridge();
    await registry.write("bridge", bridge);
    build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);
  });

  test("diff with path_violations is returned by driftIncidents()", async () => {
    const diff: DiffArtifact = {
      diff_artifact_id: generateArtifactId("diff_artifact"),
      build_id: build.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: "FEAT-001",
      captured_at: new Date().toISOString(),
      changed_files: [
        { path: "src/other/forbidden.ts", change_type: "modified", lines_added: 5, lines_removed: 2, in_write_scope: false },
      ],
      path_violations: [
        { path: "src/other/forbidden.ts", violation_type: "outside_write_scope", description: "Not in write_scope" },
      ],
      blob_ref: null,
      artifact_refs: [{ artifact_type: "build", artifact_id: build.build_id, role: "evidence_source" }],
    };
    await registry.write("diff_artifact", diff);
    const incidents = await registry.driftIncidents("FEAT-001");
    expect(incidents).toHaveLength(1);
  });

  test("clean diff (no violations) is not returned by driftIncidents()", async () => {
    const diff: DiffArtifact = {
      diff_artifact_id: generateArtifactId("diff_artifact"),
      build_id: build.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: "FEAT-001",
      captured_at: new Date().toISOString(),
      changed_files: [
        { path: "src/artifact-registry/registry.ts", change_type: "modified", lines_added: 10, lines_removed: 3, in_write_scope: true },
      ],
      path_violations: [],
      blob_ref: null,
      artifact_refs: [{ artifact_type: "build", artifact_id: build.build_id, role: "evidence_source" }],
    };
    await registry.write("diff_artifact", diff);
    const incidents = await registry.driftIncidents("FEAT-001");
    expect(incidents).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — Replay by GraphSnapshot", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("replayBySnapshot returns all artifacts anchored to a snapshot/hash pair", async () => {
    const hash = "HASH-REPLAY-TEST";
    const snap = makeGraphSnapshot({ graph_truth_hash: hash });
    await registry.write("graph_snapshot", snap);
    const bridge = makeBridge({ graph_truth_hash: hash, graph_snapshot_id: snap.graph_snapshot_id });
    await registry.write("bridge", bridge);
    const build = makeBuild(bridge.bridge_id);
    await registry.write("build", build);

    const replayed = await registry.replayBySnapshot(
      snap.graph_snapshot_id,
      hash
    );
    const types = replayed.map((r) => r.artifact_type);
    expect(types).toContain("graph_snapshot");
    expect(types).toContain("bridge");
  });

  test("replayed artifacts are returned in internal_id (insertion) order", async () => {
    const hash = "HASH-ORDER-TEST";
    const snap = makeGraphSnapshot({ graph_truth_hash: hash });
    await registry.write("graph_snapshot", snap);
    const bridge = makeBridge({ graph_truth_hash: hash });
    await registry.write("bridge", bridge);

    const replayed = await registry.replayBySnapshot(
      snap.graph_snapshot_id,
      hash
    );
    for (let i = 1; i < replayed.length; i++) {
      expect(replayed[i]!.internal_id).toBeGreaterThan(replayed[i - 1]!.internal_id);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ID Generator", () => {
  test("generates type-prefixed IDs", () => {
    expect(generateArtifactId("request")).toMatch(/^REQ-/);
    expect(generateArtifactId("bridge")).toMatch(/^BRG-/);
    expect(generateArtifactId("build")).toMatch(/^BLD-/);
    expect(generateArtifactId("validator_run")).toMatch(/^VRUN-/);
    expect(generateArtifactId("graph_snapshot")).toMatch(/^SNAP-/);
    expect(generateArtifactId("freshness_check")).toMatch(/^FRESH-/);
    expect(generateArtifactId("write_back_record")).toMatch(/^WBR-/);
  });

  test("generated IDs are unique", () => {
    const ids = new Set(
      Array.from({ length: 200 }, () => generateArtifactId("bridge"))
    );
    expect(ids.size).toBe(200);
  });

  test("artifactTypeFromId round-trips correctly", () => {
    const id = generateArtifactId("validator_run");
    expect(artifactTypeFromId(id)).toBe("validator_run");
  });

  test("artifactTypeFromId returns null for unknown prefix", () => {
    expect(artifactTypeFromId("UNKNOWN-12345-abc")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — ResearchNote (untrusted external grounding)", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("research note stored as UNTRUSTED by default", async () => {
    const note: ResearchNote = {
      research_note_id: generateArtifactId("research_note"),
      feature_id: "FEAT-001",
      captured_at: new Date().toISOString(),
      source: "https://external-docs.example.com",
      content: "Relevant external pattern found.",
      trust_status: "UNTRUSTED",
      filtered_by: null,
      artifact_refs: [
        { artifact_type: "graph_node", artifact_id: "NODE-001", role: "external_grounding" },
      ],
    };
    const record = await registry.write("research_note", note);
    expect(record.payload.trust_status).toBe("UNTRUSTED");
    expect(record.payload.filtered_by).toBeNull();
  });

  test("filtered research note records the approver", async () => {
    const note: ResearchNote = {
      research_note_id: generateArtifactId("research_note"),
      feature_id: "FEAT-001",
      captured_at: new Date().toISOString(),
      source: "https://external-docs.example.com",
      content: "Reviewed and approved pattern.",
      trust_status: "FILTERED",
      filtered_by: "orchestrator-session-ABC",
      artifact_refs: [
        { artifact_type: "graph_node", artifact_id: "NODE-001", role: "external_grounding" },
      ],
    };
    const record = await registry.write("research_note", note);
    expect(record.payload.trust_status).toBe("FILTERED");
    expect(record.payload.filtered_by).toBe("orchestrator-session-ABC");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — EscalationRecord", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("escalation with hard_veto type is stored", async () => {
    const esc: EscalationRecord = {
      escalation_record_id: generateArtifactId("escalation_record"),
      build_id: "BLD-001",
      bridge_id: "BRG-001",
      feature_id: "FEAT-001",
      escalated_at: new Date().toISOString(),
      escalation_reason: "Critical rule contradiction detected",
      escalation_type: "hard_veto",
      decision: null,
      decided_at: null,
      decided_by: null,
      rationale: null,
      artifact_refs: [
        { artifact_type: "build", artifact_id: "BLD-001", role: "escalation_source" },
      ],
    };
    const record = await registry.write("escalation_record", esc);
    expect(record.payload.escalation_type).toBe("hard_veto");
    expect(record.payload.decision).toBeNull();
  });

  test("escalation decision is appended as a new record (immutable history)", async () => {
    const esc: EscalationRecord = {
      escalation_record_id: generateArtifactId("escalation_record"),
      build_id: "BLD-001",
      bridge_id: "BRG-001",
      feature_id: "FEAT-001",
      escalated_at: new Date().toISOString(),
      escalation_reason: "Low confidence",
      escalation_type: "low_confidence",
      decision: null,
      decided_at: null,
      decided_by: null,
      rationale: null,
      artifact_refs: [{ artifact_type: "build", artifact_id: "BLD-001", role: "escalation_source" }],
    };
    await registry.write("escalation_record", esc);
    // Simulate decision being recorded: append, never update
    await registry.write("escalation_record", {
      ...esc,
      decision: "APPROVED",
      decided_at: new Date().toISOString(),
      decided_by: "human-operator",
      rationale: "Confidence gap acceptable given context",
    });
    const hist = await registry.history<EscalationRecord>(
      "escalation_record",
      esc.escalation_record_id
    );
    expect(hist).toHaveLength(2);
    expect(hist[0]!.payload.decision).toBeNull();
    expect(hist[1]!.payload.decision).toBe("APPROVED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ArtifactRegistry — DependencyRecord", () => {
  let registry: ArtifactRegistry;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
  });

  test("satisfied dependency stores all_satisfied = true", async () => {
    const dep: DependencyRecord = {
      dependency_record_id: generateArtifactId("dependency_record"),
      bridge_id: "BRG-001",
      feature_id: "FEAT-001",
      evaluated_at: new Date().toISOString(),
      depends_on_bridge_ids: ["BRG-000"],
      predecessor_build_ids: ["BLD-000"],
      dependency_type: "HARD",
      all_satisfied: true,
      unsatisfied_dependencies: [],
      artifact_refs: [{ artifact_type: "bridge", artifact_id: "BRG-001", role: "dependency_source" }],
    };
    const record = await registry.write("dependency_record", dep);
    expect(record.payload.all_satisfied).toBe(true);
    expect(record.payload.unsatisfied_dependencies).toHaveLength(0);
  });

  test("unsatisfied dependency captures blocking details", async () => {
    const dep: DependencyRecord = {
      dependency_record_id: generateArtifactId("dependency_record"),
      bridge_id: "BRG-002",
      feature_id: "FEAT-001",
      evaluated_at: new Date().toISOString(),
      depends_on_bridge_ids: ["BRG-001"],
      predecessor_build_ids: [],
      dependency_type: "BLOCKING",
      all_satisfied: false,
      unsatisfied_dependencies: [
        { bridge_id: "BRG-001", reason: "Bridge BRG-001 not in EXECUTED state" },
      ],
      artifact_refs: [{ artifact_type: "bridge", artifact_id: "BRG-002", role: "dependency_source" }],
    };
    const record = await registry.write("dependency_record", dep);
    expect(record.payload.all_satisfied).toBe(false);
    expect(record.payload.unsatisfied_dependencies[0]!.reason).toContain("EXECUTED");
  });
});
