/**
 * AES Conflict/Anti-Pattern Retrieval Agent
 *
 * Finds contradictions, prior failures, anti-patterns, unresolved
 * governance issues, and weak areas for a given feature.
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { Build } from "../types/artifacts";
import type { FeatureSpec } from "../types/app-spec";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Known Anti-Patterns ─────────────────────────────────────────────────────

const KNOWN_ANTI_PATTERNS = [
  {
    name: "global_mutable_state",
    trigger: (f: FeatureSpec) =>
      (f as any).constraints?.some((c: string) => c.toLowerCase().includes("global")) ||
      (f as any).anti_patterns?.includes("no-global-mutable-state-without-reset"),
    description: "Global mutable state without reset capability makes testing unreliable",
    recommendation: "Export a clearStore/reset function for test isolation",
    severity: "error" as const,
  },
  {
    name: "missing_auth_boundary",
    trigger: (f: FeatureSpec) =>
      ((f as any).risk_domain_tags || []).includes("auth") &&
      !f.acceptance_criteria?.some(ac => ac.description.toLowerCase().includes("unauthorized")),
    description: "Auth feature missing unauthorized access test",
    recommendation: "Add acceptance criterion for unauthorized access rejection",
    severity: "error" as const,
  },
  {
    name: "no_error_handling",
    trigger: (f: FeatureSpec) =>
      !f.acceptance_criteria?.some(ac =>
        ac.description.toLowerCase().includes("error") ||
        ac.description.toLowerCase().includes("invalid") ||
        ac.description.toLowerCase().includes("reject")
      ),
    description: "No error/validation test cases in acceptance criteria",
    recommendation: "Add boundary test cases for invalid inputs and error states",
    severity: "warning" as const,
  },
  {
    name: "async_without_timeout",
    trigger: (f: FeatureSpec) =>
      ((f as any).description || "").toLowerCase().includes("async") &&
      !(f as any).constraints?.some((c: string) => c.toLowerCase().includes("timeout")),
    description: "Async operations without timeout handling",
    recommendation: "Add timeout constraints for all async operations",
    severity: "warning" as const,
  },
  {
    name: "destructive_without_confirmation",
    trigger: (f: FeatureSpec) =>
      f.acceptance_criteria?.some(ac => ac.description.toLowerCase().includes("delete")) &&
      !f.acceptance_criteria?.some(ac => ac.description.toLowerCase().includes("confirm")),
    description: "Destructive operations without confirmation requirement",
    recommendation: "Add confirmation step before destructive actions",
    severity: "warning" as const,
  },
];

// ─── Retriever ───────────────────────────────────────────────────────────────

export class ConflictAntiPatternRetriever {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async retrieve(
    feature: FeatureSpec,
    allFeatures: FeatureSpec[],
  ): Promise<ConflictAnalysis> {
    const contradictions = this.findContradictions(feature, allFeatures);
    const antiPatterns = this.matchAntiPatterns(feature);
    const governanceIssues = await this.findGovernanceIssues(feature);
    const weakAreas = await this.findWeakAreas(feature);

    const criticalCount = contradictions.filter(c => c.severity === "critical").length;
    const highCount = contradictions.filter(c => c.severity === "high").length;
    const errorCount = antiPatterns.filter(a => a.severity === "error").length;
    const blockingIssues = governanceIssues.filter(g => g.blocking);

    const riskScore = Math.min(
      (criticalCount * 0.4) + (highCount * 0.2) + (errorCount * 0.15) + (blockingIssues.length * 0.25),
      1.0
    );

    const shouldBlock = criticalCount > 0 || blockingIssues.length > 0;
    const blockReasons: string[] = [];
    if (criticalCount > 0) blockReasons.push(`${criticalCount} critical contradiction(s)`);
    if (blockingIssues.length > 0) blockReasons.push(`${blockingIssues.length} blocking governance issue(s)`);

    return {
      analysis_id: `CONFLICT-${Date.now()}-${feature.feature_id}`,
      feature_id: feature.feature_id,
      captured_at: this.now().toISOString(),
      source: "conflict_antipattern_retriever",
      confidence: 0.8,
      artifact_refs: [],
      contradictions,
      anti_patterns: antiPatterns,
      governance_issues: governanceIssues,
      weak_areas: weakAreas,
      risk_score: Math.round(riskScore * 100) / 100,
      should_block: shouldBlock,
      block_reasons: blockReasons,
    };
  }

  private findContradictions(feature: FeatureSpec, allFeatures: FeatureSpec[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (const other of allFeatures) {
      if (other.feature_id === feature.feature_id) continue;

      // Scope overlap detection
      if (feature.data_entities?.length && other.data_entities?.length) {
        const myEntities = feature.data_entities.map((e: any) => e.entity_name || e.entity_id);
        const otherEntities = other.data_entities.map((e: any) => e.entity_name || e.entity_id);
        const overlap = myEntities.filter((e: any) => otherEntities.includes(e));

        if (overlap.length > 0) {
          contradictions.push({
            type: "data_ownership",
            description: `Both ${feature.feature_id} and ${other.feature_id} claim ownership of: ${overlap.join(", ")}`,
            feature_a: feature.feature_id,
            feature_b: other.feature_id,
            severity: "high",
            resolution: "Designate one feature as the owner, other feature uses read-only access",
          });
        }
      }

      // Auth conflict detection
      const featureTags = (feature as any).risk_domain_tags || [];
      const otherTags = (other as any).risk_domain_tags || [];
      if (featureTags.includes("auth") && otherTags.includes("auth")) {
        contradictions.push({
          type: "auth_conflict",
          description: `Both ${feature.feature_id} and ${other.feature_id} handle auth — potential conflict`,
          feature_a: feature.feature_id,
          feature_b: other.feature_id,
          severity: "medium",
          resolution: "Ensure single auth source of truth",
        });
      }

      // Dependency cycle detection
      if (
        (feature as any).dependencies?.includes(other.feature_id) &&
        (other as any).dependencies?.includes(feature.feature_id)
      ) {
        contradictions.push({
          type: "dependency_conflict",
          description: `Circular dependency between ${feature.feature_id} and ${other.feature_id}`,
          feature_a: feature.feature_id,
          feature_b: other.feature_id,
          severity: "critical",
          resolution: "Break the cycle — extract shared logic into a separate feature",
        });
      }
    }

    return contradictions;
  }

  private matchAntiPatterns(feature: FeatureSpec): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];

    for (const pattern of KNOWN_ANTI_PATTERNS) {
      if (pattern.trigger(feature)) {
        matches.push({
          pattern_name: pattern.name,
          description: pattern.description,
          matched_in: feature.feature_id,
          recommendation: pattern.recommendation,
          severity: pattern.severity,
        });
      }
    }

    return matches;
  }

  private async findGovernanceIssues(feature: FeatureSpec): Promise<GovernanceIssue[]> {
    const issues: GovernanceIssue[] = [];

    // Check for missing acceptance criteria
    if (!feature.acceptance_criteria || feature.acceptance_criteria.length === 0) {
      issues.push({
        issue_type: "incomplete_criteria",
        description: "No acceptance criteria defined",
        blocking: true,
      });
    }

    // Check for mandatory criteria without test mapping
    if (feature.acceptance_criteria) {
      const mandatoryWithoutTest = feature.acceptance_criteria.filter(
        ac => ac.mandatory && !feature.test_cases?.some(tc => tc.linked_criterion_id === ac.id)
      );
      if (mandatoryWithoutTest.length > 0) {
        issues.push({
          issue_type: "incomplete_criteria",
          description: `${mandatoryWithoutTest.length} mandatory criteria without linked test cases`,
          blocking: false,
        });
      }
    }

    return issues;
  }

  private async findWeakAreas(feature: FeatureSpec): Promise<WeakArea[]> {
    const weakAreas: WeakArea[] = [];
    const builds = await this.registry.latestByType<Build>("build");

    // Find features with similar characteristics that failed
    const featureType = this.inferFeatureType(feature);
    const similarBuilds = builds.filter(b => {
      const bType = this.inferFeatureType({ feature_id: b.payload.feature_id } as FeatureSpec);
      return bType === featureType;
    });

    if (similarBuilds.length > 2) {
      const failRate = similarBuilds.filter(b => b.payload.status !== "PASSED").length / similarBuilds.length;
      if (failRate > 0.3) {
        weakAreas.push({
          area: featureType,
          weakness: `${(failRate * 100).toFixed(0)}% failure rate for ${featureType} features`,
          historical_failure_rate: failRate,
          mitigation: failRate > 0.5
            ? "Use SKELETON strategy with reference implementation"
            : "Use TWO_PASS strategy with extra validation",
        });
      }
    }

    return weakAreas;
  }

  private inferFeatureType(feature: FeatureSpec): string {
    const id = feature.feature_id.toLowerCase();
    if (id.includes("auth")) return "auth";
    if (id.includes("queue") || id.includes("job")) return "async_processing";
    if (id.includes("event") || id.includes("message")) return "realtime";
    if (id.includes("ui") || id.includes("frontend")) return "frontend";
    if (id.includes("notification")) return "notification";
    return "general";
  }
}
