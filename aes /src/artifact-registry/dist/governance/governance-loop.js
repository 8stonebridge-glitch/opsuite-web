"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOOP_CONFIG = void 0;
exports.runGovernanceLoop = runGovernanceLoop;
exports.demoteConfig = demoteConfig;
const replay_harness_1 = require("./replay-harness");
const governance_config_defaults_1 = require("./governance-config-defaults");
const id_generator_1 = require("../registry/id-generator");
exports.DEFAULT_LOOP_CONFIG = {
    max_iterations: 200,
    convergence_threshold: 0.0005,
    step_size: 0.05,
    min_step_size: 0.005,
};
const TRAINABLE_FIELDS = [
    // Confidence weights
    { path: "trainable.confidence_weights.graph_coverage", min: 0.10, max: 0.60, dimension: "outcome_improvement" },
    { path: "trainable.confidence_weights.pattern_strength", min: 0.05, max: 0.50, dimension: "outcome_improvement" },
    { path: "trainable.confidence_weights.rule_consistency", min: 0.05, max: 0.50, dimension: "outcome_improvement" },
    { path: "trainable.confidence_weights.evidence_level", min: 0.05, max: 0.50, dimension: "outcome_improvement" },
    // Routing thresholds
    { path: "trainable.routing_thresholds.direct_build_floor", min: 0.65, max: 0.90, dimension: "bugs_caught" },
    { path: "trainable.routing_thresholds.caution_build_floor", min: 0.45, max: 0.75, dimension: "false_alarms" },
    { path: "trainable.routing_thresholds.research_required_floor", min: 0.20, max: 0.55, dimension: "valid_work_blocked" },
    // Promotion thresholds
    { path: "trainable.promotion_thresholds.min_feature_confidence", min: 0.40, max: 0.80, dimension: "outcome_improvement" },
    { path: "trainable.promotion_thresholds.builds_for_canonical", min: 2, max: 10, dimension: "bugs_caught" },
    // Escalation rules
    { path: "trainable.escalation_rules.max_files_per_module_before_escalation", min: 3, max: 30, dimension: "false_alarms" },
    { path: "trainable.escalation_rules.max_scope_expansions_before_escalation", min: 1, max: 10, dimension: "false_alarms" },
    // Validator consensus
    { path: "trainable.validator_consensus.fail_count_for_hard_fail", min: 1, max: 3, dimension: "bugs_caught" },
];
// ─── Field Access Helpers ───────────────────────────────────────────────────
function getNestedValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined)
            return 0;
        current = current[part];
    }
    return current;
}
function setNestedValue(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}
// ─── Weight Normalization ───────────────────────────────────────────────────
/**
 * After modifying one confidence weight, re-normalize so they sum to 1.0.
 * Adjusts the OTHER weights proportionally.
 */
