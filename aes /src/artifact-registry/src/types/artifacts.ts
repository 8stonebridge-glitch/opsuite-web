/**
 * AES Artifact Registry — All 15 Artifact Type Definitions
 *
 * Fields derived exactly from docs/artifact-model.md §2 Required Fields.
 * Additional artifacts (DependencyRecord, FreshnessCheck, etc.) are derived
 * from docs/artifact-model.md §1, quick-reference §5–10, and named in §4.
 *
 * GAP NOTES at the bottom of this file document fields inferred from context
 * where the focused doc does not give an explicit field list.
 */

import type { ArtifactRef } from "./refs";
import type {
  AcceptanceCriterion,
  ApiContract,
  AuthorityTier,
  BridgeStatus,
  BuildStatus,
  ComponentBoundary,
  ConfidenceBreakdown,
  DbTouch,
  DependencyType,
  EventDefinition,
  ScopeDefinition,
  TestCase,
  TieredConstraint,
  ValidatorOutcome,
  ValidatorRunStatus,
  WriteBackStatus,
} from "./common";

// ─── 1. Request ───────────────────────────────────────────────────────────────
// Fields: artifact-model.md §2

export interface Request {
  request_id: string;
  feature_id: string;
  intent: string;
  requested_by: string;
  risk_domain_tags: string[];
  created_at: string; // ISO 8601
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "PROCESSING" | "COMPLETE";
}

// ─── 2. GraphSnapshot ─────────────────────────────────────────────────────────
// Fields: artifact-model.md §2

export interface GraphSnapshot {
  graph_snapshot_id: string;
  feature_id: string;
  captured_at: string;
  graph_truth_hash: string;
  query_profile?: string;
  referenced_nodes: GraphNode[];
  referenced_edges: GraphEdge[];
  critical_domain_nodes: string[]; // node IDs
  artifact_refs: ArtifactRef[];
}

export interface GraphNode {
  node_id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  edge_id: string;
  from_node_id: string;
  to_node_id: string;
  relationship: string;
  properties: Record<string, unknown>;
}

// ─── 3. Bridge ────────────────────────────────────────────────────────────────
// Fields: artifact-model.md §2 (full list)

export interface Bridge {
  bridge_id: string;
  build_id: string;
  feature_id: string;
  generated_at: string;
  graph_snapshot_id: string;
  graph_truth_hash: string;
  bridge_version: number;
  intent: string;
  scope: ScopeDefinition;
  out_of_scope: string[];
  constraints: string[];
  tiered_constraints?: TieredConstraint[];
  patterns: string[];
  anti_patterns: string[];
  data_model: Record<string, unknown>;
  api_contracts: ApiContract[];
  events: EventDefinition[];
  db_touches: DbTouch[];
  component_boundaries: ComponentBoundary[];
  read_scope: ScopeDefinition;
  write_scope: ScopeDefinition;
  read_scope_amendments: string[]; // ReadScopeAmendment IDs applied
  depends_on_bridge_ids: string[];
  predecessor_build_ids: string[];
  dependency_type: DependencyType;
  acceptance_criteria: AcceptanceCriterion[];
  test_cases: TestCase[];
  confidence: number;
  confidence_breakdown: ConfidenceBreakdown;
  artifact_refs: ArtifactRef[];
  status: BridgeStatus;
}

// ─── 4. Build ─────────────────────────────────────────────────────────────────
// Fields: artifact-model.md §2

export interface Build {
  build_id: string;
  bridge_id: string;
  feature_id: string;
  status: BuildStatus;
  blocked_reasons: BlockedReason[];
  queued_at: string;
  authorized_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  builder_session_id: string | null;
  artifact_refs: ArtifactRef[];
}

export interface BlockedReason {
  /** Stable machine-readable reason code, e.g. MISSING_APPROVAL_STEP */
  code: string;
  message: string;
  /** Rule ID, graph node ID, or subsystem identity that raised the block */
  source: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  /** Agent or subsystem that detected the block */
  detected_by: string;
  timestamp: string; // ISO 8601
}

// ─── 5. ValidatorRun ──────────────────────────────────────────────────────────
// Fields: artifact-model.md §2

export interface ValidatorRun {
  validator_id: string;
  validator_run_id: string;
  build_id: string;
  bridge_id: string;
  /** Transition timestamp for the current validator run record */
  validated_at: string;
  status: ValidatorRunStatus;
  evidence: ValidatorEvidence[];
  violations: ValidatorViolation[];
  missing: string[];
  concerns: string[];
  confidence: number;
  artifact_refs: ArtifactRef[];
}

export type EvidenceType =
  | "file_line"
  | "test_run"
  | "diff"
  | "runtime_observation";

export interface ValidatorEvidence {
  evidence_type: EvidenceType;
  description: string;
  location?: string;   // file:line for file_line type
  artifact_ref?: ArtifactRef;
}

export interface ValidatorViolation {
  rule: string;
  severity: "HARD" | "SOFT";
  location?: string;
  description: string;
}

// ─── 6. DependencyRecord ──────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from §4 query needs + bridge dependency fields in §2.

export interface DependencyRecord {
  dependency_record_id: string;
  bridge_id: string;
  feature_id: string;
  evaluated_at: string;
  depends_on_bridge_ids: string[];
  predecessor_build_ids: string[];
  dependency_type: DependencyType;
  all_satisfied: boolean;
  unsatisfied_dependencies: UnsatisfiedDependency[];
  artifact_refs: ArtifactRef[];
}

export interface UnsatisfiedDependency {
  bridge_id?: string;
  build_id?: string;
  reason: string;
}

