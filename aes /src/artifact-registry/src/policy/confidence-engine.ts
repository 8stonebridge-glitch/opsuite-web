/**
 * AES Policy Layer — Confidence Engine
 */

import type { ConfidenceBreakdown, ConfidenceRoute, TieredConstraint } from "../types";
import { AUTHORITY_TIER_WEIGHTS, computeConfidence } from "../types";

export interface ConfidenceEvaluation {
  score: number;
  route: ConfidenceRoute;
  breakdown: ConfidenceBreakdown;
}

export function routeConfidence(score: number): ConfidenceRoute {
  if (score >= 0.75) {
    return "DIRECT_BUILD";
  }

  if (score >= 0.60) {
    return "CAUTION_BUILD";
  }

  if (score >= 0.40) {
    return "RESEARCH_REQUIRED";
  }

  return "ESCALATE";
}

export function evaluateConfidence(
  breakdown: ConfidenceBreakdown
): ConfidenceEvaluation {
  const score = computeConfidence(breakdown);
  return {
    score,
    route: routeConfidence(score),
    breakdown,
  };
}

export function evaluateConfidenceWithAuthority(
  breakdown: ConfidenceBreakdown,
  tieredConstraints?: TieredConstraint[]
): ConfidenceEvaluation {
  if (!tieredConstraints || tieredConstraints.length === 0) {
    return evaluateConfidence(breakdown);
  }

  const avgWeight =
    tieredConstraints.reduce(
      (sum, c) => sum + AUTHORITY_TIER_WEIGHTS[c.authority_tier],
      0
    ) / tieredConstraints.length;

  const adjusted: ConfidenceBreakdown = {
    graph_coverage: breakdown.graph_coverage,
    pattern_strength: breakdown.pattern_strength * avgWeight,
    rule_consistency: breakdown.rule_consistency,
    evidence_level: breakdown.evidence_level * avgWeight,
  };

  const score = computeConfidence(adjusted);
  return {
    score,
    route: routeConfidence(score),
    breakdown: adjusted,
  };
}
