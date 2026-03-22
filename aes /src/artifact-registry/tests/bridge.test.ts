/**
 * AES Bridge Layer — Tests
 *
 * Proves:
 *  1. BridgeCompiler produces append-only DRAFT bridges with computed confidence.
 *  2. BridgeValidator appends VALIDATED bridges when checks pass.
 *  3. BridgeValidator appends REJECTED bridges for scope, dependency, freshness,
 *     and critical test-mapping violations.
 */

import {
  ArtifactRegistry,
  InMemoryStorage,
  BridgeCompiler,
  BridgeValidator,
  type AcceptanceCriterion,
  type GraphSnapshot,
  type TestCase,
} from "../src";

const DUMMY_REF = {
  artifact_type: "graph_node" as const,
  artifact_id: "RULE-014",
  role: "constraint_source" as const,
};

function makeSnapshot(overrides: Partial<GraphSnapshot> = {}): GraphSnapshot {
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
    ...overrides,
  };
}

function securityCriterion(): AcceptanceCriterion {
  return {
    id: "AC-SEC-1",
    description: "Security boundary holds",
    type: "security",
    mandatory: true,
  };
}

function linkedSecurityTest(): TestCase {
  return {
    id: "TC-SEC-1",
    description: "Security boundary test",
    type: "boundary",
    linked_criterion_id: "AC-SEC-1",
    mandatory: true,
  };
}

describe("BridgeCompiler", () => {
  test("compile writes a DRAFT bridge with deterministic confidence", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry, () => new Date("2026-03-21T12:00:00.000Z"));
    const snapshot = makeSnapshot();

    const record = await compiler.compile({
      build_id: "BLD-001",
      feature_id: "FEAT-001",
      graph_snapshot: snapshot,
      intent: "Implement onboarding resume",
      scope: { paths: ["src/features/onboarding/**"] },
      read_scope: { paths: ["src/features/onboarding/**"] },
      write_scope: { paths: ["src/features/onboarding/**"] },
      acceptance_criteria: [securityCriterion()],
      test_cases: [linkedSecurityTest()],
      confidence_breakdown: {
        graph_coverage: 0.8,
        pattern_strength: 0.7,
        rule_consistency: 0.9,
        evidence_level: 0.6,
      },
      artifact_refs: [DUMMY_REF],
    });

    expect(record.payload.status).toBe("DRAFT");
    expect(record.payload.generated_at).toBe("2026-03-21T12:00:00.000Z");
    expect(record.payload.confidence).toBeCloseTo(0.755, 6);
    expect(record.sequence_number).toBe(1);
  });
});

