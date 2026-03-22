"use strict";
/**
 * AES Policy Layer — Combined Policy Evaluation
 *
 * Hard vetoes always win over confidence routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const confidence_engine_1 = require("./confidence-engine");
const hard_veto_engine_1 = require("./hard-veto-engine");
class PolicyEngine {
    evaluate(input) {
        const hard_vetoes = (0, hard_veto_engine_1.evaluateHardVetoes)(input);
        const confidence = input.tiered_constraints
            ? (0, confidence_engine_1.evaluateConfidenceWithAuthority)(input.confidence_breakdown, input.tiered_constraints)
            : (0, confidence_engine_1.evaluateConfidence)(input.confidence_breakdown);
        const hard_blocked = hard_vetoes.some((veto) => veto.blocking);
        return {
            hard_vetoes,
            hard_blocked,
            confidence_score: confidence.score,
            confidence_route: confidence.route,
            final_route: hard_blocked ? "ESCALATE" : confidence.route,
            confidence_breakdown: input.confidence_breakdown,
        };
    }
}
exports.PolicyEngine = PolicyEngine;
//# sourceMappingURL=policy-engine.js.map