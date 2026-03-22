D16. CONTEXT ASSEMBLY — Unified Retrieval Layer
───────────────────────────────────────────────────────────────────────

Purpose
Every pipeline in the AES — audit, build, and improvement loop —
starts by querying Neo4j for project context, rules, patterns,
flow knowledge, and history. Currently, each section defines its
own retrieval inline: D0.5 detects stack, D2 loads signals, D15.4
loads flow patterns, Step 0 loads Neo4j memory. No single layer
owns what gets retrieved, in what order, or what gets trimmed when
context exceeds the agent's working window.

D16 is that layer. It runs before the orchestrator receives its
first instruction for any pipeline. It assembles all relevant
knowledge into a structured context bundle, budget-trims it to fit
the available context window, and injects it as the system prompt
prefix. Without D16, each pipeline reinvents retrieval. With it,
context assembly is mechanical and auditable.

Design principle: the orchestrator should never start a task with
less knowledge than the system has available. If it does, that's a
retrieval failure, not an intelligence failure.

───────────────────────────────────────────────────────────
D16.1 TRIGGER AND SCOPE
───────────────────────────────────────────────────────────

Context assembly runs once at the start of each pipeline invocation:

  AUDIT PIPELINE:
    D16 (Context Assembly) → Step 0 (Neo4j storage init) → Step 1
    (Stack detection) → Step 2 (Codex reviews) → ...

  BUILD PIPELINE:
    D16 (Context Assembly) → Step 1 (Neo4j Memory Query) → Step 1.25
    (Flow Pattern Load) → Step 1.5 (Gemini Pre-Build) → ...

  IMPROVEMENT LOOP:
    D16 (Context Assembly) → D1 (COLLECT) → D2 (REFLECT) → ...

D16 does NOT replace Step 0, Step 1, or Step 1.25. Those steps
perform writes (storage init) or detection logic (stack detection).
D16 is read-only retrieval. It runs before them and feeds its
output into the orchestrator's system prompt.

Agent: Claude (Orchestrator) — D16 runs as a pre-step; the
orchestrator receives the assembled context, it does not build it.
Timeout: 30 seconds (all queries run in parallel).

───────────────────────────────────────────────────────────
D16.2 CONTEXT BLOCKS
───────────────────────────────────────────────────────────

The context bundle is composed of labeled blocks. Each block has:
- A human-readable header (for prompt clarity)
- A Neo4j query (or set of queries) that retrieves the data
- A priority tier that determines trim order under budget pressure
- A pipeline applicability flag (audit, build, improvement, or all)

┌────┬───────────────────────┬──────────┬───────────────────────────┐
│ #  │ Block                 │ Priority │ Pipelines                 │
├────┼───────────────────────┼──────────┼───────────────────────────┤
│ B1 │ Project Context       │ PROTECTED│ all                       │
│ B2 │ Stack & Dependencies  │ PROTECTED│ all                       │
│ B3 │ Active Rules          │ HIGH     │ audit, improvement        │
│ B4 │ Flow Patterns         │ HIGH     │ build, audit              │
│ B5 │ Flow Anti-Patterns    │ PROTECTED│ build, audit              │
│ B6 │ Pending Proposals     │ HIGH     │ improvement               │
│ B7 │ Unverified Apps       │ HIGH     │ improvement, audit        │
│ B8 │ Recent Signals        │ MEDIUM   │ improvement               │
│ B9 │ Detected Patterns     │ MEDIUM   │ improvement               │
│ B10│ Score Trajectory      │ MEDIUM   │ audit, improvement        │
│ B11│ Dead Ends             │ PROTECTED│ all                       │
│ B12│ Protocol Violations   │ HIGH     │ audit                     │
│ B13│ Global Proposals      │ LOW      │ improvement               │
│ B14│ Cross-Project Patterns│ LOW      │ improvement               │
│ B15│ Archetype Assignment  │ HIGH     │ build                     │
│ B16│ Prior Audit Summary   │ MEDIUM   │ audit                     │
│ B17│ Rollback History      │ LOW      │ improvement               │
│ B18│ Config Snapshot       │ LOW      │ audit, improvement        │
│ B19│ Structural Scan       │ PROTECTED│ all                       │
└────┴───────────────────────┴──────────┴───────────────────────────┘

