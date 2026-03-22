/**
 * AES Planning — Promotion Engine
 *
 * Pure logic that evaluates typed packages against promotion gates and hard vetoes.
 * No I/O, no side effects. Takes AppSpec + FeatureSpec[], returns PromotionEvaluation.
 *
 * Pattern follows: policy/hard-veto-engine.ts
 *
 * Rules from CLAUDE.md §7:
 * - A package promotes only if all gates pass and no hard veto triggers
 * - No model should be able to argue its way through a weak spec
 * - Promotion is earned by passing gates, not by sounding persuasive
 */
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { PromotionEvaluation, PromotionGateResult, SpecHardVeto, VerificationReport } from "../types/promotion-types";
/**
 * Evaluate all promotion gates for an app + feature package.
 */
export declare function evaluatePromotionGates(app: AppSpec, features: FeatureSpec[]): PromotionGateResult[];
/**
 * Evaluate hard vetoes against a feature package.
 * Any blocking veto prevents promotion.
 */
export declare function evaluateSpecHardVetoes(features: FeatureSpec[]): SpecHardVeto[];
/**
 * Full promotion evaluation: gates + vetoes → decision.
 * Optionally incorporates a verification report.
 */
export declare function evaluatePromotion(app: AppSpec, features: FeatureSpec[], verificationReport?: VerificationReport): PromotionEvaluation;
/**
 * Compute topological dependency order for a set of features.
 * Exported for use by other planning modules.
 */
export declare function computeDependencyOrder(features: FeatureSpec[]): {
    order: string[];
    hasCycle: boolean;
    missingDeps: string[];
};
//# sourceMappingURL=promotion-engine.d.ts.map