/**
 * AES Orchestrator Layer — Authority Checks
 *
 * Encodes the allowed state transitions from the AES state-machine docs.
 */
import type { BridgeStatus, BuildStatus, ValidatorRunStatus } from "../types";
export declare class InvalidStateTransitionError extends Error {
    constructor(kind: "bridge" | "build" | "validator_run", from: string, to: string);
}
export declare function assertBridgeTransition(from: BridgeStatus, to: BridgeStatus): void;
export declare function assertBuildTransition(from: BuildStatus, to: BuildStatus): void;
export declare function assertValidatorRunTransition(from: ValidatorRunStatus, to: ValidatorRunStatus): void;
//# sourceMappingURL=authority-checks.d.ts.map