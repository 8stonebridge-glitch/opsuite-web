/**
 * AES Artifact Registry — Storage Abstraction
 *
 * Defines the storage contract and two implementations:
 *  1. InMemoryStorage  — for tests and MVP file-based use
 *  2. PostgresStorage  — for production (PostgreSQL JSONB, append-only)
 *
 * INVARIANT: The storage layer NEVER updates an existing record.
 *            Every write is an INSERT. State changes produce a new sequence
 *            number on the same (artifact_type, artifact_id) pair.
 *
 * Derived from: docs/artifact-model.md §3 Storage Model, §4 Indexing Needs
 */
import type { ArtifactType, StoredRecord } from "../types";
export interface ArtifactFilter {
    artifact_type?: ArtifactType;
    artifact_id?: string;
    feature_id?: string;
    bridge_id?: string;
    build_id?: string;
    graph_truth_hash?: string;
    /** Only return records whose payload contains this key set to this value */
    payload_field?: {
        key: string;
        value: string;
    };
}
export interface StorageBackend {
    /**
     * Append a new record. Always an INSERT; never an UPDATE.
     * Returns the stored record with internal_id and sequence_number filled in.
     */
    insert(artifact_type: ArtifactType, artifact_id: string, payload: unknown): Promise<StoredRecord>;
    /**
     * Fetch the latest record for a given (artifact_type, artifact_id).
     * Returns null if not found.
     */
    fetchLatest(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord | null>;
    /**
     * Fetch every record (all sequence numbers) for a given
     * (artifact_type, artifact_id), ordered by sequence_number ASC.
     */
    fetchHistory(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord[]>;
    /**
     * Query records by filter. Returns the latest record per artifact_id
     * unless `all_versions` is true.
     */
    query(filter: ArtifactFilter, all_versions?: boolean): Promise<StoredRecord[]>;
    /**
     * Count total records (for diagnostics).
     */
    count(): Promise<number>;
}
/**
 * Append-only in-memory store.
 * Every insert gets a monotonically increasing internal_id and the next
 * sequence_number for that (type, id) pair.
 *
 * Used for tests and MVP operation without a running database.
 */
export declare class InMemoryStorage implements StorageBackend {
    /** All records in insertion order */
    private rows;
    private nextInternalId;
    /** O(1) sequence counter per (type, id) pair */
    private sequenceCounters;
    insert(artifact_type: ArtifactType, artifact_id: string, payload: unknown): Promise<StoredRecord>;
    fetchLatest(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord | null>;
    fetchHistory(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord[]>;
    query(filter: ArtifactFilter, all_versions?: boolean): Promise<StoredRecord[]>;
    count(): Promise<number>;
    /** Snapshot all rows for replay/export (read-only copy). */
    snapshot(): ReadonlyArray<Readonly<StoredRecord>>;
    private matchesFilter;
}
/** Minimal interface for the pg Pool dependency (avoids requiring `pg` at compile time). */
export interface PgPoolLike {
    query(sql: string, params?: unknown[]): Promise<{
        rows: Record<string, unknown>[];
    }>;
}
/**
 * Production storage using PostgreSQL JSONB.
 *
 * Requires the schema defined in schema.sql to be applied first.
 */
export declare class PostgresStorage implements StorageBackend {
    private readonly pool;
    constructor(pool: PgPoolLike);
    insert(artifact_type: ArtifactType, artifact_id: string, payload: unknown): Promise<StoredRecord>;
    fetchLatest(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord | null>;
    fetchHistory(artifact_type: ArtifactType, artifact_id: string): Promise<StoredRecord[]>;
    query(filter: ArtifactFilter, all_versions?: boolean): Promise<StoredRecord[]>;
    count(): Promise<number>;
    private rowToRecord;
}
//# sourceMappingURL=storage.d.ts.map