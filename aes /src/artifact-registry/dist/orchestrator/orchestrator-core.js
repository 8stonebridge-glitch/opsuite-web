"use strict";
/**
 * AES Orchestrator Layer — Core State Transitions
 *
 * Owns the trusted control-plane transitions for bridge/build authorization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorCore = exports.IncompleteValidatorRunsError = exports.BuildEscalationRequiredError = void 0;
const registry_1 = require("../registry");
const validator_coordinator_1 = require("../postbuild/validator-coordinator");
const authority_checks_1 = require("./authority-checks");
class BuildEscalationRequiredError extends Error {
    constructor(buildId) {
        super(`Build ${buildId} requires escalation before terminalization.`);
        this.name = "BuildEscalationRequiredError";
    }
}
exports.BuildEscalationRequiredError = BuildEscalationRequiredError;
class IncompleteValidatorRunsError extends Error {
    constructor(buildId) {
        super(`Build ${buildId} still has queued or running validator work.`);
        this.name = "IncompleteValidatorRunsError";
    }
}
exports.IncompleteValidatorRunsError = IncompleteValidatorRunsError;
function cloneBuildWithStatus(build, status, nowIso, builderSessionId, blockedReasons) {
    return {
        ...build,
        status,
        blocked_reasons: status === "BLOCKED" ? blockedReasons ?? build.blocked_reasons : [],
        authorized_at: status === "AUTHORIZED" ? nowIso : build.authorized_at,
        started_at: status === "RUNNING" ? nowIso : build.started_at,
        ended_at: status === "BLOCKED" || status === "PASSED" || status === "FAILED"
            ? nowIso
            : build.ended_at,
        builder_session_id: builderSessionId !== undefined ? builderSessionId : build.builder_session_id,
    };
}
function pickBlockedReasonSource(artifactRefs, fallback, preferredRoles = [
    "constraint_source",
    "freshness_source",
    "dependency_source",
    "graph_snapshot_source",
    "scope_source",
]) {
    for (const role of preferredRoles) {
        const match = artifactRefs.find((artifactRef) => artifactRef.role === role);
        if (match) {
            return match.artifact_id;
        }
    }
    return artifactRefs[0]?.artifact_id ?? fallback;
}
function blockedReasonMessageFromVeto(veto) {
    return veto.message;
}
function pushBlockedReason(blockedReasons, blockedReason) {
    const duplicate = blockedReasons.some((existing) => existing.code === blockedReason.code &&
        existing.message === blockedReason.message &&
        existing.source === blockedReason.source);
    if (!duplicate) {
        blockedReasons.push(blockedReason);
    }
}
function makeBlockedReason(code, message, source, severity, timestamp) {
    return {
        code,
        message,
        source,
        severity,
        detected_by: "Codex",
        timestamp,
    };
}
function cloneBridgeWithStatus(bridge, status) {
    return {
        ...bridge,
        status,
    };
}
class OrchestratorCore {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async queueBuild(input) {
        const build = {
            build_id: input.build_id ?? (0, registry_1.generateArtifactId)("build"),
            bridge_id: input.bridge_id,
            feature_id: input.feature_id,
            status: "QUEUED",
            blocked_reasons: [],
            queued_at: this.now().toISOString(),
            authorized_at: null,
            started_at: null,
            ended_at: null,
            builder_session_id: null,
            artifact_refs: input.artifact_refs,
        };
        return this.registry.write("build", build);
    }
    async authorizeBuild(buildId, options = {}) {
        const buildRecord = await this.registry.read("build", buildId);
        const build = buildRecord.payload;
        const bridgeRecord = await this.registry.read("bridge", build.bridge_id);
        const bridge = bridgeRecord.payload;
        (0, authority_checks_1.assertBuildTransition)(build.status, "AUTHORIZED");
        const nowIso = this.now().toISOString();
        const blockedReasons = [];
        const bridgeSource = pickBlockedReasonSource(bridge.artifact_refs, bridge.graph_snapshot_id);
        if (bridge.status !== "VALIDATED") {
            pushBlockedReason(blockedReasons, makeBlockedReason("BRIDGE_NOT_VALIDATED", `Bridge ${bridge.bridge_id} is not VALIDATED.`, bridgeSource, "HIGH", nowIso));
        }
        const freshness = await this.registry.latestFreshnessCheck(bridge.bridge_id);
        if (!freshness) {
            pushBlockedReason(blockedReasons, makeBlockedReason("MISSING_FRESHNESS_CHECK", `Bridge ${bridge.bridge_id} has no freshness check.`, bridge.graph_snapshot_id, "HIGH", nowIso));
        }
        else if (!freshness.payload.is_fresh) {
            pushBlockedReason(blockedReasons, makeBlockedReason("BRIDGE_NOT_FRESH", freshness.payload.staleness_reason ??
                `Bridge ${bridge.bridge_id} is stale.`, pickBlockedReasonSource(freshness.payload.artifact_refs, freshness.payload.freshness_check_id, ["freshness_source", "graph_snapshot_source", "constraint_source"]), "HIGH", nowIso));
        }
        const dependency = await this.latestDependencyRecord(bridge.bridge_id);
        if (bridge.dependency_type !== "NONE" &&
            bridge.depends_on_bridge_ids.length > 0 &&
            (!dependency || !dependency.payload.all_satisfied)) {
            const dependencySource = dependency?.payload.unsatisfied_dependencies[0]?.bridge_id ??
                dependency?.payload.unsatisfied_dependencies[0]?.build_id ??
                dependency?.payload.dependency_record_id ??
                bridge.bridge_id;
            const dependencyMessage = dependency?.payload.unsatisfied_dependencies[0]?.reason ??
                `Bridge ${bridge.bridge_id} has unsatisfied dependencies.`;
            pushBlockedReason(blockedReasons, makeBlockedReason("DEPENDENCY_NOT_SATISFIED", dependencyMessage, dependencySource, "HIGH", nowIso));
        }
        if (options.policy_evaluation) {
            if (options.policy_evaluation.hard_blocked) {
                for (const veto of options.policy_evaluation.hard_vetoes) {
                    pushBlockedReason(blockedReasons, makeBlockedReason(veto.code, blockedReasonMessageFromVeto(veto), bridgeSource, "HIGH", nowIso));
                }
            }
            if (options.policy_evaluation.final_route === "RESEARCH_REQUIRED" ||
                options.policy_evaluation.final_route === "ESCALATE") {
                pushBlockedReason(blockedReasons, makeBlockedReason("POLICY_ROUTE_BLOCKED", `Policy route ${options.policy_evaluation.final_route} does not allow build authorization.`, "POLICY_ENGINE", options.policy_evaluation.final_route === "ESCALATE"
                    ? "HIGH"
                    : "MEDIUM", nowIso));
            }
        }
        const reasons = blockedReasons.map((blockedReason) => blockedReason.message);
        if (blockedReasons.length > 0) {
            const blockedBuild = cloneBuildWithStatus(build, "BLOCKED", nowIso, undefined, blockedReasons);
            const blockedRecord = await this.registry.write("build", blockedBuild);
            return {
                allowed: false,
                reasons,
                blocked_reasons: blockedReasons,
                build_record: blockedRecord,
            };
        }
        const authorizedBuild = cloneBuildWithStatus(build, "AUTHORIZED", nowIso, options.builder_session_id);
        const authorizedBuildRecord = await this.registry.write("build", authorizedBuild);
        (0, authority_checks_1.assertBridgeTransition)(bridge.status, "EXECUTING");
        const executingBridge = cloneBridgeWithStatus(bridge, "EXECUTING");
        const executingBridgeRecord = await this.registry.write("bridge", executingBridge);
        return {
            allowed: true,
            reasons: [],
            blocked_reasons: [],
            build_record: authorizedBuildRecord,
            bridge_record: executingBridgeRecord,
        };
    }
    async markBuildRunningByBuilder(buildId, builderSessionId) {
        const buildRecord = await this.registry.read("build", buildId);
        (0, authority_checks_1.assertBuildTransition)(buildRecord.payload.status, "RUNNING");
        const runningBuild = cloneBuildWithStatus(buildRecord.payload, "RUNNING", this.now().toISOString(), builderSessionId);
        return this.registry.write("build", runningBuild);
    }
    async markBuildFailed(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        (0, authority_checks_1.assertBuildTransition)(buildRecord.payload.status, "FAILED");
        const failedBuild = cloneBuildWithStatus(buildRecord.payload, "FAILED", this.now().toISOString());
        return this.registry.write("build", failedBuild);
    }
    async finalizeBuildFromValidators(buildId) {
        const coordinator = new validator_coordinator_1.ValidatorCoordinator(this.registry, this.now);
        try {
            const result = await coordinator.finalizeBuild(buildId);
            if (result.state === "ESCALATED") {
                throw new BuildEscalationRequiredError(buildId);
            }
            return {
                outcome: result.outcome,
                build_record: result.build_record,
                bridge_record: result.bridge_record,
                validator_outcome: result.validator_outcome,
            };
        }
        catch (error) {
            if (error instanceof validator_coordinator_1.PendingValidatorRunsError) {
                throw new IncompleteValidatorRunsError(buildId);
            }
            if (error instanceof validator_coordinator_1.NoValidatorRunsError) {
                throw new BuildEscalationRequiredError(buildId);
            }
            throw error;
        }
    }
    async latestDependencyRecord(bridgeId) {
        const artifacts = await this.registry.byBridge(bridgeId);
        const dependencyRecords = artifacts
            .filter((record) => record.artifact_type === "dependency_record")
            .sort((left, right) => right.internal_id - left.internal_id);
        if (dependencyRecords.length === 0) {
            return null;
        }
        return dependencyRecords[0];
    }
}
exports.OrchestratorCore = OrchestratorCore;
//# sourceMappingURL=orchestrator-core.js.map