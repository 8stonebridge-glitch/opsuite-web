# AES Runtime Primitives

This file turns the AES operating model into the first concrete runtime slice.
It is not a new authority layer.
It is the implementation-facing shape of the existing `Graph -> Bridge -> Build` model.

Use this file when the task is:

- defining the first real runtime modules
- implementing artifact schemas
- deciding the first orchestrator loop
- choosing what must be immutable from day one

## 1. First Runnable AES Slice

The first version of AES should be one orchestrated runtime with deterministic modules:

1. `Request Intake`
   - normalizes incoming requests into a typed `Request`

2. `Neo4j Truth Adapter`
   - executes read-only graph queries
   - returns structured truth, not prose summaries

3. `Graph Snapshot Service`
   - captures referenced graph nodes and edges
   - computes `graph_truth_hash`
   - emits immutable `GraphSnapshot`

4. `Policy Engine`
   - runs hard veto evaluation
   - computes confidence
   - emits typed policy outputs

5. `Bridge Compiler`
   - compiles truth into one immutable `Bridge`

6. `Bridge Validator`
   - rejects malformed, stale, or under-specified bridges before build

7. `Builder Adapter`
   - starts one constrained Claude builder session
   - feeds only the bridge contract

8. `Scope Guard`
   - enforces `read_scope`, `write_scope`, and interface boundaries

9. `Validator Coordinator`
   - runs independent validators
   - collects evidence
   - decides aggregate build outcome

10. `Artifact Registry`
    - stores immutable runtime artifacts
    - stores append-only status history

11. `Evidence Store`
    - stores logs, diffs, test outputs, traces, and screenshots

12. `Write-Back Manager`
    - applies write-back policy
    - updates graph truth only after controlled validation

This is the smallest cut that proves AES is a runtime instead of a prompt pattern.

## 2. Artifact Envelope

Every runtime artifact should be stored inside one immutable envelope.
The envelope is what the registry indexes and replays.

```json
{
  "artifact_id": "bridge_20260321_001",
  "artifact_type": "Bridge",
  "schema_version": "1.0",
  "status": "VALIDATED",
  "created_at": "2026-03-21T14:30:00Z",
  "created_by_role": "orchestrator",
  "feature_id": "feat_onboarding_resume",
  "build_id": "build_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "graph_snapshot_id": "snapshot_20260321_001",
  "graph_truth_hash": "sha256:abc123",
  "parent_artifact_id": null,
  "supersedes_artifact_id": null,
  "payload_hash": "sha256:def456",
  "artifact_refs": [],
  "payload": {}
}
```

Required envelope rules:

- artifacts are immutable after creation
- status changes create a new artifact event, not in-place mutation of payload
- `payload_hash` must be computed from canonical JSON serialization
- every artifact must have a creator role
- every artifact tied to bridge execution must include `feature_id`

## 3. Concrete Artifact Shapes

### 3.1 Request

`Request` is the normalized runtime input.

```json
{
  "request_id": "req_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "intent": {
    "summary": "Allow onboarding to resume from a saved draft",
    "request_kind": "feature",
    "requested_outcome": "A user who leaves mid-flow can return and continue"
  },
  "requested_by": "operator",
  "risk_domain_tags": ["auth", "persistence"],
  "repo_roots": ["/workspace/app"],
  "status": "NEW"
}
```

### 3.2 GraphSnapshot

`GraphSnapshot` is the replay anchor for bridge freshness.

```json
{
  "graph_snapshot_id": "snapshot_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "captured_at": "2026-03-21T14:31:00Z",
  "graph_truth_hash": "sha256:abc123",
  "referenced_nodes": ["FEATURE-22", "RULE-14", "PATTERN-09"],
  "referenced_edges": ["EDGE-912", "EDGE-913"],
  "critical_domain_nodes": ["RULE-14"],
  "query_profile": "build_default",
  "artifact_refs": []
}
```

