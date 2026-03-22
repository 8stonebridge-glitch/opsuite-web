import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  Build,
  EscalationRecord,
  StoredRecord,
  ValidatorEvidence,
  ValidatorOutcome,
  ValidatorRun,
  ValidatorViolation,
  WriteBackRecord,
} from "../types";
import {
  assertBridgeTransition,
  assertBuildTransition,
  assertValidatorRunTransition,
} from "../orchestrator/authority-checks";
import { WriteBackManager } from "./write-back-manager";
import type {
  ValidatorAdapter,
  ValidatorExecutionContext,
} from "./validator-adapter";

export class MissingValidatorEvidenceError extends Error {
  constructor(validatorRunId: string) {
    super(`Validator run ${validatorRunId} cannot complete without evidence.`);
    this.name = "MissingValidatorEvidenceError";
  }
}

export class PendingValidatorRunsError extends Error {
  constructor(buildId: string) {
    super(`Build ${buildId} still has queued or running validator runs.`);
    this.name = "PendingValidatorRunsError";
  }
}

export class NoValidatorRunsError extends Error {
  constructor(buildId: string) {
    super(`Build ${buildId} has no validator runs to finalize.`);
    this.name = "NoValidatorRunsError";
  }
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

function cloneBuildWithStatus(
  build: Build,
  status: Extract<Build["status"], "PASSED" | "FAILED">,
  nowIso: string
): Build {
  return {
    ...build,
    status,
    blocked_reasons: [],
    ended_at: nowIso,
  };
}

function cloneBridgeWithStatus(
  bridge: Bridge,
  status: Extract<Bridge["status"], "EXECUTED">
): Bridge {
  return {
    ...bridge,
    status,
  };
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

export type ValidatorFinalizationResult =
  | FinalizedValidatorResult
  | EscalatedValidatorResult;

export class ValidatorCoordinator {
  private readonly writeBackManager: WriteBackManager;

  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date()
  ) {
    this.writeBackManager = new WriteBackManager(registry, now);
  }

  async queueValidatorRun(
    input: QueueValidatorRunInput
  ): Promise<StoredRecord<ValidatorRun>> {
    const validatorRun: ValidatorRun = {
      validator_id: input.validator_id,
      validator_run_id: generateArtifactId("validator_run"),
      build_id: input.build_id,
      bridge_id: input.bridge_id,
      validated_at: this.now().toISOString(),
      status: "QUEUED",
      evidence: [],
      violations: [],
      missing: [],
      concerns: [],
      confidence: 0,
      artifact_refs: input.artifact_refs,
    };

    return this.registry.write("validator_run", validatorRun);
  }

  async markValidatorRunning(
    validatorRunId: string
  ): Promise<StoredRecord<ValidatorRun>> {
    const record = await this.registry.read<ValidatorRun>(
      "validator_run",
      validatorRunId
    );
    assertValidatorRunTransition(record.payload.status, "RUNNING");

    const running: ValidatorRun = {
      ...record.payload,
      status: "RUNNING",
      validated_at: this.now().toISOString(),
    };

    return this.registry.write("validator_run", running);
  }

  async completeValidatorRun(
    input: CompleteValidatorRunInput
  ): Promise<StoredRecord<ValidatorRun>> {
    if (input.evidence.length === 0) {
      throw new MissingValidatorEvidenceError(input.validator_run_id);
    }

    const record = await this.registry.read<ValidatorRun>(
      "validator_run",
      input.validator_run_id
    );
    assertValidatorRunTransition(record.payload.status, input.status);

    const completed: ValidatorRun = {
      ...record.payload,
      status: input.status,
      validated_at: this.now().toISOString(),
      evidence: input.evidence,
      violations: input.violations ?? [],
      missing: input.missing ?? [],
      concerns: input.concerns ?? [],
      confidence: input.confidence,
      artifact_refs: mergeArtifactRefs(
        record.payload.artifact_refs,
        input.artifact_refs ?? []
      ),
    };

    return this.registry.write("validator_run", completed);
  }

  async executeValidators(
    buildId: string,
    adapters: ValidatorAdapter[]
  ): Promise<{
    validator_runs: StoredRecord<ValidatorRun>[];
    finalization: ValidatorFinalizationResult;
  }> {
    const context = await this.buildExecutionContext(buildId);
    const completedRuns: StoredRecord<ValidatorRun>[] = [];

    for (const adapter of adapters) {
      const queued = await this.queueValidatorRun({
        validator_id: adapter.validator_id,
        build_id: context.build_record.payload.build_id,
        bridge_id: context.bridge_record.payload.bridge_id,
        artifact_refs: mergeArtifactRefs(
          context.build_record.payload.artifact_refs,
          [
            {
              artifact_type: "build",
              artifact_id: context.build_record.payload.build_id,
              role: "validation_evidence",
            },
            {
              artifact_type: "bridge",
              artifact_id: context.bridge_record.payload.bridge_id,
              role: "validation_evidence",
            },
          ]
        ),
      });
      await this.markValidatorRunning(queued.payload.validator_run_id);

      const result = await adapter.validate(context);
      completedRuns.push(
        await this.completeValidatorRun({
          validator_run_id: queued.payload.validator_run_id,
          ...result,
        })
      );
    }

    return {
      validator_runs: completedRuns,
      finalization: await this.finalizeBuild(buildId),
    };
  }

  async finalizeBuild(buildId: string): Promise<ValidatorFinalizationResult> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    const build = buildRecord.payload;
    const bridgeRecord = await this.registry.read<Bridge>("bridge", build.bridge_id);
    const bridge = bridgeRecord.payload;

    assertBuildTransition(build.status, "PASSED");
    assertBridgeTransition(bridge.status, "EXECUTED");

    const consensus = await this.registry.validatorConsensus(buildId);
    if (consensus.validator_runs.length === 0) {
      throw new NoValidatorRunsError(buildId);
    }
    if (consensus.pending_runs.length > 0) {
      throw new PendingValidatorRunsError(buildId);
    }

    if (consensus.outcome === "ESCALATE") {
      const escalationRecord: EscalationRecord = {
        escalation_record_id: generateArtifactId("escalation_record"),
        build_id: build.build_id,
        bridge_id: bridge.bridge_id,
        feature_id: build.feature_id,
        escalated_at: this.now().toISOString(),
        escalation_reason: "Validator runs did not reach actionable consensus.",
        escalation_type: "validator_disagreement",
        decision: null,
        decided_at: null,
        decided_by: null,
        rationale: null,
        artifact_refs: mergeArtifactRefs(
          build.artifact_refs,
          [
            {
              artifact_type: "build",
              artifact_id: build.build_id,
              role: "escalation_source",
            },
            {
              artifact_type: "bridge",
              artifact_id: bridge.bridge_id,
              role: "escalation_source",
            },
          ],
          consensus.validator_runs.map((record) => ({
            artifact_type: "validator_run" as const,
            artifact_id: record.payload.validator_run_id,
            role: "escalation_source" as const,
          }))
        ),
      };

      return {
        state: "ESCALATED",
        validator_outcome: "ESCALATE",
        escalation_record: await this.registry.write(
          "escalation_record",
          escalationRecord
        ),
        validator_runs: consensus.validator_runs,
      };
    }

    const terminalStatus: Extract<Build["status"], "PASSED" | "FAILED"> =
      consensus.outcome === "FAIL" ? "FAILED" : "PASSED";
    const nowIso = this.now().toISOString();
    const finalBuildRecord = await this.registry.write(
      "build",
      cloneBuildWithStatus(build, terminalStatus, nowIso)
    );
    const executedBridgeRecord = await this.registry.write(
      "bridge",
      cloneBridgeWithStatus(bridge, "EXECUTED")
    );
    const writeBackResult = await this.writeBackManager.recordForBuild(buildId, {
      validator_outcome: consensus.outcome,
      artifact_refs: [
        {
          artifact_type: "build",
          artifact_id: finalBuildRecord.payload.build_id,
          role: "evidence_source",
        },
        {
          artifact_type: "bridge",
          artifact_id: executedBridgeRecord.payload.bridge_id,
          role: "evidence_source",
        },
      ],
    });

    return {
      state: "FINALIZED",
      outcome: terminalStatus,
      validator_outcome: consensus.outcome,
      build_record: finalBuildRecord,
      bridge_record: executedBridgeRecord,
      write_back_record: writeBackResult.write_back_record,
      validator_runs: consensus.validator_runs,
    };
  }

  private async buildExecutionContext(
    buildId: string
  ): Promise<ValidatorExecutionContext> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );

    return {
      build_record: buildRecord,
      bridge_record: bridgeRecord,
      build_artifacts: await this.registry.traceEvidence(buildId),
    };
  }
}
