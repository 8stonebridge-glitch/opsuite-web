/**
 * AES Artifact Registry — Common Types
 *
 * Shared primitives used across all artifact schemas.
 * Derived from: aes-runtime-quick-reference.md, docs/artifact-model.md
 */
export type ArtifactType = "request" | "graph_snapshot" | "bridge" | "build" | "validator_run" | "dependency_record" | "freshness_check" | "scope_expansion_request" | "read_scope_amendment" | "diff_artifact" | "test_run" | "write_back_record" | "research_note" | "escalation_record" | "metric_record" | "app_spec" | "feature_spec" | "verification_report" | "promotion_evaluation" | "governance_config" | "replay_run" | "replay_report" | "governance_proposal" | "governance_decision" | "verification";
export type BridgeStatus = "DRAFT" | "VALIDATED" | "REJECTED" | "STALE" | "SUPERSEDED" | "EXECUTING" | "EXECUTED";
export type BuildStatus = "QUEUED" | "AUTHORIZED" | "BLOCKED" | "RUNNING" | "PASSED" | "FAILED";
export type ValidatorOutcome = "PASS" | "PASS_WITH_CONCERNS" | "FAIL";
export type ValidatorRunStatus = "QUEUED" | "RUNNING" | ValidatorOutcome;
export type WriteBackStatus = "PROVISIONAL" | "VERIFIED_RESTRICTED" | "VERIFIED" | "CANONICAL";
export type AuthorityTier = "CANONICAL" | "VERIFIED" | "VERIFIED_RESTRICTED" | "PROVISIONAL" | "DONOR_RAW" | "UNTESTED";
export declare const AUTHORITY_TIER_WEIGHTS: Record<AuthorityTier, number>;
export interface TieredConstraint {
    text: string;
    authority_tier: AuthorityTier;
    source_node_id?: string;
    enforcement: "MUST" | "SHOULD" | "MAY";
}
export declare function enforcementFromTier(tier: AuthorityTier): TieredConstraint["enforcement"];
export interface ConfidenceBreakdown {
    graph_coverage: number;
    pattern_strength: number;
    rule_consistency: number;
    evidence_level: number;
}
/** Computed, not guessed. Final = 0.35*G + 0.25*P + 0.20*R + 0.20*E */
export declare function computeConfidence(b: ConfidenceBreakdown): number;
export type ConfidenceRoute = "DIRECT_BUILD" | "CAUTION_BUILD" | "RESEARCH_REQUIRED" | "ESCALATE";
export type HardVetoCode = "CRITICAL_RULE_CONTRADICTION" | "MISSING_CRITICAL_TEST_MAPPING" | "CRITICAL_GRAPH_TRUTH_CHANGE" | "INVALID_BRIDGE_BOUNDARY" | "UNRESOLVED_VALIDATOR_HARD_FAIL" | "DEPENDENCY_NOT_SATISFIED" | "BRIDGE_NOT_FRESH" | "BRIDGE_NOT_VALIDATED" | "CANONICAL_CONSTRAINT_VIOLATED" | "AUTH_AMBIGUITY" | "PERMISSION_AMBIGUITY" | "MISSING_DATA_OWNERSHIP" | "UNDEFINED_DESTRUCTIVE_BEHAVIOR" | "UNRESOLVED_DEPENDENCY_CONFLICT" | "INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS";
export interface HardVeto {
    code: HardVetoCode;
    message: string;
    blocking: boolean;
}
export type DependencyType = "NONE" | "SOFT" | "HARD" | "BLOCKING";
export interface ScopeDefinition {
    paths: string[];
    description?: string;
}
export interface ApiContract {
    name: string;
    method: string;
    path: string;
    request_shape?: unknown;
    response_shape?: unknown;
}
export interface EventDefinition {
    name: string;
    payload_shape?: unknown;
    emitted_by?: string;
    consumed_by?: string[];
}
export interface DbTouch {
    table: string;
    operations: Array<"READ" | "INSERT" | "UPDATE" | "DELETE">;
    notes?: string;
}
export interface ComponentBoundary {
    name: string;
    owns: string[];
    must_not_cross: string[];
}
export interface AcceptanceCriterion {
    id: string;
    description: string;
    type: "functional" | "non_functional" | "boundary" | "security" | "runtime";
    mandatory: boolean;
}
export interface TestCase {
    id: string;
    description: string;
    type: "unit" | "integration" | "contract" | "e2e" | "boundary";
    linked_criterion_id?: string;
    mandatory: boolean;
}
/**
 * Envelope written to storage for every artifact.
 * The registry never mutates a record — every write is a new row.
 */
export interface StoredRecord<T = unknown> {
    /** Auto-assigned by the storage layer */
    internal_id: number;
    artifact_type: ArtifactType;
    artifact_id: string;
    /** Monotonically increasing per (artifact_type, artifact_id) pair */
    sequence_number: number;
    payload: T;
    written_at: string;
}
//# sourceMappingURL=common.d.ts.map