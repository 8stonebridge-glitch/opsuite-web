/**
 * AES Failure/Metrics Observer Agent
 *
 * Looks at historical failures, validator outcomes, replay runs,
 * metric records, and prior build outcomes. Tells AES which feature
 * types are weak and should use TWO_PASS or skeletons.
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { Build } from "../types/artifacts";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Observer ────────────────────────────────────────────────────────────────

export class FailureMetricsObserver {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async observe(appId?: string): Promise<FailureMetricsObservation> {
    const builds = await this.registry.latestByType<Build>("build");
    // testRuns and validatorRuns available for deeper analysis in future
    // const testRuns = await this.registry.latestByType("test_run");
    // const validatorRuns = await this.registry.latestByType("validator_run");

    const byFeatureType: Record<string, FeatureTypeMetrics> = {};
    const byRisk: Record<string, RiskMetrics> = {};
    const failurePatterns: FailurePatternSummary[] = [];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const buildRecord of builds) {
      const build = buildRecord.payload;
      const passed = build.status === "PASSED";

      if (passed) totalPassed++;
      else totalFailed++;

      // We don't have feature_type/risk on the build artifact directly,
      // so we extract what we can from the feature_id naming convention
      const featureType = this.inferFeatureType(build.feature_id);
      const risk = this.inferRisk(build.feature_id);

      // Feature type metrics
      if (!byFeatureType[featureType]) {
        byFeatureType[featureType] = {
          total: 0, passed: 0, failed: 0, success_rate: 0,
          avg_duration_s: 0, avg_tests_per_build: 0, common_failure_types: [],
        };
      }
      const ftm = byFeatureType[featureType]!;
      ftm.total++;
      if (passed) ftm.passed++;
      else ftm.failed++;
      ftm.success_rate = ftm.passed / ftm.total;

      // Risk metrics
      if (!byRisk[risk]) {
        byRisk[risk] = { total: 0, passed: 0, failed: 0, success_rate: 0 };
      }
      const rm = byRisk[risk]!;
      rm.total++;
      if (passed) rm.passed++;
      else rm.failed++;
      rm.success_rate = rm.passed / rm.total;
    }

    // Generate recommendations
    const recommendations: StrategyRecommendation[] = [];

    for (const [featureType, metrics] of Object.entries(byFeatureType)) {
      if (metrics.total < 2) continue;

      if (metrics.success_rate < 0.30) {
        recommendations.push({
          feature_type: featureType,
          risk: "high",
          recommended_strategy: "ESCALATE",
          reason: `Success rate ${(metrics.success_rate * 100).toFixed(0)}% — too low for automated build`,
          confidence: 0.9,
        });
      } else if (metrics.success_rate < 0.50) {
        recommendations.push({
          feature_type: featureType,
          risk: "high",
          recommended_strategy: "SKELETON",
          reason: `Success rate ${(metrics.success_rate * 100).toFixed(0)}% — needs reference skeleton`,
          confidence: 0.85,
        });
      } else if (metrics.success_rate < 0.70) {
        recommendations.push({
          feature_type: featureType,
          risk: "medium",
          recommended_strategy: "TWO_PASS",
          reason: `Success rate ${(metrics.success_rate * 100).toFixed(0)}% — two-pass recommended`,
          confidence: 0.8,
        });
      }
    }

    const total = totalPassed + totalFailed;

    return {
      observation_id: `OBS-FM-${Date.now()}`,
      app_id: appId,
      source: "failure_metrics_observer",
      source_type: "historical_analysis",
      captured_at: this.now().toISOString(),
      extracted_by: "failure_metrics_observer",
      confidence: total > 10 ? 0.85 : total > 3 ? 0.6 : 0.3,
      status: "UNTRUSTED",
      domain_tags: ["governance", "metrics", "strategy"],
      artifact_refs: [],
      total_builds: total,
      passed_builds: totalPassed,
      failed_builds: totalFailed,
      success_rate: total > 0 ? totalPassed / total : 0,
      by_feature_type: byFeatureType,
      by_risk: byRisk,
      failure_patterns: failurePatterns,
      recommendations,
    };
  }

  private inferFeatureType(featureId: string): string {
    const id = featureId.toLowerCase();
    if (id.includes("auth")) return "backend_platform";
    if (id.includes("todo") || id.includes("crud")) return "backend_platform";
    if (id.includes("queue") || id.includes("job")) return "backend_platform";
    if (id.includes("event") || id.includes("emitter")) return "collaboration_layer";
    if (id.includes("machine") || id.includes("workflow")) return "workflow_orchestration";
    if (id.includes("ui") || id.includes("markdown") || id.includes("parser")) return "frontend_shell";
    if (id.includes("notification")) return "notification_system";
    return "unknown";
  }

  private inferRisk(featureId: string): string {
    const id = featureId.toLowerCase();
    if (id.includes("auth") || id.includes("payment") || id.includes("billing")) return "high";
    if (id.includes("queue") || id.includes("job") || id.includes("connect")) return "high";
    if (id.includes("parser") || id.includes("todo")) return "low";
    return "medium";
  }
}
