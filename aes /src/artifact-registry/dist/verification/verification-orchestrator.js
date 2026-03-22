"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationOrchestrator = void 0;
const verification_runner_1 = require("./verification-runner");
const verification_types_1 = require("./verification-types");
// ─── Orchestrator ────────────────────────────────────────────────────────────
class VerificationOrchestrator {
    constructor(registry, runnerAdapter, _now = () => new Date()) {
        this.registry = registry;
        this.runner = new verification_runner_1.VerificationRunner(runnerAdapter);
    }
    /**
     * Run the full verification flow for a build.
     * Respects the build strategy and verification policy.
     */
    async verify(input) {
        const policy = input.custom_policy ?? this.selectPolicy(input.strategy, input.risk, input.feature_type);
        const results = [];
        const artifactIds = [];
        // ── Pass 1: Type-level checks ──────────────────────────────────────────
        if (policy.pass_1_checks.length > 0) {
            const pass1 = await this.runner.runChecks(input.build_id, input.project_dir, policy.pass_1_checks, "pass_1");
            results.push(pass1);
            const artId = await this.persist(pass1, input);
            artifactIds.push(artId);
            if (!pass1.overall_pass && policy.stop_on_pass_1_failure) {
                return {
                    overall_pass: false,
                    failed_at: "pass_1",
                    should_stop: true,
                    retry_context: verification_runner_1.VerificationRunner.toRetryContext(pass1, input.attempt_number),
                    results,
                    artifact_ids: artifactIds,
                };
            }
        }
        // ── Pass 2: Implementation-level checks ────────────────────────────────
        if (policy.pass_2_checks.length > 0) {
            const pass2 = await this.runner.runChecks(input.build_id, input.project_dir, policy.pass_2_checks, "pass_2");
            results.push(pass2);
            const artId = await this.persist(pass2, input);
            artifactIds.push(artId);
            if (!pass2.overall_pass && policy.stop_on_pass_2_failure) {
                return {
                    overall_pass: false,
                    failed_at: "pass_2",
                    should_stop: true,
                    retry_context: verification_runner_1.VerificationRunner.toRetryContext(pass2, input.attempt_number),
                    results,
                    artifact_ids: artifactIds,
                };
            }
            if (!pass2.overall_pass) {
                // Don't stop, but provide retry context
                return {
                    overall_pass: false,
                    failed_at: "pass_2",
                    should_stop: false,
                    retry_context: verification_runner_1.VerificationRunner.toRetryContext(pass2, input.attempt_number),
                    results,
                    artifact_ids: artifactIds,
                };
            }
        }
        // ── Final: Pre-promotion checks ────────────────────────────────────────
        if (policy.final_checks.length > 0) {
            const final = await this.runner.runChecks(input.build_id, input.project_dir, policy.final_checks, "final");
            results.push(final);
            const artId = await this.persist(final, input);
            artifactIds.push(artId);
            if (!final.overall_pass) {
                return {
                    overall_pass: false,
                    failed_at: "final",
                    should_stop: false,
                    retry_context: verification_runner_1.VerificationRunner.toRetryContext(final, input.attempt_number),
                    results,
                    artifact_ids: artifactIds,
                };
            }
        }
        // All passes succeeded
        return {
            overall_pass: true,
            failed_at: null,
            should_stop: false,
            retry_context: null,
            results,
            artifact_ids: artifactIds,
        };
    }
    /**
     * Check if a build's final verification passed.
     * Used as a promotion gate.
     */
    async checkPromotionGate(buildId) {
        const allVerifications = await this.registry.latestByType("verification");
        const buildVerifications = allVerifications.filter(v => v.payload.build_id === buildId);
        if (buildVerifications.length === 0) {
            return {
                can_promote: false,
                reason: "No verification results found for this build",
            };
        }
        const finalCheck = buildVerifications.find(v => v.payload.pass === "final");
        if (!finalCheck) {
            return {
                can_promote: false,
                reason: "Final verification pass has not been run",
            };
        }
        if (!finalCheck.payload.overall_pass) {
            const failedChecks = finalCheck.payload.checks
                .filter(c => !c.passed)
                .map(c => c.name);
            return {
                can_promote: false,
                reason: `Final verification failed: ${failedChecks.join(", ")}`,
                final_verification_id: finalCheck.payload.verification_id,
            };
        }
        return {
            can_promote: true,
            reason: "All final verification checks passed",
            final_verification_id: finalCheck.payload.verification_id,
        };
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    selectPolicy(strategy, risk, featureType) {
        // Strategy-specific overrides
        if (strategy === "ESCALATE") {
            // Escalated features need full verification
            return verification_types_1.DEFAULT_HIGH_RISK_POLICY;
        }
        // Risk-based selection
        if (risk === "high" || risk === "critical") {
            return verification_types_1.DEFAULT_HIGH_RISK_POLICY;
        }
        // Feature-type overrides
        if (featureType === "frontend_shell" || featureType === "notification_system") {
            return verification_types_1.DEFAULT_FRONTEND_POLICY;
        }
        if (featureType === "backend_platform" || featureType === "workflow_orchestration") {
            return verification_types_1.DEFAULT_BACKEND_POLICY;
        }
        if (risk === "low") {
            return verification_types_1.DEFAULT_LOW_RISK_POLICY;
        }
        // Default
        return verification_types_1.DEFAULT_BACKEND_POLICY;
    }
    async persist(result, input) {
        const artifact = {
            verification_id: result.verification_id,
            build_id: input.build_id,
            bridge_id: input.bridge_id,
            feature_id: input.feature_id,
            pass: result.pass,
            overall_pass: result.overall_pass,
            checks: result.checks,
            attempt_number: input.attempt_number,
            started_at: result.started_at,
            completed_at: result.completed_at,
            total_duration_ms: result.total_duration_ms,
            artifact_refs: [
                { artifact_type: "build", artifact_id: input.build_id, role: "validation_evidence" },
                { artifact_type: "bridge", artifact_id: input.bridge_id, role: "constraint_source" },
            ],
        };
        await this.registry.write("verification", artifact);
        return result.verification_id;
    }
}
exports.VerificationOrchestrator = VerificationOrchestrator;
//# sourceMappingURL=verification-orchestrator.js.map