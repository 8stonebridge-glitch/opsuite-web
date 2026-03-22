/**
 * AES Policy Layer — Hard Veto Engine
 *
 * Evaluates non-negotiable stop conditions before confidence routing.
 */

import type { Bridge, HardVeto, TieredConstraint } from "../types";

export interface HardVetoInput {
  bridge: Pick<
    Bridge,
    | "status"
    | "test_cases"
    | "acceptance_criteria"
    | "constraints"
    | "dependency_type"
    | "depends_on_bridge_ids"
    | "write_scope"
    | "read_scope"
    | "api_contracts"
    | "events"
    | "db_touches"
    | "component_boundaries"
  >;
  is_fresh: boolean;
  dependencies_satisfied: boolean;
  critical_graph_truth_changed?: boolean;
  unresolved_validator_hard_fail?: boolean;
  critical_rule_contradiction?: boolean;
  invalid_bridge_boundary?: boolean;
  canonical_constraints?: TieredConstraint[];

  // ── Security vetoes (CLAUDE.md §7) ──────────────────────────────────────
  /** Feature touches auth but auth model is ambiguous or undefined */
  auth_ambiguity?: boolean;
  /** Feature touches permissions but permission model is ambiguous */
  permission_ambiguity?: boolean;
  /** Feature has data ownership that is unresolved across features */
  missing_data_ownership?: boolean;
  /** Feature includes destructive behavior without confirmation/undo */
  undefined_destructive_behavior?: boolean;
  /** Feature has unresolved dependency conflicts */
  unresolved_dependency_conflict?: boolean;
  /** Feature has incomplete acceptance tests for critical flows */
  incomplete_critical_acceptance_tests?: boolean;
  /** Risk domain tags for the feature */
  risk_domain_tags?: string[];
}

function hasMissingCriticalTestMapping(
  bridge: HardVetoInput["bridge"]
): boolean {
  const mandatoryCriteria = bridge.acceptance_criteria.filter(
    (criterion) =>
      criterion.mandatory &&
      (criterion.type === "security" ||
        criterion.type === "boundary" ||
        criterion.type === "runtime")
  );

  if (mandatoryCriteria.length === 0) {
    return false;
  }

  const linkedCriterionIds = new Set(
    bridge.test_cases
      .filter((testCase) => testCase.mandatory && testCase.linked_criterion_id)
      .map((testCase) => testCase.linked_criterion_id as string)
  );

  return mandatoryCriteria.some(
    (criterion) => !linkedCriterionIds.has(criterion.id)
  );
}

