-- AES Artifact Registry — PostgreSQL Schema
--
-- Implements docs/artifact-model.md §3 Storage Model:
--   "append-only JSON records in PostgreSQL JSONB"
--
-- DESIGN INVARIANTS:
--   1. No UPDATE statements are ever issued against artifact_registry.
--   2. Every state change produces a new row with an incremented sequence_number.
--   3. Queries for "current state" use MAX(sequence_number) or DISTINCT ON.
--   4. The trigger below enforces invariant 1 at the database level.

-- ─── Main Table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS artifact_registry (
    internal_id      BIGSERIAL       PRIMARY KEY,

    -- Artifact identity
    artifact_type    TEXT            NOT NULL,
    artifact_id      TEXT            NOT NULL,

    -- Monotonically increasing per (artifact_type, artifact_id).
    -- sequence_number = 1 for the first write of a given artifact_id.
    sequence_number  INTEGER         NOT NULL,

    -- Immutable JSON payload. Written once, never updated.
    payload          JSONB           NOT NULL,

    -- Wall clock time of this specific write.
    written_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Uniqueness: no two records may share the same (type, id, sequence).
    CONSTRAINT uq_artifact_sequence
        UNIQUE (artifact_type, artifact_id, sequence_number)
);

COMMENT ON TABLE artifact_registry IS
    'Append-only AES artifact store. Every row is immutable after INSERT.';

COMMENT ON COLUMN artifact_registry.sequence_number IS
    'Monotonically increasing per (artifact_type, artifact_id). '
    'Enables full history replay without external versioning.';

-- ─── Append-Only Enforcement Trigger ─────────────────────────────────────────
-- Raises an error if any UPDATE or DELETE is attempted at the DB level.
-- This is the hard backstop; the application layer must never issue them either.

CREATE OR REPLACE FUNCTION artifact_registry_deny_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'artifact_registry is append-only. Operation % is forbidden on row internal_id=%.',
        TG_OP, OLD.internal_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_update ON artifact_registry;
CREATE TRIGGER trg_deny_update
    BEFORE UPDATE ON artifact_registry
    FOR EACH ROW EXECUTE FUNCTION artifact_registry_deny_mutation();

DROP TRIGGER IF EXISTS trg_deny_delete ON artifact_registry;
CREATE TRIGGER trg_deny_delete
    BEFORE DELETE ON artifact_registry
    FOR EACH ROW EXECUTE FUNCTION artifact_registry_deny_mutation();

-- ─── Indexes (docs/artifact-model.md §4 Indexing and Query Needs) ─────────────

-- Primary lookup: fetch latest / fetch history for a specific artifact
CREATE INDEX IF NOT EXISTS idx_ar_type_id_seq
    ON artifact_registry (artifact_type, artifact_id, sequence_number DESC);

-- Lookup by feature_id (cross-artifact)
CREATE INDEX IF NOT EXISTS idx_ar_feature_id
    ON artifact_registry ((payload->>'feature_id'))
    WHERE payload->>'feature_id' IS NOT NULL;

-- Lookup by bridge_id
CREATE INDEX IF NOT EXISTS idx_ar_bridge_id
    ON artifact_registry ((payload->>'bridge_id'))
    WHERE payload->>'bridge_id' IS NOT NULL;

-- Lookup by build_id
CREATE INDEX IF NOT EXISTS idx_ar_build_id
    ON artifact_registry ((payload->>'build_id'))
    WHERE payload->>'build_id' IS NOT NULL;

-- Replay by graph_truth_hash (freshness + stale bridge detection)
CREATE INDEX IF NOT EXISTS idx_ar_graph_truth_hash
    ON artifact_registry ((payload->>'graph_truth_hash'))
    WHERE payload->>'graph_truth_hash' IS NOT NULL;

-- Status-based queries (e.g. VERIFIED_RESTRICTED, FAILED builds)
CREATE INDEX IF NOT EXISTS idx_ar_status
    ON artifact_registry (artifact_type, (payload->>'status'))
    WHERE payload->>'status' IS NOT NULL;

-- GIN index for artifact_refs array traversal
-- Enables: "find all artifacts referencing validator_run X"
CREATE INDEX IF NOT EXISTS idx_ar_artifact_refs_gin
    ON artifact_registry USING GIN (payload jsonb_path_ops);

-- Temporal index for range queries and metrics
CREATE INDEX IF NOT EXISTS idx_ar_written_at
    ON artifact_registry (written_at);

-- ─── Convenience View: Latest Artifact State ──────────────────────────────────

CREATE OR REPLACE VIEW artifact_registry_latest AS
SELECT DISTINCT ON (artifact_type, artifact_id)
    internal_id,
    artifact_type,
    artifact_id,
    sequence_number,
    payload,
    written_at
FROM artifact_registry
ORDER BY artifact_type, artifact_id, sequence_number DESC;

COMMENT ON VIEW artifact_registry_latest IS
    'Latest sequence_number record per (artifact_type, artifact_id). '
    'Use for "current state" queries. Use the base table for replay.';

-- ─── Convenience View: Bridge Status ─────────────────────────────────────────

CREATE OR REPLACE VIEW bridge_status_latest AS
SELECT
    artifact_id                     AS bridge_id,
    payload->>'feature_id'          AS feature_id,
    payload->>'status'              AS status,
    payload->>'graph_truth_hash'    AS graph_truth_hash,
    payload->>'graph_snapshot_id'   AS graph_snapshot_id,
    (payload->>'confidence')::float AS confidence,
    sequence_number,
    written_at
FROM artifact_registry_latest
WHERE artifact_type = 'bridge';

-- ─── Convenience View: Build Status ──────────────────────────────────────────

CREATE OR REPLACE VIEW build_status_latest AS
SELECT
    artifact_id                     AS build_id,
    payload->>'feature_id'          AS feature_id,
    payload->>'bridge_id'           AS bridge_id,
    payload->>'status'              AS status,
    sequence_number,
    written_at
FROM artifact_registry_latest
WHERE artifact_type = 'build';

-- ─── Convenience View: VERIFIED_RESTRICTED Learnings ─────────────────────────

CREATE OR REPLACE VIEW verified_restricted_learnings AS
SELECT
    artifact_id                             AS write_back_record_id,
    payload->>'feature_id'                  AS feature_id,
    payload->>'build_id'                    AS build_id,
    payload->>'bridge_id'                   AS bridge_id,
    payload->>'write_back_status'           AS write_back_status,
    written_at
FROM artifact_registry_latest
WHERE artifact_type = 'write_back_record'
  AND payload->>'write_back_status' = 'VERIFIED_RESTRICTED';
