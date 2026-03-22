import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, Bridge, Build, EscalationRecord, StoredRecord, ValidatorEvidence, ValidatorOutcome, ValidatorRun, ValidatorViolation, WriteBackRecord } from "../types";
import type { ValidatorAdapter } from "./validator-adapter";
export declare class MissingValidatorEvidenceError extends Error {
    constructor(validatorRunId: string);
}
export declare class PendingValidatorRunsError extends Error {
    constructor(buildId: string);
}
export declare class NoValidatorRunsError extends Error {
    constructor(buildId: string);
}
export interface QueueValidatorRunInput {
    validator_id: string;
    build_id: string;
    bridge_id: string;
    artifact_refs: ArtifactRef[];
}
export interface CompleteValidatorRunInput {
    validator_run_id: string;
    status: ValidatorOutcome;
    evidence: ValidatorEvidence[];
    violations?: ValidatorViolation[];
    missing?: string[];
    concerns?: string[];
    confidence: number;
    artifact_refs?: ArtifactRef[];
}
export interface FinalizedValidatorResult {
    state: "FINALIZED";
    outcome: Extract<Build["status"], "PASSED" | "FAILED">;
    validator_outcome: ValidatorOutcome;
    build_record: StoredRecord<Build>;
    bridge_record: StoredRecord<Bridge>;
    write_back_record: StoredRecord<WriteBackRecord>;
    validator_runs: StoredRecord<ValidatorRun>[];
}
export interface EscalatedValidatorResult {
    state: "ESCALATED";
    validator_outcome: "ESCALATE";
    escalation_record: StoredRecord<EscalationRecord>;
    validator_runs: StoredRecord<ValidatorRun>[];
}
export type ValidatorFinalizationResult = FinalizedValidatorResult | EscalatedValidatorResult;
export declare class ValidatorCoordinator {
    private readonly registry;
    private readonly now;
    private readonly writeBackManager;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    queueValidatorRun(input: QueueValidatorRunInput): Promise<StoredRecord<ValidatorRun>>;
    markValidatorRunning(validatorRunId: string): Promise<StoredRecord<ValidatorRun>>;
    completeValidatorRun(input: CompleteValidatorRunInput): Promise<StoredRecord<ValidatorRun>>;
    executeValidators(buildId: string, adapters: ValidatorAdapter[]): Promise<{
        validator_runs: StoredRecord<ValidatorRun>[];
        finalization: ValidatorFinalizationResult;
    }>;
    finalizeBuild(buildId: string): Promise<ValidatorFinalizationResult>;
    private buildExecutionContext;
}
//# sourceMappingURL=validator-coordinator.d.ts.map