function normalizeConfidenceWeights(config) {
    const w = config.trainable.confidence_weights;
    const sum = w.graph_coverage + w.pattern_strength + w.rule_consistency + w.evidence_level;
    if (Math.abs(sum - 1.0) > 0.001) {
        w.graph_coverage /= sum;
        w.pattern_strength /= sum;
        w.rule_consistency /= sum;
        w.evidence_level /= sum;
    }
}
// ─── The Loop ───────────────────────────────────────────────────────────────
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
function runGovernanceLoop(baselineConfig, scenarios, loopConfig = exports.DEFAULT_LOOP_CONFIG) {
    const iterations = [];
    const failedProposals = new Set(); // "path:value" to avoid retries
    const rankedCandidates = [];
    // Score the baseline
    const { report: baselineReport } = (0, replay_harness_1.runReplay)(baselineConfig, scenarios);
    const baselineScore = baselineReport.composite_score;
    let currentConfig = structuredClone(baselineConfig);
    let currentScore = baselineScore;
    let converged = false;
    let stopReason = "max_iterations";
    let consecutiveNoImprovement = 0;
    for (let i = 0; i < loopConfig.max_iterations; i++) {
        // Find the weakest dimension to target — but also try all fields
        const { report: currentReport } = (0, replay_harness_1.runReplay)(currentConfig, scenarios, baselineConfig);
        const weakDimension = findWeakestDimension(currentReport);
        // Sort fields: weakest-dimension fields first, then all others
        // This way the loop prioritizes the weakest dimension but can still
        // find improvements in other dimensions if the weak one is stuck
        const candidateFields = [
            ...TRAINABLE_FIELDS.filter((f) => f.dimension === weakDimension),
            ...TRAINABLE_FIELDS.filter((f) => f.dimension !== weakDimension),
        ];
        // Try each candidate field with multiple step sizes
        let improved = false;
        const stepSizes = [loopConfig.step_size, loopConfig.step_size * 0.5, loopConfig.step_size * 2, loopConfig.step_size * 0.25];
        for (const field of candidateFields) {
            const currentValue = getNestedValue(currentConfig, field.path);
            // Try multiple step sizes and both directions
            for (const step of stepSizes) {
                if (step < loopConfig.min_step_size)
                    continue;
                for (const direction of [1, -1]) {
                    const proposedValue = currentValue + direction * step;
                    const proposalKey = `${field.path}:${proposedValue.toFixed(6)}`;
                    // Skip if out of range or already tried
                    if (proposedValue < field.min || proposedValue > field.max)
                        continue;
                    if (failedProposals.has(proposalKey))
                        continue;
                    // Create candidate config
                    const candidateConfig = structuredClone(currentConfig);
                    candidateConfig.governance_config_id = (0, id_generator_1.generateArtifactId)("governance_config");
                    candidateConfig.version = currentConfig.version + 1;
                    candidateConfig.created_at = new Date().toISOString();
                    candidateConfig.created_by = "governance-loop";
                    candidateConfig.promotion_status = "CANDIDATE";
                    setNestedValue(candidateConfig, field.path, proposedValue);
                    // Normalize confidence weights if we changed one
                    if (field.path.includes("confidence_weights")) {
                        normalizeConfidenceWeights(candidateConfig);
                    }
                    // Validate
                    const validation = (0, governance_config_defaults_1.validateGovernanceConfig)(candidateConfig);
                    if (!validation.valid) {
                        failedProposals.add(proposalKey);
                        continue;
                    }
                    // Replay
                    const { report: candidateReport } = (0, replay_harness_1.runReplay)(candidateConfig, scenarios, baselineConfig);
                    const proposal = {
                        governance_proposal_id: (0, id_generator_1.generateArtifactId)("governance_proposal"),
                        proposed_at: new Date().toISOString(),
                        proposed_by: "governance-loop",
                        target_field: field.path,
                        previous_value: currentValue,
                        proposed_value: proposedValue,
                        rationale: `Targeting ${weakDimension}: adjusting ${field.path} from ${currentValue.toFixed(4)} to ${proposedValue.toFixed(4)}`,
                        target_dimension: weakDimension,
                        replay_report_id: candidateReport.replay_report_id,
                        replay_score: candidateReport.composite_score,
                        baseline_score: baselineScore,
                        score_delta: candidateReport.composite_score - currentScore,
                        status: "PENDING",
                        artifact_refs: [
                            {
                                artifact_type: "governance_config",
                                artifact_id: candidateConfig.governance_config_id,
                                role: "governance_config_source",
                            },
                            {
                                artifact_type: "replay_report",
                                artifact_id: candidateReport.replay_report_id,
                                role: "replay_evidence",
                            },
                        ],
                    };
                    const delta = candidateReport.composite_score - currentScore;
                    if (delta > loopConfig.convergence_threshold) {
                        // Improvement — keep it
                        proposal.status = "ACCEPTED";
                        candidateConfig.promotion_status = "SANDBOX_TESTED";
                        candidateConfig.replay_score = candidateReport.composite_score;
                        iterations.push({
                            iteration: i + 1,
                            proposal,
                            report: candidateReport,
                            accepted: true,
                        });
                        rankedCandidates.push({
                            config: structuredClone(candidateConfig),
                            score: candidateReport.composite_score,
                            delta: candidateReport.composite_score - baselineScore,
                            proposal_summary: `${field.path}: ${currentValue.toFixed(4)} → ${proposedValue.toFixed(4)} (+${(delta * 100).toFixed(2)}%)`,
                        });
                        currentConfig = candidateConfig;
                        currentScore = candidateReport.composite_score;
                        improved = true;
                        consecutiveNoImprovement = 0;
                        break;
                    }
                    else {
                        // No improvement or regression — revert
                        proposal.status = "REJECTED";
                        failedProposals.add(proposalKey);
                        iterations.push({
                            iteration: i + 1,
                            proposal,
                            report: candidateReport,
                            accepted: false,
                        });
                    }
                }
                if (improved)
                    break; // break out of step sizes loop
            }
            if (improved)
                break;
        }
        if (!improved) {
            consecutiveNoImprovement++;
            if (consecutiveNoImprovement >= 10) {
                converged = true;
                stopReason = "convergence — 10 consecutive iterations with no improvement";
                break;
            }
        }
    }
    // Sort ranked candidates by score descending
    rankedCandidates.sort((a, b) => b.score - a.score);
    return {
        iterations,
        best_config: currentConfig,
        best_score: currentScore,
        baseline_score: baselineScore,
        total_iterations: iterations.length,
        converged,
        stop_reason: stopReason,
        ranked_candidates: rankedCandidates.slice(0, 10), // top 10
    };
}
// ─── Demotion / Rollback ────────────────────────────────────────────────────
/**
 * Demote a governance config and rollback to a previous version.
 * The demoted config gets a DEMOTED status with a reason and link
 * to the replacement. Returns the replacement config marked as the
 * new active version.
 */
function demoteConfig(configToDemote, replacementConfig, reason) {
    const demoted = {
        ...structuredClone(configToDemote),
        promotion_status: "DEMOTED",
        demotion_reason: reason,
        replaced_by_config_id: replacementConfig.governance_config_id,
    };
    const replacement = {
        ...structuredClone(replacementConfig),
        version: configToDemote.version + 1,
        created_at: new Date().toISOString(),
        created_by: "rollback",
    };
    return { demoted, replacement };
}
// ─── Dimension Analysis ─────────────────────────────────────────────────────
function findWeakestDimension(report) {
    const scores = report.scores;
    // Invert rates where lower is better
    const dimensionScores = [
        { dimension: "bugs_caught", score: scores.bugs_caught_rate },
        { dimension: "false_alarms", score: 1 - scores.false_alarm_rate },
        { dimension: "valid_work_blocked", score: 1 - scores.valid_work_blocked_rate },
        { dimension: "outcome_improvement", score: scores.outcome_improvement },
    ];
    dimensionScores.sort((a, b) => a.score - b.score);
    return dimensionScores[0].dimension;
}
//# sourceMappingURL=governance-loop.js.map