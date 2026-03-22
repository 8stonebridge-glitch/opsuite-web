/**
 * AES Graph Layer — Snapshot Service
 *
 * Captures a deterministic graph snapshot and writes it through the append-only
 * artifact registry.
 */
import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, GraphSnapshot, StoredRecord } from "../types";
import type { GraphTruthAdapter } from "./truth-adapter";
export interface CaptureSnapshotInput {
    feature_id: string;
    query_profile?: string;
    artifact_refs?: ArtifactRef[];
}
export declare class GraphSnapshotService {
    private readonly registry;
    private readonly truthAdapter;
    private readonly now;
    constructor(registry: ArtifactRegistry, truthAdapter: GraphTruthAdapter, now?: () => Date);
    capture(input: CaptureSnapshotInput): Promise<StoredRecord<GraphSnapshot>>;
}
//# sourceMappingURL=snapshot-service.d.ts.map