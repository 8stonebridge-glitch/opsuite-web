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

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface ArtifactFilter {
  artifact_type?: ArtifactType;
  artifact_id?: string;
  feature_id?: string;
  bridge_id?: string;
  build_id?: string;
  graph_truth_hash?: string;
  /** Only return records whose payload contains this key set to this value */
  payload_field?: { key: string; value: string };
}

export interface StorageBackend {
  /**
   * Append a new record. Always an INSERT; never an UPDATE.
   * Returns the stored record with internal_id and sequence_number filled in.
   */
  insert(
    artifact_type: ArtifactType,
    artifact_id: string,
    payload: unknown
  ): Promise<StoredRecord>;

  /**
   * Fetch the latest record for a given (artifact_type, artifact_id).
   * Returns null if not found.
   */
  fetchLatest(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord | null>;

  /**
   * Fetch every record (all sequence numbers) for a given
   * (artifact_type, artifact_id), ordered by sequence_number ASC.
   */
  fetchHistory(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord[]>;

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

// ─── In-Memory Storage ────────────────────────────────────────────────────────

/**
 * Append-only in-memory store.
 * Every insert gets a monotonically increasing internal_id and the next
 * sequence_number for that (type, id) pair.
 *
 * Used for tests and MVP operation without a running database.
 */
export class InMemoryStorage implements StorageBackend {
  /** All records in insertion order */
  private rows: StoredRecord[] = [];
  private nextInternalId = 1;

  /** O(1) sequence counter per (type, id) pair */
  private sequenceCounters = new Map<string, number>();

  async insert(
    artifact_type: ArtifactType,
    artifact_id: string,
    payload: unknown
  ): Promise<StoredRecord> {
    const key = `${artifact_type}::${artifact_id}`;
    const prev = this.sequenceCounters.get(key) ?? 0;
    const sequence_number = prev + 1;
    this.sequenceCounters.set(key, sequence_number);

    // Deep clone to detach from caller's reference — prevents silent mutation.
    const clonedPayload = structuredClone(payload);

    const record: StoredRecord = {
      internal_id: this.nextInternalId++,
      artifact_type,
      artifact_id,
      sequence_number,
      payload: clonedPayload,
      written_at: new Date().toISOString(),
    };

    Object.freeze(record);

    this.rows.push(record);
    return record;
  }

  async fetchLatest(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord | null> {
    const matching = this.rows.filter(
      (r) => r.artifact_type === artifact_type && r.artifact_id === artifact_id
    );
    if (matching.length === 0) return null;
    return matching[matching.length - 1]!;
  }

  async fetchHistory(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord[]> {
    return this.rows.filter(
      (r) => r.artifact_type === artifact_type && r.artifact_id === artifact_id
    );
  }

  async query(
    filter: ArtifactFilter,
    all_versions = false
  ): Promise<StoredRecord[]> {
    // Single-pass: filter and track latest in one iteration
    if (all_versions) {
      return this.rows.filter((r) => this.matchesFilter(r, filter));
    }

    const latestMap = new Map<string, StoredRecord>();
    for (const r of this.rows) {
      if (!this.matchesFilter(r, filter)) continue;
      const key = `${r.artifact_type}::${r.artifact_id}`;
      const existing = latestMap.get(key);
      if (!existing || r.sequence_number > existing.sequence_number) {
        latestMap.set(key, r);
      }
    }
    return Array.from(latestMap.values());
  }

  async count(): Promise<number> {
    return this.rows.length;
  }

  /** Snapshot all rows for replay/export (read-only copy). */
  snapshot(): ReadonlyArray<Readonly<StoredRecord>> {
    return [...this.rows];
  }

  private matchesFilter(r: StoredRecord, f: ArtifactFilter): boolean {
    if (f.artifact_type && r.artifact_type !== f.artifact_type) return false;
    if (f.artifact_id && r.artifact_id !== f.artifact_id) return false;

    const p = r.payload as Record<string, unknown>;

    if (f.feature_id && p["feature_id"] !== f.feature_id) return false;
    if (f.bridge_id && p["bridge_id"] !== f.bridge_id) return false;
    if (f.build_id && p["build_id"] !== f.build_id) return false;
    if (f.graph_truth_hash && p["graph_truth_hash"] !== f.graph_truth_hash)
      return false;
    if (f.payload_field && p[f.payload_field.key] !== f.payload_field.value)
      return false;

    return true;
  }
}

// ─── PostgreSQL Storage ───────────────────────────────────────────────────────

/** Minimal interface for the pg Pool dependency (avoids requiring `pg` at compile time). */
export interface PgPoolLike {
  query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Allowlist of payload keys that may be used in SQL JSONB queries. */
const ALLOWED_PAYLOAD_KEYS = new Set([
  "status",
  "write_back_status",
  "trust_status",
  "feature_id",
  "bridge_id",
  "build_id",
  "graph_truth_hash",
]);

const SELECT_COLUMNS =
  "internal_id, artifact_type, artifact_id, sequence_number, payload, written_at::text AS written_at";

/**
 * Production storage using PostgreSQL JSONB.
 *
 * Requires the schema defined in schema.sql to be applied first.
 */
export class PostgresStorage implements StorageBackend {
  constructor(private readonly pool: PgPoolLike) {}

  async insert(
    artifact_type: ArtifactType,
    artifact_id: string,
    payload: unknown
  ): Promise<StoredRecord> {
    // sequence_number is computed by the DB via a subquery to keep this atomic.
    const sql = `
      INSERT INTO artifact_registry
        (artifact_type, artifact_id, sequence_number, payload, written_at)
      VALUES (
        $1, $2,
        COALESCE(
          (SELECT MAX(sequence_number) FROM artifact_registry
           WHERE artifact_type = $1 AND artifact_id = $2),
          0
        ) + 1,
        $3,
        NOW()
      )
      RETURNING ${SELECT_COLUMNS}
    `;
    const result = await this.pool.query(sql, [
      artifact_type,
      artifact_id,
      JSON.stringify(payload),
    ]);
    return this.rowToRecord(result.rows[0]!);
  }

  async fetchLatest(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord | null> {
    const sql = `
      SELECT ${SELECT_COLUMNS}
      FROM artifact_registry
      WHERE artifact_type = $1 AND artifact_id = $2
      ORDER BY sequence_number DESC
      LIMIT 1
    `;
    const result = await this.pool.query(sql, [artifact_type, artifact_id]);
    if (result.rows.length === 0) return null;
    return this.rowToRecord(result.rows[0]!);
  }

  async fetchHistory(
    artifact_type: ArtifactType,
    artifact_id: string
  ): Promise<StoredRecord[]> {
    const sql = `
      SELECT ${SELECT_COLUMNS}
      FROM artifact_registry
      WHERE artifact_type = $1 AND artifact_id = $2
      ORDER BY sequence_number ASC
    `;
    const result = await this.pool.query(sql, [artifact_type, artifact_id]);
    return result.rows.map((row) => this.rowToRecord(row));
  }

  async query(
    filter: ArtifactFilter,
    all_versions = false
  ): Promise<StoredRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const addCondition = (
      col: string,
      value: unknown,
      isJsonb: boolean
    ): void => {
      const sqlCol = isJsonb ? `payload->>'${col}'` : col;
      conditions.push(`${sqlCol} = $${idx++}`);
      params.push(value);
    };

    if (filter.artifact_type)
      addCondition("artifact_type", filter.artifact_type, false);
    if (filter.artifact_id)
      addCondition("artifact_id", filter.artifact_id, false);
    if (filter.feature_id)
      addCondition("feature_id", filter.feature_id, true);
    if (filter.bridge_id)
      addCondition("bridge_id", filter.bridge_id, true);
    if (filter.build_id)
      addCondition("build_id", filter.build_id, true);
    if (filter.graph_truth_hash)
      addCondition("graph_truth_hash", filter.graph_truth_hash, true);

    if (filter.payload_field) {
      // Guard against SQL injection: only allow known payload keys.
      if (!ALLOWED_PAYLOAD_KEYS.has(filter.payload_field.key)) {
        throw new Error(
          `payload_field key "${filter.payload_field.key}" is not in the allowed set`
        );
      }
      addCondition(filter.payload_field.key, filter.payload_field.value, true);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    if (all_versions) {
      const sql = `
        SELECT ${SELECT_COLUMNS}
        FROM artifact_registry ${where}
        ORDER BY internal_id ASC
      `;
      const result = await this.pool.query(sql, params);
      return result.rows.map((row) => this.rowToRecord(row));
    }

    // Latest per artifact_id via DISTINCT ON
    const sql = `
      SELECT DISTINCT ON (artifact_type, artifact_id)
             ${SELECT_COLUMNS}
      FROM artifact_registry ${where}
      ORDER BY artifact_type, artifact_id, sequence_number DESC
    `;
    const result = await this.pool.query(sql, params);
    return result.rows.map((row) => this.rowToRecord(row));
  }

  async count(): Promise<number> {
    const result = await this.pool.query(
      "SELECT COUNT(*) AS n FROM artifact_registry"
    );
    return parseInt(result.rows[0]!["n"] as string, 10);
  }

  private rowToRecord(row: Record<string, unknown>): StoredRecord {
    return {
      internal_id: row["internal_id"] as number,
      artifact_type: row["artifact_type"] as ArtifactType,
      artifact_id: row["artifact_id"] as string,
      sequence_number: row["sequence_number"] as number,
      payload:
        typeof row["payload"] === "string"
          ? JSON.parse(row["payload"])
          : row["payload"],
      written_at: row["written_at"] as string,
    };
  }
}
