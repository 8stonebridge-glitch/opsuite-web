"use strict";
/**
 * AES Governance — Default Config Factory
 *
 * Creates the baseline GovernanceConfig artifact with all current
 * hardcoded values extracted into the trainable/frozen structure.
 *
 * These are the exact values from the current codebase:
 *   - confidence weights from common.ts computeConfidence()
 *   - routing thresholds from confidence-engine.ts routeConfidence()
 *   - authority tier weights from common.ts AUTHORITY_TIER_WEIGHTS
 *   - hard veto codes from common.ts HardVetoCode
 *   - promotion thresholds from promotion-engine.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultTrainable = createDefaultTrainable;
exports.createDefaultFrozen = createDefaultFrozen;
exports.createBaselineGovernanceConfig = createBaselineGovernanceConfig;
exports.validateGovernanceConfig = validateGovernanceConfig;
const id_generator_1 = require("../registry/id-generator");
function createDefaultTrainable() {
    return {
        confidence_weights: {
            graph_coverage: 0.35,
            pattern_strength: 0.25,
            rule_consistency: 0.20,
            evidence_level: 0.20,
        },
        routing_thresholds: {
            direct_build_floor: 0.75,
            caution_build_floor: 0.60,
            research_required_floor: 0.40,
        },
        promotion_thresholds: {
            min_feature_confidence: 0.60,
            max_missing_questions_per_feature: 3,
            builds_for_canonical: 3,
            min_description_length: 10,
        },
        authority_tier_weights: {
            CANONICAL: 1.0,
            VERIFIED: 0.9,
            VERIFIED_RESTRICTED: 0.7,
            PROVISIONAL: 0.5,
            DONOR_RAW: 0.4,
            UNTESTED: 0.2,
        },
        escalation_rules: {
            max_files_per_module_before_escalation: 10,
            max_scope_expansions_before_escalation: 3,
        },
        blocked_state_rules: {
            max_running_hours: 4,
            max_queued_builds: 20,
        },
        validator_consensus: {
            fail_count_for_hard_fail: 2,
        },
    };
}
function createDefaultFrozen() {
    return {
        hard_veto_codes: [
            "CRITICAL_RULE_CONTRADICTION",
            "MISSING_CRITICAL_TEST_MAPPING",
            "CRITICAL_GRAPH_TRUTH_CHANGE",
            "INVALID_BRIDGE_BOUNDARY",
            "UNRESOLVED_VALIDATOR_HARD_FAIL",
            "DEPENDENCY_NOT_SATISFIED",
            "BRIDGE_NOT_FRESH",
            "BRIDGE_NOT_VALIDATED",
            "CANONICAL_CONSTRAINT_VIOLATED",
        ],
        security_stop_conditions: [
            "auth_ambiguity_in_feature_spec",
            "permission_ambiguity_in_feature_spec",
            "missing_data_ownership",
            "undefined_destructive_behavior",
            "unresolved_dependency_conflict",
            "incomplete_critical_acceptance_tests",
        ],
        confidence_never_overrides_vetoes: true,
        append_only_storage: true,
        validator_independence: true,
        operator_gates_canonical: true,
    };
}
/**
 * Create the initial baseline GovernanceConfig.
 * This is the v1 CANONICAL config that the loop measures improvements against.
 */
function createBaselineGovernanceConfig() {
    return {
        governance_config_id: (0, id_generator_1.generateArtifactId)("governance_config"),
        version: 1,
        created_at: new Date().toISOString(),
        created_by: "bootstrap",
        trainable: createDefaultTrainable(),
        frozen: createDefaultFrozen(),
        promotion_status: "CANONICAL",
        replay_score: undefined,
        artifact_refs: [],
    };
}
/**
 * Validate that a governance config is structurally sound.
 * Used before writing to the registry.
 */
function validateGovernanceConfig(config) {
    const issues = [];
    const w = config.trainable.confidence_weights;
    // Weights must sum to ~1.0
    const weightSum = w.graph_coverage + w.pattern_strength + w.rule_consistency + w.evidence_level;
    if (Math.abs(weightSum - 1.0) > 0.01) {
        issues.push(`Confidence weights sum to ${weightSum.toFixed(4)}, expected 1.0`);
    }
    // All weights must be positive
    for (const [key, val] of Object.entries(w)) {
        if (val < 0)
            issues.push(`Confidence weight ${key} is negative: ${val}`);
        if (val > 1)
            issues.push(`Confidence weight ${key} exceeds 1.0: ${val}`);
    }
    // Routing thresholds must be ordered correctly
    const rt = config.trainable.routing_thresholds;
    if (rt.direct_build_floor <= rt.caution_build_floor) {
        issues.push("direct_build_floor must be > caution_build_floor");
    }
    if (rt.caution_build_floor <= rt.research_required_floor) {
        issues.push("caution_build_floor must be > research_required_floor");
    }
    if (rt.research_required_floor <= 0) {
        issues.push("research_required_floor must be > 0");
    }
    // Frozen section must be intact
    if (!config.frozen.confidence_never_overrides_vetoes) {
        issues.push("FROZEN VIOLATION: confidence_never_overrides_vetoes must be true");
    }
    if (!config.frozen.append_only_storage) {
        issues.push("FROZEN VIOLATION: append_only_storage must be true");
    }
    if (!config.frozen.validator_independence) {
        issues.push("FROZEN VIOLATION: validator_independence must be true");
    }
    if (!config.frozen.operator_gates_canonical) {
        issues.push("FROZEN VIOLATION: operator_gates_canonical must be true");
    }
    // Hard veto codes must all be present
    if (config.frozen.hard_veto_codes.length < 9) {
        issues.push(`FROZEN VIOLATION: expected 9 hard veto codes, got ${config.frozen.hard_veto_codes.length}`);
    }
    return { valid: issues.length === 0, issues };
}
//# sourceMappingURL=governance-config-defaults.js.map