describe("BridgeValidator", () => {
  test("validate appends VALIDATED bridge when checks pass", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry);
    const validator = new BridgeValidator(registry);
    const bridge = (
      await compiler.compile({
        build_id: "BLD-001",
        feature_id: "FEAT-001",
        graph_snapshot: makeSnapshot(),
        intent: "Implement onboarding resume",
        scope: { paths: ["src/features/onboarding/**"] },
        read_scope: { paths: ["src/features/onboarding/**"] },
        write_scope: { paths: ["src/features/onboarding/**"] },
        acceptance_criteria: [securityCriterion()],
        test_cases: [linkedSecurityTest()],
        confidence_breakdown: {
          graph_coverage: 0.8,
          pattern_strength: 0.8,
          rule_consistency: 0.8,
          evidence_level: 0.8,
        },
        artifact_refs: [DUMMY_REF],
      })
    ).payload;

    const result = await validator.validate({
      bridge,
      dependencies_satisfied: true,
      is_fresh: true,
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe("VALIDATED");
    expect(result.record.sequence_number).toBe(2);
    expect(result.record.payload.status).toBe("VALIDATED");
    expect(result.issues).toEqual([]);
  });

  test("validate rejects bridge when write scope is outside read scope", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry);
    const validator = new BridgeValidator(registry);
    const bridge = (
      await compiler.compile({
        build_id: "BLD-001",
        feature_id: "FEAT-001",
        graph_snapshot: makeSnapshot(),
        intent: "Implement onboarding resume",
        scope: { paths: ["src/features/onboarding/**"] },
        read_scope: { paths: ["src/features/onboarding/ui/**"] },
        write_scope: { paths: ["src/features/onboarding/api/**"] },
        confidence_breakdown: {
          graph_coverage: 0.8,
          pattern_strength: 0.8,
          rule_consistency: 0.8,
          evidence_level: 0.8,
        },
        artifact_refs: [DUMMY_REF],
      })
    ).payload;

    const result = await validator.validate({
      bridge,
      dependencies_satisfied: true,
      is_fresh: true,
    });

    expect(result.valid).toBe(false);
    expect(result.status).toBe("REJECTED");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "WRITE_SCOPE_NOT_READABLE"
    );
  });

  test("validate rejects bridge with unsatisfied dependencies", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry);
    const validator = new BridgeValidator(registry);
    const bridge = (
      await compiler.compile({
        build_id: "BLD-001",
        feature_id: "FEAT-001",
        graph_snapshot: makeSnapshot(),
        intent: "Implement onboarding resume",
        scope: { paths: ["src/features/onboarding/**"] },
        read_scope: { paths: ["src/features/onboarding/**"] },
        write_scope: { paths: ["src/features/onboarding/**"] },
        depends_on_bridge_ids: ["BRG-UPSTREAM"],
        dependency_type: "HARD",
        confidence_breakdown: {
          graph_coverage: 0.8,
          pattern_strength: 0.8,
          rule_consistency: 0.8,
          evidence_level: 0.8,
        },
        artifact_refs: [DUMMY_REF],
      })
    ).payload;

    const result = await validator.validate({
      bridge,
      dependencies_satisfied: false,
      is_fresh: true,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "DEPENDENCY_NOT_READY"
    );
  });

  test("validate rejects bridge with missing critical test mapping", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry);
    const validator = new BridgeValidator(registry);
    const bridge = (
      await compiler.compile({
        build_id: "BLD-001",
        feature_id: "FEAT-001",
        graph_snapshot: makeSnapshot(),
        intent: "Implement onboarding resume",
        scope: { paths: ["src/features/onboarding/**"] },
        read_scope: { paths: ["src/features/onboarding/**"] },
        write_scope: { paths: ["src/features/onboarding/**"] },
        acceptance_criteria: [securityCriterion()],
        test_cases: [],
        confidence_breakdown: {
          graph_coverage: 0.8,
          pattern_strength: 0.8,
          rule_consistency: 0.8,
          evidence_level: 0.8,
        },
        artifact_refs: [DUMMY_REF],
      })
    ).payload;

    const result = await validator.validate({
      bridge,
      dependencies_satisfied: true,
      is_fresh: true,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "CRITICAL_TEST_MAPPING_MISSING"
    );
  });

  test("validate rejects bridge when freshness has already failed", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const compiler = new BridgeCompiler(registry);
    const validator = new BridgeValidator(registry);
    const bridge = (
      await compiler.compile({
        build_id: "BLD-001",
        feature_id: "FEAT-001",
        graph_snapshot: makeSnapshot(),
        intent: "Implement onboarding resume",
        scope: { paths: ["src/features/onboarding/**"] },
        read_scope: { paths: ["src/features/onboarding/**"] },
        write_scope: { paths: ["src/features/onboarding/**"] },
        acceptance_criteria: [securityCriterion()],
        test_cases: [linkedSecurityTest()],
        confidence_breakdown: {
          graph_coverage: 0.8,
          pattern_strength: 0.8,
          rule_consistency: 0.8,
          evidence_level: 0.8,
        },
        artifact_refs: [DUMMY_REF],
      })
    ).payload;

    const result = await validator.validate({
      bridge,
      dependencies_satisfied: true,
      is_fresh: false,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "BRIDGE_NOT_FRESH"
    );
  });
});
