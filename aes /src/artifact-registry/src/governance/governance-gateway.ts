import { ScopeGuard, type ApproveReadScopeExpansionResult } from "../builder";
import { ArtifactRegistry } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  EscalationRecord,
  ReadScopeAmendment,
  ScopeExpansionRequest,
  StoredRecord,
  ValidatorRun,
} from "../types";

export type EscalationDecision = NonNullable<EscalationRecord["decision"]>;

export interface GovernanceDecisionContext {
  escalation_record: StoredRecord<EscalationRecord>;
  escalation_history: StoredRecord<EscalationRecord>[];
  build_artifacts: StoredRecord[];
  bridge_artifacts: StoredRecord[];
  related_validator_runs: StoredRecord<ValidatorRun>[];
  related_scope_expansion_request: StoredRecord<ScopeExpansionRequest> | null;
  related_scope_expansion_history: StoredRecord<ScopeExpansionRequest>[];
}

export interface GovernanceDecisionInput {
  escalation_record_id: string;
  decided_by: string;
  rationale: string;
  approved_scope_paths?: string[];
  artifact_refs?: ArtifactRef[];
}

export interface GovernanceDecisionResult {
  escalation_record: StoredRecord<EscalationRecord>;
  scope_expansion_request_record?: StoredRecord<ScopeExpansionRequest>;
  read_scope_amendment_record?: StoredRecord<ReadScopeAmendment>;
  bridge_record?: StoredRecord<Bridge>;
}

export class EscalationDecisionStateError extends Error {
  constructor(
    escalationRecordId: string,
    currentDecision: EscalationRecord["decision"],
    requestedDecision: EscalationDecision
  ) {
    super(
      `Escalation ${escalationRecordId} cannot move from ${currentDecision ?? "PENDING"} to ${requestedDecision}.`
    );
    this.name = "EscalationDecisionStateError";
  }
}

