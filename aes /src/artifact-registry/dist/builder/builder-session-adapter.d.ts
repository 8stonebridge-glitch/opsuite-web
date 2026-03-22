import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, ChangedFile, DiffArtifact, PathViolation, StoredRecord } from "../types";
import { ScopeDecision, ScopeGuard } from "./scope-guard";
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
export declare class BuilderSessionAdapter {
    private readonly registry;
    private readonly scopeGuard;
    private readonly now;
    constructor(registry: ArtifactRegistry, scopeGuard: ScopeGuard, now?: () => Date);
    attemptRead(buildId: string, repoPath: string): Promise<ScopeDecision>;
    attemptWrite(buildId: string, repoPath: string): Promise<ScopeDecision>;
    captureOutputs(input: CaptureBuilderOutputsInput): Promise<CaptureBuilderOutputsResult>;
    private interfaceViolations;
    private runningContext;
}
//# sourceMappingURL=builder-session-adapter.d.ts.map