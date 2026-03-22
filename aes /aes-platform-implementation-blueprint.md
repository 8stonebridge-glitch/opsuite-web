# AES Platform Implementation Blueprint

This document turns the locked AES operating spec into a full platform design.

It assumes:
- Neo4j is the graph truth layer
- Claude Code is the builder runtime
- validators are independent agents/tools
- artifacts are machine-readable JSON records
- the platform must be enforceable, replayable, and auditable
- the default execution path is `Graph -> Bridge -> Build`
- escalation mode exists, but execution docs are not a standing layer

## 1. Platform Shape

AES should be built as four cooperating planes:

1. Control plane
   - decides whether a build can happen
   - computes confidence
   - enforces hard vetoes
   - generates and validates bridges
   - owns state transitions

2. Data plane
   - stores graph truth, artifacts, evidence, and metrics
   - preserves replay and audit history

3. Execution plane
   - runs Claude builder sessions
   - enforces `read_scope` and `write_scope`
   - coordinates validators

4. Governance plane
   - handles human escalation
   - approves or blocks sensitive decisions
   - reviews write-back and conflicts

The platform should begin as one orchestrated runtime with adapters, but every major subsystem should be designed so it can later become a separate service without changing the operating contract.

## 2. Runtime Architecture

### 2.1 Core Components

| Component | Role | Trust level |
|---|---|---|
| `Request Intake API` | accepts feature/build requests, creates request records, normalizes metadata | trusted |
| `Orchestrator Core` | owns sequencing, policy application, state transitions, and authority checks | trusted |
| `Graph Query Service` | reads Neo4j truth for specs, rules, flows, patterns, anti-patterns, dependencies, and domain risk | trusted |
| `Graph Snapshot Service` | captures `graph_snapshot_id`, referenced node set, and `graph_truth_hash` for bridge freshness | trusted |
| `Hard Veto Engine` | evaluates stop conditions before confidence scoring | trusted |
| `Confidence Engine` | computes `GraphCoverage`, `PatternStrength`, `RuleConsistency`, `EvidenceLevel`, and final confidence | trusted |
| `Bridge Compiler` | converts graph truth into bridge JSON | trusted |
| `Bridge Validator` | validates bridge schema, freshness, test mapping, dependency readiness, and hard veto pass | independent trusted gate |
| `Dependency Resolver` | evaluates `depends_on_bridge_ids`, `predecessor_build_ids`, and dependency invalidation | trusted |
| `Claude Session Manager` | starts, tracks, and ends orchestrator and builder Claude sessions | trusted |
| `Scope Guard` | enforces `read_scope`, `write_scope`, interface limits, and approved amendments | trusted runtime gate |
| `Builder Adapter` | feeds bridge JSON into Claude Code and captures build outputs | untrusted execution boundary |
| `Validator Coordinator` | invokes validator agents/tools, aggregates outcomes, and classifies hard-domain failures | trusted |
| `Validator Adapters` | run file review, test execution, diff review, AST checks, security checks, and e2e checks | independent verification boundary |
| `Artifact Registry` | stores immutable JSON artifacts and status history | trusted |
| `Evidence Store` | stores large artifacts: diffs, logs, test outputs, screenshots, traces | trusted |
| `Write-Back Manager` | applies write-back policy and promotes knowledge into graph truth | trusted |
| `Research Gateway` | calls Perplexity/Gemini only when trigger rules require it | untrusted external boundary |
| `Governance Gateway` | routes human escalation for finance, security, compliance, permissions, and conflicting truths | human authority boundary |
| `Operator Console` | UI for replay, audit, queue inspection, bridge review, conflict review, and write-back approval | trusted operational interface |
| `Metrics/Telemetry Service` | tracks runtime metrics, build integrity, drift, completion honesty, and validator performance | trusted |

### 2.2 Trust Boundaries

1. Trusted policy boundary
   - Orchestrator, veto checks, confidence, bridge validation, dependency checks, freshness checks, state transitions

2. Trusted truth boundary
   - Neo4j graph truth
   - graph snapshots
   - canonical and verified write-back targets

3. Untrusted generation boundary
   - Claude builder session
   - any generated code
   - external research results

4. Independent verification boundary
   - validators must be separate from builder context
   - validators can fail the build

5. Human governance boundary
   - high-risk conflicts and approvals that AES cannot resolve alone

### 2.3 End-to-End Data Flow

