/**
 * AES Temporal/Change Retrieval Agent
 *
 * Looks at historical outcomes: success rate, failure patterns,
 * stale bridges, recent regressions, changes in constraints over time.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
export interface TemporalContext {
    context_id: string;
    feature_id: string;
    captured_at: string;
    source: "temporal_change_retriever";
    confidence: number;
    artifact_refs: ArtifactRef[];
    /** Build history for this feature */
    build_history: BuildHistoryEntry[];
    /** Success trend (improving, degrading, stable, unknown) */
    success_trend: "improving" | "degrading" | "stable" | "unknown";
    /** Average build duration */
    avg_duration_s: number;
    /** Number of bridge revisions */
    bridge_revision_count: number;
    /** Whether the latest bridge is stale */
    bridge_stale: boolean;
    /** Recent regressions */
    regressions: Regression[];
    /** Constraint changes over time */
    constraint_changes: ConstraintChange[];
    /** Time since last successful build */
    time_since_last_success_hours: number | null;
}
export interface BuildHistoryEntry {
    build_id: string;
    status: string;
    tests_passed: number;
    tests_failed: number;
    built_at: string;
    duration_s: number;
}
export interface Regression {
    description: string;
    detected_at: string;
    severity: "low" | "medium" | "high";
    affected_build_id: string;
}
export interface ConstraintChange {
    description: string;
    changed_at: string;
    bridge_id: string;
    type: "added" | "removed" | "modified";
}
export declare class TemporalChangeRetriever {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    retrieve(featureId: string): Promise<TemporalContext>;
    private calcDuration;
    private calcTrend;
    private detectRegressions;
    private detectConstraintChanges;
}
//# sourceMappingURL=temporal-change-retriever.d.ts.map