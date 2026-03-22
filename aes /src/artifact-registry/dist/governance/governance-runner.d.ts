/**
 * AES Governance — Loop Runner
 *
 * Entry point for running the governance training loop.
 * Can be invoked from CLI or programmatically.
 *
 * Usage:
 *   npx tsx src/artifact-registry/src/governance/governance-runner.ts
 *
 * The runner:
 *   1. Creates the baseline CANONICAL governance config
 *   2. Generates synthetic replay scenarios
 *   3. Runs the automated proposal loop
 *   4. Writes all results to the artifact registry
 *   5. Prints a summary report for operator review
 */
import { ArtifactRegistry } from "../registry/registry";
import type { GovernanceConfig } from "../types/governance-types";
export interface RunnerResult {
    baseline_config: GovernanceConfig;
    best_config: GovernanceConfig;
    baseline_score: number;
    best_score: number;
    total_iterations: number;
    accepted_proposals: number;
    rejected_proposals: number;
    converged: boolean;
    stop_reason: string;
    ranked_candidates: Array<{
        config_id: string;
        score: number;
        delta: number;
        summary: string;
    }>;
    frozen_fields: string[];
    scoring_formula: string;
}
/**
 * Run the full governance training loop and persist results.
 */
export declare function runGovernanceTraining(registry?: ArtifactRegistry, maxIterations?: number): Promise<RunnerResult>;
//# sourceMappingURL=governance-runner.d.ts.map