───────────────────────────────────────────────────────────────────────
D15. UX FLOW KNOWLEDGE — Graph Integration
───────────────────────────────────────────────────────────────────────

Purpose
Claude builds screens in isolation. It doesn't know where users
land after sign-up, what the correct post-auth redirect is per role,
which screen comes after which, what onboarding steps exist between
registration and the core loop, or standard navigation patterns for
different app archetypes.

D14.7 (Step 3.5) audits existing flows forensically — it traces
what the code does. D15 is prescriptive — it tells Claude what
the code SHOULD do when building. The graph needs flow knowledge
that informs builds, not just flow tracing that catches bugs.

───────────────────────────────────────────────────────────
D15.1 GRAPH SCHEMA — New Node Types
───────────────────────────────────────────────────────────

(:AppArchetype {
  name: STRING UNIQUE,       // "SaaS-RoleBased", "MobileFieldApp",
                             // "Marketplace", "B2B-Approval", "CLI-Tool"
  description: STRING,
  active: BOOLEAN,
})
  Purpose: Classifier for projects. When Claude starts a build, it
  queries the project's archetype and loads all matching FlowPatterns.

(:FlowPattern {
  id: STRING UNIQUE,         // "role-based-post-auth-redirect"
  name: STRING,
  archetype: STRING,         // matches AppArchetype.name
  description: STRING,
  entryCondition: STRING,    // "user.isAuthenticated && !user.hasCompletedOnboarding"
  exitCondition: STRING,     // "user.isOnDashboard"
  priority: INTEGER,         // ordering when multiple patterns match
  state: STRING,             // CANDIDATE | ACTIVE | RETIRED
  source: STRING,            // "research" | "audit-derived" | "manual"
  confidence: STRING,        // HIGH | MEDIUM | LOW
  validatedAt: DATETIME,
  timesUsed: INTEGER,        // incremented via Build→USED_FLOW
  lastUsedAt: DATETIME,
  active: BOOLEAN,
})
  Purpose: Prescriptive flow definition. A state machine template
  that Claude follows when building screens for a matching archetype.
  entryCondition/exitCondition define the flow's boundary.

  Lifecycle: CANDIDATE → ACTIVE → RETIRED (same as Rules in A17).
  A FlowPattern starts as CANDIDATE when first ingested from
  research or derived from an audit. It becomes ACTIVE after being
  used successfully in 2 builds without triggering a flow-related
  finding. It is RETIRED if it produces ≥3 FlowAntiPattern matches.

(:FlowStage {
  id: STRING UNIQUE,
  name: STRING,              // "post-signup-redirect"
  order: INTEGER,            // position in the flow sequence
  screenType: STRING,        // "landing" | "auth" | "onboarding" |
                             // "dashboard" | "feature" | "settings" | "error"
  requiredState: JSON,       // what must be true to reach this stage
                             // e.g., { isAuthenticated: true, hasProfile: false }
  producedState: JSON,       // what becomes true after this stage
                             // e.g., { hasProfile: true }
  roleFilter: STRING | NULL, // null = all roles, or "admin" / "employee" / etc.
  fallbackScreen: STRING | NULL,  // where to go if requiredState isn't met
  isTerminal: BOOLEAN,       // true if this is a valid end state
  isEntryPoint: BOOLEAN,     // true if this is a valid start state
})
  Purpose: One stage in a flow's state machine. requiredState and
  producedState make it traceable — Claude can verify: "After
  sign-up, user has { isAuthenticated: true, hasProfile: false }.
  The only valid next stage is onboarding, which requires
  isAuthenticated: true and produces hasProfile: true."

(:FlowTransition {
  id: STRING UNIQUE,
  trigger: STRING,           // "signup_complete" | "login_success" |
                             // "role_check_fail" | "onboarding_skip"
  guard: STRING | NULL,      // "user.role === 'admin'" or null (always)
  redirectTo: STRING | NULL, // fallback if guard fails
  priority: INTEGER,         // ordering when multiple transitions match
  isDefault: BOOLEAN,        // true if this is the fallback transition
  isError: BOOLEAN,          // true if this handles an error case
})
  Purpose: Explicit edge between stages. Guards and triggers make
  branching explicit. Role-based redirects become data in the graph,
  not ad-hoc code.

(:FlowAntiPattern {
  id: STRING UNIQUE,
  name: STRING,              // "post-signup-dumps-to-login"
  description: STRING,       // "User signs up then gets sent to login page"
  severity: STRING,          // HIGH | MEDIUM | LOW
  detection: STRING,         // what to look for in code
  correctPattern: STRING,    // what should happen instead
  source: STRING,            // "research" | "audit-derived" | "manual"
  confidence: STRING,        // HIGH | MEDIUM | LOW
  active: BOOLEAN,
  timesDetected: INTEGER,
  lastDetectedAt: DATETIME | NULL,
})
  Purpose: Known-bad flow pattern. When Step 3.5 finds a broken
  flow, it checks: "Does this match a known anti-pattern?" Single
  traversal. The correctPattern field tells Claude what to build
  instead.