1. Request enters `Request Intake API`
2. `Orchestrator Core` classifies feature and requests graph truth
3. `Graph Query Service` returns relevant truth and references
4. `Graph Snapshot Service` creates snapshot and truth hash
5. `Hard Veto Engine` evaluates stop conditions
6. `Confidence Engine` computes score if no veto triggered
7. `Bridge Compiler` creates bridge JSON
8. `Bridge Validator` validates the bridge
9. `Dependency Resolver` confirms hard dependencies are satisfied
10. `Orchestrator Core` authorizes build and starts builder session via `Claude Session Manager`
11. `Scope Guard` enforces read/write/interface boundaries during execution
12. Builder outputs code, tests, and runtime artifacts
13. `Validator Coordinator` triggers validators and gathers evidence
14. `Orchestrator Core` sets build/bridge terminal state based on validator results
15. `Write-Back Manager` writes approved learnings back to Neo4j and artifact store
16. `Metrics/Telemetry Service` records system outcomes

## 3. Artifact Model

Artifacts should be immutable JSON records plus linked evidence files.

### 3.1 Primary Runtime Artifacts

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

### 3.2 Required Fields

#### Request
- `request_id`
- `feature_id`
- `intent`
- `requested_by`
- `risk_domain_tags`
- `created_at`
- `status`

#### GraphSnapshot
- `graph_snapshot_id`
- `feature_id`
- `captured_at`
- `graph_truth_hash`
- `referenced_nodes`
- `referenced_edges`
- `critical_domain_nodes`
- `artifact_refs`

#### Bridge
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

#### Build
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

#### ValidatorRun
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

### 3.3 Storage Model

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

### 3.4 Indexing and Query Needs

Must support:
- lookup by `bridge_id`, `build_id`, `validator_run_id`, `feature_id`
- replay by `graph_snapshot_id` and `graph_truth_hash`
- list stale bridges caused by a graph change
- list failed builds by failure type
- list all artifacts tied to a validator concern
- find all `VERIFIED_RESTRICTED` learnings awaiting promotion
- show drift incidents by repo path or feature
- trace all evidence tied to a build

### 3.5 Traceability Design

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

## 4. Enforcement Hooks

### 4.1 Read Scope Enforcement
- every builder read goes through `Scope Guard`
- deny reads outside `read_scope` plus approved amendments
- log denied reads as boundary violations
- security/compliance/finance path expansion requires elevated approval

### 4.2 Write Scope Enforcement
- every write/edit goes through `Scope Guard`
- deny writes outside `write_scope`
- violation triggers immediate hard fail
- post-build diff confirms writes stayed in allowed scope

### 4.3 Interface Enforcement
- builder may not create API outside `api_contracts`
- may not emit events outside `events`
- may not mutate DB outside `db_touches`
- any undefined interface touch is a boundary failure

### 4.4 Bridge Freshness Checks
- run before authorization
- run again immediately before execution
- compare `graph_snapshot_id`, `graph_truth_hash`, and referenced critical nodes
- critical changes invalidate the bridge immediately
- non-critical changes require revalidation

### 4.5 Dependency Blocking
- hard dependencies must be `EXECUTED` and upstream builds `PASSED`
- soft dependency misses are allowed but flagged
- upstream stale/superseded hard dependency makes downstream bridge `STALE`

### 4.6 Validator Evidence Capture
- validator output is invalid without typed evidence
- evidence types:
  - `file_line`
  - `test_run`
  - `diff`
  - `runtime_observation`
- evidence is stored separately but linked through artifact refs

### 4.7 Completion Gating
- builder cannot self-certify
- builder may only signal candidate completion
- final completion requires post-build validation and orchestrator acceptance

### 4.8 Write-Back Gating
- `PASS` may write back as `VERIFIED`
- `PASS_WITH_CONCERNS` may write back only as `VERIFIED_RESTRICTED`
- `FAIL` cannot write back
- conflicting knowledge follows the locked conflict rules

## 5. State Machines

### 5.1 Bridge Lifecycle

States:
- `DRAFT`
- `VALIDATED`
- `REJECTED`
- `STALE`
- `SUPERSEDED`
- `EXECUTING`
- `EXECUTED`

Authority:
- Planner / Bridge Compiler: `DRAFT`
- Pre-Build Validator: `VALIDATED`, `REJECTED`
- Freshness Checker: `STALE`
- Orchestrator: `SUPERSEDED`, `EXECUTING`, `EXECUTED`

