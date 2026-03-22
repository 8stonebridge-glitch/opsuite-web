/**
 * AES Orchestrator Layer — Core State Transitions
 *
 * Owns the trusted control-plane transitions for bridge/build authorization.
 */
import { ArtifactRegistry } from "../registry";
import type { Bridge, BlockedReason, Build, StoredRecord, ValidatorOutcome } from "../types";
import type { PolicyEvaluation } from "../policy";
export interface QueueBuildInput {
    build_id?: string;
    bridge_id: string;
    feature_id: string;
    artifact_refs: Build["artifact_refs"];
}
export interface AuthorizationResult {
    allowed: boolean;
    reasons: string[];
    blocked_reasons: BlockedReason[];
    build_record: StoredRecord<Build>;
    bridge_record?: StoredRecord<Bridge>;
}
export interface FinalizationResult {
    outcome: Extract<Build["status"], "PASSED" | "FAILED">;
    build_record: StoredRecord<Build>;
    bridge_record: StoredRecord<Bridge>;
    validator_outcome: ValidatorOutcome;
}
export declare class BuildEscalationRequiredError extends Error {
    constructor(buildId: string);
}
export declare class IncompleteValidatorRunsError extends Error {
    constructor(buildId: string);
}
export declare class OrchestratorCore {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    queueBuild(input: QueueBuildInput): Promise<StoredRecord<Build>>;
    authorizeBuild(buildId: string, options?: {
        builder_session_id?: string | null;
        policy_evaluation?: Pick<PolicyEvaluation, "hard_blocked" | "final_route" | "hard_vetoes">;
    }): Promise<AuthorizationResult>;
    markBuildRunningByBuilder(buildId: string, builderSessionId: string): Promise<StoredRecord<Build>>;
    markBuildFailed(buildId: string): Promise<StoredRecord<Build>>;
    finalizeBuildFromValidators(buildId: string): Promise<FinalizationResult>;
    private latestDependencyRecord;
}
//# sourceMappingURL=orchestrator-core.d.ts.map