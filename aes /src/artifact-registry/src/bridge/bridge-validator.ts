/**
 * AES Bridge Layer — Bridge Validator
 *
 * Performs deterministic pre-build validation and appends a new bridge version
 * with validator-owned status.
 */

import { ArtifactRegistry } from "../registry";
import type {
  Bridge,
  BridgeStatus,
  StoredRecord,
} from "../types";
import { computeConfidence } from "../types";

export type BridgeValidationIssueCode =
  | "MISSING_REQUIRED_FIELD"
  | "EMPTY_SCOPE"
  | "WRITE_SCOPE_NOT_READABLE"
  | "CONFIDENCE_MISMATCH"
  | "DEPENDENCY_NOT_READY"
  | "CRITICAL_TEST_MAPPING_MISSING"
  | "BRIDGE_NOT_FRESH";

export interface BridgeValidationIssue {
  code: BridgeValidationIssueCode;
  message: string;
  field?: keyof Bridge | string;
}

export interface BridgeValidationInput {
  bridge: Bridge;
  dependencies_satisfied: boolean;
  is_fresh?: boolean;
}

export interface BridgeValidationResult {
  status: Extract<BridgeStatus, "VALIDATED" | "REJECTED">;
  valid: boolean;
  issues: BridgeValidationIssue[];
  record: StoredRecord<Bridge>;
}

function hasPathCoverage(candidate: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((allowedPath) => {
    if (allowedPath === candidate) {
      return true;
    }

    if (allowedPath.endsWith("/**")) {
      const prefix = allowedPath.slice(0, -3);
      return candidate.startsWith(prefix);
    }

    return false;
  });
}

function collectValidationIssues(
  input: BridgeValidationInput
): BridgeValidationIssue[] {
  const issues: BridgeValidationIssue[] = [];
  const { bridge } = input;

  const requiredFields: Array<keyof Bridge> = [
    "bridge_id",
    "build_id",
    "feature_id",
    "graph_snapshot_id",
    "graph_truth_hash",
    "intent",
  ];

  for (const field of requiredFields) {
    const value = bridge[field];
    if (typeof value !== "string" || value.trim() === "") {
      issues.push({
        code: "MISSING_REQUIRED_FIELD",
        message: `Bridge field ${field} is required.`,
        field,
      });
    }
  }

  if (!Array.isArray(bridge.read_scope.paths) || bridge.read_scope.paths.length === 0) {
    issues.push({
      code: "EMPTY_SCOPE",
      message: "Bridge read_scope must contain at least one path.",
      field: "read_scope",
    });
  }

  if (
    !Array.isArray(bridge.write_scope.paths) ||
    bridge.write_scope.paths.length === 0
  ) {
    issues.push({
      code: "EMPTY_SCOPE",
      message: "Bridge write_scope must contain at least one path.",
      field: "write_scope",
    });
  }

  for (const writePath of bridge.write_scope.paths) {
    if (!hasPathCoverage(writePath, bridge.read_scope.paths)) {
      issues.push({
        code: "WRITE_SCOPE_NOT_READABLE",
        message: `write_scope path ${writePath} is not covered by read_scope.`,
        field: "write_scope",
      });
    }
  }

  const computedConfidence = computeConfidence(bridge.confidence_breakdown);
  if (Math.abs(computedConfidence - bridge.confidence) > 0.000001) {
    issues.push({
      code: "CONFIDENCE_MISMATCH",
      message: "Bridge confidence does not match the deterministic confidence formula.",
      field: "confidence",
    });
  }

  if (
    bridge.dependency_type !== "NONE" &&
    bridge.depends_on_bridge_ids.length > 0 &&
    !input.dependencies_satisfied
  ) {
    issues.push({
      code: "DEPENDENCY_NOT_READY",
      message: "Bridge has unsatisfied hard or soft dependencies.",
      field: "depends_on_bridge_ids",
    });
  }

  const linkedCriterionIds = new Set(
    bridge.test_cases
      .filter((testCase) => testCase.mandatory && testCase.linked_criterion_id)
      .map((testCase) => testCase.linked_criterion_id as string)
  );
  for (const criterion of bridge.acceptance_criteria) {
    if (
      criterion.mandatory &&
      (criterion.type === "security" ||
        criterion.type === "boundary" ||
        criterion.type === "runtime") &&
      !linkedCriterionIds.has(criterion.id)
    ) {
      issues.push({
        code: "CRITICAL_TEST_MAPPING_MISSING",
        message: `Mandatory ${criterion.type} criterion ${criterion.id} is not linked to a mandatory test case.`,
        field: "test_cases",
      });
    }
  }

  if (input.is_fresh === false) {
    issues.push({
      code: "BRIDGE_NOT_FRESH",
      message: "Bridge freshness check failed.",
      field: "graph_truth_hash",
    });
  }

  return issues;
}

export class BridgeValidator {
  constructor(private readonly registry: ArtifactRegistry) {}

  async validate(input: BridgeValidationInput): Promise<BridgeValidationResult> {
    const issues = collectValidationIssues(input);
    const status: Extract<BridgeStatus, "VALIDATED" | "REJECTED"> =
      issues.length === 0 ? "VALIDATED" : "REJECTED";

    const validatedBridge: Bridge = {
      ...input.bridge,
      status,
    };

    const record = await this.registry.write("bridge", validatedBridge);

    return {
      status,
      valid: status === "VALIDATED",
      issues,
      record,
    };
  }
}
