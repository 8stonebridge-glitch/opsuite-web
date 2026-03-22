/**
 * AES Verification Types
 *
 * Defines the structured output of build verification checks.
 * Used by the verification runner, retry brief generator, and promotion gate.
 */
import type { ArtifactRef } from "../types/refs";
/** Built-in check types that map to run_quality_pipeline */
export type BuiltInCheck = "typecheck" | "test" | "lint" | "all";
/** A single check to run — either built-in or custom command */
export type CheckSpec = {
    type: "builtin";
    check: BuiltInCheck;
} | {
    type: "single";
    command: string;
    checkName: string;
};
/** Verification policy for a build — what checks to run at each pass */
export interface VerificationPolicy {
    /** Checks after pass 1 (types/signatures). Default: ["typecheck"] */
    pass_1_checks: CheckSpec[];
    /** Checks after pass 2 (implementation). Default: ["test"] */
    pass_2_checks: CheckSpec[];
    /** Checks before promotion. Default: ["all"] */
    final_checks: CheckSpec[];
    /** Stop the entire build if pass 1 fails (default true) */
    stop_on_pass_1_failure: boolean;
    /** Stop the entire build if pass 2 fails (default false — retry instead) */
    stop_on_pass_2_failure: boolean;
}
export type FailureClass = "type" | "test" | "lint" | "build" | "async" | "import" | "schema" | "auth" | "contract" | "unknown";
export interface CheckResult {
    name: string;
    passed: boolean;
    raw_output: string;
    normalized_error_summary?: string;
    failure_class?: FailureClass;
    /** Specific files that had errors, if detectable */
    failing_files?: string[];
    /** Specific symbols (functions/types) that failed, if detectable */
    failing_symbols?: string[];
    duration_ms: number;
}
export interface VerificationResult {
    verification_id: string;
    build_id: string;
    pass: "pass_1" | "pass_2" | "final";
    overall_pass: boolean;
    checks: CheckResult[];
    started_at: string;
    completed_at: string;
    total_duration_ms: number;
}
export interface VerificationArtifact {
    verification_id: string;
    build_id: string;
    bridge_id: string;
    feature_id: string;
    pass: "pass_1" | "pass_2" | "final";
    overall_pass: boolean;
    checks: CheckResult[];
    attempt_number: number;
    started_at: string;
    completed_at: string;
    total_duration_ms: number;
    artifact_refs: ArtifactRef[];
}
export interface VerificationRetryContext {
    attempt_number: number;
    failed_pass: "pass_1" | "pass_2" | "final";
    failed_check_names: string[];
    failure_classes: FailureClass[];
    normalized_error_summary: string;
    raw_output_excerpt: string;
    failing_files: string[];
    failing_symbols: string[];
}
export declare const DEFAULT_LOW_RISK_POLICY: VerificationPolicy;
export declare const DEFAULT_BACKEND_POLICY: VerificationPolicy;
export declare const DEFAULT_HIGH_RISK_POLICY: VerificationPolicy;
export declare const DEFAULT_FRONTEND_POLICY: VerificationPolicy;
//# sourceMappingURL=verification-types.d.ts.map