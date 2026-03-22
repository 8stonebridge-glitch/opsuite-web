/**
 * AES Failure/Metrics Observer Agent
 *
 * Looks at historical failures, validator outcomes, replay runs,
 * metric records, and prior build outcomes. Tells AES which feature
 * types are weak and should use TWO_PASS or skeletons.
 */
import type { ArtifactRegistry } from "../../registry/registry";
import type { ArtifactRef } from "../../types/refs";
export interface FailureMetricsObservation {
    observation_id: string;
    app_id?: string;
    feature_id?: string;
    source: "failure_metrics_observer";
    source_type: "historical_analysis";
    captured_at: string;
    extracted_by: "failure_metrics_observer";
    confidence: number;
    status: "UNTRUSTED";
    domain_tags: string[];
    artifact_refs: ArtifactRef[];
    /** Summary metrics */
    total_builds: number;
    passed_builds: number;
    failed_builds: number;
    success_rate: number;
    /** Breakdown by feature type */
    by_feature_type: Record<string, FeatureTypeMetrics>;
    /** Breakdown by risk level */
    by_risk: Record<string, RiskMetrics>;
    /** Identified failure patterns */
    failure_patterns: FailurePatternSummary[];
    /** Recommendations */
    recommendations: StrategyRecommendation[];
}
export interface FeatureTypeMetrics {
    total: number;
    passed: number;
    failed: number;
    success_rate: number;
    avg_duration_s: number;
    avg_tests_per_build: number;
    common_failure_types: string[];
}
export interface RiskMetrics {
    total: number;
    passed: number;
    failed: number;
    success_rate: number;
}
export interface FailurePatternSummary {
    pattern_type: string;
    feature_type: string;
    occurrences: number;
    description: string;
    first_seen?: string;
    last_seen?: string;
}
export interface StrategyRecommendation {
    feature_type: string;
    risk: string;
    recommended_strategy: "ONE_PASS" | "TWO_PASS" | "SKELETON" | "ESCALATE";
    reason: string;
    confidence: number;
}
export declare class FailureMetricsObserver {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    observe(appId?: string): Promise<FailureMetricsObservation>;
    private inferFeatureType;
    private inferRisk;
}
//# sourceMappingURL=failure-metrics-observer.d.ts.map