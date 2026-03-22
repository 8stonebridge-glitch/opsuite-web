/**
 * AES Governance — Replay Harness
 *
 * Replays historical/synthetic build scenarios against a candidate
 * governance config and scores the results.
 *
 * Scoring formula (v1, equal weights):
 *   composite = 0.25 * bugs_caught_rate
 *             + 0.25 * (1 - false_alarm_rate)
 *             + 0.25 * (1 - valid_work_blocked_rate)
 *             + 0.25 * outcome_improvement
 *
 * The formula is explicit, inspectable, and versioned.
 */

import type {
  GovernanceConfig,
  ReplayScenario,
  ReplayRun,
  ReplayResult,
  ReplayReport,
  TrainableGovernance,
} from "../types/governance-types";
import type { ConfidenceRoute } from "../types/common";
import { generateArtifactId } from "../registry/id-generator";

// ─── Scoring Formula ────────────────────────────────────────────────────────

export const SCORING_FORMULA_V1 = "composite = 0.25 * bugs_caught + 0.25 * (1 - false_alarms) + 0.25 * (1 - blocked_valid) + 0.25 * outcome_improvement";

export function computeCompositeScore(scores: ReplayReport["scores"]): number {
  return (
    0.25 * scores.bugs_caught_rate +
    0.25 * (1 - scores.false_alarm_rate) +
    0.25 * (1 - scores.valid_work_blocked_rate) +
    0.25 * scores.outcome_improvement
  );
}

// ─── Confidence Simulation ──────────────────────────────────────────────────

/**
 * Simulate confidence routing using the candidate config's thresholds.
 */
function simulateRoute(
  score: number,
  thresholds: TrainableGovernance["routing_thresholds"]
): ConfidenceRoute {
  if (score >= thresholds.direct_build_floor) return "DIRECT_BUILD";
  if (score >= thresholds.caution_build_floor) return "CAUTION_BUILD";
  if (score >= thresholds.research_required_floor) return "RESEARCH_REQUIRED";
  return "ESCALATE";
}

/**
 * Simulate confidence score using the candidate config's weights.
 *
 * The breakdown dimensions are derived from scenario inputs to produce
 * meaningful spread across the confidence space. Each dimension uses
 * multiple scenario signals so that weight changes create real score
 * movement at decision boundaries.
 */
function simulateConfidence(
  scenario: ReplayScenario,
  weights: TrainableGovernance["confidence_weights"]
): number {
  const inp = scenario.inputs;

  // graph_coverage: base confidence penalized by scope size and dependencies
  // Large scopes with many dependencies = lower graph coverage
  const scopePenalty = Math.min(0.3, inp.bridge_scope_size * 0.015);
  const depPenalty = Math.min(0.2, inp.dependency_count * 0.06);
  const graph_coverage = Math.max(0.05, Math.min(1.0,
    inp.bridge_confidence - scopePenalty - depPenalty
  ));

  // pattern_strength: critical criteria boost, risk tags penalize
  // Security/auth risk domains reduce pattern confidence
  const riskPenalty = Math.min(0.35, (inp.risk_domain_tags?.length ?? 0) * 0.12);
  const critBoost = inp.has_critical_criteria ? 0.15 : -0.10;
  const pattern_strength = Math.max(0.05, Math.min(1.0,
    0.55 + critBoost - riskPenalty + (inp.bridge_confidence - 0.7) * 0.5
  ));

  // rule_consistency: penalized by dependencies and file count
  // Many files in scope = higher chance of rule inconsistency
  const filePenalty = Math.min(0.3, (inp.file_count ?? 5) * 0.02);
  const rule_consistency = Math.max(0.05, Math.min(1.0,
    0.85 - depPenalty * 1.5 - filePenalty
  ));

  // evidence_level: direct from bridge confidence, modulated by scope
  const evidence_level = Math.max(0.05, Math.min(1.0,
    inp.bridge_confidence * (1 - scopePenalty * 0.5)
  ));

  return (
    weights.graph_coverage * graph_coverage +
    weights.pattern_strength * pattern_strength +
    weights.rule_consistency * rule_consistency +
    weights.evidence_level * evidence_level
  );
}