// ─── 7. FreshnessCheck ────────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from §4 ("list stale bridges caused by a graph change") +
// quick-reference §3 hard safety model (bridge freshness).

export interface FreshnessCheck {
  freshness_check_id: string;
  bridge_id: string;
  feature_id: string;
  checked_at: string;
  bridge_graph_truth_hash: string;
  current_graph_truth_hash: string;
  is_fresh: boolean;
  staleness_reason: string | null;
  artifact_refs: ArtifactRef[];
}

// ─── 8. ScopeExpansionRequest ─────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from quick-reference §6 Scope Enforcement.

export interface ScopeExpansionRequest {
  scope_expansion_request_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  requested_at: string;
  requested_paths: string[];
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  artifact_refs: ArtifactRef[];
}

// ─── 9. ReadScopeAmendment ────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from quick-reference §6 + bridge.read_scope_amendments.

export interface ReadScopeAmendment {
  read_scope_amendment_id: string;
  scope_expansion_request_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  amended_at: string;
  approved_paths: string[];
  approved_by: string; // orchestrator identity
  artifact_refs: ArtifactRef[];
}

// ─── 10. DiffArtifact ─────────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from §3 (object storage for diffs) + §4 query need
// ("show drift incidents by repo path or feature").

export interface DiffArtifact {
  diff_artifact_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  captured_at: string;
  changed_files: ChangedFile[];
  path_violations: PathViolation[];
  /** Reference to the raw diff blob in object storage */
  blob_ref: string | null;
  artifact_refs: ArtifactRef[];
}

export interface ChangedFile {
  path: string;
  change_type: "added" | "modified" | "deleted" | "renamed";
  lines_added: number;
  lines_removed: number;
  in_write_scope: boolean;
}

export interface PathViolation {
  path: string;
  violation_type: "outside_write_scope" | "outside_read_scope" | "interface_boundary";
  description: string;
}

// ─── 11. TestRun ──────────────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from §3 (test outputs in object storage) + quick-reference §7
// (test_run as evidence type) + bridge.test_cases.

export interface TestRun {
  test_run_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  executed_at: string;
  test_cases_run: number;
  passed: number;
  failed: number;
  skipped: number;
  status: "PASS" | "FAIL" | "PARTIAL";
  failure_details: TestFailure[];
  /** Reference to full test output blob in object storage */
  blob_ref: string | null;
  artifact_refs: ArtifactRef[];
}

export interface TestFailure {
  test_case_id: string;
  test_name: string;
  error_message: string;
  location?: string;
}

// ─── 12. WriteBackRecord ──────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from quick-reference §8 Write-Back Policy.

export interface WriteBackRecord {
  write_back_record_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  decided_at: string;
  validator_consensus: ValidatorOutcome;
  /**
   * PASS        => VERIFIED
   * PASS_WITH_CONCERNS => VERIFIED_RESTRICTED
   * FAIL        => no write-back (written_back = false)
   */
  write_back_status: WriteBackStatus | null;
  written_back: boolean;
  rejection_reason: string | null;
  promoted_tier?: AuthorityTier;
  artifact_refs: ArtifactRef[];
}

// ─── 13. ResearchNote ─────────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from quick-reference hard rule: "external research is untrusted
// until filtered and recorded" + §4 query need.

export interface ResearchNote {
  research_note_id: string;
  feature_id: string;
  captured_at: string;
  source: string;
  content: string;
  trust_status: "UNTRUSTED" | "FILTERED" | "RECORDED";
  filtered_by: string | null; // orchestrator identity that approved
  artifact_refs: ArtifactRef[];
}

// ─── 14. EscalationRecord ─────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from docs/governance.md context + quick-reference §3 hard vetoes.

export interface EscalationRecord {
  escalation_record_id: string;
  build_id: string | null;
  bridge_id: string | null;
  feature_id: string;
  escalated_at: string;
  escalation_reason: string;
  escalation_type:
    | "hard_veto"
    | "low_confidence"
    | "validator_disagreement"
    | "scope_violation"
    | "graph_conflict"
    | "manual";
  decision: "APPROVED" | "REJECTED" | "DEFERRED" | null;
  decided_at: string | null;
  decided_by: string | null;
  rationale: string | null;
  artifact_refs: ArtifactRef[];
}

// ─── 15. MetricRecord ─────────────────────────────────────────────────────────
// GAP: artifact-model.md §1 names this artifact; §2 omits its field list.
// Fields derived from §4 query needs + deployment-path.md full platform goals.

export interface MetricRecord {
  metric_record_id: string;
  build_id: string | null;
  feature_id: string | null;
  period_start: string;
  period_end: string;
  captured_at: string;
  metric_name: string;
  metric_value: number;
  tags: Record<string, string>;
  artifact_refs: ArtifactRef[];
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type AnyArtifact =
  | Request
  | GraphSnapshot
  | Bridge
  | Build
  | ValidatorRun
  | DependencyRecord
  | FreshnessCheck
  | ScopeExpansionRequest
  | ReadScopeAmendment
  | DiffArtifact
  | TestRun
  | WriteBackRecord
  | ResearchNote
  | EscalationRecord
  | MetricRecord
  | import("./app-spec").AppSpec
  | import("./app-spec").FeatureSpec
  | import("./promotion-types").VerificationReport
  | import("./promotion-types").PromotionEvaluation
  | import("./governance-types").GovernanceConfig
  | import("./governance-types").ReplayRun
  | import("./governance-types").ReplayReport
  | import("./governance-types").GovernanceProposal
  | import("./governance-types").GovernanceDecision;
