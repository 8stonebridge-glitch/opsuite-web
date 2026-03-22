/**
 * AES Policy Layer — Confidence Engine
 */
import type { ConfidenceBreakdown, ConfidenceRoute, TieredConstraint } from "../types";
export interface ConfidenceEvaluation {
    score: number;
    route: ConfidenceRoute;
    breakdown: ConfidenceBreakdown;
}
export declare function routeConfidence(score: number): ConfidenceRoute;
export declare function evaluateConfidence(breakdown: ConfidenceBreakdown): ConfidenceEvaluation;
export declare function evaluateConfidenceWithAuthority(breakdown: ConfidenceBreakdown, tieredConstraints?: TieredConstraint[]): ConfidenceEvaluation;
//# sourceMappingURL=confidence-engine.d.ts.map