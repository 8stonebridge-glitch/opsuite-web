/**
 * AES Governance Training Types
 *
 * Types for governance-as-artifact: trainable config, replay harness,
 * governance proposals, and promotion decisions.
 *
 * Design principle: governance config is a first-class append-only artifact.
 * Frozen fields (hard vetoes, security stops) are never trainable.
 * Trainable fields (confidence weights, thresholds) are optimized via
 * automated sandbox replay.
 */

import type { ArtifactRef } from "./refs";
import type { AuthorityTier, HardVetoCode } from "./common";

// ─── Governance Config ─────────────────────────────────────────────────────────

/**
 * Trainable governance values — these can be modified by the automated
 * proposal loop within sandbox replay.
 */
export interface TrainableGovernance {
  /** Confidence formula weights (must sum to 1.0) */
  confidence_weights: {
    graph_coverage: number;    // default: 0.35
    pattern_strength: number;  // default: 0.25
    rule_consistency: number;  // default: 0.20
    evidence_level: number;    // default: 0.20
  };

  /** Confidence routing thresholds */
  routing_thresholds: {
    direct_build_floor: number;     // default: 0.75
    caution_build_floor: number;    // default: 0.60
    research_required_floor: number; // default: 0.40
    // Below research_required_floor → ESCALATE
  };

  /** Promotion thresholds */
  promotion_thresholds: {
    /** Minimum confidence for promotion gate passage */
    min_feature_confidence: number;         // default: 0.60
    /** Max open questions per feature before gate failure */
    max_missing_questions_per_feature: number; // default: 3
    /** Distinct successful builds needed for CANONICAL */
    builds_for_canonical: number;            // default: 3
    /** Min description length for buildability gate */
    min_description_length: number;          // default: 10
  };

  /** Authority tier weight overrides */
  authority_tier_weights: Record<AuthorityTier, number>;

  /** Escalation rules */
  escalation_rules: {
    /** Auto-escalate builds touching > N files in a single module */
    max_files_per_module_before_escalation: number; // default: 10
    /** Auto-escalate if > N scope expansion requests on a single build */
    max_scope_expansions_before_escalation: number; // default: 3
  };

  /** Blocked-state rules */
  blocked_state_rules: {
    /** Max hours a build can stay RUNNING before auto-escalation */
    max_running_hours: number; // default: 4
    /** Max queued builds before backpressure warning */
    max_queued_builds: number; // default: 20
  };

  /** Validator consensus rules */
  validator_consensus: {
    /** Number of FAILs required for hard fail */
    fail_count_for_hard_fail: number; // default: 2
  };
}

/**
 * Frozen governance values — these are NEVER modified by the automated loop.
 * Changes require explicit operator action.
 */
export interface FrozenGovernance {
  /** Hard veto codes that always block — the loop cannot remove any */
  hard_veto_codes: HardVetoCode[];

  /** Security/compliance stop conditions */
  security_stop_conditions: string[];

  /** Invariant: numeric confidence never overrides critical vetoes */
  confidence_never_overrides_vetoes: true;

  /** Invariant: append-only storage — no record mutation */
  append_only_storage: true;

  /** Invariant: validators are independent of builder context */
  validator_independence: true;

  /** Invariant: operator approval required for CANONICAL promotion */
  operator_gates_canonical: true;
}

/**
 * GovernanceConfig — a first-class append-only artifact in the registry.
 * Each version is immutable. Changes produce new versions.
 */
export interface GovernanceConfig {
  governance_config_id: string;
  version: number;
  created_at: string; // ISO 8601
  created_by: string; // "operator" | "governance-loop" | "bootstrap"

  /** Trainable section — optimized by the automated loop */
  trainable: TrainableGovernance;

  /** Frozen section — never modified by automated processes */
  frozen: FrozenGovernance;

  /** Promotion state of this config version */
  promotion_status:
    | "CANDIDATE"
    | "SANDBOX_TESTED"
    | "VERIFIED_RESTRICTED"
    | "VERIFIED"
    | "CANONICAL"
    | "DEMOTED";

  /** If DEMOTED, reason and link to replacement */
  demotion_reason?: string;
  replaced_by_config_id?: string;

  /** Composite replay score that earned this promotion level */
  replay_score?: number;

  artifact_refs: ArtifactRef[];
}

// ─── Replay Types ──────────────────────────────────────────────────────────────

/**
 * A single replay scenario — either historical or synthetic.
 * Represents one build cycle with known inputs and expected outcomes.
 */
export interface ReplayScenario {
  scenario_id: string;
  source: "historical" | "synthetic" | "manual" | "donor_derived";
  source_description: string;

  /** The inputs that existed at build time */
  inputs: {
    bridge_confidence: number;
    bridge_scope_size: number;
    dependency_count: number;
    has_critical_criteria: boolean;
    file_count: number;
    feature_type: string;
    risk_domain_tags: string[];
  };

