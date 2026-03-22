import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, AuthorityTier, Build, StoredRecord, ValidatorOutcome, WriteBackRecord } from "../types";
export declare class InvalidWriteBackStateError extends Error {
    constructor(buildId: string, status: Build["status"]);
}
export declare class EscalatedConsensusWriteBackError extends Error {
    constructor(buildId: string);
}
export interface WriteBackDecisionResult {
    validator_outcome: ValidatorOutcome;
    write_back_record: StoredRecord<WriteBackRecord>;
    promoted_tier?: AuthorityTier;
}
export declare function determinePromotion(currentTier: AuthorityTier, validatorOutcome: ValidatorOutcome, successfulBuildCount: number): AuthorityTier;
export declare class WriteBackManager {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    recordForBuild(buildId: string, options?: {
        validator_outcome?: ValidatorOutcome;
        artifact_refs?: ArtifactRef[];
        rejection_reason?: string | null;
        current_authority_tier?: AuthorityTier;
        successful_build_count?: number;
    }): Promise<WriteBackDecisionResult>;
}
//# sourceMappingURL=write-back-manager.d.ts.map