### 3.3 Bridge

`Bridge` is the only builder input.

```json
{
  "bridge_id": "bridge_20260321_001",
  "build_id": "build_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "generated_at": "2026-03-21T14:32:00Z",
  "graph_snapshot_id": "snapshot_20260321_001",
  "graph_truth_hash": "sha256:abc123",
  "bridge_version": 1,
  "intent": {
    "summary": "Implement resume-from-draft onboarding behavior",
    "user_visible_outcome": "Users continue where they left off",
    "delivery_type": "application_change"
  },
  "scope": [
    "persist onboarding draft on step transitions",
    "restore saved draft when user resumes",
    "show loading and resume states"
  ],
  "out_of_scope": [
    "new onboarding questions",
    "new auth providers",
    "analytics redesign"
  ],
  "constraints": [
    {
      "constraint_id": "RULE-14",
      "kind": "rule",
      "statement": "Builder may only modify files inside write_scope",
      "severity": "critical"
    }
  ],
  "patterns": [
    {
      "pattern_id": "PATTERN-09",
      "statement": "Persist wizard state after every successful step transition"
    }
  ],
  "anti_patterns": [
    {
      "anti_pattern_id": "AP-03",
      "statement": "Do not let the UI infer completion from local-only state"
    }
  ],
  "data_model": {
    "entities": ["OnboardingDraft", "OnboardingSession"],
    "invariants": [
      "draft belongs to one user",
      "resume token must resolve before state restore"
    ]
  },
  "api_contracts": [
    {
      "name": "save_onboarding_draft",
      "method": "POST",
      "path": "/api/onboarding/draft",
      "direction": "existing_or_modify"
    }
  ],
  "events": [
    {
      "name": "onboarding_draft_saved",
      "kind": "domain_event"
    }
  ],
  "db_touches": [
    {
      "entity": "onboarding_drafts",
      "action": "insert_or_update"
    }
  ],
  "component_boundaries": [
    {
      "component": "onboarding wizard",
      "allowed_touches": ["resume loader", "step persistence"]
    }
  ],
  "read_scope": [
    "apps/web/src/features/onboarding/**",
    "apps/api/src/onboarding/**"
  ],
  "write_scope": [
    "apps/web/src/features/onboarding/**",
    "apps/api/src/onboarding/**"
  ],
  "read_scope_amendments": [],
  "depends_on_bridge_ids": [],
  "predecessor_build_ids": [],
  "dependency_type": "hard",
  "acceptance_criteria": [
    {
      "criterion_id": "AC-1",
      "kind": "behavior",
      "statement": "A partially completed onboarding flow can be resumed",
      "verification_method": "test_case"
    },
    {
      "criterion_id": "AC-2",
      "kind": "state",
      "statement": "Draft state is stored after each successful step transition",
      "verification_method": "test_case"
    }
  ],
  "test_cases": [
    {
      "test_case_id": "TC-1",
      "kind": "integration",
      "command": "pnpm test onboarding-resume",
      "required": true,
      "expected_signal": "resume flow restores saved draft"
    }
  ],
  "confidence": 0.81,
  "confidence_breakdown": {
    "graph_coverage": 0.85,
    "pattern_strength": 0.80,
    "rule_consistency": 0.82,
    "evidence_level": 0.76
  },
  "artifact_refs": [],
  "status": "VALIDATED"
}
```

Bridge rules:

- bridge payload must be complete enough that the builder does not invent missing interfaces
- `write_scope` may never be widened by amendment
- bridge replacement creates a new bridge with `supersedes_artifact_id`
- builder receives bridge JSON, not the full graph by default

### 3.4 Build

`Build` is the runtime execution record for one bridge.

