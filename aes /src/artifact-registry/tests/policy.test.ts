/**
 * AES Policy Layer — Tests
 *
 * Proves:
 *  1. Confidence routing follows quick-reference thresholds.
 *  2. Hard vetoes are deterministic and blocking.
 *  3. Hard vetoes override confidence routing.
 *  4. Missing critical test mappings are detected.
 */

import {
  PolicyEngine,
  evaluateConfidence,
  evaluateHardVetoes,
  type Bridge,
  type ConfidenceBreakdown,
} from "../src";

function makeBreakdown(overrides: Partial<ConfidenceBreakdown> = {}): ConfidenceBreakdown {
  return {
    graph_coverage: 0.8,
    pattern_strength: 0.8,
    rule_consistency: 0.8,
    evidence_level: 0.8,
    ...overrides,
  };
}

function makeBridge(overrides: Partial<Bridge> = {}): Bridge {
  return {
    bridge_id: "BRG-001",
    build_id: "BLD-001",
    feature_id: "FEAT-001",
    generated_at: new Date().toISOString(),
    graph_snapshot_id: "SNAP-001",
    graph_truth_hash: "sha256:abc",
    bridge_version: 1,
    intent: "Compile bridge",
    scope: { paths: ["src/**"] },
    out_of_scope: [],
    constraints: [],
    patterns: [],
    anti_patterns: [],
    data_model: {},
    api_contracts: [],
    events: [],
    db_touches: [],
    component_boundaries: [],
    read_scope: { paths: ["src/**"] },
    write_scope: { paths: ["src/**"] },
    read_scope_amendments: [],
    depends_on_bridge_ids: [],
    predecessor_build_ids: [],
    dependency_type: "NONE",
    acceptance_criteria: [],
    test_cases: [],
    confidence: 0.8,
    confidence_breakdown: makeBreakdown(),
    artifact_refs: [{ artifact_type: "graph_node", artifact_id: "RULE-1", role: "constraint_source" }],
    status: "VALIDATED",
    ...overrides,
  };
}

describe("Confidence engine", () => {
  test(">= 0.75 routes to DIRECT_BUILD", () => {
    const evaluation = evaluateConfidence(
      makeBreakdown({
        graph_coverage: 0.9,
        pattern_strength: 0.8,
        rule_consistency: 0.8,
        evidence_level: 0.8,
      })
    );

    expect(evaluation.route).toBe("DIRECT_BUILD");
  });

  test("0.60 - 0.74 routes to CAUTION_BUILD", () => {
    const evaluation = evaluateConfidence(
      makeBreakdown({
        graph_coverage: 0.65,
        pattern_strength: 0.6,
        rule_consistency: 0.6,
        evidence_level: 0.6,
      })
    );

    expect(evaluation.route).toBe("CAUTION_BUILD");
  });

  test("0.40 - 0.59 routes to RESEARCH_REQUIRED", () => {
    const evaluation = evaluateConfidence(
      makeBreakdown({
        graph_coverage: 0.45,
        pattern_strength: 0.45,
        rule_consistency: 0.45,
        evidence_level: 0.45,
      })
    );

    expect(evaluation.route).toBe("RESEARCH_REQUIRED");
  });

  test("< 0.40 routes to ESCALATE", () => {
    const evaluation = evaluateConfidence(
      makeBreakdown({
        graph_coverage: 0.2,
        pattern_strength: 0.2,
        rule_consistency: 0.2,
        evidence_level: 0.2,
      })
    );

    expect(evaluation.route).toBe("ESCALATE");
  });
});

describe("Hard veto engine", () => {
  test("validated fresh bridge with satisfied dependencies has no vetoes", () => {
    const vetoes = evaluateHardVetoes({
      bridge: makeBridge(),
      is_fresh: true,
      dependencies_satisfied: true,
    });

    expect(vetoes).toEqual([]);
  });

  test("bridge not fresh yields BRIDGE_NOT_FRESH veto", () => {
    const vetoes = evaluateHardVetoes({
      bridge: makeBridge(),
      is_fresh: false,
      dependencies_satisfied: true,
    });

    expect(vetoes.map((veto) => veto.code)).toContain("BRIDGE_NOT_FRESH");
  });

  test("non-validated bridge yields BRIDGE_NOT_VALIDATED veto", () => {
    const vetoes = evaluateHardVetoes({
      bridge: makeBridge({ status: "DRAFT" }),
      is_fresh: true,
      dependencies_satisfied: true,
    });

    expect(vetoes.map((veto) => veto.code)).toContain("BRIDGE_NOT_VALIDATED");
  });

  test("missing critical test mapping yields MISSING_CRITICAL_TEST_MAPPING veto", () => {
    const vetoes = evaluateHardVetoes({
      bridge: makeBridge({
        acceptance_criteria: [
          {
            id: "AC-SEC-1",
            description: "Critical security boundary",
            type: "security",
            mandatory: true,
          },
        ],
        test_cases: [],
      }),
      is_fresh: true,
      dependencies_satisfied: true,
    });

    expect(vetoes.map((veto) => veto.code)).toContain(
      "MISSING_CRITICAL_TEST_MAPPING"
    );
  });
});

describe("Policy engine", () => {
  test("high confidence with no vetoes routes to DIRECT_BUILD", () => {
    const engine = new PolicyEngine();
    const evaluation = engine.evaluate({
      bridge: makeBridge(),
      is_fresh: true,
      dependencies_satisfied: true,
      confidence_breakdown: makeBreakdown({
        graph_coverage: 0.9,
        pattern_strength: 0.9,
        rule_consistency: 0.8,
        evidence_level: 0.8,
      }),
    });

    expect(evaluation.hard_blocked).toBe(false);
    expect(evaluation.confidence_route).toBe("DIRECT_BUILD");
    expect(evaluation.final_route).toBe("DIRECT_BUILD");
  });

  test("hard veto overrides otherwise direct build confidence", () => {
    const engine = new PolicyEngine();
    const evaluation = engine.evaluate({
      bridge: makeBridge(),
      is_fresh: false,
      dependencies_satisfied: true,
      confidence_breakdown: makeBreakdown({
        graph_coverage: 0.9,
        pattern_strength: 0.9,
        rule_consistency: 0.9,
        evidence_level: 0.9,
      }),
    });

    expect(evaluation.confidence_route).toBe("DIRECT_BUILD");
    expect(evaluation.hard_blocked).toBe(true);
    expect(evaluation.final_route).toBe("ESCALATE");
    expect(evaluation.hard_vetoes.map((veto) => veto.code)).toContain(
      "BRIDGE_NOT_FRESH"
    );
  });
});
