───────────────────────────────────────────────────────────────────────
D0. THE LOOP
───────────────────────────────────────────────────────────────────────

Every audit produces six categories of signal. The improvement loop
collects those signals, converts them into proposals, validates the
proposals through evidence and deliberation, applies them, and then
verifies the change improved outcomes on the next audit.

  AUDIT
    ↓
  CONTEXT ASSEMBLY (retrieve all project knowledge — D16)
    ↓
  DETECT STACK (identify project context — D0.5)
    ↓
  COLLECT (signals from the audit — D1)
    ↓
  REFLECT (identify patterns within project scope — D2)
    ↓
  PROPOSE (generate specific, testable changes — D3)
    ↓
  VALIDATE (evidence gate + deliberation — D4)
    ↓
  APPLY (implement the change — D5)
    ↓
  VERIFY (next audit confirms improvement — D7)
    ↓
  GENERALIZE (cross-project validation gate — D13)
    ↓
  AUDIT (loop restarts)

  BUILD PIPELINE:
    CONTEXT ASSEMBLY (D16)
      ↓
    CONSULT (graph-driven domain retrieval — D17.5)
      ↓
    CONSULTATION GATE (prove knowledge coverage — D18)
      ↓
    BUILD / CODEX CALL
      ↓
    AUTOCONTEXT QUALITY GATE (independent evaluation — D19.3)
      ↓
    VERIFY (D7)

  Protocol enforcement (D19) runs throughout both pipelines.
  Violations are written to the graph. CRITICAL violations halt.

Each stage has defined inputs, outputs, agents responsible, timeouts,
and failure modes. No stage is "agents discuss." Every stage produces
a concrete artifact stored in Neo4j, linked to its (:Project).

───────────────────────────────────────────────────────────────────────
D0.5. DETECT STACK — Project Context Resolution
───────────────────────────────────────────────────────────────────────

Purpose
Before any improvement logic runs, the system must know what it is
looking at. A "critical path" means something different in Next.js
(app/ routes, middleware.ts, layout.tsx) vs. FastAPI (main.py,
routers/, dependencies/) vs. a Go CLI (cmd/, internal/). Flow
definitions, severity heuristics, and even rule applicability depend
on the project’s stack. This stage resolves that context.

Trigger
Runs once per project, at first audit. Refreshed if the project’s
package manifest changes (new lockfile hash detected).

Detection Procedure

Agent: Claude (Orchestrator)
Input: Repository root file listing, package manifests, lockfiles,
       config files (tsconfig, pyproject, Cargo.toml, go.mod, etc.)
Timeout: 60 seconds

Steps:
1. Scan root for package manifests:
   - package.json → Node.js ecosystem
   - pyproject.toml / requirements.txt / Pipfile → Python ecosystem
   - go.mod → Go ecosystem
   - Cargo.toml → Rust ecosystem
   - Gemfile → Ruby ecosystem
   - pom.xml / build.gradle → JVM ecosystem
   - If none found → stack = "UNKNOWN", proceed with generic rules only

2. Detect framework from dependencies:
   - next, nuxt, remix, sveltekit → SSR web framework
   - react (without next) → SPA
   - fastapi, django, flask, express, gin, rails → backend framework
   - expo, react-native → mobile
   - No framework detected → library or CLI tool

3. Detect repo type from structure:
   - Multiple package.json / workspace config → monorepo
   - Single root package → single-repo
   - apps/ + packages/ pattern → monorepo (turborepo/nx style)

4. Detect package manager: npm, yarn, pnpm, bun, pip, poetry,
   cargo, go modules, bundler, maven, gradle

5. Detect auxiliary systems from dependencies and config files:
   - Auth: clerk, next-auth, better-auth, passport, devise, etc.
   - Database: prisma, drizzle, convex, supabase, sqlalchemy, etc.
   - Hosting: vercel.json, fly.toml, Dockerfile, railway.json, etc.

Output

  (:Project {
    id: "PROJ-{slug}",
    name: "opsuite",
    repo_url: "https://github.com/...",
    stack: "node",                    // node | python | go | rust | ruby | jvm | unknown
    framework: "next",                // next | expo | fastapi | django | express | etc.
    framework_version: "14.x",
    repo_type: "single",              // single | monorepo
    package_manager: "pnpm",
    auxiliary_systems: ["clerk", "convex", "better-auth"],
    lockfile_hash: "abc123...",       // triggers re-detection on change
    detected_at: "2026-03-19T...",
    last_refreshed: "2026-03-19T...",
  })

  (:Project)-[:AUDITED_BY]->(:Audit)

