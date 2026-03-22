# CLAUDE.md

You are Claude Code working inside the AES repository.
These are repository-level operating instructions for you.

## 1. Project Operating Principle

Work inside the real repo. Do not create a standalone demo, mock UI, or parallel workflow.

AES is a real constrained execution system. Build against the live codebase, live graph/runtime contract, and existing operator workflow. Prefer grounded integration over speculative redesign.

Treat AES as a graph-first product build system:
- user intent comes first
- research informs planning
- typed plans are verified before execution
- only approved graph truth drives builds

When the user describes a new product, do not require them to manually provide a feature list if the system can derive it. The system should infer the feature breakdown internally, verify it, promote it, and execute from approved graph truth.

For the first live system test, treat "build or upgrade the operator interface layer so the user can execute the supervised AES workflow from the UI" as a real integration task. Correctness and operability matter more than visual polish.

## 2. Source-of-Truth Precedence

Use this source-of-truth order:

1. this file
2. `aes-runtime-quick-reference.md`
3. the relevant focused docs in `docs/`
4. the live implementation in `src/artifact-registry/src/**`
5. the operator usage docs in `src/artifact-registry/README.md`, `QUICKSTART.md`, and `CLAUDE_BYPASS_QUICKSTART.md`

Treat the live codebase, graph/runtime contract, and execution docs as the source of truth.

If docs and implementation differ, inspect both, explain the discrepancy, and follow the path that matches the real runtime behavior. Do not invent a third model.

## 3. Build Behavior Rules

- Preserve packet/build/test/validator lineage.
- Surface validator failures, blocked states, and abort states clearly.
- Keep append-only and audit-oriented behavior intact.
- Reuse the existing AES workflow instead of creating a new one.
- Prefer existing runtime and operator hooks over new parallel abstractions.
- Do not bypass AES just because a task looks small. Targeted fixes still require a scoped AES path when they change behavior, permissions, data flow, integrations, or user experience.
- Before implementing, inspect the relevant entrypoints, identify exact files to change, and explain why.
- After implementing, report changed files, acceptance criteria, linked tests, validator expectations, and known limitations.

For targeted or narrow fixes:
- use a lightweight AES path rather than skipping the system
- keep user intent as the anchor
- do a focused research or graph check for the specific domain being changed
- consult the relevant donor, graph, runtime, or policy context that applies
- generate a small scoped task contract or bridge before implementation
- run the narrowest relevant checks after implementation
- record the result as part of AES lineage

Mandatory execution protocol for any behavioral change:
1. identify the affected domain
2. check the relevant AES context for that domain
3. state whether discovered evidence matches or conflicts with user intent
4. define the exact scoped steps that will be taken
5. implement the change
6. run the narrowest relevant verification
7. report what was consulted, what changed, and what was verified

Before starting implementation, Claude must first output:
- the required steps
- the exact steps it is about to take
- which AES context or evidence it will consult first

Claude must not start implementation before that outline is given.

After each step completes, Claude must explicitly report:
- which step is complete
- what was learned or confirmed
- which step it is moving to next

If a step cannot be completed, Claude must stop, state the blocker, and not silently skip ahead.

Required output shape for the protocol:

Step 1 — Identify Domain
- Status: COMPLETE or IN PROGRESS
- In scope
- Out of scope
- Why this scope is correct
- Next step

Step 2 — Consult AES Context
- Status: COMPLETE or IN PROGRESS
- Exact files, graph queries, docs, donor assets, or research inputs to consult
- Exact findings taken from each source
- No claims like "already loaded" without stating what was actually found
- For audits and greenfield planning, sources must be consulted in this order:
  1. external research
  2. AES graph, runtime, donor, and policy context
  3. live codebase evidence
- External research must not be deferred to the end or treated as optional background if it is relevant to the task
- If the task affects frontend behavior, external research must cover the relevant UI surface:
  - layout patterns
  - navigation and interaction patterns
  - user flows
  - loading, empty, success, error, retry, blocked, and permission states
  - form and input patterns
  - responsive behavior
  - accessibility expectations
  - visual hierarchy and status signaling