  /** What actually happened */
  actual_outcome: {
    build_status: "PASSED" | "FAILED" | "BLOCKED";
    validator_outcome: "PASS" | "PASS_WITH_CONCERNS" | "FAIL" | "ESCALATE";
    had_scope_violations: boolean;
    had_test_failures: boolean;
    escalation_triggered: boolean;
    veto_triggered: boolean;
    veto_codes?: HardVetoCode[];
  };

  /** Tags for filtering */
  tags: string[];
}

/**
 * ReplayRun — one execution of the replay harness against a candidate config.
 */
export interface ReplayRun {
  replay_run_id: string;
  governance_config_id: string;
  started_at: string;
  completed_at: string;
  scenario_count: number;
  scenarios_used: string[]; // scenario_ids

  /** Per-scenario results */
  results: ReplayResult[];

  artifact_refs: ArtifactRef[];
}

export interface ReplayResult {
  scenario_id: string;
  /** What the candidate config WOULD have done */
  predicted_route: string;
  predicted_blocked: boolean;
  predicted_escalation: boolean;
  /** Compared to actual */
  caught_real_bug: boolean;
  false_alarm: boolean;
  blocked_valid_work: boolean;
  correct_decision: boolean;
}

/**
 * ReplayReport — aggregated scoring of a replay run.
 */
export interface ReplayReport {
  replay_report_id: string;
  replay_run_id: string;
  governance_config_id: string;
  generated_at: string;

  /** The four core scoring dimensions */
  scores: {
    /** % of real bugs caught by this config */
    bugs_caught_rate: number;
    /** % of scenarios where config triggered a false alarm */
    false_alarm_rate: number;
    /** % of valid work that was incorrectly blocked */
    valid_work_blocked_rate: number;
    /** % improvement over baseline (previous CANONICAL config) */
    outcome_improvement: number;
  };

  /** Composite score (equal weights to start) */
  composite_score: number;

  /** Scoring formula used (for versioning) */
  scoring_formula: string;

  /** Comparison to the current CANONICAL config */
  baseline_config_id: string | null;
  baseline_composite_score: number | null;
  delta: number | null;

  /** Machine-readable recommendation */
  recommendation: "PROMOTE" | "KEEP_TESTING" | "REJECT";
  recommendation_reason: string;

  artifact_refs: ArtifactRef[];
}

// ─── Governance Proposal / Decision ────────────────────────────────────────────

/**
 * GovernanceProposal — one targeted change to the governance config.
 */
export interface GovernanceProposal {
  governance_proposal_id: string;
  proposed_at: string;
  proposed_by: string; // "governance-loop" | "operator"

  /** Which field was changed */
  target_field: string; // dot-path like "trainable.routing_thresholds.direct_build_floor"

  /** Previous and proposed values */
  previous_value: number;
  proposed_value: number;

  /** Why this change was proposed */
  rationale: string;

  /** Which scoring dimension this targets */
  target_dimension: "bugs_caught" | "false_alarms" | "valid_work_blocked" | "outcome_improvement";

  /** Replay results */
  replay_report_id: string | null;
  replay_score: number | null;
  baseline_score: number | null;
  score_delta: number | null;

  /** Outcome */
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "REVERTED";

  artifact_refs: ArtifactRef[];
}

/**
 * GovernanceDecision — operator decision on a governance promotion.
 * Shape mirrors EscalationRecord decision fields.
 */
export interface GovernanceDecision {
  governance_decision_id: string;
  governance_config_id: string;
  decided_at: string;
  decided_by: string;

  /** The promotion transition being decided */
  from_status: GovernanceConfig["promotion_status"];
  to_status: GovernanceConfig["promotion_status"];

  decision: "APPROVED" | "REJECTED" | "DEFERRED";
  rationale: string;

  /** Supporting evidence */
  replay_report_ids: string[];

  artifact_refs: ArtifactRef[];
}

// ─── Code Grounding Types ──────────────────────────────────────────────────────

/**
 * SourceFile — a file in the repository, tracked in the graph.
 * Not stored as a registry artifact — lives in Neo4j.
 */
export interface SourceFileNode {
  node_id: string;
  path: string;
  language: string;
  file_hash: string;
  last_scanned_at: string;
  line_count: number;
  /** Metadata about the scan that produced this node */
  scan_source: "import_scan" | "manual" | "test_mapping";
  inference_confidence: number; // 0-1
}

/**
 * Import relationship between source files.
 */
export interface ImportsEdge {
  from_file: string; // path
  to_file: string;   // path
  import_type: "static" | "dynamic" | "re_export";
  scan_source: "import_scan" | "manual";
  inference_confidence: number;
}

/**
 * Feature-to-file implementation link.
 */
export interface ImplementedByEdge {
  feature_id: string;
  file_path: string;
  relationship_type: "primary" | "supporting" | "test";
  scan_source: "import_scan" | "manual" | "test_mapping";
  inference_confidence: number;
}
