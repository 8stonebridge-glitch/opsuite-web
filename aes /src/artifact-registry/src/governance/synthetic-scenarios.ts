/**
 * AES Governance — Synthetic Scenario Generator
 *
 * Generates replay scenarios from donor data and feature class knowledge.
 * Produces a mix of successful builds, failures, edge cases, and
 * intentional failure injections for governance training.
 *
 * Sources:
 *   - Donor scenario packs (already in the repo)
 *   - Feature class definitions from the graph
 *   - Known failure patterns
 *   - Intentional failure injections
 */

import type { ReplayScenario } from "../types/governance-types";

// ─── Feature Class Templates ────────────────────────────────────────────────

const FEATURE_TYPES = [
  "workflow",
  "notification_system",
  "payments_and_billing_verification",
  "collaboration_system",
  "onboarding",
  "backend_platform",
] as const;

// ─── Scenario Templates ─────────────────────────────────────────────────────

/**
 * Generate the baseline set of synthetic scenarios.
 * These cover the common build patterns and known failure modes.
 */
export function generateSyntheticScenarios(): ReplayScenario[] {
  const scenarios: ReplayScenario[] = [];
  let idx = 0;
  const id = () => `SYNTH-${String(++idx).padStart(4, "0")}`;

  // ── Successful builds across feature types ────────────────────────────

  for (const featureType of FEATURE_TYPES) {
    // High-confidence successful build
    scenarios.push({
      scenario_id: id(),
      source: "synthetic",
      source_description: `High-confidence ${featureType} build — clean pass`,
      inputs: {
        bridge_confidence: 0.85,
        bridge_scope_size: 5,
        dependency_count: 1,
        has_critical_criteria: true,
        file_count: 4,
        feature_type: featureType,
        risk_domain_tags: [],
      },
      actual_outcome: {
        build_status: "PASSED",
        validator_outcome: "PASS",
        had_scope_violations: false,
        had_test_failures: false,
        escalation_triggered: false,
        veto_triggered: false,
      },
      tags: ["success", "high_confidence", featureType],
    });

    // Medium-confidence successful build
    scenarios.push({
      scenario_id: id(),
      source: "synthetic",
      source_description: `Medium-confidence ${featureType} build — pass with concerns`,
      inputs: {
        bridge_confidence: 0.65,
        bridge_scope_size: 8,
        dependency_count: 2,
        has_critical_criteria: true,
        file_count: 7,
        feature_type: featureType,
        risk_domain_tags: [],
      },
      actual_outcome: {
        build_status: "PASSED",
        validator_outcome: "PASS_WITH_CONCERNS",
        had_scope_violations: false,
        had_test_failures: false,
        escalation_triggered: false,
        veto_triggered: false,
      },
      tags: ["success", "medium_confidence", featureType],
    });
  }

  // ── Known failure patterns ────────────────────────────────────────────

  // Scope violation — builder wrote outside write_scope
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Builder scope violation — wrote to protected auth directory",
    inputs: {
      bridge_confidence: 0.70,
      bridge_scope_size: 3,
      dependency_count: 0,
      has_critical_criteria: true,
      file_count: 6,
      feature_type: "backend_platform",
      risk_domain_tags: ["auth", "security"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: true,
      had_test_failures: false,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["failure", "scope_violation", "security"],
  });

  // Missing test coverage for mandatory criteria
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Missing critical test mapping — security criterion not tested",
    inputs: {
      bridge_confidence: 0.60,
      bridge_scope_size: 4,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 5,
      feature_type: "backend_platform",
      risk_domain_tags: ["security"],
    },
    actual_outcome: {
      build_status: "BLOCKED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: true,
      veto_codes: ["MISSING_CRITICAL_TEST_MAPPING"],
    },
    tags: ["failure", "veto", "missing_tests"],
  });

  // Stale bridge — graph changed after bridge generation
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Stale bridge — graph truth changed during build",
    inputs: {
      bridge_confidence: 0.80,
      bridge_scope_size: 6,
      dependency_count: 2,
      has_critical_criteria: false,
      file_count: 5,
      feature_type: "workflow",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "BLOCKED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: true,
      veto_codes: ["BRIDGE_NOT_FRESH"],
    },
    tags: ["failure", "veto", "stale_bridge"],
  });

  // Dependency not satisfied
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Blocked — upstream dependency build not complete",
    inputs: {
      bridge_confidence: 0.75,
      bridge_scope_size: 4,
      dependency_count: 3,
      has_critical_criteria: true,
      file_count: 3,
      feature_type: "notification_system",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "BLOCKED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: true,
      veto_codes: ["DEPENDENCY_NOT_SATISFIED"],
    },
    tags: ["failure", "veto", "dependency"],
  });

  // Validator disagreement
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Validator disagreement — one PASS, one FAIL, one PASS_WITH_CONCERNS",
    inputs: {
      bridge_confidence: 0.68,
      bridge_scope_size: 7,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 8,
      feature_type: "collaboration_system",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "ESCALATE",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["failure", "validator_disagreement", "escalation"],
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  // Very low confidence — should always escalate
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Very low confidence build — should escalate",
    inputs: {
      bridge_confidence: 0.25,
      bridge_scope_size: 2,
      dependency_count: 0,
      has_critical_criteria: false,
      file_count: 2,
      feature_type: "onboarding",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["edge_case", "low_confidence", "should_escalate"],
  });

  // Borderline confidence — right at the CAUTION_BUILD threshold
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Borderline confidence at 0.60 — caution/research boundary",
    inputs: {
      bridge_confidence: 0.60,
      bridge_scope_size: 5,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 5,
      feature_type: "workflow",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS_WITH_CONCERNS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["edge_case", "borderline", "threshold_test"],
  });

  // Large scope build — many files, high risk
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Large scope build — 20+ files, cross-cutting",
    inputs: {
      bridge_confidence: 0.72,
      bridge_scope_size: 25,
      dependency_count: 4,
      has_critical_criteria: true,
      file_count: 22,
      feature_type: "backend_platform",
      risk_domain_tags: ["auth", "data", "api"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: true,
      had_test_failures: true,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["edge_case", "large_scope", "high_risk"],
  });

  // ── Intentional failure injections ────────────────────────────────────

  // Auth ambiguity — feature has no auth requirements
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "INJECTION: Feature with no auth requirements passed through",
    inputs: {
      bridge_confidence: 0.78,
      bridge_scope_size: 4,
      dependency_count: 0,
      has_critical_criteria: false,
      file_count: 3,
      feature_type: "backend_platform",
      risk_domain_tags: ["auth"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["injection", "auth_ambiguity", "should_block"],
  });

  // Data ownership missing — destructive action not audit-logged
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "INJECTION: Destructive action without audit logging",
    inputs: {
      bridge_confidence: 0.82,
      bridge_scope_size: 3,
      dependency_count: 0,
      has_critical_criteria: true,
      file_count: 2,
      feature_type: "workflow",
      risk_domain_tags: ["destructive", "data"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["injection", "destructive_action", "should_block"],
  });

  // Canonical constraint violated — MUST constraint missing
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "INJECTION: Build missing CANONICAL MUST constraint",
    inputs: {
      bridge_confidence: 0.76,
      bridge_scope_size: 5,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 4,
      feature_type: "backend_platform",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "BLOCKED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: true,
      veto_codes: ["CANONICAL_CONSTRAINT_VIOLATED"],
    },
    tags: ["injection", "canonical_violation", "should_block"],
  });

  // ── Donor-derived scenarios ───────────────────────────────────────────

  // Slack-style real-time collaboration build
  scenarios.push({
    scenario_id: id(),
    source: "donor_derived",
    source_description: "Slack-derived: real-time messaging feature build",
    inputs: {
      bridge_confidence: 0.71,
      bridge_scope_size: 12,
      dependency_count: 3,
      has_critical_criteria: true,
      file_count: 10,
      feature_type: "collaboration_system",
      risk_domain_tags: ["realtime", "websocket", "messaging"],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS_WITH_CONCERNS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["donor", "slack", "collaboration"],
  });

  // Stripe-style payment verification build
  scenarios.push({
    scenario_id: id(),
    source: "donor_derived",
    source_description: "Stripe-derived: payment webhook verification build",
    inputs: {
      bridge_confidence: 0.88,
      bridge_scope_size: 6,
      dependency_count: 2,
      has_critical_criteria: true,
      file_count: 5,
      feature_type: "payments_and_billing_verification",
      risk_domain_tags: ["payments", "webhooks", "security"],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["donor", "stripe", "payments"],
  });

  // Linear-style workflow build
  scenarios.push({
    scenario_id: id(),
    source: "donor_derived",
    source_description: "Linear-derived: issue state machine build",
    inputs: {
      bridge_confidence: 0.74,
      bridge_scope_size: 8,
      dependency_count: 2,
      has_critical_criteria: true,
      file_count: 7,
      feature_type: "workflow",
      risk_domain_tags: ["state_machine", "transitions"],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["donor", "linear", "workflow"],
  });

  // Clerk-style auth onboarding build
  scenarios.push({
    scenario_id: id(),
    source: "donor_derived",
    source_description: "Clerk-derived: auth onboarding flow build",
    inputs: {
      bridge_confidence: 0.79,
      bridge_scope_size: 7,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 6,
      feature_type: "onboarding",
      risk_domain_tags: ["auth", "onboarding", "oauth"],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["donor", "clerk", "onboarding"],
  });

  // ClickUp-style notification build that failed
  scenarios.push({
    scenario_id: id(),
    source: "donor_derived",
    source_description: "ClickUp-derived: notification system build — failed due to scope creep",
    inputs: {
      bridge_confidence: 0.66,
      bridge_scope_size: 15,
      dependency_count: 3,
      has_critical_criteria: true,
      file_count: 14,
      feature_type: "notification_system",
      risk_domain_tags: ["notifications", "email", "webhooks"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: true,
      had_test_failures: true,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["donor", "clickup", "notification", "failure"],
  });

  // ── Borderline scenarios ──────────────────────────────────────────────
  // These sit right at decision boundaries where small config changes
  // flip the outcome from correct to incorrect or vice versa.

  // Just above DIRECT_BUILD threshold — passed but had hidden issues
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Borderline DIRECT_BUILD: confidence 0.76, later found scope drift",
    inputs: {
      bridge_confidence: 0.76,
      bridge_scope_size: 9,
      dependency_count: 2,
      has_critical_criteria: true,
      file_count: 8,
      feature_type: "backend_platform",
      risk_domain_tags: ["api"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "PASS_WITH_CONCERNS",
      had_scope_violations: true,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "direct_build_boundary", "false_pass"],
  });

  // Just below DIRECT_BUILD — would have succeeded if allowed
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Borderline below DIRECT_BUILD: confidence 0.73, clean successful build",
    inputs: {
      bridge_confidence: 0.73,
      bridge_scope_size: 4,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 3,
      feature_type: "workflow",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "direct_build_boundary", "valid_blocked"],
  });

  // At CAUTION/RESEARCH boundary — failed, should have been caught
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Borderline CAUTION/RESEARCH: confidence 0.61, build failed with test issues",
    inputs: {
      bridge_confidence: 0.61,
      bridge_scope_size: 11,
      dependency_count: 3,
      has_critical_criteria: true,
      file_count: 10,
      feature_type: "collaboration_system",
      risk_domain_tags: ["realtime", "state"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "caution_research_boundary", "missed_bug"],
  });

  // At CAUTION/RESEARCH boundary — passed, valid work
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Borderline CAUTION/RESEARCH: confidence 0.59, clean pass",
    inputs: {
      bridge_confidence: 0.59,
      bridge_scope_size: 3,
      dependency_count: 0,
      has_critical_criteria: false,
      file_count: 2,
      feature_type: "onboarding",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "caution_research_boundary", "valid_work"],
  });

  // High confidence but with security risk tags — should escalate
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "High confidence + security risk tags: should have been escalated",
    inputs: {
      bridge_confidence: 0.82,
      bridge_scope_size: 8,
      dependency_count: 1,
      has_critical_criteria: true,
      file_count: 7,
      feature_type: "backend_platform",
      risk_domain_tags: ["auth", "security", "permissions"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: true,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "security_miss", "should_escalate"],
  });

  // Medium confidence, large scope — passed but borderline
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Medium confidence, large scope: 12 files, passed but risky",
    inputs: {
      bridge_confidence: 0.67,
      bridge_scope_size: 18,
      dependency_count: 4,
      has_critical_criteria: true,
      file_count: 12,
      feature_type: "workflow",
      risk_domain_tags: ["data", "migrations"],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS_WITH_CONCERNS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "large_scope_pass", "risky"],
  });

  // Low confidence, no risk — passed cleanly, shouldn't be blocked
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Low confidence simple build: 2 files, clean pass, over-cautious block",
    inputs: {
      bridge_confidence: 0.42,
      bridge_scope_size: 2,
      dependency_count: 0,
      has_critical_criteria: false,
      file_count: 2,
      feature_type: "onboarding",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "low_confidence_valid", "over_cautious"],
  });

  // Medium-high confidence, zero dependencies — failed unexpectedly
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Surprising failure: high confidence, simple build, but auth was wrong",
    inputs: {
      bridge_confidence: 0.77,
      bridge_scope_size: 3,
      dependency_count: 0,
      has_critical_criteria: false,
      file_count: 3,
      feature_type: "backend_platform",
      risk_domain_tags: ["auth"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: false,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "surprising_failure", "auth_miss"],
  });

  // Just below ESCALATE threshold — should escalate but was valid
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Below escalation threshold: confidence 0.38, but build was fine",
    inputs: {
      bridge_confidence: 0.38,
      bridge_scope_size: 3,
      dependency_count: 1,
      has_critical_criteria: false,
      file_count: 2,
      feature_type: "onboarding",
      risk_domain_tags: [],
    },
    actual_outcome: {
      build_status: "PASSED",
      validator_outcome: "PASS",
      had_scope_violations: false,
      had_test_failures: false,
      escalation_triggered: true,
      veto_triggered: false,
    },
    tags: ["borderline", "escalation_boundary", "valid_escalated"],
  });

  // Multi-risk-tag failure that was allowed through
  scenarios.push({
    scenario_id: id(),
    source: "synthetic",
    source_description: "Multi-risk failure: payments + auth + data, confidence 0.70, not caught",
    inputs: {
      bridge_confidence: 0.70,
      bridge_scope_size: 10,
      dependency_count: 2,
      has_critical_criteria: true,
      file_count: 9,
      feature_type: "payments_and_billing_verification",
      risk_domain_tags: ["payments", "auth", "data", "pii"],
    },
    actual_outcome: {
      build_status: "FAILED",
      validator_outcome: "FAIL",
      had_scope_violations: true,
      had_test_failures: true,
      escalation_triggered: false,
      veto_triggered: false,
    },
    tags: ["borderline", "multi_risk", "should_block"],
  });

  return scenarios;
}
