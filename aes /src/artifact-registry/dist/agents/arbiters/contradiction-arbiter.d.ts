/**
 * AES Contradiction Arbiter
 *
 * Backed by Gemini or deterministic rules. Checks:
 *   - Auth conflicts
 *   - Data ownership conflicts
 *   - Dependency conflicts
 *   - Impossible flows
 *   - Conflicting requirements
 *
 * Returns a pass/fail verdict with specific contradictions identified.
 */
import type { ArtifactRegistry } from "../../registry/registry";
import type { ArtifactRef } from "../../types/refs";
import type { FeatureSpec, AppSpec } from "../../types/app-spec";
export interface ContradictionEvaluation {
    evaluation_id: string;
    app_id: string;
    captured_at: string;
    source: "contradiction_arbiter";
    extracted_by: "gemini";
    confidence: number;
    status: "UNTRUSTED";
    artifact_refs: ArtifactRef[];
    /** Whether the feature set passes the contradiction gate */
    passes_gate: boolean;
    /** Hard vetoes that must be resolved before any build */
    hard_vetoes: ContradictionVeto[];
    /** Warnings that should be reviewed but don't block */
    warnings: ContradictionWarning[];
    /** Dependency analysis */
    dependency_analysis: DependencyAnalysis;
    /** Auth model analysis */
    auth_analysis: AuthAnalysis;
    /** Data ownership analysis */
    data_analysis: DataOwnershipAnalysis;
}
export interface ContradictionVeto {
    veto_code: string;
    description: string;
    affected_features: string[];
    resolution: string;
}
export interface ContradictionWarning {
    warning_code: string;
    description: string;
    affected_features: string[];
    recommendation: string;
}
export interface DependencyAnalysis {
    has_cycles: boolean;
    cycles: string[][];
    missing_dependencies: MissingDependency[];
    orphaned_features: string[];
}
export interface MissingDependency {
    feature_id: string;
    expected_dependency: string;
    reason: string;
}
export interface AuthAnalysis {
    has_auth_feature: boolean;
    auth_feature_id?: string;
    features_needing_auth: string[];
    features_missing_auth_dependency: string[];
    consistent: boolean;
}
export interface DataOwnershipAnalysis {
    entities: EntityOwnership[];
    conflicts: DataConflict[];
}
export interface EntityOwnership {
    entity_name: string;
    owner_feature_id: string;
    reader_feature_ids: string[];
}
export interface DataConflict {
    entity_name: string;
    claimants: string[];
    resolution: string;
}
export declare class ContradictionArbiter {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    evaluate(app: AppSpec, features: FeatureSpec[]): ContradictionEvaluation;
    private analyzeDependencies;
    private findCycles;
    private findMissingDependencies;
    private findOrphaned;
    private analyzeAuth;
    private analyzeDataOwnership;
}
//# sourceMappingURL=contradiction-arbiter.d.ts.map