```json
{
  "build_id": "build_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "status": "RUNNING",
  "queued_at": "2026-03-21T14:33:00Z",
  "authorized_at": "2026-03-21T14:34:00Z",
  "started_at": "2026-03-21T14:35:00Z",
  "ended_at": null,
  "builder_session_id": "claude_builder_018",
  "authorization": {
    "authorized_by_role": "orchestrator",
    "bridge_status_at_authorization": "VALIDATED",
    "freshness_check_id": "fresh_20260321_001"
  },
  "execution": {
    "repo_root": "/workspace/app",
    "scope_guard_mode": "enforced",
    "network_access": "blocked",
    "changed_paths": []
  },
  "artifact_refs": []
}
```

Build rules:

- one build executes exactly one bridge
- restarting work creates a new build record
- a build cannot exist without a bridge reference

### 3.5 ValidatorRun

`ValidatorRun` is the typed output of one validator.

```json
{
  "validator_run_id": "val_20260321_001",
  "validator_id": "tests",
  "build_id": "build_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "validated_at": "2026-03-21T14:50:00Z",
  "status": "PASS_WITH_CONCERNS",
  "hard_fail": false,
  "evidence": [
    {
      "evidence_type": "test_run",
      "locator": "test_run_20260321_001",
      "summary": "Resume flow passes, empty-state regression still untested"
    }
  ],
  "violations": [],
  "missing": [
    {
      "kind": "coverage_gap",
      "statement": "No test proves expired resume token error state"
    }
  ],
  "concerns": [
    {
      "severity": "medium",
      "statement": "Resume error path lacks direct verification"
    }
  ],
  "confidence": 0.73,
  "artifact_refs": []
}
```

Validator rules:

- terminal validator states must always include evidence
- validators can recommend, but only orchestrator and write-back policy decide final truth updates
- validator evidence must be typed and replayable

### 3.6 FreshnessCheck

`FreshnessCheck` proves that a bridge is still aligned with graph truth before authorization.

```json
{
  "freshness_check_id": "fresh_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "checked_at": "2026-03-21T14:34:00Z",
  "graph_snapshot_id": "snapshot_20260321_001",
  "bridge_truth_hash": "sha256:abc123",
  "current_truth_hash": "sha256:abc123",
  "changed_nodes": [],
  "changed_edges": [],
  "status": "FRESH",
  "reason": "No critical graph changes detected"
}
```

### 3.7 ScopeExpansionRequest

`ScopeExpansionRequest` is the only sanctioned way to widen read scope.

```json
{
  "scope_expansion_request_id": "scope_req_20260321_001",
  "build_id": "build_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "requested_at": "2026-03-21T14:40:00Z",
  "requested_by_session_id": "claude_builder_018",
  "requested_paths": ["apps/web/src/shared/forms/**"],
  "justification": "Current bridge references a shared form resolver used by onboarding",
  "status": "PENDING"
}
```

### 3.8 ReadScopeAmendment

`ReadScopeAmendment` records approved read expansion.

```json
{
  "read_scope_amendment_id": "scope_amend_20260321_001",
  "scope_expansion_request_id": "scope_req_20260321_001",
  "bridge_id": "bridge_20260321_001",
  "approved_at": "2026-03-21T14:41:00Z",
  "approved_by_role": "orchestrator",
  "approved_paths": ["apps/web/src/shared/forms/**"],
  "expires_at": "2026-03-21T15:41:00Z",
  "status": "APPROVED"
}
```

Scope amendment rules:

- amendments may widen `read_scope` only
- amendments must be time-bounded
- amendments never change interface scope or `write_scope`

### 3.9 WriteBackRecord

`WriteBackRecord` is the only artifact allowed to update graph truth after validation.

