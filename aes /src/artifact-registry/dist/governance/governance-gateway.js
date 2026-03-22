"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceGateway = exports.MissingScopeGuardForEscalationError = exports.EscalationDecisionStateError = void 0;
class EscalationDecisionStateError extends Error {
    constructor(escalationRecordId, currentDecision, requestedDecision) {
        super(`Escalation ${escalationRecordId} cannot move from ${currentDecision ?? "PENDING"} to ${requestedDecision}.`);
        this.name = "EscalationDecisionStateError";
    }
}
exports.EscalationDecisionStateError = EscalationDecisionStateError;
class MissingScopeGuardForEscalationError extends Error {
    constructor(escalationRecordId) {
        super(`Escalation ${escalationRecordId} is linked to a scope expansion request but GovernanceGateway has no ScopeGuard.`);
        this.name = "MissingScopeGuardForEscalationError";
    }
}
exports.MissingScopeGuardForEscalationError = MissingScopeGuardForEscalationError;
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
function assertEscalationDecisionAllowed(currentDecision, requestedDecision, escalationRecordId) {
    if (currentDecision === "APPROVED" || currentDecision === "REJECTED") {
        throw new EscalationDecisionStateError(escalationRecordId, currentDecision, requestedDecision);
    }
}
function uniqueRecords(records) {
    const seen = new Set();
    const unique = [];
    for (const record of records) {
        if (!seen.has(record.internal_id)) {
            seen.add(record.internal_id);
            unique.push(record);
        }
    }
    return unique;
}
class GovernanceGateway {
    constructor(registry, options = {}, now = () => new Date()) {
        this.registry = registry;
        this.options = options;
        this.now = now;
    }
    async pendingDecisionQueue() {
        const escalations = await this.registry.latestByType("escalation_record");
        return escalations
            .filter((record) => record.payload.decision === null ||
            record.payload.decision === "DEFERRED")
            .sort((left, right) => left.internal_id - right.internal_id);
    }
    async decisionContext(escalationRecordId) {
        const escalationRecord = await this.registry.read("escalation_record", escalationRecordId);
        const escalationHistory = await this.registry.history("escalation_record", escalationRecordId);
        const buildArtifacts = escalationRecord.payload.build_id
            ? await this.registry.traceEvidence(escalationRecord.payload.build_id)
            : [];
        const bridgeArtifacts = escalationRecord.payload.bridge_id
            ? await this.registry.byBridge(escalationRecord.payload.bridge_id)
            : [];
        const validatorRunRefs = escalationRecord.payload.artifact_refs.filter((artifactRef) => artifactRef.artifact_type === "validator_run");
        const relatedValidatorRuns = await Promise.all(validatorRunRefs.map((artifactRef) => this.registry.read("validator_run", artifactRef.artifact_id)));
        const scopeExpansionRef = escalationRecord.payload.artifact_refs.find((artifactRef) => artifactRef.artifact_type === "scope_expansion_request");
        const relatedScopeExpansionRequest = scopeExpansionRef
            ? await this.registry.read("scope_expansion_request", scopeExpansionRef.artifact_id)
            : null;
        const relatedScopeExpansionHistory = relatedScopeExpansionRequest
            ? await this.registry.history("scope_expansion_request", relatedScopeExpansionRequest.payload.scope_expansion_request_id)
            : [];
        return {
            escalation_record: escalationRecord,
            escalation_history: escalationHistory,
            build_artifacts: buildArtifacts,
            bridge_artifacts: uniqueRecords(bridgeArtifacts),
            related_validator_runs: relatedValidatorRuns,
            related_scope_expansion_request: relatedScopeExpansionRequest,
            related_scope_expansion_history: relatedScopeExpansionHistory,
        };
    }
    async approveEscalation(input) {
        const escalationRecord = await this.registry.read("escalation_record", input.escalation_record_id);
        assertEscalationDecisionAllowed(escalationRecord.payload.decision, "APPROVED", input.escalation_record_id);
        const context = await this.decisionContext(input.escalation_record_id);
        let scopeExpansionResult;
        if (context.related_scope_expansion_request) {
            if (!this.options.scope_guard) {
                throw new MissingScopeGuardForEscalationError(input.escalation_record_id);
            }
            scopeExpansionResult = await this.options.scope_guard.approveReadScopeExpansion({
                scope_expansion_request_id: context.related_scope_expansion_request.payload.scope_expansion_request_id,
                approved_paths: input.approved_scope_paths &&
                    input.approved_scope_paths.length > 0
                    ? input.approved_scope_paths
                    : context.related_scope_expansion_request.payload.requested_paths,
                approved_by: input.decided_by,
                artifact_refs: input.artifact_refs,
            });
        }
        return {
            escalation_record: await this.appendDecision(escalationRecord.payload, "APPROVED", input),
            scope_expansion_request_record: scopeExpansionResult?.request_record,
            read_scope_amendment_record: scopeExpansionResult?.amendment_record,
            bridge_record: scopeExpansionResult?.bridge_record,
        };
    }
    async rejectEscalation(input) {
        const escalationRecord = await this.registry.read("escalation_record", input.escalation_record_id);
        assertEscalationDecisionAllowed(escalationRecord.payload.decision, "REJECTED", input.escalation_record_id);
        let scopeExpansionRequestRecord;
        const context = await this.decisionContext(input.escalation_record_id);
        if (context.related_scope_expansion_request) {
            if (!this.options.scope_guard) {
                throw new MissingScopeGuardForEscalationError(input.escalation_record_id);
            }
            scopeExpansionRequestRecord =
                await this.options.scope_guard.rejectReadScopeExpansion({
                    scope_expansion_request_id: context.related_scope_expansion_request.payload.scope_expansion_request_id,
                    artifact_refs: input.artifact_refs,
                });
        }
        return {
            escalation_record: await this.appendDecision(escalationRecord.payload, "REJECTED", input),
            scope_expansion_request_record: scopeExpansionRequestRecord,
        };
    }
    async deferEscalation(input) {
        const escalationRecord = await this.registry.read("escalation_record", input.escalation_record_id);
        assertEscalationDecisionAllowed(escalationRecord.payload.decision, "DEFERRED", input.escalation_record_id);
        return {
            escalation_record: await this.appendDecision(escalationRecord.payload, "DEFERRED", input),
        };
    }
    async appendDecision(escalation, decision, input) {
        return this.registry.write("escalation_record", {
            ...escalation,
            decision,
            decided_at: this.now().toISOString(),
            decided_by: input.decided_by,
            rationale: input.rationale,
            artifact_refs: mergeArtifactRefs(escalation.artifact_refs, input.artifact_refs ?? []),
        });
    }
}
exports.GovernanceGateway = GovernanceGateway;
//# sourceMappingURL=governance-gateway.js.map