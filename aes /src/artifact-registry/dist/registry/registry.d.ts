/**
 * AES Artifact Registry — Core Registry
 *
 * The single entry-point for all artifact read/write/query operations.
 *
 * HARD INVARIANTS enforced here:
 *  - Every write is an append (INSERT only). No record is ever mutated.
 *  - artifact_refs must be present on every artifact that requires them.
 *  - The registry does not enforce business-level state machine transitions;
 *    that is the orchestrator's responsibility. It only enforces storage
 *    immutability and structural completeness.
 *
 * Derived from: docs/artifact-model.md §4 Indexing and Query Needs
 *              aes-runtime-quick-reference.md §9 Traceability
 */
import type { ArtifactType, AnyArtifact, StoredRecord, Bridge, Build, ValidatorRun, WriteBackRecord, FreshnessCheck, ValidatorOutcome } from "../types";
import type { StorageBackend } from "./storage";
export declare class ArtifactNotFoundError extends Error {
    constructor(type: ArtifactType, id: string);
}
export declare class MissingArtifactRefsError extends Error {
    constructor(type: ArtifactType, id: string);
}
/**
 * ArtifactRegistry is the runtime authority for all artifact I/O.
 *
 * Usage:
 *   const registry = new ArtifactRegistry(new InMemoryStorage());
 *   const record = await registry.write("bridge", bridge);
 */
export declare class ArtifactRegistry {
    private readonly storage;
    constructor(storage: StorageBackend);
    /**
     * Append a new artifact record.
     *
     * Rules:
     *  - If the artifact has an ID field, it is used; otherwise one is generated.
     *  - artifact_refs are required for bridges and validator_runs.
     *  - Returns the stored envelope (with sequence_number, internal_id, written_at).
     */
    write<T extends AnyArtifact>(type: ArtifactType, artifact: T): Promise<StoredRecord<T>>;
    /**
     * Read the latest state of a specific artifact.
     * Throws ArtifactNotFoundError if not present.
     */
    read<T = AnyArtifact>(type: ArtifactType, id: string): Promise<StoredRecord<T>>;
    /**
     * Read the full history (all versions) of an artifact, oldest first.
     * Required for replay.
     */
    history<T = AnyArtifact>(type: ArtifactType, id: string): Promise<StoredRecord<T>[]>;
    /**
     * Find all artifacts linked to a feature.
     * Returns latest version of each artifact.
     */
    byFeature(featureId: string): Promise<StoredRecord[]>;
    /**
     * Find all artifacts linked to a bridge.
     */
    byBridge(bridgeId: string): Promise<StoredRecord[]>;
    /**
     * Find all artifacts linked to a build.
     */
    byBuild(buildId: string): Promise<StoredRecord[]>;
    /**
     * Read the latest version of every artifact for a given type.
     * Useful for operator queues such as pending escalations.
     */
    latestByType<T = AnyArtifact>(type: ArtifactType): Promise<StoredRecord<T>[]>;
    /**
     * Find bridges whose graph_truth_hash matches a given value.
     * Used to identify stale bridges after a graph change.
     */
    bridgesWithHash(hash: string): Promise<StoredRecord<Bridge>[]>;
    /**
     * List bridges that have become stale due to a graph hash change.
     * Finds bridges whose stored graph_truth_hash differs from currentHash
     * AND whose status is not already STALE/SUPERSEDED/REJECTED/EXECUTED.
     */
    staleBridges(currentHash: string): Promise<StoredRecord<Bridge>[]>;
    /**
     * List failed builds, optionally filtered by failure reason stored in
     * a linked ValidatorRun violation.
     */
    failedBuilds(): Promise<StoredRecord<Build>[]>;
    /**
     * Find all artifacts (any type) whose payload contains an artifact_ref
     * that links to a given validator concern.
     *
     * Because artifact_refs is a JSON array, this requires in-application
     * filtering on the in-memory backend. The PostgreSQL backend can use
     * a GIN index on the payload column for production efficiency.
     */
    artifactsForValidatorRun(validatorRunId: string): Promise<StoredRecord[]>;
    /**
     * Find all VERIFIED_RESTRICTED WriteBackRecords awaiting promotion.
     */
    verifiedRestrictedPendingPromotion(): Promise<StoredRecord<WriteBackRecord>[]>;
    /**
     * Show drift incidents for a given feature or repo path.
     * Returns DiffArtifacts that contain path violations.
     */
    driftIncidents(featureId?: string): Promise<StoredRecord[]>;
    /**
     * Trace ALL evidence artifacts tied to a build.
     * Returns every artifact (any type) whose payload references the build_id.
     */
    traceEvidence(buildId: string): Promise<StoredRecord[]>;
    /**
     * Replay query: return every artifact recorded against a given graph
     * snapshot + hash pair, in insertion order.
     * This is the replayability anchor.
     */
    replayBySnapshot(graphSnapshotId: string, graphTruthHash: string): Promise<StoredRecord[]>;
    /**
     * Validate the majority-rule validator consensus for a build.
     * Returns the consensus outcome and whether it triggers a hard fail.
     *
     * Rules (quick-reference §7):
     *  - 2 FAIL => hard fail
     *  - 2 PASS, 1 FAIL => PASS_WITH_CONCERNS
     *  - all disagree => escalate
     */
    validatorConsensus(buildId: string): Promise<{
        outcome: ValidatorOutcome | "ESCALATE";
        hard_fail: boolean;
        validator_runs: StoredRecord<ValidatorRun>[];
        pending_runs: StoredRecord<ValidatorRun>[];
    }>;
    /**
     * Retrieve or confirm a FreshnessCheck for a bridge.
     */
    latestFreshnessCheck(bridgeId: string): Promise<StoredRecord<FreshnessCheck> | null>;
    totalRecords(): Promise<number>;
}
//# sourceMappingURL=registry.d.ts.map