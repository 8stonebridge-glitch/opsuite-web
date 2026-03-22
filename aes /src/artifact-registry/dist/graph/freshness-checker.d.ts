/**
 * AES Graph Layer — Freshness Checker
 */
import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, Bridge, FreshnessCheck, StoredRecord } from "../types";
import type { GraphTruthAdapter } from "./truth-adapter";
export interface FreshnessEvaluation {
    record: StoredRecord<FreshnessCheck>;
    is_fresh: boolean;
    changed_node_ids: string[];
    changed_edge_ids: string[];
}
export declare class FreshnessChecker {
    private readonly registry;
    private readonly truthAdapter;
    private readonly now;
    constructor(registry: ArtifactRegistry, truthAdapter: GraphTruthAdapter, now?: () => Date);
    checkBridge(bridge: Bridge, artifactRefs?: ArtifactRef[]): Promise<FreshnessEvaluation>;
}
//# sourceMappingURL=freshness-checker.d.ts.map