Priority tiers:
  PROTECTED — never trimmed, regardless of budget pressure
  HIGH     — trimmed only after all MEDIUM and LOW blocks are gone
  MEDIUM   — trimmed before HIGH, after LOW
  LOW      — trimmed first when budget is exceeded

───────────────────────────────────────────────────────────
D16.3 QUERY CATALOG
───────────────────────────────────────────────────────────

All queries are parameterized by $project (the current project
name) and executed in parallel where possible.

B1 — Project Context
  MATCH (p:Project { name: $project })
  RETURN p.id, p.name, p.repo_url, p.stack, p.framework,
         p.framework_version, p.repo_type, p.package_manager,
         p.auxiliary_systems, p.detected_at, p.last_refreshed

B2 — Stack & Dependencies
  MATCH (p:Project { name: $project })
  RETURN p.stack, p.framework, p.framework_version,
         p.package_manager, p.auxiliary_systems
  // Also returns the stack template from D0.5 for this stack

B3 — Active Rules
  MATCH (r:Rule { state: 'ACTIVE' })
  OPTIONAL MATCH (r)-[:HAS_VERSION]->(rv:RuleVersion)
  RETURN r.id, r.description, r.severity, r.bucket,
         count(rv) AS version_count
  ORDER BY r.severity DESC, r.id

B4 — Flow Patterns (for project's archetype)
  MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a:AppArchetype)
  MATCH (fp:FlowPattern { active: true })-[:FOR_ARCHETYPE]->(a)
  MATCH (fp)-[:HAS_STAGE]->(fs:FlowStage)
  OPTIONAL MATCH (fs)-[:HAS_TRANSITION]->(ft:FlowTransition)
                 -[:TARGETS]->(target:FlowStage)
  RETURN fp.name, fp.description, fp.entryCondition, fp.exitCondition,
         fs.name AS stage, fs.order, fs.screenType,
         fs.requiredState, fs.producedState, fs.roleFilter,
         ft.trigger, ft.guard, target.name AS transitionsTo
  ORDER BY fp.priority, fs.order

B5 — Flow Anti-Patterns (for project's archetype)
  MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a:AppArchetype)
  MATCH (fa:FlowAntiPattern { active: true })-[:FOR_ARCHETYPE]->(a)
  RETURN fa.name, fa.description, fa.severity, fa.detection,
         fa.correctPattern, fa.timesDetected
  ORDER BY fa.severity DESC, fa.timesDetected DESC

B6 — Pending Proposals
  MATCH (proj:Project { name: $project })-[:HAS_PROPOSAL]->(p:Proposal)
  WHERE p.status IN ['pending', 'approved']
  RETURN p.id, p.target, p.action, p.proposed_value, p.rationale,
         p.success_criterion, p.safety_tier, p.status
  ORDER BY p.created_at DESC

B7 — Unverified Applications
  MATCH (proj:Project { name: $project })-[:HAS_APPLICATION]->(a:Application)
  WHERE a.verified = false
  RETURN a.id, a.proposal_id, a.target, a.action,
         a.applied_at, a.applied_by
  ORDER BY a.applied_at DESC

B8 — Recent Signals (last 5 audits)
  MATCH (proj:Project { name: $project })-[:AUDITED_BY]->(audit:Audit)
  WITH audit ORDER BY audit.date DESC LIMIT 5
  MATCH (audit)-[:PRODUCED_SIGNAL]->(s:Signal)
  WHERE s.status IN ['new', 'reflected']
  RETURN s.id, s.type, s.description, s.status, s.audit_id
  ORDER BY s.created_at DESC