export class MissingScopeGuardForEscalationError extends Error {
  constructor(escalationRecordId: string) {
    super(
      `Escalation ${escalationRecordId} is linked to a scope expansion request but GovernanceGateway has no ScopeGuard.`
    );
    this.name = "MissingScopeGuardForEscalationError";
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

function assertEscalationDecisionAllowed(
  currentDecision: EscalationRecord["decision"],
  requestedDecision: EscalationDecision,
  escalationRecordId: string
): void {
  if (currentDecision === "APPROVED" || currentDecision === "REJECTED") {
    throw new EscalationDecisionStateError(
      escalationRecordId,
      currentDecision,
      requestedDecision
    );
  }
}

function uniqueRecords(records: StoredRecord[]): StoredRecord[] {
  const seen = new Set<number>();
  const unique: StoredRecord[] = [];

  for (const record of records) {
    if (!seen.has(record.internal_id)) {
      seen.add(record.internal_id);
      unique.push(record);
    }
  }

  return unique;
}

export class GovernanceGateway {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly options: {
      scope_guard?: ScopeGuard;
    } = {},
    private readonly now: () => Date = () => new Date()
  ) {}

  async pendingDecisionQueue(): Promise<StoredRecord<EscalationRecord>[]> {
    const escalations = await this.registry.latestByType<EscalationRecord>(
      "escalation_record"
    );

    return escalations
      .filter(
        (record) =>
          record.payload.decision === null ||
          record.payload.decision === "DEFERRED"
      )
      .sort((left, right) => left.internal_id - right.internal_id);
  }

  async decisionContext(
    escalationRecordId: string
  ): Promise<GovernanceDecisionContext> {
    const escalationRecord = await this.registry.read<EscalationRecord>(
      "escalation_record",
      escalationRecordId
    );
    const escalationHistory = await this.registry.history<EscalationRecord>(
      "escalation_record",
      escalationRecordId
    );

    const buildArtifacts = escalationRecord.payload.build_id
      ? await this.registry.traceEvidence(escalationRecord.payload.build_id)
      : [];
    const bridgeArtifacts = escalationRecord.payload.bridge_id
      ? await this.registry.byBridge(escalationRecord.payload.bridge_id)
      : [];
    const validatorRunRefs = escalationRecord.payload.artifact_refs.filter(
      (artifactRef) => artifactRef.artifact_type === "validator_run"
    );
    const relatedValidatorRuns = await Promise.all(
      validatorRunRefs.map((artifactRef) =>
        this.registry.read<ValidatorRun>(
          "validator_run",
          artifactRef.artifact_id
        )
      )
    );

    const scopeExpansionRef = escalationRecord.payload.artifact_refs.find(
      (artifactRef) => artifactRef.artifact_type === "scope_expansion_request"
    );
    const relatedScopeExpansionRequest = scopeExpansionRef
      ? await this.registry.read<ScopeExpansionRequest>(
          "scope_expansion_request",
          scopeExpansionRef.artifact_id
        )
      : null;
    const relatedScopeExpansionHistory = relatedScopeExpansionRequest
      ? await this.registry.history<ScopeExpansionRequest>(
          "scope_expansion_request",
          relatedScopeExpansionRequest.payload.scope_expansion_request_id
        )
      : [];

    return {
      escalation_record: escalationRecord,
      escalation_history: escalationHistory,
      build_artifacts: buildArtifacts,
      bridge_artifacts: uniqueRecords(bridgeArtifacts),
      related_validator_runs: relatedValidatorRuns,
      related_scope_expansion_request: relatedScopeExpansionRequest,
      related_scope_expansion_history: relatedScopeExpansionHistory,
    };
  }

  async approveEscalation(
    input: GovernanceDecisionInput
  ): Promise<GovernanceDecisionResult> {
    const escalationRecord = await this.registry.read<EscalationRecord>(
      "escalation_record",
      input.escalation_record_id
    );
    assertEscalationDecisionAllowed(
      escalationRecord.payload.decision,
      "APPROVED",
      input.escalation_record_id
    );

    const context = await this.decisionContext(input.escalation_record_id);
    let scopeExpansionResult: ApproveReadScopeExpansionResult | undefined;
    if (context.related_scope_expansion_request) {
      if (!this.options.scope_guard) {
        throw new MissingScopeGuardForEscalationError(input.escalation_record_id);
      }

      scopeExpansionResult = await this.options.scope_guard.approveReadScopeExpansion({
        scope_expansion_request_id:
          context.related_scope_expansion_request.payload.scope_expansion_request_id,
        approved_paths:
          input.approved_scope_paths &&
          input.approved_scope_paths.length > 0
            ? input.approved_scope_paths
            : context.related_scope_expansion_request.payload.requested_paths,
        approved_by: input.decided_by,
        artifact_refs: input.artifact_refs,
      });
    }

    return {
      escalation_record: await this.appendDecision(
        escalationRecord.payload,
        "APPROVED",
        input
      ),
      scope_expansion_request_record: scopeExpansionResult?.request_record,
      read_scope_amendment_record: scopeExpansionResult?.amendment_record,
      bridge_record: scopeExpansionResult?.bridge_record,
    };
  }

  async rejectEscalation(
    input: GovernanceDecisionInput
  ): Promise<GovernanceDecisionResult> {
    const escalationRecord = await this.registry.read<EscalationRecord>(
      "escalation_record",
      input.escalation_record_id
    );
    assertEscalationDecisionAllowed(
      escalationRecord.payload.decision,
      "REJECTED",
      input.escalation_record_id
    );

    let scopeExpansionRequestRecord: StoredRecord<ScopeExpansionRequest> | undefined;
    const context = await this.decisionContext(input.escalation_record_id);
    if (context.related_scope_expansion_request) {
      if (!this.options.scope_guard) {
        throw new MissingScopeGuardForEscalationError(input.escalation_record_id);
      }

      scopeExpansionRequestRecord =
        await this.options.scope_guard.rejectReadScopeExpansion({
          scope_expansion_request_id:
            context.related_scope_expansion_request.payload.scope_expansion_request_id,
          artifact_refs: input.artifact_refs,
        });
    }

    return {
      escalation_record: await this.appendDecision(
        escalationRecord.payload,
        "REJECTED",
        input
      ),
      scope_expansion_request_record: scopeExpansionRequestRecord,
    };
  }

  async deferEscalation(
    input: GovernanceDecisionInput
  ): Promise<GovernanceDecisionResult> {
    const escalationRecord = await this.registry.read<EscalationRecord>(
      "escalation_record",
      input.escalation_record_id
    );
    assertEscalationDecisionAllowed(
      escalationRecord.payload.decision,
      "DEFERRED",
      input.escalation_record_id
    );

    return {
      escalation_record: await this.appendDecision(
        escalationRecord.payload,
        "DEFERRED",
        input
      ),
    };
  }

  private async appendDecision(
    escalation: EscalationRecord,
    decision: EscalationDecision,
    input: GovernanceDecisionInput
  ): Promise<StoredRecord<EscalationRecord>> {
    return this.registry.write("escalation_record", {
      ...escalation,
      decision,
      decided_at: this.now().toISOString(),
      decided_by: input.decided_by,
      rationale: input.rationale,
      artifact_refs: mergeArtifactRefs(
        escalation.artifact_refs,
        input.artifact_refs ?? []
      ),
    });
  }
}