───────────────────────────────────────────────────────────
D15.2 GRAPH SCHEMA — Relationships
───────────────────────────────────────────────────────────

  // Archetype connections
  (:FlowPattern)-[:FOR_ARCHETYPE]->(:AppArchetype)
  (:Project)-[:IS_ARCHETYPE]->(:AppArchetype)

  // Flow structure (ordered chain)
  (:FlowPattern)-[:HAS_STAGE]->(:FlowStage)
  (:FlowStage)-[:TRANSITIONS_TO]->(:FlowStage)
  (:FlowStage)-[:HAS_TRANSITION]->(:FlowTransition)
  (:FlowTransition)-[:TARGETS]->(:FlowStage)

  // Anti-patterns
  (:FlowAntiPattern)-[:FOR_ARCHETYPE]->(:AppArchetype)
  (:FlowAntiPattern)-[:VIOLATES]->(:FlowPattern)

  // Knowledge graph integration (reuses existing Knowledge node)
  (:Knowledge)-[:INFORMS]->(:FlowPattern)
  (:Knowledge)-[:INFORMS]->(:FlowAntiPattern)

  // Build and audit linkage
  (:Build)-[:USED_FLOW]->(:FlowPattern)
  (:AuditFinding)-[:MATCHES_ANTIPATTERN]->(:FlowAntiPattern)

  // Project-specific overrides
  (:FlowPattern)-[:FOR_PROJECT]->(:Project)

Design rationale:
  - AppArchetype as classifier — one query loads all patterns for
    a project type
  - FlowStage with requiredState/producedState — this is a state
    machine, not a list. Claude can verify state transitions.
  - FlowTransition as explicit edge — guards and triggers make
    branching data, not code
  - FlowAntiPattern linked to FlowPattern — "what's wrong" links
    to "what's right" in a single traversal
  - Knowledge→INFORMS — flow insights from research enter as
    Knowledge nodes first (with DERIVED_FROM provenance), then
    INFORMS the FlowPattern they shaped. Same tier system
    (Reference → Validated → Governance) applies.
  - Build→USED_FLOW — tracks which builds used which pattern.
    High timesUsed = battle-tested.

───────────────────────────────────────────────────────────
D15.3 BOOTSTRAP QUERIES
───────────────────────────────────────────────────────────

// Constraints
CREATE CONSTRAINT archetype_name IF NOT EXISTS
  FOR (a:AppArchetype) REQUIRE a.name IS UNIQUE;

CREATE CONSTRAINT flowpattern_id IF NOT EXISTS
  FOR (fp:FlowPattern) REQUIRE fp.id IS UNIQUE;

CREATE CONSTRAINT flowstage_id IF NOT EXISTS
  FOR (fs:FlowStage) REQUIRE fs.id IS UNIQUE;

CREATE CONSTRAINT flowtransition_id IF NOT EXISTS
  FOR (ft:FlowTransition) REQUIRE ft.id IS UNIQUE;

CREATE CONSTRAINT flowantipattern_id IF NOT EXISTS
  FOR (fa:FlowAntiPattern) REQUIRE fa.id IS UNIQUE;

// Indexes
CREATE INDEX flowpattern_archetype IF NOT EXISTS
  FOR (fp:FlowPattern) ON (fp.archetype);

CREATE INDEX flowpattern_active IF NOT EXISTS
  FOR (fp:FlowPattern) ON (fp.active);

CREATE INDEX flowstage_screentype IF NOT EXISTS
  FOR (fs:FlowStage) ON (fs.screenType);

CREATE INDEX flowantipattern_active IF NOT EXISTS
  FOR (fa:FlowAntiPattern) ON (fa.active);

───────────────────────────────────────────────────────────
D15.4 BUILD PIPELINE INTEGRATION (new Step 1.25)
───────────────────────────────────────────────────────────

New step in the build pipeline, between Step 1 (Neo4j Memory Query)
and Step 1.5 (Gemini Pre-Build Verify). Runs for MEDIUM and HIGH
complexity builds.

  STEP 1     Neo4j Memory Query                  [existing — always]
  STEP 1.25  Load Flow Pattern for App Archetype  [NEW — MEDIUM+HIGH]
  STEP 1.5   Gemini Pre-Build Verify              [existing]
  STEP 2     Design                               [existing — now
             informed by flow pattern]

