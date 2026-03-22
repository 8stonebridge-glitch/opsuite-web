"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactRegistry = exports.MissingArtifactRefsError = exports.ArtifactNotFoundError = void 0;
const artifact_meta_1 = require("./artifact-meta");
const id_generator_1 = require("./id-generator");
// ─── Errors ───────────────────────────────────────────────────────────────────
class ArtifactNotFoundError extends Error {
    constructor(type, id) {
        super(`Artifact not found: ${type}/${id}`);
        this.name = "ArtifactNotFoundError";
    }
}
exports.ArtifactNotFoundError = ArtifactNotFoundError;
class MissingArtifactRefsError extends Error {
    constructor(type, id) {
        super(`artifact_refs required but empty/missing on ${type}/${id}. ` +
            `Every bridge and validator run must carry structured references.`);
        this.name = "MissingArtifactRefsError";
    }
}
exports.MissingArtifactRefsError = MissingArtifactRefsError;
// ─── Registry Class ───────────────────────────────────────────────────────────
/**
 * ArtifactRegistry is the runtime authority for all artifact I/O.
 *
 * Usage:
 *   const registry = new ArtifactRegistry(new InMemoryStorage());
 *   const record = await registry.write("bridge", bridge);
 */
class ArtifactRegistry {
    constructor(storage) {
        this.storage = storage;
    }
    // ── Write ─────────────────────────────────────────────────────────────────
    /**
     * Append a new artifact record.
     *
     * Rules:
     *  - If the artifact has an ID field, it is used; otherwise one is generated.
     *  - artifact_refs are required for bridges and validator_runs.
     *  - Returns the stored envelope (with sequence_number, internal_id, written_at).
     */
    async write(type, artifact) {
        const id = extractId(type, artifact);
        validateArtifactRefs(type, id, artifact);
        const record = await this.storage.insert(type, id, artifact);
        return record;
    }
    // ── Read ──────────────────────────────────────────────────────────────────
    /**
     * Read the latest state of a specific artifact.
     * Throws ArtifactNotFoundError if not present.
     */
    async read(type, id) {
        const record = await this.storage.fetchLatest(type, id);
        if (!record)
            throw new ArtifactNotFoundError(type, id);
        return record;
    }
    /**
     * Read the full history (all versions) of an artifact, oldest first.
     * Required for replay.
     */
    async history(type, id) {
        const records = await this.storage.fetchHistory(type, id);
        return records;
    }
    // ── Specialised Queries (docs/artifact-model.md §4) ───────────────────────
    /**
     * Find all artifacts linked to a feature.
     * Returns latest version of each artifact.
     */
    async byFeature(featureId) {
        return this.storage.query({ feature_id: featureId });
    }
    /**
     * Find all artifacts linked to a bridge.
     */
    async byBridge(bridgeId) {
        return this.storage.query({ bridge_id: bridgeId });
    }
    /**
     * Find all artifacts linked to a build.
     */
    async byBuild(buildId) {
        return this.storage.query({ build_id: buildId });
    }
    /**
     * Read the latest version of every artifact for a given type.
     * Useful for operator queues such as pending escalations.
     */
    async latestByType(type) {
        const records = await this.storage.query({ artifact_type: type });
        return records;
    }
    /**
     * Find bridges whose graph_truth_hash matches a given value.
     * Used to identify stale bridges after a graph change.
     */
    async bridgesWithHash(hash) {
        const records = await this.storage.query({
            artifact_type: "bridge",
            graph_truth_hash: hash,
        });
        return records;
    }
    /**
     * List bridges that have become stale due to a graph hash change.
     * Finds bridges whose stored graph_truth_hash differs from currentHash
     * AND whose status is not already STALE/SUPERSEDED/REJECTED/EXECUTED.
     */
    async staleBridges(currentHash) {
        const all = await this.storage.query({ artifact_type: "bridge" });
        return all.filter((r) => {
            const b = r.payload;
            return (b.graph_truth_hash !== currentHash &&
                ACTIVE_BRIDGE_STATUSES.has(b.status));
        });
    }
    /**
     * List failed builds, optionally filtered by failure reason stored in
     * a linked ValidatorRun violation.
     */
    async failedBuilds() {
        const records = await this.storage.query({
            artifact_type: "build",
            payload_field: { key: "status", value: "FAILED" },
        });
        return records;
    }
    /**
     * Find all artifacts (any type) whose payload contains an artifact_ref
     * that links to a given validator concern.
     *
     * Because artifact_refs is a JSON array, this requires in-application
     * filtering on the in-memory backend. The PostgreSQL backend can use
     * a GIN index on the payload column for production efficiency.
     */
    async artifactsForValidatorRun(validatorRunId) {
        const all = await this.storage.query({});
        return all.filter((r) => {
            const p = r.payload;
            const refs = p["artifact_refs"];
            if (!Array.isArray(refs))
                return false;
            return refs.some((ref) => ref["artifact_type"] === "validator_run" &&
                ref["artifact_id"] === validatorRunId);
        });
    }
    /**
     * Find all VERIFIED_RESTRICTED WriteBackRecords awaiting promotion.
     */
    async verifiedRestrictedPendingPromotion() {
        const records = await this.storage.query({
            artifact_type: "write_back_record",
            payload_field: { key: "write_back_status", value: "VERIFIED_RESTRICTED" },
        });
        return records;
    }
    /**
     * Show drift incidents for a given feature or repo path.
     * Returns DiffArtifacts that contain path violations.
     */
    async driftIncidents(featureId) {
        const filter = { artifact_type: "diff_artifact" };
        if (featureId)
            filter.feature_id = featureId;
        const records = await this.storage.query(filter);
        return records.filter((r) => {
            const p = r.payload;
            const violations = p["path_violations"];
            return Array.isArray(violations) && violations.length > 0;
        });
    }
    /**
     * Trace ALL evidence artifacts tied to a build.
     * Returns every artifact (any type) whose payload references the build_id.
     */
    async traceEvidence(buildId) {
        return this.storage.query({ build_id: buildId }, true);
    }
    /**
     * Replay query: return every artifact recorded against a given graph
     * snapshot + hash pair, in insertion order.
     * This is the replayability anchor.
     */
    async replayBySnapshot(graphSnapshotId, graphTruthHash) {
        const byHash = await this.storage.query({ graph_truth_hash: graphTruthHash }, true);
        const bySnap = await this.storage.query({
            artifact_type: "graph_snapshot",
            artifact_id: graphSnapshotId,
        }, true);
        // Union, deduplicated by internal_id, sorted by internal_id
        const seen = new Set();
        const merged = [];
        for (const r of [...bySnap, ...byHash]) {
            if (!seen.has(r.internal_id)) {
                seen.add(r.internal_id);
                merged.push(r);
            }
        }
        return merged.sort((a, b) => a.internal_id - b.internal_id);
    }
    /**
     * Validate the majority-rule validator consensus for a build.
     * Returns the consensus outcome and whether it triggers a hard fail.
     *
     * Rules (quick-reference §7):
     *  - 2 FAIL => hard fail
     *  - 2 PASS, 1 FAIL => PASS_WITH_CONCERNS
     *  - all disagree => escalate
     */
    async validatorConsensus(buildId) {
        const records = await this.storage.query({
            artifact_type: "validator_run",
            build_id: buildId,
        });
        const runs = records;
        const pendingRuns = runs.filter((record) => !TERMINAL_VALIDATOR_RUN_STATUSES.has(record.payload.status));
        const terminalRuns = runs.filter((record) => TERMINAL_VALIDATOR_RUN_STATUSES.has(record.payload.status));
        // Single-pass count
        let failCount = 0;
        let passCount = 0;
        let concernCount = 0;
        for (const r of terminalRuns) {
            const s = r.payload.status;
            if (s === "FAIL")
                failCount++;
            else if (s === "PASS")
                passCount++;
            else if (s === "PASS_WITH_CONCERNS")
                concernCount++;
        }
        let outcome;
        let hard_fail = false;
        if (failCount >= 2) {
            outcome = "FAIL";
            hard_fail = true;
        }
        else if (passCount >= 2 && failCount === 1) {
            outcome = "PASS_WITH_CONCERNS";
        }
        else if (passCount >= 2 && concernCount === 0) {
            outcome = "PASS";
        }
        else if (passCount === 0 && concernCount === 0 && failCount === 1) {
            outcome = "FAIL";
            hard_fail = true;
        }
        else if (passCount >= 1 && concernCount >= 1 && failCount === 0) {
            outcome = "PASS_WITH_CONCERNS";
        }
        else {
            outcome = "ESCALATE";
        }
        return {
            outcome,
            hard_fail,
            validator_runs: terminalRuns,
            pending_runs: pendingRuns,
        };
    }
    /**
     * Retrieve or confirm a FreshnessCheck for a bridge.
     */
    async latestFreshnessCheck(bridgeId) {
        const records = await this.storage.query({
            artifact_type: "freshness_check",
            bridge_id: bridgeId,
        });
        if (records.length === 0)
            return null;
        return records[records.length - 1];
    }
    async totalRecords() {
        return this.storage.count();
    }
}
exports.ArtifactRegistry = ArtifactRegistry;
// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVE_BRIDGE_STATUSES = new Set(["DRAFT", "VALIDATED", "EXECUTING"]);
const TERMINAL_VALIDATOR_RUN_STATUSES = new Set([
    "PASS",
    "PASS_WITH_CONCERNS",
    "FAIL",
]);
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Extract the canonical ID from an artifact payload using the type's ID field. */
function extractId(type, artifact) {
    const idField = artifact_meta_1.ARTIFACT_META[type].idField;
    const id = artifact[idField];
    if (typeof id !== "string" || id.trim() === "") {
        return (0, id_generator_1.generateArtifactId)(type);
    }
    return id;
}
/**
 * Artifact types that do NOT require artifact_refs.
 * All other types require non-empty refs for traceability.
 * (quick-reference §9: "every bridge and validator run must be replayable")
 *
 * Inverted so new artifact types default to requiring refs (safer).
 */
const REFS_NOT_REQUIRED = new Set([
    "request",
    "metric_record",
    "app_spec",
    "feature_spec",
    "verification_report",
    "promotion_evaluation",
    // Governance config is self-standing at creation; proposals/decisions carry refs
    "governance_config",
]);
function validateArtifactRefs(type, id, artifact) {
    if (REFS_NOT_REQUIRED.has(type))
        return;
    const refs = artifact["artifact_refs"];
    if (!Array.isArray(refs) || refs.length === 0) {
        throw new MissingArtifactRefsError(type, id);
    }
}
//# sourceMappingURL=registry.js.map