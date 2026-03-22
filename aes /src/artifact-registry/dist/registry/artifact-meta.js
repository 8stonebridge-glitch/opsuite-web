"use strict";
/**
 * AES Artifact Registry — Artifact Metadata
 *
 * Single source of truth for per-artifact-type constants.
 * Both the ID generator and the registry derive from this map,
 * eliminating drift risk between parallel maps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTIFACT_META = void 0;
exports.ARTIFACT_META = {
    request: { prefix: "REQ", idField: "request_id" },
    graph_snapshot: { prefix: "SNAP", idField: "graph_snapshot_id" },
    bridge: { prefix: "BRG", idField: "bridge_id" },
    build: { prefix: "BLD", idField: "build_id" },
    validator_run: { prefix: "VRUN", idField: "validator_run_id" },
    dependency_record: { prefix: "DEP", idField: "dependency_record_id" },
    freshness_check: { prefix: "FRESH", idField: "freshness_check_id" },
    scope_expansion_request: { prefix: "SEXP", idField: "scope_expansion_request_id" },
    read_scope_amendment: { prefix: "RSAM", idField: "read_scope_amendment_id" },
    diff_artifact: { prefix: "DIFF", idField: "diff_artifact_id" },
    test_run: { prefix: "TRUN", idField: "test_run_id" },
    write_back_record: { prefix: "WBR", idField: "write_back_record_id" },
    research_note: { prefix: "RN", idField: "research_note_id" },
    escalation_record: { prefix: "ESC", idField: "escalation_record_id" },
    metric_record: { prefix: "MET", idField: "metric_record_id" },
    app_spec: { prefix: "APP", idField: "app_id" },
    feature_spec: { prefix: "FSPEC", idField: "feature_id" },
    verification_report: { prefix: "VRPT", idField: "verification_id" },
    promotion_evaluation: { prefix: "PROM", idField: "evaluation_id" },
    // Governance training artifacts
    governance_config: { prefix: "GCFG", idField: "governance_config_id" },
    replay_run: { prefix: "RRUN", idField: "replay_run_id" },
    replay_report: { prefix: "RRPT", idField: "replay_report_id" },
    governance_proposal: { prefix: "GPROP", idField: "governance_proposal_id" },
    governance_decision: { prefix: "GDEC", idField: "governance_decision_id" },
    // Verification artifacts
    verification: { prefix: "VRFY", idField: "verification_id" },
};
//# sourceMappingURL=artifact-meta.js.map