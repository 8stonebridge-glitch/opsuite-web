# AES Runtime Quick Reference

This file is the short, low-context entrypoint for Claude sessions working in this repository.
Read this first.
Then read only the relevant focused doc in `docs/`.
Read `aes-platform-implementation-blueprint.md` only if the focused docs are insufficient.

## 1. What AES Is

AES is a constrained execution runtime for AI software building.

Default path:

`Graph -> Bridge -> Build`

Core idea:

- Neo4j holds truth
- the orchestrator compiles truth into a bridge
- a restricted builder executes only that bridge
- independent validators verify the result
- validated outcomes write back into truth under strict rules

AES is not:

- a loose prompting strategy
- a builder-first coding workflow
- a system where the builder invents scope or certifies itself

## 2. Runtime Roles

### Orchestrator

Owns:

- graph access
- hard veto evaluation
- freshness checks
- confidence computation
- bridge generation
- dependency checks
- build authorization
- validator coordination
- terminal bridge/build state updates

### Builder

Owns:

- executing one bridge
- reading only approved files
- writing only approved files
- implementing only approved interfaces and touches

Builder cannot:

- self-certify completion
- widen scope unilaterally
- override hard vetoes
- improvise outside bridge boundaries

### Validators

Own:

- independent pass/fail judgment
- evidence-backed review
- boundary, correctness, test, and runtime checks

Validators must be separate from the builder context.

## 3. Hard Safety Model

Build may proceed only if:

1. no hard veto triggered
2. bridge is fresh
3. dependencies are satisfied
4. confidence meets threshold
5. bridge is validated

Hard vetoes always win over confidence.

Examples of hard vetoes:

- critical rule contradiction
- missing critical test mapping
- critical graph truth change after bridge generation
- invalid bridge boundary
- unresolved validator hard fail

## 4. Confidence Model

Confidence is computed, not guessed.

Final score:

- `0.35 * GraphCoverage`
- `0.25 * PatternStrength`
- `0.20 * RuleConsistency`
- `0.20 * EvidenceLevel`

Thresholds:

- `>= 0.75` direct bridge to build
- `0.60 - 0.74` bridge to build with caution
- `0.40 - 0.59` research required before build
- `< 0.40` unsafe, escalate or stop

Confidence is a routing signal, not a safety override.

## 5. Bridge Contract

The bridge is the only builder input.

Required categories:

- identity and traceability
- intent and scope
- constraints, patterns, anti-patterns
- data model
- interfaces:
  - `api_contracts`
  - `events`
  - `db_touches`
  - `component_boundaries`
- `read_scope`
- `write_scope`
- typed `acceptance_criteria`
- typed `test_cases`
- confidence and confidence breakdown
- artifact references
- status

Bridge states:

- `DRAFT`
- `VALIDATED`
- `REJECTED`
- `STALE`
- `SUPERSEDED`
- `EXECUTING`
- `EXECUTED`

## 6. Scope Enforcement

Builder access is restricted.

### Read scope

Builder may read only:

- `read_scope`
- approved `read_scope_amendments`

Builder may not self-expand read scope.

### Write scope

Builder may write only:

- `write_scope`

Write outside `write_scope` is an immediate hard fail.

### Interface scope

Builder may not:

- create APIs outside `api_contracts`
- emit events outside `events`
- mutate DB outside `db_touches`

## 7. Validation Contract

Validators return:

- `PASS`
- `PASS_WITH_CONCERNS`
- `FAIL`

Every validator result must include typed evidence.

Allowed evidence types:

- `file_line`
- `test_run`
- `diff`
- `runtime_observation`

Majority rule:

- `2 FAIL` => hard fail
- `2 PASS, 1 FAIL` => pass with concerns
- all disagree => escalate

`PASS_WITH_CONCERNS` is not equal to `PASS`.

## 8. Write-Back Policy

Statuses:

- `PROVISIONAL`
- `VERIFIED_RESTRICTED`
- `VERIFIED`
- `CANONICAL`

Rules:

- `PASS` may write back as `VERIFIED`
- `PASS_WITH_CONCERNS` may write back only as `VERIFIED_RESTRICTED`
- `FAIL` does not write back

Promotion to `CANONICAL` requires:

- successful use in 3 or more distinct builds
- validation success each time
- no conflicting rule violations
- at least one meaningful variation in context

## 9. Traceability

Every bridge and validator run must be replayable.

Use structured references, not raw IDs:

- `artifact_type`
- `artifact_id`
- `role`

Minimum roles:

- `constraint_source`
- `pattern_source`
- `anti_pattern_source`
- `dependency_source`
- `validation_evidence`
- `external_grounding`
- `evidence_source`

## 10. Authority Model

### Bridge authority

- Planner / compiler: `DRAFT`
- Pre-build validator: `VALIDATED`, `REJECTED`
- Freshness checker: `STALE`
- Orchestrator: `SUPERSEDED`, `EXECUTING`, `EXECUTED`

### Build authority

- Orchestrator: `QUEUED`, `AUTHORIZED`, `BLOCKED`
- Builder runtime: `RUNNING`
- Post-build validator coordinator: `PASSED`, `FAILED`

Builder may never mark a build `PASSED`.

## 11. When Working In This Repo

Use the focused docs first:

- architecture work -> `docs/runtime-architecture.md`
- concrete first-runtime shapes -> `docs/runtime-primitives.md`
- schema/storage work -> `docs/artifact-model.md`
- runtime controls -> `docs/enforcement-hooks.md`
- orchestration and state logic -> `docs/state-machines.md`
- Claude role/runtime work -> `docs/claude-code-runtime.md`
- governance/escalation work -> `docs/governance.md`
- sequencing -> `docs/deployment-path.md`

If a task only needs one focused doc, do not load the full blueprint.

## 12. Current Best Implementation Direction

Build the platform first as:

- one orchestrator runtime
- deterministic policy functions
- Neo4j adapter
- artifact/evidence storage
- Claude builder adapter
- independent validator adapters
- runtime scope guards

This proves the AES control loop before splitting the platform into more services.
