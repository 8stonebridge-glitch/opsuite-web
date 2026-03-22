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
import type { GovernanceConfig, ReplayScenario, ReplayRun, ReplayResult, ReplayReport } from "../types/governance-types";
export declare const SCORING_FORMULA_V1 = "composite = 0.25 * bugs_caught + 0.25 * (1 - false_alarms) + 0.25 * (1 - blocked_valid) + 0.25 * outcome_improvement";
export declare function computeCompositeScore(scores: ReplayReport["scores"]): number;
/**
 * Replay a single scenario against a candidate governance config.
 */
export declare function replayScenario(scenario: ReplayScenario, config: GovernanceConfig): ReplayResult;
/**
 * Run the full replay harness: replay all scenarios, aggregate scores.
 */
export declare function runReplay(config: GovernanceConfig, scenarios: ReplayScenario[], baselineConfig?: GovernanceConfig): {
    run: ReplayRun;
    report: ReplayReport;
};
//# sourceMappingURL=replay-harness.d.ts.map