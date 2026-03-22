import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, Bridge, Build, EscalationRecord, ReadScopeAmendment, ScopeExpansionRequest, StoredRecord } from "../types";
export interface ProtectedDomainRule {
    domain: string;
    paths: string[];
}
export interface ScopeDecision {
    allowed: boolean;
    path: string;
    access_type: "read" | "write";
    matched_scope: string | null;
    reason: string | null;
    protected_domains: string[];
}
export interface RequestReadScopeExpansionInput {
    build_id: string;
    requested_paths: string[];
    reason: string;
    artifact_refs?: ArtifactRef[];
}
export interface RequestReadScopeExpansionResult {
    request_record: StoredRecord<ScopeExpansionRequest>;
    escalation_record?: StoredRecord<EscalationRecord>;
    protected_domains: string[];
}
export interface ApproveReadScopeExpansionInput {
    scope_expansion_request_id: string;
    approved_paths: string[];
    approved_by: string;
    artifact_refs?: ArtifactRef[];
}
export interface ApproveReadScopeExpansionResult {
    request_record: StoredRecord<ScopeExpansionRequest>;
    amendment_record: StoredRecord<ReadScopeAmendment>;
    bridge_record: StoredRecord<Bridge>;
}
export interface RejectReadScopeExpansionInput {
    scope_expansion_request_id: string;
    artifact_refs?: ArtifactRef[];
}
export declare class BuildExecutionStateError extends Error {
    constructor(buildId: string, status: Build["status"]);
}
export declare class ScopeExpansionDecisionStateError extends Error {
    constructor(requestId: string, status: ScopeExpansionRequest["status"]);
}
export declare class ScopeGuard {
    private readonly registry;
    private readonly options;
    private readonly now;
    constructor(registry: ArtifactRegistry, options?: {
        protected_domains?: ProtectedDomainRule[];
    }, now?: () => Date);
    evaluateRead(buildId: string, repoPath: string): Promise<ScopeDecision>;
    evaluateWrite(buildId: string, repoPath: string): Promise<ScopeDecision>;
    requestReadScopeExpansion(input: RequestReadScopeExpansionInput): Promise<RequestReadScopeExpansionResult>;
    approveReadScopeExpansion(input: ApproveReadScopeExpansionInput): Promise<ApproveReadScopeExpansionResult>;
    rejectReadScopeExpansion(input: RejectReadScopeExpansionInput): Promise<StoredRecord<ScopeExpansionRequest>>;
    private protectedDomainsForPaths;
    private protectedDomainsForPath;
    private runningContext;
}
//# sourceMappingURL=scope-guard.d.ts.map