"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunOutcomeValidator = exports.DiffScopeValidator = void 0;
function diffArtifactRefs(diffArtifact) {
    return [
        ...diffArtifact.artifact_refs,
        {
            artifact_type: "diff_artifact",
            artifact_id: diffArtifact.diff_artifact_id,
            role: "validation_evidence",
        },
    ];
}
function testRunRefs(testRun) {
    return [
        ...testRun.artifact_refs,
        {
            artifact_type: "test_run",
            artifact_id: testRun.test_run_id,
            role: "validation_evidence",
        },
    ];
}
class DiffScopeValidator {
    constructor() {
        this.validator_id = "diff-scope-validator";
    }
    async validate(context) {
        const diffArtifacts = context.build_artifacts
            .filter((record) => record.artifact_type === "diff_artifact")
            .sort((left, right) => right.internal_id - left.internal_id);
        if (diffArtifacts.length === 0) {
            return {
                status: "PASS_WITH_CONCERNS",
                evidence: [
                    {
                        evidence_type: "runtime_observation",
                        description: "No diff artifact was recorded for this build.",
                    },
                ],
                missing: ["diff_artifact"],
                concerns: ["Builder outputs were not captured into a diff artifact."],
                confidence: 0.45,
            };
        }
        const latest = diffArtifacts[0].payload;
        const violations = latest.path_violations.map((violation) => ({
            rule: violation.violation_type,
            severity: "HARD",
            location: violation.path,
            description: violation.description,
        }));
        return {
            status: violations.length > 0 ? "FAIL" : "PASS",
            evidence: [
                {
                    evidence_type: "diff",
                    description: `Captured ${latest.changed_files.length} changed files with ${latest.path_violations.length} path violations.`,
                    artifact_ref: {
                        artifact_type: "diff_artifact",
                        artifact_id: latest.diff_artifact_id,
                        role: "validation_evidence",
                    },
                },
            ],
            violations,
            confidence: violations.length > 0 ? 0.2 : 0.95,
            artifact_refs: diffArtifactRefs(latest),
        };
    }
}
exports.DiffScopeValidator = DiffScopeValidator;
class TestRunOutcomeValidator {
    constructor() {
        this.validator_id = "test-run-validator";
    }
    async validate(context) {
        const testRuns = context.build_artifacts
            .filter((record) => record.artifact_type === "test_run")
            .sort((left, right) => right.internal_id - left.internal_id);
        if (testRuns.length === 0) {
            return {
                status: "PASS_WITH_CONCERNS",
                evidence: [
                    {
                        evidence_type: "runtime_observation",
                        description: "No test run artifact was recorded for this build.",
                    },
                ],
                missing: ["test_run"],
                concerns: ["Build completed without a recorded test run artifact."],
                confidence: 0.4,
            };
        }
        const latest = testRuns[0].payload;
        const failed = latest.failed > 0 || latest.status === "FAIL";
        return {
            status: failed ? "FAIL" : "PASS",
            evidence: [
                {
                    evidence_type: "test_run",
                    description: `Test run ${latest.test_run_id} reported ${latest.passed} passed, ${latest.failed} failed, ${latest.skipped} skipped.`,
                    artifact_ref: {
                        artifact_type: "test_run",
                        artifact_id: latest.test_run_id,
                        role: "validation_evidence",
                    },
                },
            ],
            violations: latest.failure_details.map((failure) => ({
                rule: failure.test_case_id,
                severity: "HARD",
                location: failure.location,
                description: failure.error_message,
            })),
            confidence: failed ? 0.15 : 0.92,
            artifact_refs: testRunRefs(latest),
        };
    }
}
exports.TestRunOutcomeValidator = TestRunOutcomeValidator;
//# sourceMappingURL=built-in-validators.js.map