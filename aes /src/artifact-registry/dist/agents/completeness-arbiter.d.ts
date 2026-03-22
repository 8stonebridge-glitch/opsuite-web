/**
 * AES Completeness Arbiter
 *
 * Backed by Gemini. Checks:
 *   - Is the feature set complete?
 *   - Are major flows missing?
 *   - Is backend/frontend coverage balanced?
 *   - Are there orphaned features with no connections?
 *
 * Does not build — only evaluates and recommends.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec, AppSpec } from "../types/app-spec";
export interface CompletenessEvaluation {
    evaluation_id: string;
    app_id: string;
    captured_at: string;
    source: "completeness_arbiter";
    extracted_by: "gemini";
    confidence: number;
    status: "UNTRUSTED";
    artifact_refs: ArtifactRef[];
    /** Overall completeness score 0-1 */
    completeness_score: number;
    /** Whether the feature set passes the completeness gate */
    passes_gate: boolean;
    /** Missing flows detected */
    missing_flows: MissingFlow[];
    /** Coverage gaps */
    coverage_gaps: CoverageGap[];
    /** Orphaned features (no dependencies in or out) */
    orphaned_features: string[];
    /** Balance assessment */
    balance: BalanceAssessment;
    /** Recommendations */
    recommendations: string[];
}
export interface MissingFlow {
    flow_name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    suggested_feature_id?: string;
}
export interface CoverageGap {
    area: "backend" | "frontend" | "testing" | "auth" | "error_handling" | "onboarding";
    description: string;
    affected_features: string[];
    severity: "low" | "medium" | "high";
}
export interface BalanceAssessment {
    backend_count: number;
    frontend_count: number;
    both_count: number;
    backend_only_count: number;
    frontend_only_count: number;
    balanced: boolean;
    concern?: string;
}
export declare class CompletenessArbiter {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    /**
     * Evaluate completeness of an app's feature set.
     * In production, this would call Gemini for deeper analysis.
     * This implementation provides rule-based evaluation.
     */
    evaluate(app: AppSpec, features: FeatureSpec[]): CompletenessEvaluation;
    private detectMissingFlows;
    private detectCoverageGaps;
    private findOrphanedFeatures;
    private assessBalance;
}
//# sourceMappingURL=completeness-arbiter.d.ts.map