- If the task affects backend behavior, external research must cover the relevant system surface:
  - API and contract patterns
  - auth and permission expectations
  - data ownership and persistence rules
  - event, notification, and side-effect patterns
  - queueing, retries, and async behavior when relevant
  - security, compliance, and failure-mode expectations
- If the task affects both frontend and backend behavior, both surfaces must be researched before continuing
- Next step

Step 3 — Match / Conflict Check
- Status: COMPLETE or IN PROGRESS
- Evidence table or equivalent summary showing:
  - source
  - finding
  - matches user intent: yes or no
  - if conflict exists, which side wins and why
- Next step

Step 4 — Scoped Contract
- Status: COMPLETE or IN PROGRESS
- Exact files to change
- Exact behavior to add, remove, or modify
- Exact checks to run
- Next step

Step 5 — Implement
- Status: COMPLETE or IN PROGRESS

Step 6 — Verify
- Status: COMPLETE or IN PROGRESS

Step 7 — Report
- Status: COMPLETE or IN PROGRESS

Hard gate:
- For behavioral changes, no file edits may begin until Steps 1 through 4 are complete.

Claude must not skip this protocol by calling the task:
- small
- straightforward
- obvious
- a simple fix
- not worth full AES overhead

Only truly trivial non-behavioral work may skip this reduced path:
- copy edits
- formatting-only changes
- purely mechanical renames or refactors that do not change behavior

If the task is app-level rather than feature-level:
- treat the whole app as the planning target
- derive the internal feature breakdown automatically when possible
- keep the feature list internal unless the user asks to see it
- execute as dependency-ordered feature builds under AES supervision
- do not require a fresh user prompt for every feature unless the system is blocked

Relevant entrypoints for operator work usually include:

- `src/artifact-registry/src/ui/operator-http-server.ts`
- `src/artifact-registry/src/runtime/platform-runtime.ts`
- `src/artifact-registry/src/cli/aes-platform.ts`
- `src/artifact-registry/src/bootstrap/runtime-bootstrap.ts`
- `src/artifact-registry/src/bootstrap/builder-launch.ts`
- `src/artifact-registry/tests/runtime-ui.test.ts`

Treat the operator HTTP server as part of the target subsystem for operator-interface tasks, not as an external detail.

## 4. Scope-Control Rules

- Keep changes tightly scoped to the requested subsystem unless a minimal integration change is required.
- Prefer the smallest viable write set.
- Do not broaden runtime authority, graph access, or builder scope casually.
- Do not weaken validator independence, freshness checks, or status transitions.
- Minimize changes outside the target operator/interface path.
- If a cross-cutting change is required, make it explicit and keep it narrow.

## 5. Graph And Donor-Guidance Boundary

- Do not treat donor-derived evidence as canonical truth by default.
- Raw donor notes and markdown under `library componets /donor/` are evidence and guidance, not execution truth on their own.
- Execution should use promoted graph assets and the repo's runtime resolution path.
- Prefer the seeded and promoted donor/runtime path already implemented in:
  - `src/artifact-registry/src/bootstrap/donor-asset-seed.ts`
  - `src/artifact-registry/src/bridge/donor-resolution.ts`
  - `src/artifact-registry/seeds/neo4j/live-runtime.cypher`
- Use the existing feature binding model rather than inventing new graph classes unless the task explicitly requires it.

Keep the graph layered:
- evidence layer: outside research, donor notes, raw findings
- derived layer: extracted patterns, scenarios, presets, candidate specs
- execution layer: buildable candidate packages
- canonical layer: promoted graph truth

The builder must obey only promoted truth, not raw evidence.

## 6. Planning And Promotion Model

When the user gives product intent instead of a manual feature list, use this model:

1. gather outside evidence if needed
2. decompose into internal typed product structure
3. verify completeness and dependency logic
4. apply promotion gates
5. write only approved truth into the graph
6. execute from the promoted graph

