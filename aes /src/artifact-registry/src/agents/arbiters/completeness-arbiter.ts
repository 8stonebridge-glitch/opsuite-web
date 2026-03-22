/**
 * AES Completeness Arbiter
 *
 * Backed by Gemini. Checks:
 *   - Is the feature set complete?
 *   - Are major flows missing?
 *   - Is backend/frontend coverage balanced?
 *   - Are there orphaned features with no connections?
 *
 * Does not build — only evaluates and recommends.
 */

import type { ArtifactRegistry } from "../../registry/registry";
import type { ArtifactRef } from "../../types/refs";
import type { FeatureSpec, AppSpec } from "../../types/app-spec";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompletenessEvaluation {
  evaluation_id: string;
  app_id: string;
  captured_at: string;
  source: "completeness_arbiter";
  extracted_by: "gemini";
  confidence: number;
  status: "UNTRUSTED";
  artifact_refs: ArtifactRef[];

  /** Overall completeness score 0-1 */
  completeness_score: number;

  /** Whether the feature set passes the completeness gate */
  passes_gate: boolean;

  /** Missing flows detected */
  missing_flows: MissingFlow[];

  /** Coverage gaps */
  coverage_gaps: CoverageGap[];

  /** Orphaned features (no dependencies in or out) */
  orphaned_features: string[];

  /** Balance assessment */
  balance: BalanceAssessment;

  /** Recommendations */
  recommendations: string[];
}

export interface MissingFlow {
  flow_name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggested_feature_id?: string;
}

export interface CoverageGap {
  area: "backend" | "frontend" | "testing" | "auth" | "error_handling" | "onboarding";
  description: string;
  affected_features: string[];
  severity: "low" | "medium" | "high";
}

export interface BalanceAssessment {
  backend_count: number;
  frontend_count: number;
  both_count: number;
  backend_only_count: number;
  frontend_only_count: number;
  balanced: boolean;
  concern?: string;
}

// ─── Standard Flows Every App Needs ──────────────────────────────────────────

const STANDARD_FLOWS = [
  { name: "user_authentication", keywords: ["auth", "login", "register", "session"], severity: "critical" as const },
  { name: "error_handling", keywords: ["error", "fail", "catch", "boundary"], severity: "high" as const },
  { name: "onboarding", keywords: ["onboard", "welcome", "setup", "first"], severity: "medium" as const },
  { name: "settings", keywords: ["setting", "preference", "config", "profile"], severity: "medium" as const },
  { name: "navigation", keywords: ["nav", "route", "menu", "sidebar"], severity: "high" as const },
  { name: "data_loading", keywords: ["load", "fetch", "skeleton", "spinner"], severity: "medium" as const },
  { name: "empty_states", keywords: ["empty", "no data", "zero", "placeholder"], severity: "low" as const },
  { name: "notifications", keywords: ["notification", "alert", "toast", "badge"], severity: "medium" as const },
  { name: "search", keywords: ["search", "find", "filter", "query"], severity: "low" as const },
];

// ─── Arbiter ─────────────────────────────────────────────────────────────────

