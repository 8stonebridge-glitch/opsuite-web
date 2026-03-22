/**
 * AES Policy Layer — Combined Policy Evaluation
 *
 * Hard vetoes always win over confidence routing.
 */
import type { ConfidenceBreakdown, ConfidenceRoute, HardVeto, TieredConstraint } from "../types";
import { type HardVetoInput } from "./hard-veto-engine";
export interface PolicyEvaluation {
    hard_vetoes: HardVeto[];
    hard_blocked: boolean;
    confidence_score: number;
    confidence_route: ConfidenceRoute;
    final_route: ConfidenceRoute;
    confidence_breakdown: ConfidenceBreakdown;
}
export declare class PolicyEngine {
    evaluate(input: HardVetoInput & {
        confidence_breakdown: ConfidenceBreakdown;
        tiered_constraints?: TieredConstraint[];
    }): PolicyEvaluation;
}
//# sourceMappingURL=policy-engine.d.ts.map