B9 — Detected Patterns
  MATCH (proj:Project { name: $project })-[:HAS_PATTERN]->(pat:Pattern)
  WHERE pat.status IN ['detected', 'proposed']
  RETURN pat.id, pat.type, pat.description, pat.confidence,
         pat.signal_count, pat.status
  ORDER BY pat.confidence DESC, pat.signal_count DESC

B10 — Score Trajectory (last 10 audits)
  MATCH (proj:Project { name: $project })-[:AUDITED_BY]->(a:Audit)
  RETURN a.id, a.date, a.overall_score, a.pipeline_completeness,
         a.finding_count, a.flow_finding_count
  ORDER BY a.date DESC
  LIMIT 10

B11 — Dead Ends (rolled back proposals + rejected proposals)
  MATCH (proj:Project { name: $project })-[:HAS_PROPOSAL]->(p:Proposal)
  WHERE p.status IN ['rolled_back', 'rejected']
  OPTIONAL MATCH (p)-[:APPLIED_AS]->(a:Application)
                 -[:ROLLED_BACK_BY]->(rb:Rollback)
  RETURN p.id, p.target, p.action, p.rationale, p.status,
         rb.reason AS rollback_reason
  ORDER BY p.created_at DESC
  LIMIT 20

B12 — Protocol Violations (v11: uses ProtocolViolation nodes from D19)
  MATCH (proj:Project { name: $project })-[:HAS_PROTOCOL_VIOLATION]->(pv:ProtocolViolation)
  RETURN pv.id, pv.stage, pv.reason, pv.severity, pv.createdAt
  ORDER BY pv.createdAt DESC
  LIMIT 10
  // Fallback for pre-v11 data: also check Signal-based violations
  UNION
  MATCH (proj:Project { name: $project })-[:HAS_SIGNAL]->(s:Signal)
  WHERE s.type = 'PROTOCOL_VIOLATION'
  RETURN s.id AS id, 'audit' AS stage, s.description AS reason,
         'WARNING' AS severity, s.created_at AS createdAt
  ORDER BY s.created_at DESC
  LIMIT 10

B13 — Global Proposals (pending human approval)
  MATCH (gp:GlobalProposal)
  WHERE gp.status = 'pending_human'
  RETURN gp.id, gp.target, gp.scope, gp.stack_filter,
         gp.supporting_projects, gp.evidence_summary

B14 — Cross-Project Patterns
  MATCH (pat:Pattern)
  WITH pat.type AS pattern_type, collect(DISTINCT pat.project_id) AS projects
  WHERE size(projects) >= 2
  RETURN pattern_type, projects, size(projects) AS project_count

B15 — Archetype Assignment
  MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a:AppArchetype)
  RETURN a.name, a.description
  // If no result: Claude proposes assignment (per D15.4)

B16 — Prior Audit Summary (last audit for this project)
  MATCH (proj:Project { name: $project })-[:AUDITED_BY]->(a:Audit)
  WITH a ORDER BY a.date DESC LIMIT 1
  OPTIONAL MATCH (a)-[:PRODUCED_SIGNAL]->(s:Signal)
  OPTIONAL MATCH (a)-[:TRACED_FLOW]->(ff:FlowFinding)
  RETURN a.id, a.date, a.overall_score, a.pipeline_completeness,
         collect(DISTINCT s.type) AS signal_types,
         count(DISTINCT s) AS signal_count,
         collect(DISTINCT ff.result) AS flow_results

B17 — Rollback History (last 20 audits)
  MATCH (proj:Project { name: $project })-[:HAS_APPLICATION]->(a:Application)
        -[:ROLLED_BACK_BY]->(rb:Rollback)
  RETURN a.id, a.target, a.action, rb.reason,
         a.applied_at, rb.rolled_back_at
  ORDER BY rb.rolled_back_at DESC
  LIMIT 10

