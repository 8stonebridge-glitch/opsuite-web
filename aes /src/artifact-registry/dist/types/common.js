"use strict";
/**
 * AES Artifact Registry — Common Types
 *
 * Shared primitives used across all artifact schemas.
 * Derived from: aes-runtime-quick-reference.md, docs/artifact-model.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTHORITY_TIER_WEIGHTS = void 0;
exports.enforcementFromTier = enforcementFromTier;
exports.computeConfidence = computeConfidence;
exports.AUTHORITY_TIER_WEIGHTS = {
    CANONICAL: 1.0,
    VERIFIED: 0.9,
    VERIFIED_RESTRICTED: 0.7,
    PROVISIONAL: 0.5,
    DONOR_RAW: 0.4,
    UNTESTED: 0.2,
};
function enforcementFromTier(tier) {
    if (tier === "CANONICAL")
        return "MUST";
    if (tier === "VERIFIED" || tier === "VERIFIED_RESTRICTED")
        return "SHOULD";
    return "MAY";
}
/** Computed, not guessed. Final = 0.35*G + 0.25*P + 0.20*R + 0.20*E */
function computeConfidence(b) {
    return (0.35 * b.graph_coverage +
        0.25 * b.pattern_strength +
        0.20 * b.rule_consistency +
        0.20 * b.evidence_level);
}
//# sourceMappingURL=common.js.map