Stack-Aware Downstream Effects

The detected stack feeds directly into:
- D1 COLLECT: COVERAGE_BLIND_SPOT detection uses stack-specific
  critical-path templates (not a generic glob list)
- D3 PROPOSE: FLOW_DEFINITION and CRITICAL_PATH proposals reference
  stack-appropriate file patterns
- D5 APPLY: New flows and critical paths are validated against the
  project’s actual file structure
- D13 GENERALIZE: Cross-project generalization groups projects by
  stack before comparing patterns
- D16 CONTEXT ASSEMBLY: Stack context feeds into block B2, ensuring
  all downstream pipeline steps have framework-aware context

Stack Templates (initial set, expandable by the loop itself)

  next:     app/**/page.tsx, middleware.ts, layout.tsx, next.config.*
  expo:     app/**/index.tsx, app/_layout.tsx, app.json
  fastapi:  main.py, routers/*.py, dependencies.py, alembic/
  express:  server.*, routes/*.*, middleware/*.*
  django:   settings.py, urls.py, models.py, views.py
  rails:    config/routes.rb, app/models/*.rb, app/controllers/*.rb
  go:       cmd/**/main.go, internal/**/*.go, go.mod
  rust:     src/main.rs, src/lib.rs, Cargo.toml
  generic:  README.md, Dockerfile, .env.example, CI config files

These templates are the starting point for critical-path detection.
The improvement loop can propose additions via CRITICAL_PATH proposals.

───────────────────────────────────────────────────────────────────────
D1. COLLECT — Signal Extraction
───────────────────────────────────────────────────────────────────────

Purpose
After every audit completes, extract structured signals before the
system moves on. These signals are the raw material for improvement.

Trigger
Runs automatically after every audit report is generated, before
the report is delivered to the human.

Seven Signal Types

┌──────────────────────┬─────────────────────────────────────────────┐
│ Signal               │ Definition                                  │
├──────────────────────┼─────────────────────────────────────────────┤
│ MISSED_FINDING       │ A real bug or issue the audit did not flag  │
│                      │ but the human found post-audit, OR a flow   │
│                      │ verification failure the static review      │
│                      │ scored as passing.                          │
├──────────────────────┼─────────────────────────────────────────────┤
│ FALSE_POSITIVE       │ A finding the audit flagged that was        │
│                      │ dismissed by the human or by deliberation.  │
│                      │ Tracked from A6 dismissed findings.         │
├──────────────────────┼─────────────────────────────────────────────┤
│ SEVERITY_DISPUTE     │ A finding where the final severity differs  │
│                      │ from the original severity by 2+ levels, OR │
│                      │ a deliberation that went to 3 rounds.       │
├──────────────────────┼─────────────────────────────────────────────┤
│ TIMEOUT              │ Any MCP server timeout during the audit.    │
│                      │ Tracked from B1 timeout logs.               │
├──────────────────────┼─────────────────────────────────────────────┤
│ COVERAGE_BLIND_SPOT  │ A critical-path file that was not scored,   │
│                      │ OR a flow that was UNVERIFIED, OR a file    │
│                      │ category (e.g., middleware, providers) that  │
│                      │ has never been sampled in any audit.         │
├──────────────────────┼─────────────────────────────────────────────┤
│ SCORE_ANOMALY        │ A category score that moved ±2.0 between    │
│                      │ consecutive audits without a corresponding  │
│                      │ code change explaining the movement.        │
├──────────────────────┼─────────────────────────────────────────────┤
│ PROTOCOL_VIOLATION   │ The orchestrator bypassed a required gate   │
│                      │ (e.g., skipped deliberation for a HIGH      │
│                      │ finding override). See D14.3 for detection  │
│                      │ rules.                                     │
├──────────────────────┼─────────────────────────────────────────────┤
│ STRUCTURAL_GAP       │ A filesystem-level gap found by structural  │
│                      │ scan: empty test directory, undocumented    │
│                      │ scripts, missing README, orphan modules.    │
│                      │ Source: autocontext Phase 0 scan.           │
├──────────────────────┼─────────────────────────────────────────────┤
│ ARCHITECTURAL_       │ A dependency direction violation, circular  │
│ VIOLATION            │ import, or layer breach found by import     │
│                      │ graph analysis. Source: autocontext Phase 0 │
│                      │ scan or targeted audit.                     │
└──────────────────────┴─────────────────────────────────────────────┘