B18 — Config Snapshot (current scoring weights, severity thresholds)
  MATCH (cs:ConfigSnapshot)
  WHERE cs.type IN ['scoring_weights', 'severity_thresholds',
                     'timeout_config']
  RETURN cs.type, cs.values, cs.snapshot_at
  ORDER BY cs.snapshot_at DESC
  // Returns most recent snapshot per type

B19 — Structural Scan (autocontext filesystem baseline)
  Source: NOT a Neo4j query. This block is populated by running
  `npx -y autocontext status` and `npx -y autocontext show .`
  at the start of every pipeline, before Neo4j queries execute.

  Autocontext scans the filesystem structurally: directory inventory,
  export/import graph, test coverage presence, undocumented modules.
  It catches what keyword search cannot — empty directories, reverse
  dependencies, orphan modules, missing documentation.

  Output format (injected into context bundle):
    ── B19: Structural Scan (autocontext) ──
    Health: 14/14 fresh | 0 stale | 0 invalid
    Test coverage: tests/ — 0 files (CRITICAL)
    State machines: src/machines/ — 1 file
    Reverse deps: src/utils → src/components/tasks/TaskFilters (VIOLATION)
    Undocumented: scripts/ — 2 files, no context
    Component tree: 11 subdirectories under src/components/

  Signal extraction rules:
    - Empty tests/ directory → Signal type STRUCTURAL_GAP, severity CRITICAL
    - Reverse dependency detected → Signal type ARCHITECTURAL_VIOLATION, severity HIGH
    - Directory with 0 exports but >0 imports → Signal type COVERAGE_BLIND_SPOT, severity MEDIUM
    - Directory below token threshold with no manual context → Signal type STRUCTURAL_GAP, severity LOW

  Trigger: autocontext runs ONCE at pipeline start, before D16 Neo4j
  queries. Its output is injected as B19. If autocontext is unavailable
  (not installed, timeout), B19 is empty and a WARNING protocol
  violation is written (per D19.1 trigger table).

  Priority: PROTECTED. The orchestrator must always know the structural
  state of the codebase. This block is never trimmed.

───────────────────────────────────────────────────────────
D16.4 PIPELINE PROFILES
───────────────────────────────────────────────────────────

Not every pipeline needs every block. Retrieving all 18 blocks
for a build wastes tokens on improvement loop history. Retrieving
flow patterns for the improvement loop wastes tokens on build
context. Pipeline profiles define which blocks are retrieved.

AUDIT PROFILE
  Always: B1, B2, B3, B4, B5, B7, B10, B12, B16, B19
  If available: B11, B18
  Skip: B6, B8, B9, B13, B14, B15, B17

  Rationale: the audit pipeline needs project context, rules to
  check against, flow patterns to trace, protocol violation history
  to watch for, and the prior audit's results for comparison. It
  does not need improvement loop internals.

BUILD PROFILE
  Always: B1, B2, B4, B5, B12, B15, B19
  If available: B11, B16
  Skip: B3, B6, B7, B8, B9, B10, B13, B14, B17, B18

  Rationale: the build pipeline needs project context, flow
  patterns and anti-patterns as design constraints, the archetype
  assignment, protocol violation history (to detect repeated build
  violations — D19), and dead ends to avoid repeating mistakes.
  v11 addition: B12 (Protocol Violations) is now "Always" for builds
  because the consultation gate (D18) and build enforcement (D19)
  need visibility into prior violations. FailureCase history is
  loaded directly by the consultation gate query, not through D16.

IMPROVEMENT LOOP PROFILE
  Always: B1, B2, B6, B7, B8, B9, B10, B11, B19
  If available: B3, B13, B14, B17, B18
  Skip: B4, B5, B12, B15, B16

  Rationale: the improvement loop needs the full proposal and
  signal pipeline state — pending proposals, unverified
  applications, recent signals, detected patterns, score trends,
  and dead ends. Flow patterns and anti-patterns are build/audit
  concerns.

