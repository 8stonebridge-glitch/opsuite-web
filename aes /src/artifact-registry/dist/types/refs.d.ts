/**
 * AES Artifact Registry — Structured References
 *
 * Every bridge and validator run must use structured artifact_refs, not raw IDs.
 * Derived from: docs/artifact-model.md §5 Traceability Design
 *              aes-runtime-quick-reference.md §9 Traceability
 */
export type RefArtifactType = "request" | "graph_node" | "graph_edge" | "graph_snapshot" | "bridge" | "build" | "validator_run" | "dependency_record" | "freshness_check" | "scope_expansion_request" | "read_scope_amendment" | "research_note" | "escalation_record" | "write_back_record" | "metric_record" | "execution_doc" | "test_run" | "diff" | "diff_artifact" | "governance_config" | "replay_run" | "replay_report" | "governance_proposal" | "governance_decision";
export type RefRole = "constraint_source" | "pattern_source" | "anti_pattern_source" | "dependency_source" | "validation_evidence" | "external_grounding" | "evidence_source" | "graph_snapshot_source" | "freshness_source" | "scope_source" | "test_source" | "diff_source" | "escalation_source" | "governance_config_source" | "replay_evidence" | "governance_proposal_source" | "baseline_config";
/**
 * Structured artifact reference.
 * Use these instead of loose string IDs wherever a cross-artifact link is needed.
 */
export interface ArtifactRef {
    artifact_type: RefArtifactType;
    artifact_id: string;
    role: RefRole;
}
//# sourceMappingURL=refs.d.ts.map