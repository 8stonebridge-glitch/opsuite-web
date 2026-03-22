import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  AuthorityTier,
  Build,
  StoredRecord,
  ValidatorOutcome,
  WriteBackRecord,
  WriteBackStatus,
} from "../types";

export class InvalidWriteBackStateError extends Error {
  constructor(buildId: string, status: Build["status"]) {
    super(`Cannot write back build ${buildId} from non-terminal state ${status}.`);
    this.name = "InvalidWriteBackStateError";
  }
}

export class EscalatedConsensusWriteBackError extends Error {
  constructor(buildId: string) {
    super(`Build ${buildId} cannot write back while validator consensus is ESCALATE.`);
    this.name = "EscalatedConsensusWriteBackError";
  }
}

export interface WriteBackDecisionResult {
  validator_outcome: ValidatorOutcome;
  write_back_record: StoredRecord<WriteBackRecord>;
  promoted_tier?: AuthorityTier;
}

export function determinePromotion(
  currentTier: AuthorityTier,
  validatorOutcome: ValidatorOutcome,
  successfulBuildCount: number
): AuthorityTier {
  if (validatorOutcome === "FAIL") return currentTier;

  if (validatorOutcome === "PASS_WITH_CONCERNS") {
    if (
      currentTier === "UNTESTED" ||
      currentTier === "DONOR_RAW" ||
      currentTier === "PROVISIONAL"
    ) {
      return "VERIFIED_RESTRICTED";
    }
    return currentTier;
  }

  // PASS case
  if (
    currentTier === "UNTESTED" ||
    currentTier === "DONOR_RAW" ||
    currentTier === "PROVISIONAL"
  ) {
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

function mergeArtifactRefs(...groups: ArtifactRef[][]): ArtifactRef[] {
  const seen = new Set<string>();
  const merged: ArtifactRef[] = [];

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

function mapWriteBackStatus(
  validatorOutcome: ValidatorOutcome
): WriteBackStatus | null {
  if (validatorOutcome === "PASS") {
    return "VERIFIED";
  }

  if (validatorOutcome === "PASS_WITH_CONCERNS") {
    return "VERIFIED_RESTRICTED";
  }

  return null;
}

export class WriteBackManager {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date()
  ) {}

  async recordForBuild(
    buildId: string,
    options: {
      validator_outcome?: ValidatorOutcome;
      artifact_refs?: ArtifactRef[];
      rejection_reason?: string | null;
      current_authority_tier?: AuthorityTier;
      successful_build_count?: number;
    } = {}
  ): Promise<WriteBackDecisionResult> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
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
    const promotedTier =
      options.current_authority_tier != null
        ? determinePromotion(
            options.current_authority_tier,
            validatorOutcome,
            options.successful_build_count ?? 0
          )
        : undefined;
    const writeBackRecord: WriteBackRecord = {
      write_back_record_id: generateArtifactId("write_back_record"),
      build_id: build.build_id,
      bridge_id: build.bridge_id,
      feature_id: build.feature_id,
      decided_at: this.now().toISOString(),
      validator_consensus: validatorOutcome,
      write_back_status: writeBackStatus,
      written_back: writeBackStatus !== null,
      rejection_reason:
        writeBackStatus === null
          ? options.rejection_reason ??
            "Validator consensus FAIL prevents write-back."
          : null,
      promoted_tier: promotedTier,
      artifact_refs: mergeArtifactRefs(
        build.artifact_refs,
        consensus.validator_runs.map((record) => ({
          artifact_type: "validator_run" as const,
          artifact_id: record.payload.validator_run_id,
          role: "validation_evidence" as const,
        })),
        options.artifact_refs ?? []
      ),
    };

    return {
      validator_outcome: validatorOutcome,
      promoted_tier: promotedTier,
      write_back_record: await this.registry.write(
        "write_back_record",
        writeBackRecord
      ),
    };
  }
}