"If available" means: retrieve if the query returns results and
there is budget remaining after all "Always" blocks are assembled.
If budget is tight, "If available" blocks are the first to trim.

───────────────────────────────────────────────────────────
D16.5 CONTEXT BUDGET AND TRIM CASCADE
───────────────────────────────────────────────────────────

Problem
The sum of all context blocks can exceed the orchestrator's
effective working window. A project with 50 active rules, 30 flow
patterns, 100 signals, and 10 audits of history generates more
context than is useful. Injecting all of it degrades performance —
the orchestrator drowns in context instead of focusing on the task.

Budget
The context budget is defined per pipeline:

  AUDIT_CONTEXT_BUDGET   = 12000 tokens (estimated)
  BUILD_CONTEXT_BUDGET   = 8000 tokens
  IMPROVE_CONTEXT_BUDGET = 10000 tokens

These are conservative starting values. The improvement loop can
propose adjustments via a new proposal target (see D16.7).

Token Estimation
  tokens ≈ characters / 4
  This is a rough heuristic. Precision is not required — the goal
  is preventing overflow, not exact packing.

Trim Cascade
When the assembled context exceeds the budget, blocks are trimmed
in order from lowest priority to highest. Within a priority tier,
blocks are trimmed in reverse order of their block number (higher
numbers = more specialized = trimmed first).

  Trim order (first to last):
    LOW:       B18, B17, B14, B13
    MEDIUM:    B16, B10, B9, B8
    HIGH:      B15, B12, B7, B6, B4, B3
    PROTECTED: never trimmed (B1, B2, B5, B11, B19)

Trimming a block means:
  1. First pass: truncate the block to 50% of its current size,
     keeping the most recent entries (ORDER BY ... DESC ensures
     newest data is first). Append "[... truncated for context
     budget ...]"
  2. Second pass (if still over budget): remove the block entirely.
  3. If all non-PROTECTED blocks are removed and budget is still
     exceeded: the PROTECTED blocks are sent as-is. This should
     be rare — PROTECTED blocks (project context, stack, anti-
     patterns, dead ends) are small.

Invariant: PROTECTED blocks are never trimmed. The orchestrator
always knows the project's identity, stack, known anti-patterns,
dead ends, and structural codebase state regardless of budget
pressure.

───────────────────────────────────────────────────────────
D16.6 ASSEMBLY OUTPUT FORMAT
───────────────────────────────────────────────────────────

The assembled context is injected as a structured prefix in the
orchestrator's system prompt. Each block is labeled with a
human-readable header so the orchestrator (and any human reviewing
the prompt) can identify the source of each piece of context.

Format:

  ═══ CONTEXT ASSEMBLY ═══
  Pipeline: AUDIT | Budget: 12000 tokens | Used: 8842 tokens
  Blocks: 12/19 loaded | 2 trimmed | 5 skipped (profile)

  ── B1: Project Context ──
  Project: opsuite (PROJ-opsuite)
  Repo: https://github.com/...
  Stack: node | Framework: next 14.x | Type: single
  Package Manager: pnpm
  Auxiliary: clerk, convex, better-auth
  Last refreshed: 2026-03-19T...

  ── B2: Stack & Dependencies ──
  Stack template: app/**/page.tsx, middleware.ts, layout.tsx, next.config.*
  Auth system: clerk
  Database: convex
  Hosting: vercel.json

  ── B3: Active Rules (23 rules) ──
  | Rule ID | Description | Severity |
  |---------|-------------|----------|
  | detect-dual-auth | Flag 2+ auth systems in deps | HIGH |
  | ... | ... | ... |
  [... truncated for context budget ...]

  ── B5: Flow Anti-Patterns (4 patterns) ──
  | Anti-Pattern | Severity | Detection |
  |--------------|----------|----------|
  | post-signup-dumps-to-login | HIGH | Check if afterSignUpUrl... |
  | ... | ... | ... |

  ── B11: Dead Ends (7 entries) ──
  | Proposal | Target | Why It Failed |
  |----------|--------|---------------|
  | PROP-003 | RULE (add) | VERIFIED_FAIL: rule produced 4 FPs |
  | PROP-008 | SCORING_WEIGHT | REJECTED: contradicts weight floor |
  | ... | ... | ... |

  ── B19: Structural Scan (autocontext) ──
  Health: 14/14 fresh | 0 stale | 0 invalid
  Test coverage: tests/ — 0 files (CRITICAL)
  State machines: src/machines/ — 1 file
  Reverse deps: src/utils → src/components/tasks/TaskFilters (VIOLATION)
  Undocumented: scripts/ — 2 files, no context
  Component tree: 11 subdirectories under src/components/

  ═══ END CONTEXT ASSEMBLY ═══

