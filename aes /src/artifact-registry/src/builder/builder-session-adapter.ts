import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  Build,
  ChangedFile,
  DiffArtifact,
  PathViolation,
  StoredRecord,
} from "../types";
import { BuildExecutionStateError, ScopeDecision, ScopeGuard } from "./scope-guard";

export interface InterfaceTouchSummary {
  api_contract_names?: string[];
  event_names?: string[];
  db_tables?: string[];
}

export interface ChangedFileInput {
  path: string;
  change_type: ChangedFile["change_type"];
  lines_added: number;
  lines_removed: number;
}

export interface CaptureBuilderOutputsInput {
  build_id: string;
  changed_files: ChangedFileInput[];
  interface_touches?: InterfaceTouchSummary;
  blob_ref?: string | null;
  artifact_refs?: ArtifactRef[];
}

export interface CaptureBuilderOutputsResult {
  diff_record: StoredRecord<DiffArtifact>;
  hard_failure: boolean;
  violations: PathViolation[];
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

export class BuilderSessionAdapter {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly scopeGuard: ScopeGuard,
    private readonly now: () => Date = () => new Date()
  ) {}

  async attemptRead(buildId: string, repoPath: string): Promise<ScopeDecision> {
    return this.scopeGuard.evaluateRead(buildId, repoPath);
  }

  async attemptWrite(buildId: string, repoPath: string): Promise<ScopeDecision> {
    return this.scopeGuard.evaluateWrite(buildId, repoPath);
  }

  async captureOutputs(
    input: CaptureBuilderOutputsInput
  ): Promise<CaptureBuilderOutputsResult> {
    const { build, bridge } = await this.runningContext(input.build_id);
    const changedFiles: ChangedFile[] = [];
    const violations: PathViolation[] = [];

    for (const changedFile of input.changed_files) {
      const decision = await this.scopeGuard.evaluateWrite(
        build.build_id,
        changedFile.path
      );
      changedFiles.push({
        ...changedFile,
        in_write_scope: decision.allowed,
      });

      if (!decision.allowed) {
        violations.push({
          path: changedFile.path,
          violation_type: "outside_write_scope",
          description: decision.reason ?? `Path ${changedFile.path} is outside write_scope.`,
        });
      }
    }

    violations.push(
      ...this.interfaceViolations(bridge, input.interface_touches ?? {})
    );

    const diffArtifact: DiffArtifact = {
      diff_artifact_id: generateArtifactId("diff_artifact"),
      build_id: build.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: build.feature_id,
      captured_at: this.now().toISOString(),
      changed_files: changedFiles,
      path_violations: violations,
      blob_ref: input.blob_ref ?? null,
      artifact_refs: mergeArtifactRefs(
        build.artifact_refs,
        [
          {
            artifact_type: "build",
            artifact_id: build.build_id,
            role: "diff_source",
          },
          {
            artifact_type: "bridge",
            artifact_id: bridge.bridge_id,
            role: "scope_source",
          },
        ],
        input.artifact_refs ?? []
      ),
    };
    const diffRecord = await this.registry.write("diff_artifact", diffArtifact);

    return {
      diff_record: diffRecord,
      hard_failure: violations.length > 0,
      violations,
    };
  }

  private interfaceViolations(
    bridge: Bridge,
    touches: InterfaceTouchSummary
  ): PathViolation[] {
    const violations: PathViolation[] = [];
    const allowedApiContracts = new Set(
      bridge.api_contracts.map((apiContract) => apiContract.name)
    );
    const allowedEvents = new Set(bridge.events.map((eventDefinition) => eventDefinition.name));
    const allowedDbTables = new Set(bridge.db_touches.map((dbTouch) => dbTouch.table));

    for (const apiContractName of touches.api_contract_names ?? []) {
      if (!allowedApiContracts.has(apiContractName)) {
        violations.push({
          path: `api_contract:${apiContractName}`,
          violation_type: "interface_boundary",
          description: `API contract ${apiContractName} is outside the bridge contract.`,
        });
      }
    }

    for (const eventName of touches.event_names ?? []) {
      if (!allowedEvents.has(eventName)) {
        violations.push({
          path: `event:${eventName}`,
          violation_type: "interface_boundary",
          description: `Event ${eventName} is outside the bridge contract.`,
        });
      }
    }

    for (const dbTable of touches.db_tables ?? []) {
      if (!allowedDbTables.has(dbTable)) {
        violations.push({
          path: `db:${dbTable}`,
          violation_type: "interface_boundary",
          description: `DB touch ${dbTable} is outside the bridge contract.`,
        });
      }
    }

    return violations;
  }

  private async runningContext(
    buildId: string
  ): Promise<{ build: Build; bridge: Bridge }> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    if (buildRecord.payload.status !== "RUNNING") {
      throw new BuildExecutionStateError(buildId, buildRecord.payload.status);
    }

    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );

    return {
      build: buildRecord.payload,
      bridge: bridgeRecord.payload,
    };
  }
}