// ─── Replay Engine ──────────────────────────────────────────────────────────

/**
 * Replay a single scenario against a candidate governance config.
 */
export function replayScenario(
  scenario: ReplayScenario,
  config: GovernanceConfig
): ReplayResult {
  const trainable = config.trainable;

  // Simulate what this config WOULD have done
  const simScore = simulateConfidence(scenario, trainable.confidence_weights);
  const predictedRoute = simulateRoute(simScore, trainable.routing_thresholds);
  const predictedBlocked = predictedRoute === "ESCALATE";
  const predictedEscalation = predictedRoute === "ESCALATE" || predictedRoute === "RESEARCH_REQUIRED";

  // Compare to actual outcomes
  const actual = scenario.actual_outcome;
  const wasRealBug = actual.build_status === "FAILED" || actual.had_scope_violations || actual.had_test_failures;
  const wasValidWork = actual.build_status === "PASSED" && !actual.had_scope_violations;

  // Risk-aware: high-risk scenarios that weren't escalated count as worse misses
  const isHighRisk = (scenario.inputs.risk_domain_tags?.length ?? 0) >= 2 ||
    scenario.inputs.risk_domain_tags?.some(t => ["auth", "security", "payments", "pii"].includes(t));
  const isLargeScope = (scenario.inputs.file_count ?? 5) > 10 || scenario.inputs.bridge_scope_size > 12;

  // Scoring logic
  let caughtRealBug = false;
  let falseAlarm = false;
  let blockedValidWork = false;
  let correctDecision = false;

  if (wasRealBug && (predictedBlocked || predictedEscalation)) {
    // Config would have caught/escalated a real problem
    caughtRealBug = true;
    correctDecision = true;
  } else if (wasRealBug && !predictedBlocked && !predictedEscalation) {
    // Config would have let a real problem through — worse if high risk
    correctDecision = false;
  } else if (wasValidWork && !predictedBlocked) {
    // Config correctly allowed valid work
    correctDecision = true;
  } else if (wasValidWork && predictedBlocked) {
    // Config would have blocked valid work
    blockedValidWork = true;
    correctDecision = false;
  } else if (!wasRealBug && predictedBlocked) {
    // Config would have blocked something that wasn't a bug
    falseAlarm = true;
    correctDecision = false;
  } else if (wasValidWork && predictedEscalation && !isHighRisk && !isLargeScope) {
    // Escalating simple, low-risk valid work is a soft false alarm
    falseAlarm = true;
    correctDecision = false;
  } else {
    // Ambiguous — escalation on ambiguous/risky case is acceptable
    correctDecision = predictedEscalation || isHighRisk;
  }

  return {
    scenario_id: scenario.scenario_id,
    predicted_route: predictedRoute,
    predicted_blocked: predictedBlocked,
    predicted_escalation: predictedEscalation,
    caught_real_bug: caughtRealBug,
    false_alarm: falseAlarm,
    blocked_valid_work: blockedValidWork,
    correct_decision: correctDecision,
  };
}

/**
 * Run the full replay harness: replay all scenarios, aggregate scores.
 */
