/**
 * AES Governance Training — Tests
 *
 * Proves the governance training system works end-to-end:
 *   1. GovernanceConfig as a first-class artifact
 *   2. Replay harness scores candidate configs
 *   3. Synthetic scenario generation
 *   4. Automated loop proposes, tests, and ranks candidates
 *   5. Frozen fields are never modified
 *   6. Rollback/demotion support
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import {
  createBaselineGovernanceConfig,
  validateGovernanceConfig,
} from "../src/governance/governance-config-defaults";
import { generateSyntheticScenarios } from "../src/governance/synthetic-scenarios";
import {
  runReplay,
  replayScenario,
  computeCompositeScore,
  SCORING_FORMULA_V1,
} from "../src/governance/replay-harness";
import {
  runGovernanceLoop,
  DEFAULT_LOOP_CONFIG,
} from "../src/governance/governance-loop";
import type {
  GovernanceConfig,
  ReplayScenario,
} from "../src/types/governance-types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRegistry() {
  return new ArtifactRegistry(new InMemoryStorage());
}

// ─── 1. GovernanceConfig as Artifact ────────────────────────────────────────

describe("GovernanceConfig artifact", () => {
  test("baseline config has correct defaults", () => {
    const config = createBaselineGovernanceConfig();

    expect(config.version).toBe(1);
    expect(config.created_by).toBe("bootstrap");
    expect(config.promotion_status).toBe("CANONICAL");

    // Trainable defaults match hardcoded values
    expect(config.trainable.confidence_weights.graph_coverage).toBe(0.35);
    expect(config.trainable.confidence_weights.pattern_strength).toBe(0.25);
    expect(config.trainable.confidence_weights.rule_consistency).toBe(0.20);
    expect(config.trainable.confidence_weights.evidence_level).toBe(0.20);

    expect(config.trainable.routing_thresholds.direct_build_floor).toBe(0.75);
    expect(config.trainable.routing_thresholds.caution_build_floor).toBe(0.60);
    expect(config.trainable.routing_thresholds.research_required_floor).toBe(0.40);

    // Frozen section
    expect(config.frozen.hard_veto_codes).toHaveLength(9);
    expect(config.frozen.confidence_never_overrides_vetoes).toBe(true);
    expect(config.frozen.append_only_storage).toBe(true);
    expect(config.frozen.validator_independence).toBe(true);
    expect(config.frozen.operator_gates_canonical).toBe(true);
  });

  test("writes to registry as append-only artifact", async () => {
    const registry = makeRegistry();
    const config = createBaselineGovernanceConfig();

    const record = await registry.write("governance_config", config);
    expect(record.artifact_type).toBe("governance_config");
    expect(record.sequence_number).toBe(1);

    // Write a new version — append, not update
    const v2 = { ...config, version: 2, governance_config_id: config.governance_config_id };
    const record2 = await registry.write("governance_config", v2);
    expect(record2.sequence_number).toBe(2);

    // History shows both versions
    const history = await registry.history("governance_config", config.governance_config_id);
    expect(history).toHaveLength(2);
  });

  test("validation catches bad configs", () => {
    const config = createBaselineGovernanceConfig();

    // Valid baseline
    expect(validateGovernanceConfig(config).valid).toBe(true);

    // Break weight sum
    const badWeights = structuredClone(config);
    badWeights.trainable.confidence_weights.graph_coverage = 0.90;
    const result = validateGovernanceConfig(badWeights);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("sum to");

    // Break threshold ordering
    const badThresholds = structuredClone(config);
    badThresholds.trainable.routing_thresholds.direct_build_floor = 0.50;
    badThresholds.trainable.routing_thresholds.caution_build_floor = 0.60;
    const result2 = validateGovernanceConfig(badThresholds);
    expect(result2.valid).toBe(false);

    // Break frozen section
    const badFrozen = structuredClone(config);
    (badFrozen.frozen as any).confidence_never_overrides_vetoes = false;
    const result3 = validateGovernanceConfig(badFrozen);
    expect(result3.valid).toBe(false);
    expect(result3.issues[0]).toContain("FROZEN VIOLATION");
  });
});

// ─── 2. Synthetic Scenarios ─────────────────────────────────────────────────

describe("Synthetic scenarios", () => {
  test("generates a diverse scenario set", () => {
    const scenarios = generateSyntheticScenarios();

    expect(scenarios.length).toBeGreaterThan(20);

    // Has all source types
    const sources = new Set(scenarios.map((s) => s.source));
    expect(sources.has("synthetic")).toBe(true);
    expect(sources.has("donor_derived")).toBe(true);

    // Has successes and failures
    const statuses = new Set(scenarios.map((s) => s.actual_outcome.build_status));
    expect(statuses.has("PASSED")).toBe(true);
    expect(statuses.has("FAILED")).toBe(true);
    expect(statuses.has("BLOCKED")).toBe(true);

    // Has veto scenarios
    const vetoScenarios = scenarios.filter((s) => s.actual_outcome.veto_triggered);
    expect(vetoScenarios.length).toBeGreaterThan(0);

    // Has all feature types
    const featureTypes = new Set(scenarios.map((s) => s.inputs.feature_type));
    expect(featureTypes.has("workflow")).toBe(true);
    expect(featureTypes.has("notification_system")).toBe(true);
    expect(featureTypes.has("collaboration_system")).toBe(true);
    expect(featureTypes.has("payments_and_billing_verification")).toBe(true);
    expect(featureTypes.has("onboarding")).toBe(true);
    expect(featureTypes.has("backend_platform")).toBe(true);

    // Has injection scenarios
    const injections = scenarios.filter((s) => s.tags.includes("injection"));
    expect(injections.length).toBeGreaterThan(0);
  });
});

// ─── 3. Replay Harness ─────────────────────────────────────────────────────

describe("Replay harness", () => {
  test("scores baseline config against scenarios", () => {
    const config = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const { run, report } = runReplay(config, scenarios);

    expect(run.scenario_count).toBe(scenarios.length);
    expect(run.results).toHaveLength(scenarios.length);
    expect(report.composite_score).toBeGreaterThan(0);
    expect(report.composite_score).toBeLessThanOrEqual(1);
    expect(report.scoring_formula).toBe(SCORING_FORMULA_V1);
  });

  test("catches real bugs in failure scenarios", () => {
    const config = createBaselineGovernanceConfig();

    // Scope violation scenario — should be caught
    const scopeViolation: ReplayScenario = {
      scenario_id: "TEST-SCOPE-FAIL",
      source: "manual",
      source_description: "Scope violation test",
      inputs: {
        bridge_confidence: 0.30,
        bridge_scope_size: 3,
        dependency_count: 0,
        has_critical_criteria: true,
        file_count: 6,
        feature_type: "backend_platform",
        risk_domain_tags: ["security"],
      },
      actual_outcome: {
        build_status: "FAILED",
        validator_outcome: "FAIL",
        had_scope_violations: true,
        had_test_failures: false,
        escalation_triggered: true,
        veto_triggered: false,
      },
      tags: ["test"],
    };

    const result = replayScenario(scopeViolation, config);
    // Low confidence should route to ESCALATE or RESEARCH_REQUIRED, catching the real bug
    expect(["ESCALATE", "RESEARCH_REQUIRED"]).toContain(result.predicted_route);
    expect(result.caught_real_bug).toBe(true);
    expect(result.false_alarm).toBe(false);
  });

  test("does not block valid high-confidence work", () => {
    const config = createBaselineGovernanceConfig();

    const validBuild: ReplayScenario = {
      scenario_id: "TEST-VALID-PASS",
      source: "manual",
      source_description: "Valid high-confidence build",
      inputs: {
        bridge_confidence: 0.90,
        bridge_scope_size: 3,
        dependency_count: 0,
        has_critical_criteria: true,
        file_count: 3,
        feature_type: "workflow",
        risk_domain_tags: [],
      },
      actual_outcome: {
        build_status: "PASSED",
        validator_outcome: "PASS",
        had_scope_violations: false,
        had_test_failures: false,
        escalation_triggered: false,
        veto_triggered: false,
      },
      tags: ["test"],
    };

    const result = replayScenario(validBuild, config);
    expect(result.predicted_route).toBe("DIRECT_BUILD");
    expect(result.blocked_valid_work).toBe(false);
    expect(result.correct_decision).toBe(true);
  });

  test("composite score formula is explicit and versioned", () => {
    const scores = {
      bugs_caught_rate: 0.8,
      false_alarm_rate: 0.1,
      valid_work_blocked_rate: 0.05,
      outcome_improvement: 0.75,
    };

    const composite = computeCompositeScore(scores);
    const expected = 0.25 * 0.8 + 0.25 * 0.9 + 0.25 * 0.95 + 0.25 * 0.75;
    expect(composite).toBeCloseTo(expected, 6);
  });

  test("compares candidate to baseline config", () => {
    const baseline = createBaselineGovernanceConfig();
    const candidate = structuredClone(baseline);
    candidate.governance_config_id = "GCFG-candidate-test";
    candidate.trainable.routing_thresholds.direct_build_floor = 0.80;

    const scenarios = generateSyntheticScenarios();
    const { report } = runReplay(candidate, scenarios, baseline);

    expect(report.baseline_config_id).toBe(baseline.governance_config_id);
    expect(report.baseline_composite_score).not.toBeNull();
    expect(report.delta).not.toBeNull();
    expect(["PROMOTE", "KEEP_TESTING", "REJECT"]).toContain(report.recommendation);
  });
});

// ─── 4. Automated Governance Loop ───────────────────────────────────────────

describe("Governance loop", () => {
  test("runs and produces ranked candidates", () => {
    const baseline = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 20, // small for test speed
    });

    expect(result.total_iterations).toBeGreaterThan(0);
    expect(result.baseline_score).toBeGreaterThan(0);
    expect(result.best_score).toBeGreaterThanOrEqual(result.baseline_score);
    // If improvements were found, best is SANDBOX_TESTED; if not, it stays CANONICAL
    const hasImprovements = result.ranked_candidates.length > 0;
    if (hasImprovements) {
      expect(result.best_config.promotion_status).toBe("SANDBOX_TESTED");
    } else {
      expect(result.best_config.promotion_status).toBe("CANONICAL");
    }
    expect(result.stop_reason).toBeTruthy();
  });

  test("never modifies frozen fields", () => {
    const baseline = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 30,
    });

    // Check that the best config's frozen section is identical to baseline
    expect(result.best_config.frozen).toEqual(baseline.frozen);

    // Check all ranked candidates
    for (const candidate of result.ranked_candidates) {
      const config = candidate.config;
      expect(config.frozen.hard_veto_codes).toEqual(baseline.frozen.hard_veto_codes);
      expect(config.frozen.confidence_never_overrides_vetoes).toBe(true);
      expect(config.frozen.append_only_storage).toBe(true);
      expect(config.frozen.validator_independence).toBe(true);
      expect(config.frozen.operator_gates_canonical).toBe(true);
    }
  });

  test("confidence weights remain normalized", () => {
    const baseline = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 30,
    });

    const w = result.best_config.trainable.confidence_weights;
    const sum = w.graph_coverage + w.pattern_strength + w.rule_consistency + w.evidence_level;
    expect(sum).toBeCloseTo(1.0, 2);
  });

  test("does not retry known failed proposals", () => {
    const baseline = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 50,
    });

    // Collect all rejected proposal field+value pairs
    // The loop should not retry the exact same rejected proposal
    const rejectedKeys = result.iterations
      .filter((i) => !i.accepted)
      .map((i) => `${i.proposal.target_field}:${i.proposal.proposed_value.toFixed(6)}`);

    const uniqueRejected = new Set(rejectedKeys);
    expect(uniqueRejected.size).toBe(rejectedKeys.length);
  });
});

// ─── 5. Rollback / Demotion ─────────────────────────────────────────────────

describe("Governance rollback", () => {
  test("config can be demoted", async () => {
    const registry = makeRegistry();
    const config = createBaselineGovernanceConfig();
    config.promotion_status = "VERIFIED";
    await registry.write("governance_config", config);

    // Demote it
    const demoted: GovernanceConfig = {
      ...config,
      promotion_status: "DEMOTED",
      demotion_reason: "Replay showed regression on real build data",
      replaced_by_config_id: "GCFG-replacement-001",
    };
    const record = await registry.write("governance_config", demoted);
    expect(record.payload.promotion_status).toBe("DEMOTED");
    expect(record.payload.demotion_reason).toBeTruthy();

    // History shows the transition
    const history = await registry.history("governance_config", config.governance_config_id);
    expect(history).toHaveLength(2);
    expect((history[0]!.payload as any).promotion_status).toBe("VERIFIED");
    expect((history[1]!.payload as any).promotion_status).toBe("DEMOTED");
  });
});

// ─── 6. Authority Boundaries ────────────────────────────────────────────────

describe("Authority boundaries", () => {
  test("loop candidates never reach beyond SANDBOX_TESTED", () => {
    const baseline = createBaselineGovernanceConfig();
    const scenarios = generateSyntheticScenarios();

    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 20,
    });

    for (const candidate of result.ranked_candidates) {
      expect(candidate.config.promotion_status).toBe("SANDBOX_TESTED");
    }
  });

  test("baseline starts as CANONICAL", () => {
    const baseline = createBaselineGovernanceConfig();
    expect(baseline.promotion_status).toBe("CANONICAL");
  });

  test("promotion lifecycle is enforced by type", () => {
    const config = createBaselineGovernanceConfig();

    // Valid promotion states
    const validStates: GovernanceConfig["promotion_status"][] = [
      "CANDIDATE",
      "SANDBOX_TESTED",
      "VERIFIED_RESTRICTED",
      "VERIFIED",
      "CANONICAL",
      "DEMOTED",
    ];

    for (const state of validStates) {
      config.promotion_status = state;
      // TypeScript enforces this at compile time
      expect(validStates).toContain(config.promotion_status);
    }
  });
});

// ─── 7. End-to-End ──────────────────────────────────────────────────────────

describe("End-to-end governance training", () => {
  test("full pipeline: config → scenarios → replay → loop → persist", async () => {
    const registry = makeRegistry();

    // Create and persist baseline
    const baseline = createBaselineGovernanceConfig();
    await registry.write("governance_config", baseline);

    // Generate scenarios
    const scenarios = generateSyntheticScenarios();
    expect(scenarios.length).toBeGreaterThan(20);

    // Run replay on baseline
    const { report: baselineReport } = runReplay(baseline, scenarios);
    expect(baselineReport.composite_score).toBeGreaterThan(0);

    // Run governance loop
    const result = runGovernanceLoop(baseline, scenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 15,
    });

    // Persist best config
    await registry.write("governance_config", result.best_config);

    // Persist proposals
    for (const iteration of result.iterations) {
      await registry.write("governance_proposal", iteration.proposal);
    }

    // Verify artifacts in registry
    const configs = await registry.latestByType("governance_config");
    expect(configs.length).toBeGreaterThanOrEqual(1);

    const proposals = await registry.latestByType("governance_proposal");
    expect(proposals.length).toBe(result.total_iterations);

    // Frozen section intact
    expect(result.best_config.frozen).toEqual(baseline.frozen);

    // Score improved or stayed same (never degraded)
    expect(result.best_score).toBeGreaterThanOrEqual(result.baseline_score);
  });
});
