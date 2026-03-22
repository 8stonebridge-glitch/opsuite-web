"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderSessionAdapter = void 0;
const registry_1 = require("../registry");
const scope_guard_1 = require("./scope-guard");
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
class BuilderSessionAdapter {
    constructor(registry, scopeGuard, now = () => new Date()) {
        this.registry = registry;
        this.scopeGuard = scopeGuard;
        this.now = now;
    }
    async attemptRead(buildId, repoPath) {
        return this.scopeGuard.evaluateRead(buildId, repoPath);
    }
    async attemptWrite(buildId, repoPath) {
        return this.scopeGuard.evaluateWrite(buildId, repoPath);
    }
    async captureOutputs(input) {
        const { build, bridge } = await this.runningContext(input.build_id);
        const changedFiles = [];
        const violations = [];
        for (const changedFile of input.changed_files) {
            const decision = await this.scopeGuard.evaluateWrite(build.build_id, changedFile.path);
            changedFiles.push({
                ...changedFile,
                in_write_scope: decision.allowed,
            });
            if (!decision.allowed) {
                violations.push({
                    path: changedFile.path,
                    violation_type: "outside_write_scope",
                    description: decision.reason ?? `Path ${changedFile.path} is outside write_scope.`,
                });
            }
        }
        violations.push(...this.interfaceViolations(bridge, input.interface_touches ?? {}));
        const diffArtifact = {
            diff_artifact_id: (0, registry_1.generateArtifactId)("diff_artifact"),
            build_id: build.build_id,
            bridge_id: bridge.bridge_id,
            feature_id: build.feature_id,
            captured_at: this.now().toISOString(),
            changed_files: changedFiles,
            path_violations: violations,
            blob_ref: input.blob_ref ?? null,
            artifact_refs: mergeArtifactRefs(build.artifact_refs, [
                {
                    artifact_type: "build",
                    artifact_id: build.build_id,
                    role: "diff_source",
                },
                {
                    artifact_type: "bridge",
                    artifact_id: bridge.bridge_id,
                    role: "scope_source",
                },
            ], input.artifact_refs ?? []),
        };
        const diffRecord = await this.registry.write("diff_artifact", diffArtifact);
        return {
            diff_record: diffRecord,
            hard_failure: violations.length > 0,
            violations,
        };
    }
    interfaceViolations(bridge, touches) {
        const violations = [];
        const allowedApiContracts = new Set(bridge.api_contracts.map((apiContract) => apiContract.name));
        const allowedEvents = new Set(bridge.events.map((eventDefinition) => eventDefinition.name));
        const allowedDbTables = new Set(bridge.db_touches.map((dbTouch) => dbTouch.table));
        for (const apiContractName of touches.api_contract_names ?? []) {
            if (!allowedApiContracts.has(apiContractName)) {
                violations.push({
                    path: `api_contract:${apiContractName}`,
                    violation_type: "interface_boundary",
                    description: `API contract ${apiContractName} is outside the bridge contract.`,
                });
            }
        }
        for (const eventName of touches.event_names ?? []) {
            if (!allowedEvents.has(eventName)) {
                violations.push({
                    path: `event:${eventName}`,
                    violation_type: "interface_boundary",
                    description: `Event ${eventName} is outside the bridge contract.`,
                });
            }
        }
        for (const dbTable of touches.db_tables ?? []) {
            if (!allowedDbTables.has(dbTable)) {
                violations.push({
                    path: `db:${dbTable}`,
                    violation_type: "interface_boundary",
                    description: `DB touch ${dbTable} is outside the bridge contract.`,
                });
            }
        }
        return violations;
    }
    async runningContext(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        if (buildRecord.payload.status !== "RUNNING") {
            throw new scope_guard_1.BuildExecutionStateError(buildId, buildRecord.payload.status);
        }
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        return {
            build: buildRecord.payload,
            bridge: bridgeRecord.payload,
        };
    }
}
exports.BuilderSessionAdapter = BuilderSessionAdapter;
//# sourceMappingURL=builder-session-adapter.js.map