export function runReplay(
  config: GovernanceConfig,
  scenarios: ReplayScenario[],
  baselineConfig?: GovernanceConfig,
): { run: ReplayRun; report: ReplayReport } {
  const startedAt = new Date().toISOString();
  const results: ReplayResult[] = scenarios.map((s) => replayScenario(s, config));
  const completedAt = new Date().toISOString();

  // Aggregate scores
  const totalScenarios = results.length;
  const realBugs = scenarios.filter(
    (s) => s.actual_outcome.build_status === "FAILED" || s.actual_outcome.had_scope_violations || s.actual_outcome.had_test_failures
  );
  const validWork = scenarios.filter(
    (s) => s.actual_outcome.build_status === "PASSED" && !s.actual_outcome.had_scope_violations
  );

  const bugsCaughtCount = results.filter((r) => r.caught_real_bug).length;
  const falseAlarmCount = results.filter((r) => r.false_alarm).length;
  const blockedValidCount = results.filter((r) => r.blocked_valid_work).length;
  const correctCount = results.filter((r) => r.correct_decision).length;

  const scores: ReplayReport["scores"] = {
    bugs_caught_rate: realBugs.length > 0 ? bugsCaughtCount / realBugs.length : 1.0,
    false_alarm_rate: totalScenarios > 0 ? falseAlarmCount / totalScenarios : 0,
    valid_work_blocked_rate: validWork.length > 0 ? blockedValidCount / validWork.length : 0,
    outcome_improvement: totalScenarios > 0 ? correctCount / totalScenarios : 0.5,
  };

  const compositeScore = computeCompositeScore(scores);

  // Compare to baseline if available
  let baselineComposite: number | null = null;
  let delta: number | null = null;
  if (baselineConfig) {
    const baselineResults = scenarios.map((s) => replayScenario(s, baselineConfig));
    const baselineRealBugs = scenarios.filter(
      (s) => s.actual_outcome.build_status === "FAILED" || s.actual_outcome.had_scope_violations || s.actual_outcome.had_test_failures
    );
    const baselineValidWork = scenarios.filter(
      (s) => s.actual_outcome.build_status === "PASSED" && !s.actual_outcome.had_scope_violations
    );
    const bBugsCaught = baselineResults.filter((r) => r.caught_real_bug).length;
    const bFalseAlarms = baselineResults.filter((r) => r.false_alarm).length;
    const bBlockedValid = baselineResults.filter((r) => r.blocked_valid_work).length;
    const bCorrect = baselineResults.filter((r) => r.correct_decision).length;
    const bScores: ReplayReport["scores"] = {
      bugs_caught_rate: baselineRealBugs.length > 0 ? bBugsCaught / baselineRealBugs.length : 1.0,
      false_alarm_rate: totalScenarios > 0 ? bFalseAlarms / totalScenarios : 0,
      valid_work_blocked_rate: baselineValidWork.length > 0 ? bBlockedValid / baselineValidWork.length : 0,
      outcome_improvement: totalScenarios > 0 ? bCorrect / totalScenarios : 0.5,
    };
    baselineComposite = computeCompositeScore(bScores);
    delta = compositeScore - baselineComposite;
  }

  // Recommendation
  let recommendation: ReplayReport["recommendation"];
  let recommendationReason: string;
  if (delta !== null && delta > 0.01) {
    recommendation = "PROMOTE";
    recommendationReason = `Composite score improved by ${(delta * 100).toFixed(1)}% over baseline`;
  } else if (delta !== null && delta < -0.01) {
    recommendation = "REJECT";
    recommendationReason = `Composite score decreased by ${(Math.abs(delta) * 100).toFixed(1)}% from baseline`;
  } else {
    recommendation = "KEEP_TESTING";
    recommendationReason = "Score within noise margin of baseline (±1%)";
  }

  const runId = generateArtifactId("replay_run");
  const reportId = generateArtifactId("replay_report");

  const run: ReplayRun = {
    replay_run_id: runId,
    governance_config_id: config.governance_config_id,
    started_at: startedAt,
    completed_at: completedAt,
    scenario_count: totalScenarios,
    scenarios_used: scenarios.map((s) => s.scenario_id),
    results,
    artifact_refs: [
      {
        artifact_type: "governance_config",
        artifact_id: config.governance_config_id,
        role: "governance_config_source",
      },
    ],
  };

  const report: ReplayReport = {
    replay_report_id: reportId,
    replay_run_id: runId,
    governance_config_id: config.governance_config_id,
    generated_at: completedAt,
    scores,
    composite_score: compositeScore,
    scoring_formula: SCORING_FORMULA_V1,
    baseline_config_id: baselineConfig?.governance_config_id ?? null,
    baseline_composite_score: baselineComposite,
    delta,
    recommendation,
    recommendation_reason: recommendationReason,
    artifact_refs: [
      {
        artifact_type: "replay_run",
        artifact_id: runId,
        role: "replay_evidence",
      },
      {
        artifact_type: "governance_config",
        artifact_id: config.governance_config_id,
        role: "governance_config_source",
      },
    ],
  };

  return { run, report };
}
