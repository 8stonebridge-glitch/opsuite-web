/**
 * AES Bridge Layer — Bridge Compiler
 *
 * Compiles orchestrator-selected truth and scoped execution intent into the
 * single bridge contract that a builder will later consume.
 */
import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, Bridge, ConfidenceBreakdown, DependencyType, GraphSnapshot, StoredRecord, AcceptanceCriterion, ApiContract, ComponentBoundary, DbTouch, EventDefinition, ScopeDefinition, TestCase, TieredConstraint } from "../types";
export interface CompileBridgeInput {
    build_id: string;
    feature_id: string;
    graph_snapshot: Pick<GraphSnapshot, "graph_snapshot_id" | "graph_truth_hash" | "feature_id">;
    intent: string;
    scope: ScopeDefinition;
    out_of_scope?: string[];
    constraints?: string[];
    patterns?: string[];
    anti_patterns?: string[];
    data_model?: Record<string, unknown>;
    api_contracts?: ApiContract[];
    events?: EventDefinition[];
    db_touches?: DbTouch[];
    component_boundaries?: ComponentBoundary[];
    read_scope: ScopeDefinition;
    write_scope: ScopeDefinition;
    read_scope_amendments?: string[];
    depends_on_bridge_ids?: string[];
    predecessor_build_ids?: string[];
    dependency_type?: DependencyType;
    acceptance_criteria?: AcceptanceCriterion[];
    test_cases?: TestCase[];
    confidence_breakdown: ConfidenceBreakdown;
    tiered_constraints?: TieredConstraint[];
    artifact_refs: ArtifactRef[];
}
export declare class BridgeCompiler {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    compile(input: CompileBridgeInput): Promise<StoredRecord<Bridge>>;
}
//# sourceMappingURL=bridge-compiler.d.ts.map