Step 1.25 Query:

  // Load flow patterns for this project's archetype
  MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a:AppArchetype)
  MATCH (fp:FlowPattern { active: true })-[:FOR_ARCHETYPE]->(a)
  MATCH (fp)-[:HAS_STAGE]->(fs:FlowStage)
  OPTIONAL MATCH (fs)-[:HAS_TRANSITION]->(ft:FlowTransition)
                 -[:TARGETS]->(target:FlowStage)
  RETURN fp.name AS pattern, fp.description,
         fs.name AS stage, fs.order, fs.screenType,
         fs.requiredState, fs.producedState, fs.roleFilter,
         ft.trigger, ft.guard, target.name AS transitionsTo
  ORDER BY fp.name, fs.order

  // Also load anti-patterns for this archetype
  MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a:AppArchetype)
  MATCH (fa:FlowAntiPattern { active: true })-[:FOR_ARCHETYPE]->(a)
  RETURN fa.name AS antiPattern, fa.description, fa.detection,
         fa.correctPattern, fa.severity

Claude receives these results at Step 1.25 and uses them as
constraints during Step 2 (Design). The architecture gate (Gate 1)
validates the design against these patterns.

If no archetype is assigned to the project:
  1. Claude queries all available archetypes
  2. Based on D0.5 stack detection (framework, auth system, repo
     type), Claude proposes the closest match
  3. The assignment is stored as (:Project)-[:IS_ARCHETYPE]->
     (:AppArchetype) with state = CANDIDATE
  4. After 2 successful builds, the assignment becomes ACTIVE
  5. If the archetype doesn't fit (flow patterns don't match the
     project's actual screens), it can be reassigned

If no FlowPattern exists for the archetype:
  Claude builds without flow constraints (current behavior) but
  logs a COVERAGE_BLIND_SPOT signal at D1 COLLECT: "No FlowPattern
  exists for archetype {name}."

───────────────────────────────────────────────────────────
D15.5 AUDIT PIPELINE INTEGRATION (enhances D14.7 Step 3.5)
───────────────────────────────────────────────────────────

D14.7 defined Step 3.5 as forensic flow tracing — read the code
and trace execution paths. D15 adds prescriptive comparison:

Step 3.5 now has two phases:

  Phase 1: Forensic tracing (existing D14.7)
    Trace actual code paths for critical user flows.
    Output: chain of file → action → next hops.

  Phase 2: Prescriptive comparison (new, from D15)
    1. Load the expected FlowPattern for the project's archetype:

       MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a)
       MATCH (fp:FlowPattern { active: true })-[:FOR_ARCHETYPE]->(a)
       MATCH (fp)-[:HAS_STAGE]->(fs:FlowStage)
       OPTIONAL MATCH (fs)-[:HAS_TRANSITION]->(ft:FlowTransition)
                      -[:TARGETS]->(target:FlowStage)
       RETURN fp, fs, ft, target
       ORDER BY fp.name, fs.order

    2. Compare traced flows (Phase 1 output) against expected
       stages and transitions (Phase 2 query results):
       - Does each traced hop match an expected FlowStage?
       - Does each redirect match an expected FlowTransition?
       - Are there traced hops that don't appear in any pattern?
       - Are there expected stages that the code doesn't implement?

    3. Check against known FlowAntiPatterns:

       MATCH (p:Project { name: $project })-[:IS_ARCHETYPE]->(a)
       MATCH (fa:FlowAntiPattern { active: true })-[:FOR_ARCHETYPE]->(a)
       RETURN fa.name, fa.detection, fa.correctPattern, fa.severity

       For each anti-pattern, check if the traced flow matches the
       detection criteria. If yes:
       - Flag the finding
       - Link via (:AuditFinding)-[:MATCHES_ANTIPATTERN]->(:FlowAntiPattern)
       - Increment fa.timesDetected
       - Set fa.lastDetectedAt = now()

    4. Deviations are classified:
       - MISSING_STAGE: expected stage not implemented → MEDIUM
       - WRONG_TRANSITION: redirect goes to unexpected target → HIGH
       - ANTIPATTERN_MATCH: matches a known bad pattern → severity
         from the FlowAntiPattern node
       - UNRECOGNIZED_HOP: code has a hop not in any pattern → LOW
         (may be a legitimate custom flow)

───────────────────────────────────────────────────────────
D15.6 IMPROVEMENT LOOP INTEGRATION (extends D1–D5)
───────────────────────────────────────────────────────────

The improvement loop doesn't just consume signals about code bugs.
It also learns about flow patterns. Here's how D15 connects:

D1 COLLECT — New signal triggers:
  - If Step 3.5 Phase 2 finds a WRONG_TRANSITION or
    ANTIPATTERN_MATCH, emit a MISSED_FINDING signal with
    related_flows populated
  - If Step 3.5 Phase 2 finds no matching FlowPattern for the
    project, emit a COVERAGE_BLIND_SPOT signal

