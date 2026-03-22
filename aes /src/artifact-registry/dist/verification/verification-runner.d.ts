/**
 * AES Verification Runner
 *
 * Wraps the MCP testrunner to provide structured verification results.
 * Routes checks to run_quality_pipeline (built-in) or run_single_check (custom).
 *
 * Does NOT call MCP directly — accepts a runner adapter for testability.
 */
import type { CheckSpec, VerificationResult, VerificationRetryContext, BuiltInCheck } from "./verification-types";
export interface QualityPipelineResult {
    check: string;
    passed: boolean;
    output: string;
    duration_ms?: number;
}
export interface SingleCheckResult {
    checkName: string;
    passed: boolean;
    output: string;
    duration_ms?: number;
}
/**
 * Adapter interface for the test runner.
 * In production, this calls mcp__testrunner-mcp.
 * In tests, this is a mock.
 */
export interface TestRunnerAdapter {
    runQualityPipeline(projectDir: string, checks: BuiltInCheck[]): Promise<QualityPipelineResult[]>;
    runSingleCheck(projectDir: string, command: string, checkName: string): Promise<SingleCheckResult>;
}
export declare class VerificationRunner {
    private readonly runner;
    constructor(runner: TestRunnerAdapter);
    /**
     * Run a set of checks against a project directory.
     * Returns structured results with failure classification.
     */
    runChecks(buildId: string, projectDir: string, checks: CheckSpec[], pass: "pass_1" | "pass_2" | "final"): Promise<VerificationResult>;
    /**
     * Convert a failed verification result into retry context
     * for the retry brief generator.
     */
    static toRetryContext(result: VerificationResult, attemptNumber: number): VerificationRetryContext;
}
//# sourceMappingURL=verification-runner.d.ts.map