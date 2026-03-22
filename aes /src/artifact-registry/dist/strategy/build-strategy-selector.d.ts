/**
 * AES Build Strategy Selector
 *
 * Decides HOW a feature should be built based on:
 *   - risk level
 *   - historical success rate (from graph)
 *   - donor coverage
 *   - feature complexity
 *
 * Strategies:
 *   ONE_PASS  — standard build, bridge + builder in one shot
 *   TWO_PASS  — types/signatures first (typecheck), then implementation (test)
 *   SKELETON  — provide reference skeleton in bridge, builder fills in logic
 *   ESCALATE  — too risky for automated build, needs human design
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
export type BuildStrategy = "ONE_PASS" | "TWO_PASS" | "SKELETON" | "ESCALATE";
export interface BuildStrategyInput {
    feature_id: string;
    feature_type: string;
    risk: "low" | "medium" | "high" | "critical";
    acceptance_criteria_count: number;
    has_donor_coverage: boolean;
    has_research_evidence: boolean;
    domain_tags: string[];
    /** Historical success rate for this feature type (0-1), null if unknown */
    historical_success_rate: number | null;
    /** Historical success rate for this risk level (0-1), null if unknown */
    risk_success_rate: number | null;
    /** Number of prior builds for this feature type */
    prior_build_count: number;
}
export interface BuildStrategyResult {
    strategy: BuildStrategy;
    confidence: number;
    reasoning: string[];
    recommendations: string[];
    requires_skeleton: boolean;
    requires_two_pass: boolean;
    requires_research: boolean;
    requires_human_review: boolean;
    artifact_refs: ArtifactRef[];
}
export interface StrategyThresholds {
    /** Below this success rate, use TWO_PASS (default 0.70) */
    two_pass_threshold: number;
    /** Below this success rate, use SKELETON (default 0.50) */
    skeleton_threshold: number;
    /** Below this success rate, ESCALATE (default 0.30) */
    escalate_threshold: number;
    /** Minimum prior builds to trust historical rate (default 3) */
    min_builds_for_history: number;
    /** Acceptance criteria count above which to prefer TWO_PASS (default 8) */
    complex_criteria_threshold: number;
    /** Risk levels that always require at least TWO_PASS */
    always_two_pass_risks: string[];
    /** Domain tags that always ESCALATE */
    always_escalate_domains: string[];
}
export declare class BuildStrategySelector {
    private readonly thresholds;
    constructor(_registry: ArtifactRegistry, thresholds?: Partial<StrategyThresholds>, _now?: () => Date);
    select(input: BuildStrategyInput): BuildStrategyResult;
    private buildResult;
}
//# sourceMappingURL=build-strategy-selector.d.ts.map