"use strict";
/**
 * AES Orchestrator Layer — Authority Checks
 *
 * Encodes the allowed state transitions from the AES state-machine docs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidStateTransitionError = void 0;
exports.assertBridgeTransition = assertBridgeTransition;
exports.assertBuildTransition = assertBuildTransition;
exports.assertValidatorRunTransition = assertValidatorRunTransition;
const ALLOWED_BRIDGE_TRANSITIONS = {
    DRAFT: new Set(["VALIDATED", "REJECTED", "SUPERSEDED"]),
    VALIDATED: new Set(["STALE", "SUPERSEDED", "EXECUTING", "REJECTED"]),
    REJECTED: new Set(["SUPERSEDED"]),
    STALE: new Set(["SUPERSEDED"]),
    SUPERSEDED: new Set([]),
    EXECUTING: new Set(["EXECUTED", "SUPERSEDED"]),
    EXECUTED: new Set(["SUPERSEDED"]),
};
const ALLOWED_BUILD_TRANSITIONS = {
    QUEUED: new Set(["AUTHORIZED", "BLOCKED"]),
    AUTHORIZED: new Set(["RUNNING", "BLOCKED"]),
    BLOCKED: new Set([]),
    RUNNING: new Set(["PASSED", "FAILED"]),
    PASSED: new Set([]),
    FAILED: new Set([]),
};
const ALLOWED_VALIDATOR_RUN_TRANSITIONS = {
    QUEUED: new Set(["RUNNING"]),
    RUNNING: new Set(["PASS", "PASS_WITH_CONCERNS", "FAIL"]),
    PASS: new Set([]),
    PASS_WITH_CONCERNS: new Set([]),
    FAIL: new Set([]),
};
class InvalidStateTransitionError extends Error {
    constructor(kind, from, to) {
        super(`Invalid ${kind} transition: ${from} -> ${to}`);
        this.name = "InvalidStateTransitionError";
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
function assertBridgeTransition(from, to) {
    if (!ALLOWED_BRIDGE_TRANSITIONS[from].has(to)) {
        throw new InvalidStateTransitionError("bridge", from, to);
    }
}
function assertBuildTransition(from, to) {
    if (!ALLOWED_BUILD_TRANSITIONS[from].has(to)) {
        throw new InvalidStateTransitionError("build", from, to);
    }
}
function assertValidatorRunTransition(from, to) {
    if (!ALLOWED_VALIDATOR_RUN_TRANSITIONS[from].has(to)) {
        throw new InvalidStateTransitionError("validator_run", from, to);
    }
}
//# sourceMappingURL=authority-checks.js.map