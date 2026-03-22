"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeGuard = exports.ScopeExpansionDecisionStateError = exports.BuildExecutionStateError = void 0;
const registry_1 = require("../registry");
class BuildExecutionStateError extends Error {
    constructor(buildId, status) {
        super(`Build ${buildId} must be RUNNING for builder execution controls, got ${status}.`);
        this.name = "BuildExecutionStateError";
    }
}
exports.BuildExecutionStateError = BuildExecutionStateError;
class ScopeExpansionDecisionStateError extends Error {
    constructor(requestId, status) {
        super(`Scope expansion request ${requestId} must be PENDING, got ${status}.`);
        this.name = "ScopeExpansionDecisionStateError";
    }
}
exports.ScopeExpansionDecisionStateError = ScopeExpansionDecisionStateError;
function dedupeStrings(values) {
    return Array.from(new Set(values));
}
function pathMatches(pattern, repoPath) {
    if (pattern === repoPath) {
        return true;
    }
    if (pattern.endsWith("/**")) {
        const prefix = pattern.slice(0, -3);
        return repoPath.startsWith(prefix);
    }
    return false;
}
function firstMatchingScope(repoPath, allowedPaths) {
    return allowedPaths.find((allowedPath) => pathMatches(allowedPath, repoPath)) ?? null;
}
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
class ScopeGuard {
    constructor(registry, options = {}, now = () => new Date()) {
        this.registry = registry;
        this.options = options;
        this.now = now;
    }
    async evaluateRead(buildId, repoPath) {
        const { bridge } = await this.runningContext(buildId);
        const matchedScope = firstMatchingScope(repoPath, bridge.read_scope.paths);
        return {
            allowed: matchedScope !== null,
            path: repoPath,
            access_type: "read",
            matched_scope: matchedScope,
            reason: matchedScope === null
                ? `Path ${repoPath} is outside the approved read_scope.`
                : null,
            protected_domains: matchedScope === null ? this.protectedDomainsForPath(repoPath) : [],
        };
    }
    async evaluateWrite(buildId, repoPath) {
        const { bridge } = await this.runningContext(buildId);
        const matchedScope = firstMatchingScope(repoPath, bridge.write_scope.paths);
        return {
            allowed: matchedScope !== null,
            path: repoPath,
            access_type: "write",
            matched_scope: matchedScope,
            reason: matchedScope === null
                ? `Path ${repoPath} is outside the approved write_scope.`
                : null,
            protected_domains: [],
        };
    }
    async requestReadScopeExpansion(input) {
        const { build, bridge } = await this.runningContext(input.build_id);
        const requestedPaths = dedupeStrings(input.requested_paths);
        const protectedDomains = this.protectedDomainsForPaths(requestedPaths);
        const request = {
            scope_expansion_request_id: (0, registry_1.generateArtifactId)("scope_expansion_request"),
            build_id: build.build_id,
            bridge_id: bridge.bridge_id,
            feature_id: build.feature_id,
            requested_at: this.now().toISOString(),
            requested_paths: requestedPaths,
            reason: input.reason,
            status: "PENDING",
            artifact_refs: mergeArtifactRefs(build.artifact_refs, [
                {
                    artifact_type: "build",
                    artifact_id: build.build_id,
                    role: "scope_source",
                },
                {
                    artifact_type: "bridge",
                    artifact_id: bridge.bridge_id,
                    role: "scope_source",
                },
            ], input.artifact_refs ?? []),
        };
        const requestRecord = await this.registry.write("scope_expansion_request", request);
        let escalationRecord;
        if (protectedDomains.length > 0) {
            const escalation = {
                escalation_record_id: (0, registry_1.generateArtifactId)("escalation_record"),
                build_id: build.build_id,
                bridge_id: bridge.bridge_id,
                feature_id: build.feature_id,
                escalated_at: this.now().toISOString(),
                escalation_reason: `Read scope expansion touches protected domains: ${protectedDomains.join(", ")}.`,
                escalation_type: "manual",
                decision: null,
                decided_at: null,
                decided_by: null,
                rationale: null,
                artifact_refs: mergeArtifactRefs(request.artifact_refs, [
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
                    {
                        artifact_type: "scope_expansion_request",
                        artifact_id: request.scope_expansion_request_id,
                        role: "escalation_source",
                    },
                ]),
            };
            escalationRecord = await this.registry.write("escalation_record", escalation);
        }
        return {
            request_record: requestRecord,
            escalation_record: escalationRecord,
            protected_domains: protectedDomains,
        };
    }
    async approveReadScopeExpansion(input) {
        const requestRecord = await this.registry.read("scope_expansion_request", input.scope_expansion_request_id);
        if (requestRecord.payload.status !== "PENDING") {
            throw new ScopeExpansionDecisionStateError(input.scope_expansion_request_id, requestRecord.payload.status);
        }
        const { build, bridge } = await this.runningContext(requestRecord.payload.build_id);
        const approvedPaths = dedupeStrings(input.approved_paths);
        const approvedRequestRecord = await this.registry.write("scope_expansion_request", {
            ...requestRecord.payload,
            status: "APPROVED",
            artifact_refs: mergeArtifactRefs(requestRecord.payload.artifact_refs, input.artifact_refs ?? []),
        });
        const amendment = {
            read_scope_amendment_id: (0, registry_1.generateArtifactId)("read_scope_amendment"),
            scope_expansion_request_id: requestRecord.payload.scope_expansion_request_id,
            build_id: build.build_id,
            bridge_id: bridge.bridge_id,
            feature_id: build.feature_id,
            amended_at: this.now().toISOString(),
            approved_paths: approvedPaths,
            approved_by: input.approved_by,
            artifact_refs: mergeArtifactRefs(requestRecord.payload.artifact_refs, [
                {
                    artifact_type: "build",
                    artifact_id: build.build_id,
                    role: "scope_source",
                },
                {
                    artifact_type: "bridge",
                    artifact_id: bridge.bridge_id,
                    role: "scope_source",
                },
            ], input.artifact_refs ?? []),
        };
        const amendmentRecord = await this.registry.write("read_scope_amendment", amendment);
        const updatedBridge = {
            ...bridge,
            read_scope: {
                ...bridge.read_scope,
                paths: dedupeStrings([...bridge.read_scope.paths, ...approvedPaths]),
            },
            read_scope_amendments: dedupeStrings([
                ...bridge.read_scope_amendments,
                amendment.read_scope_amendment_id,
            ]),
        };
        const bridgeRecord = await this.registry.write("bridge", updatedBridge);
        return {
            request_record: approvedRequestRecord,
            amendment_record: amendmentRecord,
            bridge_record: bridgeRecord,
        };
    }
    async rejectReadScopeExpansion(input) {
        const requestRecord = await this.registry.read("scope_expansion_request", input.scope_expansion_request_id);
        if (requestRecord.payload.status !== "PENDING") {
            throw new ScopeExpansionDecisionStateError(input.scope_expansion_request_id, requestRecord.payload.status);
        }
        return this.registry.write("scope_expansion_request", {
            ...requestRecord.payload,
            status: "REJECTED",
            artifact_refs: mergeArtifactRefs(requestRecord.payload.artifact_refs, input.artifact_refs ?? []),
        });
    }
    protectedDomainsForPaths(paths) {
        const matchedDomains = new Set();
        for (const repoPath of paths) {
            for (const domain of this.protectedDomainsForPath(repoPath)) {
                matchedDomains.add(domain);
            }
        }
        return Array.from(matchedDomains);
    }
    protectedDomainsForPath(repoPath) {
        const matches = [];
        for (const rule of this.options.protected_domains ?? []) {
            if (rule.paths.some((pattern) => pathMatches(pattern, repoPath))) {
                matches.push(rule.domain);
            }
        }
        return matches;
    }
    async runningContext(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        if (buildRecord.payload.status !== "RUNNING") {
            throw new BuildExecutionStateError(buildId, buildRecord.payload.status);
        }
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        return {
            build: buildRecord.payload,
            bridge: bridgeRecord.payload,
        };
    }
}
exports.ScopeGuard = ScopeGuard;
//# sourceMappingURL=scope-guard.js.map