export function evaluateHardVetoes(input: HardVetoInput): HardVeto[] {
  const vetoes: HardVeto[] = [];

  if (input.critical_rule_contradiction) {
    vetoes.push({
      code: "CRITICAL_RULE_CONTRADICTION",
      message: "Critical rule contradiction detected in graph truth or bridge constraints.",
      blocking: true,
    });
  }

  if (hasMissingCriticalTestMapping(input.bridge)) {
    vetoes.push({
      code: "MISSING_CRITICAL_TEST_MAPPING",
      message:
        "Mandatory boundary/security/runtime acceptance criteria are not mapped to mandatory test cases.",
      blocking: true,
    });
  }

  if (input.critical_graph_truth_changed) {
    vetoes.push({
      code: "CRITICAL_GRAPH_TRUTH_CHANGE",
      message: "Critical graph truth changed after bridge generation.",
      blocking: true,
    });
  }

  if (input.invalid_bridge_boundary) {
    vetoes.push({
      code: "INVALID_BRIDGE_BOUNDARY",
      message: "Bridge boundary is invalid or underspecified.",
      blocking: true,
    });
  }

  if (input.unresolved_validator_hard_fail) {
    vetoes.push({
      code: "UNRESOLVED_VALIDATOR_HARD_FAIL",
      message: "A prior validator hard fail remains unresolved.",
      blocking: true,
    });
  }

  if (!input.dependencies_satisfied) {
    vetoes.push({
      code: "DEPENDENCY_NOT_SATISFIED",
      message: "Required upstream dependencies are not satisfied.",
      blocking: true,
    });
  }

  if (!input.is_fresh) {
    vetoes.push({
      code: "BRIDGE_NOT_FRESH",
      message: "Bridge freshness check failed.",
      blocking: true,
    });
  }

  if (input.bridge.status !== "VALIDATED") {
    vetoes.push({
      code: "BRIDGE_NOT_VALIDATED",
      message: "Bridge is not in VALIDATED state.",
      blocking: true,
    });
  }

  // ── Security vetoes (CLAUDE.md §7 — hard vetoes that block promotion) ────

  if (input.auth_ambiguity) {
    vetoes.push({
      code: "AUTH_AMBIGUITY",
      message: "Feature touches authentication but auth model is ambiguous or undefined. Resolve before build.",
      blocking: true,
    });
  }

  if (input.permission_ambiguity) {
    vetoes.push({
      code: "PERMISSION_AMBIGUITY",
      message: "Feature touches permissions but permission model is ambiguous. Define roles and access before build.",
      blocking: true,
    });
  }

  if (input.missing_data_ownership) {
    vetoes.push({
      code: "MISSING_DATA_OWNERSHIP",
      message: "Data ownership is unresolved. Multiple features claim the same entity without a designated owner.",
      blocking: true,
    });
  }

  if (input.undefined_destructive_behavior) {
    vetoes.push({
      code: "UNDEFINED_DESTRUCTIVE_BEHAVIOR",
      message: "Feature includes destructive actions without defined confirmation or undo behavior.",
      blocking: true,
    });
  }

  if (input.unresolved_dependency_conflict) {
    vetoes.push({
      code: "UNRESOLVED_DEPENDENCY_CONFLICT",
      message: "Feature has circular or conflicting dependencies that must be resolved before build.",
      blocking: true,
    });
  }

  if (input.incomplete_critical_acceptance_tests) {
    vetoes.push({
      code: "INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS",
      message: "Critical flows lack acceptance tests. All auth, security, and destructive flows must have test coverage.",
      blocking: true,
    });
  }

  // Auto-detect auth ambiguity from risk tags + constraints
  if (
    input.risk_domain_tags?.includes("auth") &&
    !input.bridge.constraints?.some(c =>
      c.toLowerCase().includes("auth") ||
      c.toLowerCase().includes("session") ||
      c.toLowerCase().includes("jwt") ||
      c.toLowerCase().includes("token")
    )
  ) {
    vetoes.push({
      code: "AUTH_AMBIGUITY",
      message: "Feature is tagged with 'auth' risk domain but bridge has no auth-related constraints. Define the auth model.",
      blocking: true,
    });
  }

  // Auto-detect permission ambiguity from risk tags
  if (
    input.risk_domain_tags?.includes("permissions") &&
    !input.bridge.constraints?.some(c =>
      c.toLowerCase().includes("permission") ||
      c.toLowerCase().includes("role") ||
      c.toLowerCase().includes("access") ||
      c.toLowerCase().includes("rbac")
    )
  ) {
    vetoes.push({
      code: "PERMISSION_AMBIGUITY",
      message: "Feature is tagged with 'permissions' risk domain but bridge has no permission-related constraints.",
      blocking: true,
    });
  }

  if (input.canonical_constraints && input.canonical_constraints.length > 0) {
    const mustConstraints = input.canonical_constraints.filter(
      (c) => c.enforcement === "MUST"
    );
    const bridgeConstraintTexts = new Set(input.bridge.constraints ?? []);
    const missing = mustConstraints.filter(
      (c) => !bridgeConstraintTexts.has(c.text)
    );
    if (missing.length > 0) {
      vetoes.push({
        code: "CANONICAL_CONSTRAINT_VIOLATED",
        message: `CANONICAL constraint not satisfied: ${missing.map((c) => c.text).join("; ")}`,
        blocking: true,
      });
    }
  }

  return vetoes;
}
