"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorCoordinator = exports.NoValidatorRunsError = exports.PendingValidatorRunsError = exports.MissingValidatorEvidenceError = void 0;
const registry_1 = require("../registry");
const authority_checks_1 = require("../orchestrator/authority-checks");
const write_back_manager_1 = require("./write-back-manager");
class MissingValidatorEvidenceError extends Error {
    constructor(validatorRunId) {
        super(`Validator run ${validatorRunId} cannot complete without evidence.`);
        this.name = "MissingValidatorEvidenceError";
    }
}
exports.MissingValidatorEvidenceError = MissingValidatorEvidenceError;
class PendingValidatorRunsError extends Error {
    constructor(buildId) {
        super(`Build ${buildId} still has queued or running validator runs.`);
        this.name = "PendingValidatorRunsError";
    }
}
exports.PendingValidatorRunsError = PendingValidatorRunsError;
class NoValidatorRunsError extends Error {
    constructor(buildId) {
        super(`Build ${buildId} has no validator runs to finalize.`);
        this.name = "NoValidatorRunsError";
    }
}
exports.NoValidatorRunsError = NoValidatorRunsError;
function mergeArtifactRefs(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        for (const artifactRef of group) {
            const key = `${artifactRef.artifact_type}::${artifactRef.artifact_id}::${artifactRef.role}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(artifactRef);
            }
        }
    }
    return merged;
}
function cloneBuildWithStatus(build, status, nowIso) {
    return {
        ...build,
        status,
        blocked_reasons: [],
        ended_at: nowIso,
    };
}
function cloneBridgeWithStatus(bridge, status) {
    return {
        ...bridge,
        status,
    };
}
class ValidatorCoordinator {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
        this.writeBackManager = new write_back_manager_1.WriteBackManager(registry, now);
    }
    async queueValidatorRun(input) {
        const validatorRun = {
            validator_id: input.validator_id,
            validator_run_id: (0, registry_1.generateArtifactId)("validator_run"),
            build_id: input.build_id,
            bridge_id: input.bridge_id,
            validated_at: this.now().toISOString(),
            status: "QUEUED",
            evidence: [],
            violations: [],
            missing: [],
            concerns: [],
            confidence: 0,
            artifact_refs: input.artifact_refs,
        };
        return this.registry.write("validator_run", validatorRun);
    }
    async markValidatorRunning(validatorRunId) {
        const record = await this.registry.read("validator_run", validatorRunId);
        (0, authority_checks_1.assertValidatorRunTransition)(record.payload.status, "RUNNING");
        const running = {
            ...record.payload,
            status: "RUNNING",
            validated_at: this.now().toISOString(),
        };
        return this.registry.write("validator_run", running);
    }
    async completeValidatorRun(input) {
        if (input.evidence.length === 0) {
            throw new MissingValidatorEvidenceError(input.validator_run_id);
        }
        const record = await this.registry.read("validator_run", input.validator_run_id);
        (0, authority_checks_1.assertValidatorRunTransition)(record.payload.status, input.status);
        const completed = {
            ...record.payload,
            status: input.status,
            validated_at: this.now().toISOString(),
            evidence: input.evidence,
            violations: input.violations ?? [],
            missing: input.missing ?? [],
            concerns: input.concerns ?? [],
            confidence: input.confidence,
            artifact_refs: mergeArtifactRefs(record.payload.artifact_refs, input.artifact_refs ?? []),
        };
        return this.registry.write("validator_run", completed);
    }
    async executeValidators(buildId, adapters) {
        const context = await this.buildExecutionContext(buildId);
        const completedRuns = [];
        for (const adapter of adapters) {
            const queued = await this.queueValidatorRun({
                validator_id: adapter.validator_id,
                build_id: context.build_record.payload.build_id,
                bridge_id: context.bridge_record.payload.bridge_id,
                artifact_refs: mergeArtifactRefs(context.build_record.payload.artifact_refs, [
                    {
                        artifact_type: "build",
                        artifact_id: context.build_record.payload.build_id,
                        role: "validation_evidence",
                    },
                    {
                        artifact_type: "bridge",
                        artifact_id: context.bridge_record.payload.bridge_id,
                        role: "validation_evidence",
                    },
                ]),
            });
            await this.markValidatorRunning(queued.payload.validator_run_id);
            const result = await adapter.validate(context);
            completedRuns.push(await this.completeValidatorRun({
                validator_run_id: queued.payload.validator_run_id,
                ...result,
            }));
        }
        return {
            validator_runs: completedRuns,
            finalization: await this.finalizeBuild(buildId),
        };
    }
    async finalizeBuild(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        const build = buildRecord.payload;
        const bridgeRecord = await this.registry.read("bridge", build.bridge_id);
        const bridge = bridgeRecord.payload;
        (0, authority_checks_1.assertBuildTransition)(build.status, "PASSED");
        (0, authority_checks_1.assertBridgeTransition)(bridge.status, "EXECUTED");
        const consensus = await this.registry.validatorConsensus(buildId);
        if (consensus.validator_runs.length === 0) {
            throw new NoValidatorRunsError(buildId);
        }
        if (consensus.pending_runs.length > 0) {
            throw new PendingValidatorRunsError(buildId);
        }
        if (consensus.outcome === "ESCALATE") {
            const escalationRecord = {
                escalation_record_id: (0, registry_1.generateArtifactId)("escalation_record"),
                build_id: build.build_id,
                bridge_id: bridge.bridge_id,
                feature_id: build.feature_id,
                escalated_at: this.now().toISOString(),
                escalation_reason: "Validator runs did not reach actionable consensus.",
                escalation_type: "validator_disagreement",
                decision: null,
                decided_at: null,
                decided_by: null,
                rationale: null,
                artifact_refs: mergeArtifactRefs(build.artifact_refs, [
                    {
                        artifact_type: "build",
                        artifact_id: build.build_id,
                        role: "escalation_source",
                    },
                    {
                        artifact_type: "bridge",
                        artifact_id: bridge.bridge_id,
                        role: "escalation_source",
                    },
                ], consensus.validator_runs.map((record) => ({
                    artifact_type: "validator_run",
                    artifact_id: record.payload.validator_run_id,
                    role: "escalation_source",
                }))),
            };
            return {
                state: "ESCALATED",
                validator_outcome: "ESCALATE",
                escalation_record: await this.registry.write("escalation_record", escalationRecord),
                validator_runs: consensus.validator_runs,
            };
        }
        const terminalStatus = consensus.outcome === "FAIL" ? "FAILED" : "PASSED";
        const nowIso = this.now().toISOString();
        const finalBuildRecord = await this.registry.write("build", cloneBuildWithStatus(build, terminalStatus, nowIso));
        const executedBridgeRecord = await this.registry.write("bridge", cloneBridgeWithStatus(bridge, "EXECUTED"));
        const writeBackResult = await this.writeBackManager.recordForBuild(buildId, {
            validator_outcome: consensus.outcome,
            artifact_refs: [
                {
                    artifact_type: "build",
                    artifact_id: finalBuildRecord.payload.build_id,
                    role: "evidence_source",
                },
                {
                    artifact_type: "bridge",
                    artifact_id: executedBridgeRecord.payload.bridge_id,
                    role: "evidence_source",
                },
            ],
        });
        return {
            state: "FINALIZED",
            outcome: terminalStatus,
            validator_outcome: consensus.outcome,
            build_record: finalBuildRecord,
            bridge_record: executedBridgeRecord,
            write_back_record: writeBackResult.write_back_record,
            validator_runs: consensus.validator_runs,
        };
    }
    async buildExecutionContext(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        return {
            build_record: buildRecord,
            bridge_record: bridgeRecord,
            build_artifacts: await this.registry.traceEvidence(buildId),
        };
    }
}
exports.ValidatorCoordinator = ValidatorCoordinator;
//# sourceMappingURL=validator-coordinator.js.map