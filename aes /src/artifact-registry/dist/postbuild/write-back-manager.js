"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteBackManager = exports.EscalatedConsensusWriteBackError = exports.InvalidWriteBackStateError = void 0;
exports.determinePromotion = determinePromotion;
const registry_1 = require("../registry");
class InvalidWriteBackStateError extends Error {
    constructor(buildId, status) {
        super(`Cannot write back build ${buildId} from non-terminal state ${status}.`);
        this.name = "InvalidWriteBackStateError";
    }
}
exports.InvalidWriteBackStateError = InvalidWriteBackStateError;
class EscalatedConsensusWriteBackError extends Error {
    constructor(buildId) {
        super(`Build ${buildId} cannot write back while validator consensus is ESCALATE.`);
        this.name = "EscalatedConsensusWriteBackError";
    }
}
exports.EscalatedConsensusWriteBackError = EscalatedConsensusWriteBackError;
function determinePromotion(currentTier, validatorOutcome, successfulBuildCount) {
    if (validatorOutcome === "FAIL")
        return currentTier;
    if (validatorOutcome === "PASS_WITH_CONCERNS") {
        if (currentTier === "UNTESTED" ||
            currentTier === "DONOR_RAW" ||
            currentTier === "PROVISIONAL") {
            return "VERIFIED_RESTRICTED";
        }
        return currentTier;
    }
    // PASS case
    if (currentTier === "UNTESTED" ||
        currentTier === "DONOR_RAW" ||
        currentTier === "PROVISIONAL") {
        return "VERIFIED";
    }
    if (currentTier === "VERIFIED_RESTRICTED") {
        return "VERIFIED";
    }
    if (currentTier === "VERIFIED" && successfulBuildCount >= 3) {
        return "CANONICAL";
    }
    return currentTier;
}
function mergeArtifactRefs(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        for (const artifactRef of group) {
            const key = `${artifactRef.artifact_type}::${artifactRef.artifact_id}::${artifactRef.role}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(artifactRef);
            }
        }
    }
    return merged;
}
function mapWriteBackStatus(validatorOutcome) {
    if (validatorOutcome === "PASS") {
        return "VERIFIED";
    }
    if (validatorOutcome === "PASS_WITH_CONCERNS") {
        return "VERIFIED_RESTRICTED";
    }
    return null;
}
class WriteBackManager {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async recordForBuild(buildId, options = {}) {
        const buildRecord = await this.registry.read("build", buildId);
        const build = buildRecord.payload;
        if (build.status !== "PASSED" && build.status !== "FAILED") {
            throw new InvalidWriteBackStateError(buildId, build.status);
        }
        const consensus = await this.registry.validatorConsensus(buildId);
        if (consensus.pending_runs.length > 0 || consensus.outcome === "ESCALATE") {
            throw new EscalatedConsensusWriteBackError(buildId);
        }
        const validatorOutcome = options.validator_outcome ?? consensus.outcome;
        const writeBackStatus = mapWriteBackStatus(validatorOutcome);
        const promotedTier = options.current_authority_tier != null
            ? determinePromotion(options.current_authority_tier, validatorOutcome, options.successful_build_count ?? 0)
            : undefined;
        const writeBackRecord = {
            write_back_record_id: (0, registry_1.generateArtifactId)("write_back_record"),
            build_id: build.build_id,
            bridge_id: build.bridge_id,
            feature_id: build.feature_id,
            decided_at: this.now().toISOString(),
            validator_consensus: validatorOutcome,
            write_back_status: writeBackStatus,
            written_back: writeBackStatus !== null,
            rejection_reason: writeBackStatus === null
                ? options.rejection_reason ??
                    "Validator consensus FAIL prevents write-back."
                : null,
            promoted_tier: promotedTier,
            artifact_refs: mergeArtifactRefs(build.artifact_refs, consensus.validator_runs.map((record) => ({
                artifact_type: "validator_run",
                artifact_id: record.payload.validator_run_id,
                role: "validation_evidence",
            })), options.artifact_refs ?? []),
        };
        return {
            validator_outcome: validatorOutcome,
            promoted_tier: promotedTier,
            write_back_record: await this.registry.write("write_back_record", writeBackRecord),
        };
    }
}
exports.WriteBackManager = WriteBackManager;
//# sourceMappingURL=write-back-manager.js.map