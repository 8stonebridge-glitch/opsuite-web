/**
 * AES Context/Dependency Retrieval Agent
 *
 * Looks at neighbor features and upstream/downstream dependencies.
 * Answers: what must exist first, what contracts does this feature
 * rely on, what adjacent flows matter.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec } from "../types/app-spec";
export interface DependencyContext {
    context_id: string;
    feature_id: string;
    captured_at: string;
    source: "context_dependency_retriever";
    confidence: number;
    artifact_refs: ArtifactRef[];
    /** Direct upstream dependencies */
    upstream: UpstreamDependency[];
    /** Direct downstream dependents */
    downstream: DownstreamDependent[];
    /** Contracts this feature must satisfy for downstream features */
    required_contracts: RequiredContract[];
    /** Contracts this feature consumes from upstream features */
    consumed_contracts: ConsumedContract[];
    /** Shared data entities across the dependency chain */
    shared_entities: string[];
    /** Whether all upstream dependencies are satisfied */
    all_upstream_satisfied: boolean;
    /** Blocking issues */
    blockers: string[];
}
export interface UpstreamDependency {
    feature_id: string;
    dependency_type: "hard" | "soft";
    status: "PASSED" | "FAILED" | "NOT_BUILT" | "UNKNOWN";
    bridge_id?: string;
    satisfied: boolean;
}
export interface DownstreamDependent {
    feature_id: string;
    dependency_type: "hard" | "soft";
    status: "WAITING" | "READY" | "BLOCKED";
}
export interface RequiredContract {
    contract_id: string;
    consumed_by_feature_id: string;
    description: string;
    type: "api" | "data" | "event" | "auth";
}
export interface ConsumedContract {
    contract_id: string;
    provided_by_feature_id: string;
    description: string;
    type: "api" | "data" | "event" | "auth";
    available: boolean;
}
export declare class ContextDependencyRetriever {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    retrieve(feature: FeatureSpec, allFeatures: FeatureSpec[]): Promise<DependencyContext>;
    private findUpstream;
    private findDownstream;
    private findRequiredContracts;
    private findConsumedContracts;
    private findSharedEntities;
}
//# sourceMappingURL=context-dependency-retriever.d.ts.map