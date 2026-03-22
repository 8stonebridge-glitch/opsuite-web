import type {
  ArtifactRef,
  Bridge,
  Build,
  StoredRecord,
  ValidatorEvidence,
  ValidatorOutcome,
  ValidatorViolation,
} from "../types";

export interface ValidatorExecutionContext {
  build_record: StoredRecord<Build>;
  bridge_record: StoredRecord<Bridge>;
  build_artifacts: StoredRecord[];
}

export interface ValidatorAdapterResult {
  status: ValidatorOutcome;
  evidence: ValidatorEvidence[];
  violations?: ValidatorViolation[];
  missing?: string[];
  concerns?: string[];
  confidence: number;
  artifact_refs?: ArtifactRef[];
}

export interface ValidatorAdapter {
  validator_id: string;
  validate(context: ValidatorExecutionContext): Promise<ValidatorAdapterResult>;
}
