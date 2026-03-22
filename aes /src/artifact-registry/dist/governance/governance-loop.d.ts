/**
 * AES Governance — Automated Proposal Loop
 *
 * The engine that runs overnight. Proposes one targeted governance config
 * change per iteration, replays against scenarios, scores, keeps or reverts.
 *
 * Safety boundaries:
 *   - Frozen fields are NEVER modified
 *   - Only one parameter changes per iteration
 *   - Failed proposals are logged and never retried with the same value
 *   - The loop operates only in sandboxed replay, never live production truth
 *   - Operator approval required for promotion beyond SANDBOX_TESTED
 *
 * Convergence: the loop stops when score improvements fall below threshold
 * or max iterations are reached.
 */
import type { GovernanceConfig, GovernanceProposal, ReplayScenario, ReplayReport } from "../types/governance-types";
export interface LoopConfig {
    /** Max iterations before forced stop */
    max_iterations: number;
    /** Stop if composite score improvement < this per iteration */
    convergence_threshold: number;
    /** Step size for parameter adjustments */
    step_size: number;
    /** Minimum step size before giving up on a parameter */
    min_step_size: number;
}
export declare const DEFAULT_LOOP_CONFIG: LoopConfig;
export interface LoopIteration {
    iteration: number;
    proposal: GovernanceProposal;
    report: ReplayReport;
    accepted: boolean;
}
export interface LoopResult {
    iterations: LoopIteration[];
    best_config: GovernanceConfig;
    best_score: number;
    baseline_score: number;
    total_iterations: number;
    converged: boolean;
    stop_reason: string;
    /** Top candidates ranked by score, for operator review */
    ranked_candidates: Array<{
        config: GovernanceConfig;
        score: number;
        delta: number;
        proposal_summary: string;
    }>;
}
/**
 * Run the automated governance improvement loop.
 *
 * This is the main entry point. It:
 * 1. Reads the baseline (CANONICAL) config
 * 2. Identifies the weakest scoring dimension
 * 3. Proposes ONE targeted change
 * 4. Replays against all scenarios
 * 5. Scores the result
 * 6. If improved: keeps it as SANDBOX_TESTED
 * 7. If not: reverts and logs rejection
 * 8. Repeats until convergence or max iterations
 */
export declare function runGovernanceLoop(baselineConfig: GovernanceConfig, scenarios: ReplayScenario[], loopConfig?: LoopConfig): LoopResult;
/**
 * Demote a governance config and rollback to a previous version.
 * The demoted config gets a DEMOTED status with a reason and link
 * to the replacement. Returns the replacement config marked as the
 * new active version.
 */
export declare function demoteConfig(configToDemote: GovernanceConfig, replacementConfig: GovernanceConfig, reason: string): {
    demoted: GovernanceConfig;
    replacement: GovernanceConfig;
};
//# sourceMappingURL=governance-loop.d.ts.map