export class CompletenessArbiter {
  constructor(
    _registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Evaluate completeness of an app's feature set.
   * In production, this would call Gemini for deeper analysis.
   * This implementation provides rule-based evaluation.
   */
  evaluate(app: AppSpec, features: FeatureSpec[]): CompletenessEvaluation {
    const missingFlows = this.detectMissingFlows(features);
    const coverageGaps = this.detectCoverageGaps(features);
    const orphaned = this.findOrphanedFeatures(features);
    const balance = this.assessBalance(features);
    const recommendations: string[] = [];

    // Score
    let score = 1.0;
    for (const flow of missingFlows) {
      if (flow.severity === "critical") score -= 0.2;
      else if (flow.severity === "high") score -= 0.1;
      else if (flow.severity === "medium") score -= 0.05;
    }
    for (const gap of coverageGaps) {
      if (gap.severity === "high") score -= 0.1;
      else if (gap.severity === "medium") score -= 0.05;
    }
    if (orphaned.length > 0) score -= orphaned.length * 0.02;
    if (!balance.balanced) score -= 0.05;
    score = Math.max(0, Math.round(score * 100) / 100);

    // Recommendations
    for (const flow of missingFlows) {
      if (flow.severity === "critical" || flow.severity === "high") {
        recommendations.push(`Add missing flow: ${flow.flow_name} — ${flow.description}`);
      }
    }
    if (orphaned.length > 0) {
      recommendations.push(`Review orphaned features: ${orphaned.join(", ")}`);
    }
    if (!balance.balanced && balance.concern) {
      recommendations.push(balance.concern);
    }

    return {
      evaluation_id: `COMP-${Date.now()}-${app.app_id}`,
      app_id: app.app_id,
      captured_at: this.now().toISOString(),
      source: "completeness_arbiter",
      extracted_by: "gemini",
      confidence: features.length > 5 ? 0.8 : 0.5,
      status: "UNTRUSTED",
      artifact_refs: [],
      completeness_score: score,
      passes_gate: score >= 0.6 && missingFlows.filter(f => f.severity === "critical").length === 0,
      missing_flows: missingFlows,
      coverage_gaps: coverageGaps,
      orphaned_features: orphaned,
      balance,
      recommendations,
    };
  }

  private detectMissingFlows(features: FeatureSpec[]): MissingFlow[] {
    const missing: MissingFlow[] = [];
    const allText = features.map(f => `${f.feature_id} ${(f as any).description || ""}`).join(" ").toLowerCase();

    for (const flow of STANDARD_FLOWS) {
      const hasFlow = flow.keywords.some(kw => allText.includes(kw));
      if (!hasFlow) {
        missing.push({
          flow_name: flow.name,
          description: `No feature covers ${flow.name.replace(/_/g, " ")}`,
          severity: flow.severity,
        });
      }
    }

    return missing;
  }

  private detectCoverageGaps(features: FeatureSpec[]): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    // Backend without frontend
    const backendOnly = features.filter(f => f.backend_surfaces?.length && !f.frontend_surfaces?.length);
    if (backendOnly.length > features.length * 0.5 && features.length > 3) {
      gaps.push({
        area: "frontend",
        description: `${backendOnly.length}/${features.length} features have backend but no frontend surface`,
        affected_features: backendOnly.map(f => f.feature_id),
        severity: "medium",
      });
    }

    // No error handling tests
    const noErrorTests = features.filter(f =>
      !f.acceptance_criteria?.some(ac =>
        ac.description.toLowerCase().includes("error") ||
        ac.description.toLowerCase().includes("invalid") ||
        ac.description.toLowerCase().includes("reject") ||
        ac.description.toLowerCase().includes("fail")
      )
    );
    if (noErrorTests.length > features.length * 0.3) {
      gaps.push({
        area: "error_handling",
        description: `${noErrorTests.length}/${features.length} features lack error handling criteria`,
        affected_features: noErrorTests.map(f => f.feature_id),
        severity: "high",
      });
    }

    // Auth features without auth tests
    const authFeatures = features.filter(f =>
      !((f as any).risk_domain_tags || []).includes("auth") &&
      ((f as any).description || "").toLowerCase().includes("protect")
    );
    if (authFeatures.length > 0) {
      gaps.push({
        area: "auth",
        description: "Features reference protection but aren't tagged with auth domain",
        affected_features: authFeatures.map(f => f.feature_id),
        severity: "high",
      });
    }

    return gaps;
  }

  private findOrphanedFeatures(features: FeatureSpec[]): string[] {
    if (features.length <= 2) return [];

    return features
      .filter(f => {
        const hasDependencies = (f as any).dependencies && (f as any).dependencies.length > 0;
        const isDependedOn = features.some(other =>
          (other as any).dependencies?.includes(f.feature_id)
        );
        return !hasDependencies && !isDependedOn;
      })
      .map(f => f.feature_id);
  }

  private assessBalance(features: FeatureSpec[]): BalanceAssessment {
    let backendCount = 0;
    let frontendCount = 0;
    let bothCount = 0;
    let backendOnlyCount = 0;
    let frontendOnlyCount = 0;

    for (const f of features) {
      const hasBackend = !!f.backend_surfaces?.length;
      const hasFrontend = !!f.frontend_surfaces?.length;
      if (hasBackend) backendCount++;
      if (hasFrontend) frontendCount++;
      if (hasBackend && hasFrontend) bothCount++;
      if (hasBackend && !hasFrontend) backendOnlyCount++;
      if (!hasBackend && hasFrontend) frontendOnlyCount++;
    }

    const balanced = backendOnlyCount <= features.length * 0.6 &&
      frontendOnlyCount <= features.length * 0.6;

    let concern: string | undefined;
    if (backendOnlyCount > features.length * 0.6) {
      concern = "Backend-heavy: consider adding frontend surfaces to more features";
    } else if (frontendOnlyCount > features.length * 0.6) {
      concern = "Frontend-heavy: consider adding backend services to support UI features";
    }

    return {
      backend_count: backendCount,
      frontend_count: frontendCount,
      both_count: bothCount,
      backend_only_count: backendOnlyCount,
      frontend_only_count: frontendOnlyCount,
      balanced,
      concern,
    };
  }
}