Collection Rules

1. MISSED_FINDING signals are NOT auto-generated. They require human
   input. After every audit, the report includes a prompt:

   "Were there any bugs, issues, or behaviors this audit missed?
    If yes, describe them. If no, confirm with 'none missed.'"

   The human's response is stored as-is. If the human provides a
   missed finding, the system creates a MISSED_FINDING signal with:
   - description: human's text
   - related_files: files the human mentions (or [] if none)
   - related_flows: flow numbers affected (or [] if none)
   - audit_id: the audit that missed it

2. FALSE_POSITIVE signals are auto-generated from:
   - A6 dismissed findings (status = 'dismissed')
   - Human overrides (human changes a finding's severity to NONE)

3. SEVERITY_DISPUTE signals are auto-generated from:
   - A6 deliberation outcomes where original_sev != final_sev by 2+
   - Deliberations that consumed all 3 rounds

4. TIMEOUT signals are auto-generated from B1 timeout logs.

5. COVERAGE_BLIND_SPOT signals are auto-generated from:
   - A13 critical-path files with no Codex score in this audit
   - A9 UNVERIFIED flows
   - B4 governance review blind spots (if governance ran)
   - Neo4j query: file categories never sampled across all audits
   - Autocontext Phase 0 scan: relevant patterns, modules, or state
     machines that exist in the codebase but were not surfaced

7. STRUCTURAL_GAP signals are auto-generated from autocontext Phase 0
   filesystem scan:
   - Empty test directories (0 test files)
   - Undocumented scripts or utility files
   - Missing README or config documentation
   - Orphan modules with no imports

8. ARCHITECTURAL_VIOLATION signals are auto-generated from autocontext
   Phase 0 import/export analysis:
   - Reverse dependencies (utils importing from UI components)
   - Circular imports
   - Layer breaches (data layer depending on presentation layer)

6. SCORE_ANOMALY signals are auto-generated by comparing the current
   audit's category scores to the previous audit. If any category
   moved ±2.0, check git diff for that audit range. If the diff does
   not touch files relevant to that category, emit the signal.

Output
Each signal is stored as a (:Signal) node in Neo4j:

  (:Signal {
    id: "SIG-{audit_number}-{seq}",
    type: "MISSED_FINDING" | "FALSE_POSITIVE" | "SEVERITY_DISPUTE"
          | "TIMEOUT" | "COVERAGE_BLIND_SPOT" | "SCORE_ANOMALY"
          | "PROTOCOL_VIOLATION",
    project_id: "PROJ-opsuite",  // scoped to project
    audit_id: "AUDIT-005",
    description: "...",
    raw_data: { ... },           // type-specific payload
    status: "new",               // new | reflected | proposed | applied | verified | stale
    created_at: "2026-03-19T...",
  })

  (:Project)-[:HAS_SIGNAL]->(:Signal)
  (:Audit)-[:PRODUCED_SIGNAL]->(:Signal)

Timeout
Collection runs inline after the audit. No separate timeout — it
inherits the audit pipeline's timeout. If collection itself fails,
the audit report is still delivered; signals are marked [COLLECTION_FAILED]
and the next audit re-collects.

───────────────────────────────────────────────────────────────────────
D2. REFLECT — Pattern Recognition
───────────────────────────────────────────────────────────────────────

Purpose
Individual signals are noise. Patterns across signals are knowledge.
REFLECT reads all unprocessed signals (status = 'new') within a
single project and groups them into patterns. Cross-project pattern
detection is handled separately in D13 (GENERALIZE).

Trigger
Runs after COLLECT, but only when there are ≥3 unprocessed signals.
If fewer than 3 signals exist, skip REFLECT and carry them forward
to the next audit's collection. Rationale: patterns require a minimum
sample size. Acting on 1 signal is reactive, not reflective.

Pattern Detection Rules

┌──────────────────────┬─────────────────────────────────────────────┐
│ Pattern              │ Detection Criteria                          │
├──────────────────────┼─────────────────────────────────────────────┤
│ RECURRING_MISS       │ ≥2 MISSED_FINDING signals with overlapping │
│                      │ related_files or related_flows across       │
│                      │ different audits.                           │
├──────────────────────┼─────────────────────────────────────────────┤
│ SYSTEMATIC_FP        │ ≥3 FALSE_POSITIVE signals triggered by the │
│                      │ same rule_violated across any audits.       │
├──────────────────────┼─────────────────────────────────────────────┤
│ CALIBRATION_DRIFT    │ ≥3 SEVERITY_DISPUTE signals in the same    │
│                      │ severity direction (all downgraded, or all  │
│                      │ upgraded) within the last 5 audits.         │
├──────────────────────┼─────────────────────────────────────────────┤
│ INFRA_INSTABILITY    │ ≥3 TIMEOUT signals for the same MCP server │
│                      │ across the last 5 audits.                   │
├──────────────────────┼─────────────────────────────────────────────┤
│ BLIND_SPOT_CLUSTER   │ ≥2 COVERAGE_BLIND_SPOT signals pointing at │
│                      │ the same file category or flow number.      │
├──────────────────────┼─────────────────────────────────────────────┤
│ SCORING_INSTABILITY  │ ≥2 SCORE_ANOMALY signals for the same      │
│                      │ category within the last 5 audits.          │
└──────────────────────┴─────────────────────────────────────────────┘

Reflection Procedure

Agent: Claude (Orchestrator)
Input: All (:Signal {status: 'new', project_id: current_project})
       nodes + last 5 audit summaries for this project
Timeout: 120 seconds

Steps:
1. Load all new signals for the current project from Neo4j
2. For each signal, query for related signals (same type, same files,
   same flows, same rules) from previous audits of this project
3. Apply pattern detection rules above
4. For each detected pattern, create a (:Pattern) node
5. Mark consumed signals as status = 'reflected'
6. If no patterns detected, mark signals as status = 'reflected'
   with note: "No pattern detected — carried as isolated signal"

Output

  (:Pattern {
    id: "PAT-{seq}",
    type: "RECURRING_MISS" | "SYSTEMATIC_FP" | "CALIBRATION_DRIFT"
          | "INFRA_INSTABILITY" | "BLIND_SPOT_CLUSTER"
          | "SCORING_INSTABILITY" | "SYSTEMATIC_BYPASS",
    project_id: "PROJ-opsuite",  // scoped to project
    description: "...",
    signal_count: 3,
    confidence: "HIGH" | "MEDIUM" | "LOW",
    scope: "PROJECT",            // PROJECT | GLOBAL (set to GLOBAL by D13)
    status: "detected",          // detected | proposed | applied | verified | rejected
    created_at: "2026-03-19T...",
  })

  (:Project)-[:HAS_PATTERN]->(:Pattern)
  (:Signal)-[:CONTRIBUTED_TO]->(:Pattern)
  (:Pattern)-[:DETECTED_IN]->(:Audit)   // the audit where reflection ran

Pattern Confidence
- HIGH: ≥5 signals, all same type, clear cluster
- MEDIUM: 3–4 signals, same type, plausible cluster
- LOW: 2 signals, possible coincidence

No-Pattern Handling
Signals without a pattern are not discarded. They age. If a signal
remains at status = 'reflected' for 10 consecutive audits without
contributing to a pattern, it is marked status = 'stale'. Stale
signals are excluded from future pattern detection but retained in
Neo4j for historical queries.

───────────────────────────────────────────────────────────────────────
D3. PROPOSE — Change Generation
───────────────────────────────────────────────────────────────────────

Purpose
Convert detected patterns into specific, testable changes to the
system. Every proposal modifies exactly one thing and includes a
success criterion.

Trigger
Runs immediately after REFLECT, for each (:Pattern {status: 'detected'})
with confidence ≥ MEDIUM.

LOW-confidence patterns are held. They become eligible if a new signal
arrives that raises the pattern's confidence.

Proposal Types

Every proposal targets exactly one of these system components:

┌────────────────────┬──────────────────────────────────────────────┐
│ Target             │ What it changes                              │
├────────────────────┼──────────────────────────────────────────────┤
│ RULE               │ Add, modify, or retire a rule in A17         │
├────────────────────┼──────────────────────────────────────────────┤
│ SEVERITY_THRESHOLD │ Adjust severity definitions in A4            │
├────────────────────┼──────────────────────────────────────────────┤
│ SCORING_WEIGHT     │ Adjust category weights in A10               │
├────────────────────┼──────────────────────────────────────────────┤
│ FLOW_DEFINITION    │ Add, modify, or remove a flow in A9          │
├────────────────────┼──────────────────────────────────────────────┤
│ CRITICAL_PATH      │ Add files/globs to the mandatory set in A13  │
├────────────────────┼──────────────────────────────────────────────┤
│ TIMEOUT_CONFIG     │ Adjust timeout values in B1                  │
├────────────────────┼──────────────────────────────────────────────┤
│ BATCH_CONFIG       │ Adjust batch sizes or priorities in B2       │
├────────────────────┼──────────────────────────────────────────────┤
│ CONFIDENCE_THRESH  │ Adjust escalation threshold in A14           │
├────────────────────┼──────────────────────────────────────────────┤
│ PROMPT_REFINEMENT  │ Modify the prompt sent to a reviewer to      │
│                    │ improve finding quality for a specific        │
│                    │ pattern type                                  │
├────────────────────┼──────────────────────────────────────────────┤
│ CONTEXT_CONFIG     │ Adjust context budgets, trim order, or       │
│                    │ pipeline profiles in D16. See D16.7.          │
├────────────────────┼──────────────────────────────────────────────┤
│ DOMAIN_WIRING     │ Add/modify REQUIRES_DOMAIN edges between     │
│                    │ FeatureType and FeatureDomain nodes. See D17. │
└────────────────────┴──────────────────────────────────────────────┘

Proposal Structure

  {
    "id": "PROP-{seq}",
    "pattern_id": "PAT-003",
    "target": "RULE",
    "action": "add",               // add | modify | retire | adjust
    "current_value": null,          // what exists now (null for add)
    "proposed_value": {             // what should replace it
      "id": "detect-dual-auth-providers",
      "description": "Flag when package.json contains dependencies for 2+ auth systems",
      "severity": "HIGH",
      "bucket": "immediate_risk",
      "state": "CANDIDATE"
    },
    "rationale": "Pattern PAT-003 (RECURRING_MISS): 3 audits missed the dual auth system in OpSuite. No rule exists to detect conflicting auth providers.",
    "success_criterion": "Next audit of a project with dual auth providers flags it as a finding",
    "rollback_criterion": "If the rule produces ≥3 FALSE_POSITIVE signals within 5 audits, retire it",
    "safety_tier": "STANDARD",      // see D6
    "created_at": "2026-03-19T..."
  }

Proposal Generation Rules

Agent: Claude (Orchestrator)
Input: (:Pattern {status: 'detected', confidence: >= MEDIUM})
Timeout: 90 seconds per proposal

1. For each eligible pattern, Claude generates 1 proposal.
   ONE pattern → ONE proposal. No compound proposals.
2. The proposal MUST include a success_criterion that is testable
   on the next audit. Vague criteria like "improve quality" are
   rejected at the VALIDATE stage.
3. The proposal MUST include a rollback_criterion that defines when
   the change should be undone.
4. The proposal MUST be assigned a safety_tier (see D6).
5. If the pattern type is INFRA_INSTABILITY, the proposal target
   is limited to TIMEOUT_CONFIG or BATCH_CONFIG.
6. If the pattern type is SYSTEMATIC_FP, the proposal MUST target
   the specific rule producing false positives (RULE retire or modify).

Output

  (:Proposal {
    id: "PROP-001",
    project_id: "PROJ-opsuite",  // scoped to project
    pattern_id: "PAT-003",
    target: "RULE",
    action: "add",
    current_value: "...",
    proposed_value: "...",
    rationale: "...",
    success_criterion: "...",
    rollback_criterion: "...",
    safety_tier: "STANDARD",
    scope: "PROJECT",            // PROJECT | GLOBAL (promoted by D13)
    status: "pending",          // pending | approved | rejected | applied | verified | rolled_back
    created_at: "2026-03-19T...",
  })

  (:Project)-[:HAS_PROPOSAL]->(:Proposal)
  (:Pattern)-[:GENERATED]->(:Proposal)

