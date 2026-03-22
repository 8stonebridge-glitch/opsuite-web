/**
 * AES Artifact Registry — Promotion Types
 *
 * Gates, vetoes, and evaluation results for the promotion pipeline.
 * Promotion decides whether a typed package becomes canonical graph truth.
 *
 * Pattern follows: hard-veto-engine.ts (pure functions, typed input, array output)
 */
export type PromotionGateName = "COVERAGE" | "DEPENDENCY" | "FLOW" | "BUILDABILITY" | "CONTRADICTION" | "CONFIDENCE_THRESHOLD" | "MISSING_QUESTIONS";
export interface PromotionGateResult {
    gate: PromotionGateName;
    passed: boolean;
    message: string;
    details?: Record<string, unknown>;
}
export type SpecHardVetoCode = "AUTH_AMBIGUITY" | "PERMISSION_AMBIGUITY" | "MISSING_DATA_OWNERSHIP" | "UNDEFINED_DESTRUCTIVE_BEHAVIOR" | "UNRESOLVED_DEPENDENCY_CONFLICT" | "INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS";
export interface SpecHardVeto {
    code: SpecHardVetoCode;
    feature_id: string;
    message: string;
    blocking: boolean;
}
export interface PromotionEvaluation {
    evaluation_id: string;
    app_id: string;
    gates: PromotionGateResult[];
    hard_vetoes: SpecHardVeto[];
    all_gates_passed: boolean;
    hard_blocked: boolean;
    decision: "PROMOTED" | "BLOCKED" | "REJECTED";
    reasons: string[];
    evaluated_at: string;
}
export interface VerificationReport {
    verification_id: string;
    app_id: string;
    verified_at: string;
    completeness_score: number;
    missing_flows: string[];
    dependency_issues: string[];
    backend_frontend_balance: {
        backend_coverage: number;
        frontend_coverage: number;
        gaps: string[];
    };
    contradictions: string[];
    overall_score: number;
    recommendation: "APPROVE" | "NEEDS_WORK" | "REJECT";
    notes: string[];
}
//# sourceMappingURL=promotion-types.d.ts.map