Preferred role split:
- external research system: market and product evidence
- Claude: structured decomposition into `AppSpec` and `FeatureSpec` candidates
- independent reviewer: completeness and dependency verification
- promotion authority: gate and veto evaluation
- AES graph: canonical truth store
- orchestrator: execution engine

Do not ask the user to hand-author the internal feature list unless needed. Generate the plan internally and surface it only when helpful or required.

Promotion should approve a typed package, not prose. Each feature package should be concrete enough for orchestration and implementation.

## 7. Promotion Gates And Vetoes

A package should promote only if all of these pass:
- Coverage gate
- Dependency gate
- Flow gate
- Buildability gate
- Contradiction gate
- confidence threshold
- no critical missing questions

Hard vetoes should block promotion immediately:
- auth ambiguity
- permission ambiguity
- missing data ownership
- undefined destructive behavior
- unresolved dependency conflict
- incomplete acceptance tests for critical flows

No model should be able to argue its way through a weak spec. Promotion is earned by passing gates, not by sounding persuasive.

## 8. Orchestration Expectations

The orchestrator should understand the whole system but execute in controlled build units.

Execution rules:
- the user can describe the product once
- the system may generate many internal feature builds
- prerequisites must complete before downstream hard dependencies
- independent features may run in parallel only when ownership and dependencies are clear
- the system should continue feature-to-feature automatically unless blocked, failed, escalated, or awaiting required evidence

Whole-system requests should become dependency-ordered supervised build flows, not one giant unconstrained build.

## 9. Operator-Interface Expectations

The operator interface is a real control surface for AES, not a mock dashboard.

When working on the operator interface:

- drive the existing supervised workflow from the UI
- use the real runtime and HTTP routes
- treat the operator HTTP server as a first-class implementation surface
- preserve live state and lineage
- show build status, errors, blocked states, validator results, and abort state clearly
- prefer operable controls over ornamental UI changes

For the first live test, the interface should support:

- prepare build
- run builder
- abort builder
- record diff
- record test run
- run validators
- show current build status and failure or abort feedback

As the product-planning loop matures, the operator surface should also become capable of:
- submitting app-level intent
- showing derived feature plans
- showing promotion state
- showing dependency order
- showing automatic build progression across features

Do not build a fake frontend path that bypasses the real AES runtime.

## 10. Output Expectations After A Task

When you finish a task, report:

- what changed
- exact files changed
- acceptance criteria addressed
- linked tests run or not run
- validator expectations
- known limitations or follow-up gaps

If you used live feature lanes, name them directly when relevant:

- `FEAT-AES-REAL-001` backend/operator
- `FEAT-AES-REAL-006` frontend shell
- `FEAT-AES-REAL-007` notifications
- `FEAT-AES-REAL-008` onboarding
- `FEAT-AES-REAL-009` workflow

If the task affects planning, promotion, or orchestration, also report:
- what input shape now exists
- what is automatic vs still manual
- what blocks the system from full end-to-end automation

## First Live Test Focus

Treat the first operator-interface task as a real system test:

- build or upgrade AES's own operator interface layer
- let the user execute the supervised AES workflow from the UI
- use the repo's actual runtime, graph, and execution flow
- prefer minimal, honest, working integration over redesign

Core reminders:

- Work inside the real repo. Do not create a standalone demo, mock UI, or parallel workflow.
- Treat the live codebase, graph/runtime contract, and execution docs as the source of truth.
- Prefer grounded integration over speculative redesign.
- Preserve packet/build/test/validator lineage.
- Surface validator failures, blocked states, and abort states clearly.
- Do not treat donor-derived evidence as canonical truth by default.
- Keep changes tightly scoped to the requested subsystem unless a minimal integration change is required.
- Before implementing, inspect the relevant entrypoints, identify exact files to change, and explain why.
- After implementing, report changed files, acceptance criteria, linked tests, validator expectations, and known limitations.
