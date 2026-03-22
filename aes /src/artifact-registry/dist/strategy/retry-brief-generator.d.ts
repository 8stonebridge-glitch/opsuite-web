/**
 * AES Retry Brief Generator
 *
 * When a build fails, this creates a targeted retry brief from
 * concrete failure evidence. The next build attempt gets the
 * specific errors and mitigations instead of rebuilding blind.
 *
 * Path 3: Better Failure Recovery
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
export interface RetryBriefInput {
    build_id: string;
    bridge_id: string;
    feature_id: string;
    attempt_number: number;
    /** Raw error output from test runner or build process */
    error_output: string;
    /** Parsed test failures if available */
    test_failures?: TestFailureDetail[];
    /** Validator violations if available */
    validator_violations?: string[];
    /** Scope violations if available */
    scope_violations?: string[];
}
export interface TestFailureDetail {
    test_name: string;
    error_message: string;
    expected?: string;
    actual?: string;
    file_path?: string;
    line_number?: number;
}
export interface RetryBrief {
    retry_brief_id: string;
    build_id: string;
    bridge_id: string;
    feature_id: string;
    attempt_number: number;
    created_at: string;
    /** Classified failure type */
    failure_type: FailureType;
    /** Human-readable failure summary */
    failure_summary: string;
    /** Specific errors that must be fixed */
    specific_errors: SpecificError[];
    /** Concrete mitigations to include in the retry prompt */
    mitigations: string[];
    /** Whether the retry should change strategy */
    strategy_change: StrategyChange | null;
    artifact_refs: ArtifactRef[];
}
export type FailureType = "COMPILE_ERROR" | "TYPE_ERROR" | "TEST_ASSERTION_FAILURE" | "RUNTIME_ERROR" | "SCOPE_VIOLATION" | "TIMEOUT" | "MISSING_FILES" | "IMPORT_MISMATCH" | "UNKNOWN";
export interface SpecificError {
    type: FailureType;
    message: string;
    file_path?: string;
    line_number?: number;
    fix_hint: string;
}
export interface StrategyChange {
    from: string;
    to: string;
    reason: string;
}
export declare class RetryBriefGenerator {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    generate(input: RetryBriefInput): RetryBrief;
    /**
     * Format the retry brief as a prompt section to inject into the builder prompt
     */
    formatForPrompt(brief: RetryBrief): string;
    private classifyErrors;
    private dominantFailureType;
    private generateSummary;
    private generateMitigations;
    private recommendStrategyChange;
    private tsErrorHint;
    private runtimeErrorHint;
}
//# sourceMappingURL=retry-brief-generator.d.ts.map