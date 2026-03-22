# AES Artifact Model

This file defines the runtime artifacts, required fields, storage model, indexing needs, and traceability rules.

## 1. Primary Runtime Artifacts

| Artifact | Purpose |
|---|---|
| `Request` | normalized incoming build request |
| `GraphSnapshot` | truth snapshot and hash for replay/freshness |
| `Bridge` | compiled execution contract |
| `Build` | runtime execution record |
| `ValidatorRun` | result of a validator pass |
| `DependencyRecord` | dependency evaluation outcome |
| `FreshnessCheck` | bridge freshness result |
| `ScopeExpansionRequest` | builder request to expand read scope |
| `ReadScopeAmendment` | approved expansion to `read_scope` |
| `DiffArtifact` | file change record plus path violations |
| `TestRun` | result of tests executed against the bridge |
| `WriteBackRecord` | write-back decision and final status |
| `ResearchNote` | externally grounded but not yet trusted knowledge |
| `EscalationRecord` | human review event, decision, and rationale |
| `MetricRecord` | runtime metrics captured per build or period |

## 2. Required Fields

### Request
- `request_id`
- `feature_id`
- `intent`
- `requested_by`
- `risk_domain_tags`
- `created_at`
- `status`

### GraphSnapshot
- `graph_snapshot_id`
- `feature_id`
- `captured_at`
- `graph_truth_hash`
- `referenced_nodes`
- `referenced_edges`
- `critical_domain_nodes`
- `artifact_refs`

### Bridge
- `bridge_id`
- `build_id`
- `feature_id`
- `generated_at`
- `graph_snapshot_id`
- `graph_truth_hash`
- `bridge_version`
- `intent`
- `scope`
- `out_of_scope`
- `constraints`
- `patterns`
- `anti_patterns`
- `data_model`
- `api_contracts`
- `events`
- `db_touches`
- `component_boundaries`
- `read_scope`
- `write_scope`
- `read_scope_amendments`
- `depends_on_bridge_ids`
- `predecessor_build_ids`
- `dependency_type`
- `acceptance_criteria`
- `test_cases`
- `confidence`
- `confidence_breakdown`
- `artifact_refs`
- `status`

### Build
- `build_id`
- `bridge_id`
- `feature_id`
- `status`
- `queued_at`
- `authorized_at`
- `started_at`
- `ended_at`
- `builder_session_id`
- `artifact_refs`

### ValidatorRun
- `validator_id`
- `validator_run_id`
- `build_id`
- `bridge_id`
- `validated_at`
- `status`
- `evidence`
- `violations`
- `missing`
- `concerns`
- `confidence`
- `artifact_refs`

## 3. Storage Model

1. Neo4j
   - canonical graph truth
   - verified patterns
   - canonical and verified rules
   - promoted build learnings

2. Relational artifact registry
   - append-only JSON records in PostgreSQL `JSONB`
   - indexed by IDs, state, feature, time, and referenced graph hash

3. Object storage / blob store
   - diffs
   - logs
   - screenshots
   - test outputs
   - AST analysis artifacts

## 4. Indexing and Query Needs

Must support:
- lookup by `bridge_id`, `build_id`, `validator_run_id`, `feature_id`
- replay by `graph_snapshot_id` and `graph_truth_hash`
- list stale bridges caused by a graph change
- list failed builds by failure type
- list all artifacts tied to a validator concern
- find all `VERIFIED_RESTRICTED` learnings awaiting promotion
- show drift incidents by repo path or feature
- trace all evidence tied to a build

## 5. Traceability Design

All artifacts use structured references:

```json
{
  "artifact_refs": [
    {
      "artifact_type": "graph_node | graph_edge | bridge | build | validator_run | research_note | execution_doc | test_run | diff",
      "artifact_id": "RULE-023",
      "role": "constraint_source"
    }
  ]
}
```

Minimum required roles:
- `constraint_source`
- `pattern_source`
- `anti_pattern_source`
- `dependency_source`
- `validation_evidence`
- `external_grounding`
- `evidence_source`

This makes every bridge and validator run replayable from recorded inputs rather than interpretation.