```json
{
  "write_back_record_id": "wb_20260321_001",
  "source_build_id": "build_20260321_001",
  "source_bridge_id": "bridge_20260321_001",
  "feature_id": "feat_onboarding_resume",
  "decided_at": "2026-03-21T15:05:00Z",
  "validator_summary": {
    "passes": 2,
    "fails": 0,
    "concerns": 1
  },
  "decision": "WRITE_BACK",
  "target_status": "VERIFIED_RESTRICTED",
  "graph_updates_planned": [
    "add verified onboarding resume pattern",
    "record restricted validation note for error-state coverage gap"
  ],
  "graph_updates_applied": [],
  "blocked_reasons": [],
  "promotion_ready": false,
  "artifact_refs": []
}
```

Write-back rules:

- no graph write without a `WriteBackRecord`
- `PASS_WITH_CONCERNS` may not write back as `VERIFIED`
- promotion to `CANONICAL` must be a separate runtime decision

## 4. First Orchestrator Cycle

The first orchestrator loop should be explicit and deterministic.

1. `Request Intake`
   - create `Request`

2. `Truth Assembly`
   - query Neo4j
   - create `GraphSnapshot`

3. `Policy Evaluation`
   - run hard vetoes
   - compute confidence
   - stop if hard vetoes fail

4. `Bridge Compilation`
   - create `Bridge` in `DRAFT`

5. `Pre-Build Validation`
   - validate schema completeness
   - validate test mapping
   - validate dependency readiness
   - validate no critical boundary contradictions

6. `Freshness Check`
   - compare snapshot hash to current truth hash immediately before authorization
   - mark bridge `STALE` if critical truth changed

7. `Build Authorization`
   - create `Build` in `AUTHORIZED`
   - mark bridge `EXECUTING`

8. `Builder Execution`
   - builder moves build to `RUNNING`
   - scope guard enforces boundaries

9. `Post-Build Validation`
   - create `ValidatorRun` artifacts
   - aggregate validator outcomes

10. `Terminal Decision`
    - orchestrator sets build `PASSED` or `FAILED`
    - orchestrator sets bridge `EXECUTED` or leaves replacement path for supersession

11. `Write-Back`
    - create `WriteBackRecord`
    - update graph truth only if policy allows it

## 5. Non-Negotiable Runtime Invariants

These invariants should become deterministic code checks as early as possible.

1. A builder can never create or mutate bridge status directly.
2. A builder can never write outside `write_scope`.
3. A bridge can never move to `EXECUTING` without a successful freshness check.
4. A build can never be `PASSED` without at least one validator artifact.
5. A validator terminal state without evidence is invalid.
6. A `WriteBackRecord` is required for every graph mutation caused by a build.
7. `PASS_WITH_CONCERNS` can never produce `VERIFIED`.
8. A superseded bridge is never reopened.
9. A failed build is never resumed in place; a new build must be created.
10. The builder never receives unrestricted graph access by default.

## 6. First Code Layout

The first implementation should map one-to-one with runtime responsibilities.

```text
src/
  runtime/
    orchestrator/
      orchestrator-core.ts
      policy-engine.ts
      authority-checks.ts
    graph/
      neo4j-truth-adapter.ts
      graph-snapshot-service.ts
      freshness-checker.ts
    bridge/
      bridge-compiler.ts
      bridge-validator.ts
      bridge-types.ts
    artifacts/
      artifact-envelope.ts
      artifact-registry.ts
      artifact-events.ts
      evidence-store.ts
    execution/
      builder-adapter.ts
      scope-guard.ts
      scope-amendments.ts
    validators/
      validator-coordinator.ts
      validator-types.ts
    writeback/
      writeback-manager.ts
      promotion-policy.ts
```

This keeps the runtime close to the AES authority model:

- orchestrator decides
- graph provides truth
- bridge constrains execution
- builder executes
- validators judge
- write-back updates truth

## 7. What To Make Real First

From this document, the first concrete implementation targets should be:

1. artifact envelope and registry
2. `Bridge` schema and validator
3. `FreshnessCheck`
4. `Build` record and authority transitions
5. validator result schema
6. `WriteBackRecord`

If these are real, the rest of AES can grow without changing the operating contract.
