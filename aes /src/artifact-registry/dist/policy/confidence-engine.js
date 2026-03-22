"use strict";
/**
 * AES Policy Layer — Confidence Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeConfidence = routeConfidence;
exports.evaluateConfidence = evaluateConfidence;
exports.evaluateConfidenceWithAuthority = evaluateConfidenceWithAuthority;
const types_1 = require("../types");
function routeConfidence(score) {
    if (score >= 0.75) {
        return "DIRECT_BUILD";
    }
    if (score >= 0.60) {
        return "CAUTION_BUILD";
    }
    if (score >= 0.40) {
        return "RESEARCH_REQUIRED";
    }
    return "ESCALATE";
}
function evaluateConfidence(breakdown) {
    const score = (0, types_1.computeConfidence)(breakdown);
    return {
        score,
        route: routeConfidence(score),
        breakdown,
    };
}
function evaluateConfidenceWithAuthority(breakdown, tieredConstraints) {
    if (!tieredConstraints || tieredConstraints.length === 0) {
        return evaluateConfidence(breakdown);
    }
    const avgWeight = tieredConstraints.reduce((sum, c) => sum + types_1.AUTHORITY_TIER_WEIGHTS[c.authority_tier], 0) / tieredConstraints.length;
    const adjusted = {
        graph_coverage: breakdown.graph_coverage,
        pattern_strength: breakdown.pattern_strength * avgWeight,
        rule_consistency: breakdown.rule_consistency,
        evidence_level: breakdown.evidence_level * avgWeight,
    };
    const score = (0, types_1.computeConfidence)(adjusted);
    return {
        score,
        route: routeConfidence(score),
        breakdown: adjusted,
    };
}
//# sourceMappingURL=confidence-engine.js.map