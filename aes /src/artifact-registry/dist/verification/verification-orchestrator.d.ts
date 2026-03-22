/**
 * AES Verification Orchestrator
 *
 * Coordinates the multi-pass verification flow for a build:
 *   Pass 1: typecheck (stop if fails for TWO_PASS/SKELETON)
 *   Pass 2: test (retry or stop based on policy)
 *   Final: all checks before promotion
 *
 * Integrates with:
 *   - VerificationRunner (runs checks)
 *   - BuildStrategySelector (determines policy)
 *   - RetryBriefGenerator (feeds failures into retries)
 *   - ArtifactRegistry (persists results)
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { BuildStrategy } from "../strategy/build-strategy-selector";
import { type TestRunnerAdapter } from "./verification-runner";
import type { VerificationPolicy, VerificationResult, VerificationRetryContext } from "./verification-types";
export interface VerificationOrchestrationInput {
    build_id: string;
    bridge_id: string;
    feature_id: string;
    project_dir: string;
    strategy: BuildStrategy;
    risk: "low" | "medium" | "high" | "critical";
    feature_type?: string;
    attempt_number: number;
    /** Override default policy */
    custom_policy?: VerificationPolicy;
}
export interface VerificationOrchestrationResult {
    /** Did all required passes succeed? */
    overall_pass: boolean;
    /** Which pass failed (null if all passed) */
    failed_at: "pass_1" | "pass_2" | "final" | null;
    /** Should the build stop immediately? */
    should_stop: boolean;
    /** Retry context if failed (feed into retry brief generator) */
    retry_context: VerificationRetryContext | null;
    /** All verification results for persistence */
    results: VerificationResult[];
    /** All persisted artifacts */
    artifact_ids: string[];
}
export declare class VerificationOrchestrator {
    private readonly registry;
    private readonly runner;
    constructor(registry: ArtifactRegistry, runnerAdapter: TestRunnerAdapter, _now?: () => Date);
    /**
     * Run the full verification flow for a build.
     * Respects the build strategy and verification policy.
     */
    verify(input: VerificationOrchestrationInput): Promise<VerificationOrchestrationResult>;
    /**
     * Check if a build's final verification passed.
     * Used as a promotion gate.
     */
    checkPromotionGate(buildId: string): Promise<{
        can_promote: boolean;
        reason: string;
        final_verification_id?: string;
    }>;
    private selectPolicy;
    private persist;
}
//# sourceMappingURL=verification-orchestrator.d.ts.map