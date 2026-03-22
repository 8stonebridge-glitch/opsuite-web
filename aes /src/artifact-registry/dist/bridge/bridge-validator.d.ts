/**
 * AES Bridge Layer — Bridge Validator
 *
 * Performs deterministic pre-build validation and appends a new bridge version
 * with validator-owned status.
 */
import { ArtifactRegistry } from "../registry";
import type { Bridge, BridgeStatus, StoredRecord } from "../types";
export type BridgeValidationIssueCode = "MISSING_REQUIRED_FIELD" | "EMPTY_SCOPE" | "WRITE_SCOPE_NOT_READABLE" | "CONFIDENCE_MISMATCH" | "DEPENDENCY_NOT_READY" | "CRITICAL_TEST_MAPPING_MISSING" | "BRIDGE_NOT_FRESH";
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
export declare class BridgeValidator {
    private readonly registry;
    constructor(registry: ArtifactRegistry);
    validate(input: BridgeValidationInput): Promise<BridgeValidationResult>;
}
//# sourceMappingURL=bridge-validator.d.ts.map