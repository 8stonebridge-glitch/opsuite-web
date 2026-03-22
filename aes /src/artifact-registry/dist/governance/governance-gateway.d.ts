import { ScopeGuard } from "../builder";
import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, Bridge, EscalationRecord, ReadScopeAmendment, ScopeExpansionRequest, StoredRecord, ValidatorRun } from "../types";
export type EscalationDecision = NonNullable<EscalationRecord["decision"]>;
export interface GovernanceDecisionContext {
    escalation_record: StoredRecord<EscalationRecord>;
    escalation_history: StoredRecord<EscalationRecord>[];
    build_artifacts: StoredRecord[];
    bridge_artifacts: StoredRecord[];
    related_validator_runs: StoredRecord<ValidatorRun>[];
    related_scope_expansion_request: StoredRecord<ScopeExpansionRequest> | null;
    related_scope_expansion_history: StoredRecord<ScopeExpansionRequest>[];
}
export interface GovernanceDecisionInput {
    escalation_record_id: string;
    decided_by: string;
    rationale: string;
    approved_scope_paths?: string[];
    artifact_refs?: ArtifactRef[];
}
export interface GovernanceDecisionResult {
    escalation_record: StoredRecord<EscalationRecord>;
    scope_expansion_request_record?: StoredRecord<ScopeExpansionRequest>;
    read_scope_amendment_record?: StoredRecord<ReadScopeAmendment>;
    bridge_record?: StoredRecord<Bridge>;
}
export declare class EscalationDecisionStateError extends Error {
    constructor(escalationRecordId: string, currentDecision: EscalationRecord["decision"], requestedDecision: EscalationDecision);
}
export declare class MissingScopeGuardForEscalationError extends Error {
    constructor(escalationRecordId: string);
}
export declare class GovernanceGateway {
    private readonly registry;
    private readonly options;
    private readonly now;
    constructor(registry: ArtifactRegistry, options?: {
        scope_guard?: ScopeGuard;
    }, now?: () => Date);
    pendingDecisionQueue(): Promise<StoredRecord<EscalationRecord>[]>;
    decisionContext(escalationRecordId: string): Promise<GovernanceDecisionContext>;
    approveEscalation(input: GovernanceDecisionInput): Promise<GovernanceDecisionResult>;
    rejectEscalation(input: GovernanceDecisionInput): Promise<GovernanceDecisionResult>;
    deferEscalation(input: GovernanceDecisionInput): Promise<GovernanceDecisionResult>;
    private appendDecision;
}
//# sourceMappingURL=governance-gateway.d.ts.map