D2 REFLECT — New pattern type:
  - FLOW_PATTERN_GAP: ≥2 COVERAGE_BLIND_SPOT signals about missing
    FlowPatterns for the same archetype
  - RECURRING_ANTIPATTERN: ≥2 ANTIPATTERN_MATCH signals for the
    same FlowAntiPattern across different projects

D3 PROPOSE — New proposal targets:
  Add two new targets to the D3 proposal types table:

  ┌────────────────────┬──────────────────────────────────────────────┐
  │ Target             │ What it changes                              │
  ├────────────────────┼──────────────────────────────────────────────┤
  │ FLOW_PATTERN       │ Add, modify, or retire a FlowPattern         │
  ├────────────────────┼──────────────────────────────────────────────┤
  │ FLOW_ANTIPATTERN   │ Add or update a FlowAntiPattern from a real  │
  │                    │ audit failure (audit-derived source)          │
  └────────────────────┴──────────────────────────────────────────────┘

  FLOW_PATTERN proposals are RESTRICTED tier (they change build
  behavior). FLOW_ANTIPATTERN proposals are STANDARD tier (they add
  detection capability without changing build behavior).

D5 APPLY — New application procedures:

  FLOW_PATTERN (add):
    1. Create FlowPattern with state = CANDIDATE
    2. Create linked FlowStage and FlowTransition nodes
    3. Pattern becomes ACTIVE after 2 builds use it without issues

  FLOW_PATTERN (modify):
    1. Store previous version (same as RuleVersion pattern)
    2. Update in place
    3. Reset timesUsed to 0 (must re-prove itself)

  FLOW_PATTERN (retire):
    1. Set state = RETIRED, active = false
    2. Pattern remains in graph for history

  FLOW_ANTIPATTERN (add):
    1. Create FlowAntiPattern with active = true
    2. Link to the FlowPattern it violates (if known)
    3. Link to the AppArchetype(s) it applies to
    4. On next audit, Step 3.5 Phase 2 will check for it

Example: The OpSuite redirect loop failure
  The Clerk redirect loop that was missed in the first audit would
  generate:
  - Signal: MISSED_FINDING (redirect loop not caught)
  - Pattern: RECURRING_MISS (if it happens again)
  - Proposal: FLOW_ANTIPATTERN (add)
    {
      name: "post-signup-redirect-to-root-with-unconditional-redirect",
      description: "Sign-up redirect URL set to / when root page
        does redirect('/sign-in') unconditionally",
      severity: "HIGH",
      detection: "Check if CLERK_SIGN_UP_FALLBACK_REDIRECT_URL or
        afterSignUpUrl points to a route that contains an
        unconditional redirect()",
      correctPattern: "Post-signup should redirect to /onboarding
        or /dashboard, never to a route with unconditional redirect",
      source: "audit-derived"
    }

  Next time ANY project with Clerk auth is audited, Step 3.5 will
  check for this anti-pattern automatically.

───────────────────────────────────────────────────────────
D15.7 ARCHETYPE CATALOG (initial seed)
───────────────────────────────────────────────────────────

Initial archetypes. The improvement loop can add more via
FLOW_PATTERN proposals.

┌──────────────────────┬─────────────────────────────────────────────┐
│ Archetype            │ Description                                 │
├──────────────────────┼─────────────────────────────────────────────┤
│ SaaS-RoleBased       │ Multi-role SaaS with admin/employee/user     │
│                      │ roles. Auth → role check → dashboard.       │
│                      │ Examples: OpSuite, most B2B tools            │
├──────────────────────┼─────────────────────────────────────────────┤
│ MobileFieldApp       │ Field worker app with offline-first,         │
│                      │ location tracking, and sync. Auth →         │
│                      │ onboarding → location permission → sync.    │
├──────────────────────┼─────────────────────────────────────────────┤
│ Marketplace          │ Two-sided marketplace with buyer/seller      │
│                      │ roles. Auth → role select → onboarding →   │
│                      │ dashboard (different per role).              │
├──────────────────────┼─────────────────────────────────────────────┤
│ B2B-Approval         │ Approval workflow with requester/approver/   │
│                      │ admin roles. Auth → request submission →    │
│                      │ approval queue → notification.              │
├──────────────────────┼─────────────────────────────────────────────┤
│ API-Service          │ Backend API with no frontend. Auth → rate   │
│                      │ limiting → versioned endpoints. No screens,  │
│                      │ but flow = request lifecycle.               │
├──────────────────────┼─────────────────────────────────────────────┤
│ CLI-Tool             │ Command-line tool. No auth screens. Flow =   │
│                      │ command parse → validate → execute → output.│
└──────────────────────┴─────────────────────────────────────────────┘

The archetype catalog is extensible. The improvement loop can
propose new archetypes via FLOW_PATTERN proposals when it detects
projects that don't fit any existing archetype.

───────────────────────────────────────────────────────────────────────
