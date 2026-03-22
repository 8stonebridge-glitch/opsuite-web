/**
 * AES Conflict/Anti-Pattern Retrieval Agent
 *
 * Finds contradictions, prior failures, anti-patterns, unresolved
 * governance issues, and weak areas for a given feature.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec } from "../types/app-spec";
export interface ConflictAnalysis {
    analysis_id: string;
    feature_id: string;
    captured_at: string;
    source: "conflict_antipattern_retriever";
    confidence: number;
    artifact_refs: ArtifactRef[];
    /** Direct contradictions found */
    contradictions: Contradiction[];
    /** Anti-patterns that apply */
    anti_patterns: AntiPatternMatch[];
    /** Unresolved governance issues */
    governance_issues: GovernanceIssue[];
    /** Weak areas based on historical data */
    weak_areas: WeakArea[];
    /** Overall risk assessment */
    risk_score: number;
    /** Whether this feature should be blocked */
    should_block: boolean;
    block_reasons: string[];
}
export interface Contradiction {
    type: "dependency_conflict" | "auth_conflict" | "data_ownership" | "scope_overlap" | "requirement_conflict";
    description: string;
    feature_a: string;
    feature_b: string;
    severity: "low" | "medium" | "high" | "critical";
    resolution?: string;
}
export interface AntiPatternMatch {
    pattern_name: string;
    description: string;
    matched_in: string;
    recommendation: string;
    severity: "warning" | "error";
}
export interface GovernanceIssue {
    issue_type: "unresolved_veto" | "missing_approval" | "stale_evidence" | "incomplete_criteria";
    description: string;
    blocking: boolean;
}
export interface WeakArea {
    area: string;
    weakness: string;
    historical_failure_rate: number;
    mitigation: string;
}
export declare class ConflictAntiPatternRetriever {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    retrieve(feature: FeatureSpec, allFeatures: FeatureSpec[]): Promise<ConflictAnalysis>;
    private findContradictions;
    private matchAntiPatterns;
    private findGovernanceIssues;
    private findWeakAreas;
    private inferFeatureType;
}
//# sourceMappingURL=conflict-antipattern-retriever.d.ts.map