Invalid transitions:
- builder setting any bridge state
- `REJECTED -> EXECUTING`
- `STALE -> EXECUTING`
- `DRAFT -> EXECUTING`
- `EXECUTED -> DRAFT`

### 5.2 Build Lifecycle

States:
- `QUEUED`
- `AUTHORIZED`
- `RUNNING`
- `BLOCKED`
- `FAILED`
- `PASSED`

Authority:
- Orchestrator: `QUEUED`, `AUTHORIZED`, `BLOCKED`
- Builder runtime: `RUNNING`
- Post-build Validator Coordinator: `PASSED`, `FAILED`

Invalid transitions:
- builder setting `PASSED`
- validator setting `RUNNING`
- `QUEUED -> PASSED`
- `FAILED -> RUNNING` without a new build record

### 5.3 Validator Lifecycle

States:
- `QUEUED`
- `RUNNING`
- `PASS`
- `PASS_WITH_CONCERNS`
- `FAIL`

Authority:
- Validator Coordinator: `QUEUED`
- Validator Runner: `RUNNING`, terminal recommendation
- Orchestrator: may supersede a validator run by triggering a new run, not mutating the old one

Invalid transitions:
- builder mutating validator state
- terminal run being reopened in place
- validator returning terminal result without evidence

## 6. Governance and Human Review

Human or elevated review is required for:
- security model decisions
- permissions model changes
- compliance logic
- financial logic
- contradictory high-confidence truths
- read scope expansion into protected code domains
- conflicts with existing `CANONICAL` graph truth

The `Governance Gateway` should support:
- pending decision queue
- artifact replay for decision context
- explicit approve/reject/defer output
- full decision audit trail

## 7. Claude Code Runtime Design

AES can be tested and run inside Claude Code, but role separation still matters.

### 7.1 Session Roles

1. Orchestrator session
   - broad graph access
   - artifact registry access
   - validator and research API access
   - no direct builder authority beyond session spawn and state control

2. Builder session
   - receives one bridge
   - scoped repo reads/writes only
   - no broad graph exploration
   - no external research access
   - no completion authority

3. Validator sessions/tools
   - independent of builder context
   - read code, artifacts, and test outputs
   - may fail the build

### 7.2 Claude Code Adapters Needed

- `neo4j_adapter`
- `artifact_store_adapter`
- `bridge_validator_adapter`
- `builder_session_adapter`
- `validator_adapter`
- `scope_guard_wrapper`
- `freshness_checker`
- `writeback_adapter`

## 8. Deployment Path

### 8.1 What Must Be Real from Day One
- Neo4j truth queries
- graph snapshots and freshness hashes
- immutable bridge artifacts
- immutable validator artifacts
- hard veto checks
- pre-build validation
- post-build validation
- read/write scope enforcement
- orchestrator-owned state transitions
- write-back gating

### 8.2 What Can Be Mocked Initially
- research adapter
- full operator console UI
- multi-validator council beyond 1-2 validators
- AST-level semantic diff, if path diff plus evidence capture is enough for first pass
- automated promotion from `VERIFIED_RESTRICTED` to `VERIFIED`

### 8.3 Suggested Build Order

1. Artifact registry and evidence store
2. Neo4j query and graph snapshot services
3. hard veto engine and confidence engine
4. bridge compiler and bridge validator
5. orchestrator core and state machines
6. Claude builder session manager and scope guard
7. validator coordinator and validator adapters
8. write-back manager
9. governance gateway
10. operator console
11. research gateway

## 9. MVP vs Full Platform

### MVP
- one orchestrator runtime
- one builder session
- one or two validators
- file-based or database-backed artifact registry
- full enforcement on scope, freshness, and completion

### Full Platform
- multi-bridge scheduling
- dependency propagation
- operator console
- governance review workflows
- full telemetry and dashboards
- replay tooling
- promotion workflows for graph learning
- external research integration

## 10. Final Platform Definition

AES is a governed execution platform where:
- Neo4j provides truth
- the orchestrator compiles truth into bridges
- builders execute only within those bridges
- validators independently verify reality
- artifacts make every decision replayable
- governance handles unresolved risk
- validated outcomes enrich future truth

The result is not an AI coding assistant. It is a controlled software execution platform that uses AI as one runtime component inside a stricter system.
