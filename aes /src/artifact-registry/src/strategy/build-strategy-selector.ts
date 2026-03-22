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

// ─── Types ───────────────────────────────────────────────────────────────────

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

const DEFAULT_THRESHOLDS: StrategyThresholds = {
  two_pass_threshold: 0.70,
  skeleton_threshold: 0.50,
  escalate_threshold: 0.30,
  min_builds_for_history: 3,
  complex_criteria_threshold: 8,
  always_two_pass_risks: ["high", "critical"],
  always_escalate_domains: ["billing", "permissions", "destructive"],
};

// ─── Selector ────────────────────────────────────────────────────────────────

export class BuildStrategySelector {
  private readonly thresholds: StrategyThresholds;

  constructor(
    _registry: ArtifactRegistry,
    thresholds?: Partial<StrategyThresholds>,
    _now: () => Date = () => new Date(),
  ) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  select(input: BuildStrategyInput): BuildStrategyResult {
    const reasoning: string[] = [];
    const recommendations: string[] = [];
    let strategy: BuildStrategy = "ONE_PASS";
    let confidence = 0.8;

    // Rule 1: Always-escalate domains
    if (input.domain_tags.some(t => this.thresholds.always_escalate_domains.includes(t))) {
      strategy = "ESCALATE";
      reasoning.push(`Domain tags ${input.domain_tags.join(", ")} require human review`);
      return this.buildResult(strategy, 0.95, reasoning, recommendations, input);
    }

    // Rule 2: Critical risk always escalates
    if (input.risk === "critical") {
      strategy = "ESCALATE";
      reasoning.push("Critical risk features require human design");
      return this.buildResult(strategy, 0.95, reasoning, recommendations, input);
    }

    // Rule 3: High risk → at least TWO_PASS
    if (this.thresholds.always_two_pass_risks.includes(input.risk)) {
      strategy = "TWO_PASS";
      reasoning.push(`Risk level '${input.risk}' defaults to TWO_PASS`);
      confidence = 0.7;
    }

    // Rule 4: Historical success rate (if we have enough data)
    if (
      input.historical_success_rate !== null &&
      input.prior_build_count >= this.thresholds.min_builds_for_history
    ) {
      const rate = input.historical_success_rate;

      if (rate < this.thresholds.escalate_threshold) {
        strategy = "ESCALATE";
        reasoning.push(
          `Historical success rate ${(rate * 100).toFixed(0)}% is below escalate threshold ${(this.thresholds.escalate_threshold * 100).toFixed(0)}%`
        );
        confidence = 0.9;
      } else if (rate < this.thresholds.skeleton_threshold) {
        strategy = "SKELETON";
        reasoning.push(
          `Historical success rate ${(rate * 100).toFixed(0)}% is below skeleton threshold — providing reference implementation`
        );
        confidence = 0.85;
        recommendations.push("Include type definitions and function signatures in bridge");
        recommendations.push("Include test template in bridge");
        recommendations.push("Include known failure modes in bridge");
      } else if (rate < this.thresholds.two_pass_threshold) {
        if ((strategy as BuildStrategy) !== "SKELETON") {
          strategy = "TWO_PASS";
          reasoning.push(
            `Historical success rate ${(rate * 100).toFixed(0)}% is below two-pass threshold`
          );
          confidence = 0.75;
        }
      } else {
        reasoning.push(
          `Historical success rate ${(rate * 100).toFixed(0)}% is above all thresholds`
        );
      }
    } else if (input.prior_build_count < this.thresholds.min_builds_for_history) {
      reasoning.push(
        `Only ${input.prior_build_count} prior builds — insufficient history, using conservative strategy`
      );
      if (input.risk === "high" && strategy === "TWO_PASS") {
        strategy = "SKELETON";
        reasoning.push("Upgrading to SKELETON due to high risk + no history");
        recommendations.push("Research this feature type before building");
      }
    }

    // Rule 5: Complex features → at least TWO_PASS
    if (
      input.acceptance_criteria_count >= this.thresholds.complex_criteria_threshold &&
      strategy === "ONE_PASS"
    ) {
      strategy = "TWO_PASS";
      reasoning.push(
        `${input.acceptance_criteria_count} acceptance criteria exceeds complexity threshold`
      );
    }

    // Rule 6: No donor coverage + no research → recommend research
    if (!input.has_donor_coverage && !input.has_research_evidence) {
      recommendations.push("No donor or research evidence — recommend Perplexity research before build");
      if (strategy === "ONE_PASS") {
        strategy = "TWO_PASS";
        reasoning.push("No evidence coverage — upgrading to TWO_PASS for safety");
      }
    }

    // Rule 7: Donor coverage boosts confidence
    if (input.has_donor_coverage) {
      confidence = Math.min(confidence + 0.1, 0.95);
      reasoning.push("Donor coverage available — confidence boosted");
    }

    // Rule 8: Research evidence boosts confidence
    if (input.has_research_evidence) {
      confidence = Math.min(confidence + 0.05, 0.95);
      reasoning.push("Research evidence available — confidence boosted");
    }

    return this.buildResult(strategy, confidence, reasoning, recommendations, input);
  }

  private buildResult(
    strategy: BuildStrategy,
    confidence: number,
    reasoning: string[],
    recommendations: string[],
    input: BuildStrategyInput,
  ): BuildStrategyResult {
    return {
      strategy,
      confidence,
      reasoning,
      recommendations,
      requires_skeleton: strategy === "SKELETON",
      requires_two_pass: strategy === "TWO_PASS" || strategy === "SKELETON",
      requires_research: !input.has_donor_coverage && !input.has_research_evidence,
      requires_human_review: strategy === "ESCALATE",
      artifact_refs: [],
    };
  }
}
