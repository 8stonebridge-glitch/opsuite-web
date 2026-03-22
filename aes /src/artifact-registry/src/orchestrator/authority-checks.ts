/**
 * AES Orchestrator Layer — Authority Checks
 *
 * Encodes the allowed state transitions from the AES state-machine docs.
 */

import type { BridgeStatus, BuildStatus, ValidatorRunStatus } from "../types";

const ALLOWED_BRIDGE_TRANSITIONS: Record<BridgeStatus, Set<BridgeStatus>> = {
  DRAFT: new Set(["VALIDATED", "REJECTED", "SUPERSEDED"]),
  VALIDATED: new Set(["STALE", "SUPERSEDED", "EXECUTING", "REJECTED"]),
  REJECTED: new Set(["SUPERSEDED"]),
  STALE: new Set(["SUPERSEDED"]),
  SUPERSEDED: new Set([]),
  EXECUTING: new Set(["EXECUTED", "SUPERSEDED"]),
  EXECUTED: new Set(["SUPERSEDED"]),
};

const ALLOWED_BUILD_TRANSITIONS: Record<BuildStatus, Set<BuildStatus>> = {
  QUEUED: new Set(["AUTHORIZED", "BLOCKED"]),
  AUTHORIZED: new Set(["RUNNING", "BLOCKED"]),
  BLOCKED: new Set([]),
  RUNNING: new Set(["PASSED", "FAILED"]),
  PASSED: new Set([]),
  FAILED: new Set([]),
};

const ALLOWED_VALIDATOR_RUN_TRANSITIONS: Record<
  ValidatorRunStatus,
  Set<ValidatorRunStatus>
> = {
  QUEUED: new Set(["RUNNING"]),
  RUNNING: new Set(["PASS", "PASS_WITH_CONCERNS", "FAIL"]),
  PASS: new Set([]),
  PASS_WITH_CONCERNS: new Set([]),
  FAIL: new Set([]),
};

export class InvalidStateTransitionError extends Error {
  constructor(kind: "bridge" | "build" | "validator_run", from: string, to: string) {
    super(`Invalid ${kind} transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function assertBridgeTransition(
  from: BridgeStatus,
  to: BridgeStatus
): void {
  if (!ALLOWED_BRIDGE_TRANSITIONS[from].has(to)) {
    throw new InvalidStateTransitionError("bridge", from, to);
  }
}

export function assertBuildTransition(
  from: BuildStatus,
  to: BuildStatus
): void {
  if (!ALLOWED_BUILD_TRANSITIONS[from].has(to)) {
    throw new InvalidStateTransitionError("build", from, to);
  }
}

export function assertValidatorRunTransition(
  from: ValidatorRunStatus,
  to: ValidatorRunStatus
): void {
  if (!ALLOWED_VALIDATOR_RUN_TRANSITIONS[from].has(to)) {
    throw new InvalidStateTransitionError("validator_run", from, to);
  }
}
