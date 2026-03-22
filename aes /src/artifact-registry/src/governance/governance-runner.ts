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
import { InMemoryStorage } from "../registry/storage";
import { createBaselineGovernanceConfig } from "./governance-config-defaults";
import { generateSyntheticScenarios } from "./synthetic-scenarios";
import { loadHistoricalScenarios } from "./historical-scenario-converter";
import { runGovernanceLoop, DEFAULT_LOOP_CONFIG } from "./governance-loop";
import type {
  GovernanceConfig,
  ReplayScenario,
} from "../types/governance-types";

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
export async function runGovernanceTraining(
  registry?: ArtifactRegistry,
  maxIterations?: number,
): Promise<RunnerResult> {
  // Setup
  const reg = registry ?? new ArtifactRegistry(new InMemoryStorage());

  // 1. Create baseline
  const baseline = createBaselineGovernanceConfig();
  await reg.write("governance_config", baseline);

  // 2. Generate scenarios — synthetic + historical
  const synthetic = generateSyntheticScenarios();
  let historical: ReplayScenario[] = [];
  try {
    historical = await loadHistoricalScenarios(reg);
  } catch {
    // No historical data yet — that's fine, synthetic only
  }
  const scenarios = [...synthetic, ...historical];

  if (historical.length > 0) {
    console.log(`Historical scenarios loaded: ${historical.length}`);
  }

  // 3. Run the loop
  const loopConfig = {
    ...DEFAULT_LOOP_CONFIG,
    max_iterations: maxIterations ?? DEFAULT_LOOP_CONFIG.max_iterations,
  };

  console.log(`\n═══ AES Governance Training Loop ═══`);
  console.log(`Baseline config: ${baseline.governance_config_id}`);
  console.log(`Scenarios: ${scenarios.length}`);
  console.log(`Max iterations: ${loopConfig.max_iterations}`);
  console.log(`Step size: ${loopConfig.step_size}`);
  console.log(`Convergence threshold: ${loopConfig.convergence_threshold}`);
  console.log(`Starting...\n`);

  const startTime = Date.now();
  const result = runGovernanceLoop(baseline, scenarios, loopConfig);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. Persist all artifacts
  // Write best config
  await reg.write("governance_config", result.best_config);

  // Write all ranked candidates
  for (const candidate of result.ranked_candidates) {
    await reg.write("governance_config", candidate.config);
  }

  // Write all proposals
  for (const iteration of result.iterations) {
    await reg.write("governance_proposal", iteration.proposal);
  }

  // 5. Print summary
  const accepted = result.iterations.filter((i) => i.accepted).length;
  const rejected = result.iterations.filter((i) => !i.accepted).length;

  console.log(`\n═══ Governance Training Complete ═══`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`Iterations: ${result.total_iterations}`);
  console.log(`Accepted: ${accepted} | Rejected: ${rejected}`);
  console.log(`Converged: ${result.converged}`);
  console.log(`Stop reason: ${result.stop_reason}`);
  console.log(`\nBaseline score: ${result.baseline_score.toFixed(4)}`);
  console.log(`Best score:     ${result.best_score.toFixed(4)}`);
  console.log(`Improvement:    ${((result.best_score - result.baseline_score) * 100).toFixed(2)}%`);

  if (result.ranked_candidates.length > 0) {
    console.log(`\n── Top Ranked SANDBOX_TESTED Candidates ──`);
    for (let i = 0; i < result.ranked_candidates.length; i++) {
      const c = result.ranked_candidates[i]!;
      console.log(`  ${i + 1}. ${c.proposal_summary}`);
      console.log(`     Score: ${c.score.toFixed(4)} (Δ ${(c.delta * 100).toFixed(2)}%)`);
    }
  }

  console.log(`\n── Frozen Governance (never modified) ──`);
  console.log(`  Hard veto codes: ${baseline.frozen.hard_veto_codes.length}`);
  console.log(`  Security stops: ${baseline.frozen.security_stop_conditions.length}`);
  console.log(`  confidence_never_overrides_vetoes: true`);
  console.log(`  append_only_storage: true`);
  console.log(`  validator_independence: true`);
  console.log(`  operator_gates_canonical: true`);

  console.log(`\n── Current Scoring Formula ──`);
  console.log(`  composite = 0.25 * bugs_caught + 0.25 * (1 - false_alarms)`);
  console.log(`            + 0.25 * (1 - blocked_valid) + 0.25 * outcome_improvement`);

  console.log(`\n── Recommended Next 3 Supervised Builds ──`);
  console.log(`  1. Build FEAT-AES-REAL-006 (frontend shell) through AES workflow`);
  console.log(`     Generates real build artifacts for governance training`);
  console.log(`  2. Build FEAT-AES-REAL-007 (notifications) through AES workflow`);
  console.log(`     Tests governance on a notification_system feature class`);
  console.log(`  3. Intentional failure: submit a build with missing auth requirements`);
  console.log(`     Tests hard veto detection on real (not synthetic) data`);

  console.log(`\n── Operator Actions Required ──`);
  console.log(`  Review ranked candidates above`);
  console.log(`  Promote chosen candidates: SANDBOX_TESTED → VERIFIED_RESTRICTED`);
  console.log(`  Run supervised builds to generate real training data`);
  console.log(`  Re-run governance loop with real + synthetic data combined\n`);

  return {
    baseline_config: baseline,
    best_config: result.best_config,
    baseline_score: result.baseline_score,
    best_score: result.best_score,
    total_iterations: result.total_iterations,
    accepted_proposals: accepted,
    rejected_proposals: rejected,
    converged: result.converged,
    stop_reason: result.stop_reason,
    ranked_candidates: result.ranked_candidates.map((c) => ({
      config_id: c.config.governance_config_id,
      score: c.score,
      delta: c.delta,
      summary: c.proposal_summary,
    })),
    frozen_fields: [
      ...baseline.frozen.hard_veto_codes,
      ...baseline.frozen.security_stop_conditions,
    ],
    scoring_formula: "composite = 0.25 * bugs_caught + 0.25 * (1 - false_alarms) + 0.25 * (1 - blocked_valid) + 0.25 * outcome_improvement",
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (typeof require !== "undefined" && require.main === module) {
  const maxIter = parseInt(process.argv[2] ?? "200", 10);
  runGovernanceTraining(undefined, maxIter).catch(console.error);
}