The format is plain text with markdown tables. No JSON, no XML.
The orchestrator is an LLM — it reads text. Structured formats
add parsing overhead without benefit.

Metadata line: the "Blocks: 11/18 loaded | 2 trimmed | 5 skipped"
line lets the orchestrator (and humans) know if context was
incomplete. If blocks were trimmed, the orchestrator knows its
view is partial and can query Neo4j directly for details during
the pipeline if needed.

───────────────────────────────────────────────────────────
D16.7 SELF-IMPROVEMENT — Context Assembly as Proposal Target
───────────────────────────────────────────────────────────

The improvement loop can propose changes to context assembly
configuration. Add one new proposal target to the D3 table:

┌────────────────────┬──────────────────────────────────────────────┐
│ Target             │ What it changes                              │
├────────────────────┼──────────────────────────────────────────────┤
│ CONTEXT_CONFIG     │ Adjust context budget values, trim order,    │
│                    │ or pipeline profile (which blocks are        │
│                    │ "Always" vs "If available" for a pipeline)    │
└────────────────────┴──────────────────────────────────────────────┘

Safety tier: RESTRICTED (always requires human approval).
Rationale: context assembly affects what the orchestrator knows.
Changing it changes the system's effective intelligence. This is
not a safe auto-apply.

Cooldown: max 1 CONTEXT_CONFIG change per 10 audits.

Example proposal:
  Pattern: COVERAGE_BLIND_SPOT signals about flow patterns not
  being loaded during audits, because B4 was trimmed due to budget.
  Proposal: Increase AUDIT_CONTEXT_BUDGET from 12000 to 15000.
  Success criterion: B4 is no longer trimmed in audits of projects
  with >20 flow patterns.

───────────────────────────────────────────────────────────
D16.8 WHAT THIS PREVENTS
───────────────────────────────────────────────────────────

Applied to the three failure classes D16 addresses:

1. RETRIEVAL FAILURE: Orchestrator starts an audit without knowing
   about a relevant anti-pattern that was learned from a previous
   project.
   → D16 loads B5 (anti-patterns) as PROTECTED. The orchestrator
     always has anti-pattern context, regardless of budget.

2. CONTEXT OVERFLOW: A mature project has 200 signals, 50 rules,
   and 30 flow patterns. Injecting all of it overwhelms the
   orchestrator and degrades output quality.
   → D16 trim cascade removes low-priority blocks first, keeps
     PROTECTED blocks intact, and tells the orchestrator what
     was trimmed so it can query on-demand if needed.

3. INCONSISTENT RETRIEVAL: The audit pipeline loads rules but not
   dead ends. The build pipeline loads flow patterns but not anti-
   patterns. Each pipeline has gaps in what it retrieves.
   → D16 pipeline profiles define exactly which blocks each
     pipeline gets. Gaps are visible in the profile table, not
     hidden in scattered inline queries.
