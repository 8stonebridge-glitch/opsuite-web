───────────────────────────────────────────────────────────────────────
D14. AUDIT PIPELINE AMENDMENTS — Lessons from First Failure
───────────────────────────────────────────────────────────────────────

Origin
During the first real audit (OpSuite, pre-v10), the orchestrating
agent (Claude) dismissed a Codex HIGH finding by citing a code
comment instead of verifying actual middleware behavior. No
deliberation was triggered. No evidence was cited. The finding was
correct — it was a documented Clerk redirect loop. This section
defines the amendments to Part A that prevent this failure class.

The root cause was structural: Claude treated the audit as a
document to write in a single pass, not as a pipeline with enforced
gates. Codex findings were batch-summarized instead of individually
challenged through the deliberation protocol.

───────────────────────────────────────────────────────────
D14.1 PER-FINDING DELIBERATION GATE (amends A6/A14)
───────────────────────────────────────────────────────────

Current behavior (broken):
  Codex returns findings → Claude writes a summary → findings are
  batch-assessed → HIGH findings can be silently downgraded in the
  summary without entering deliberation.

Required behavior:
  Codex returns findings → EACH finding with severity HIGH or REJECT
  is individually processed through a deliberation gate before the
  report is generated.

Procedure:

  FOR EACH Codex finding WHERE severity IN ('HIGH', 'REJECT'):

    1. Claude states its assessment:
       - AGREE: Claude accepts Codex's severity → finding stands
       - DISAGREE: Claude proposes a different severity → go to step 2

    2. If DISAGREE and severity delta ≥ 2 levels:
       → Mandatory deliberation (A16 protocol)
       → Claude MUST cite evidence per the hard evidence rule (D14.2)
       → The finding is sent to Gemini for a third opinion (D14.5)
       → Two out of three wins. If Codex + Gemini agree, Claude is
         overruled regardless of Claude's evidence quality
       → Result stored as (:Decision) node in Neo4j
       → If Claude cannot cite evidence, Codex's severity stands

    3. If DISAGREE and severity delta = 1 level:
       → Claude may downgrade by 1 level WITHOUT full deliberation
       → BUT must record the reason as a (:FindingOverride) node
       → The override is tracked as a signal in D1 COLLECT

    4. No finding may be dismissed (severity → NONE) without
       deliberation regardless of delta.

Enforcement:
  The audit pipeline MUST process findings sequentially through this
  gate. The report template cannot be generated until all HIGH/REJECT
  findings have been individually resolved. This is not advisory —
  it is a hard gate. If the gate is skipped, the report is flagged
  as [PROTOCOL_VIOLATION] and the skip is logged as a MISSED_FINDING
  signal in D1.

Rationale:
  Batch assessment lets the orchestrator treat the audit as a writing
  task. Per-finding gates force it to treat each finding as a claim
  that must be individually defended or accepted.

───────────────────────────────────────────────────────────
D14.2 EVIDENCE RULE FOR FINDING DISMISSALS (amends A16)
───────────────────────────────────────────────────────────

The hard evidence rule from D4 CHECK 1 applies identically to audit
finding dismissals, not just improvement proposals. This section
makes that explicit.

When Claude disagrees with a Codex finding, it MUST cite at least
one of:

  (a) External evidence: framework documentation, known issue
      tracker, CVE database, official API docs, or established
      best practice with a citable URL

  (b) Prior validated deliberation: a previous (:Decision) node
      where the same pattern was resolved with evidence, from any
      project in the system

  (c) Verified code behavior: Claude MUST have read and analyzed
      the actual source code referenced by the finding — not
      comments, not variable names, not inferred behavior from
      file names

Explicitly NOT valid evidence:

  ✗ Code comments ("// Authenticated users are redirected by
    middleware" is not evidence that middleware actually does this)
  ✗ Variable names or function names that suggest behavior
    without reading the implementation
  ✗ File names or directory structure ("it's in /auth so it
    probably handles auth")
  ✗ Inferred behavior from import statements alone
  ✗ Claude's own confidence or reasoning without external grounding
  ✗ "This is a common pattern" without citing where it's documented

The distinction: evidence (c) requires Claude to have READ the
actual middleware.ts, verified the redirect logic, confirmed the
condition paths, and cited specific line numbers. Seeing a comment
that SAYS the middleware handles it is not the same as VERIFYING
that it does.

If Claude cannot produce valid evidence for a disagreement, the
original Codex severity stands. This is not a penalty — it is the
conservative default. Codex reviewed the code; Claude must do at
least equivalent work to override that review.

───────────────────────────────────────────────────────────
D14.3 PROTOCOL VIOLATION DETECTION (amends D1 COLLECT)
───────────────────────────────────────────────────────────

Add a 7th signal type to D1:

┌──────────────────────┬─────────────────────────────────────────────┐
│ Signal               │ Definition                                  │
├──────────────────────┼─────────────────────────────────────────────┤
│ PROTOCOL_VIOLATION   │ The orchestrator bypassed a required gate   │
│                      │ during the audit pipeline. Detected by      │
│                      │ comparing the audit's Decision nodes against │
│                      │ the Codex findings that required deliberation│
│                      │ (severity HIGH or REJECT). If a HIGH finding │
│                      │ was downgraded without a corresponding       │
│                      │ Decision node, emit this signal.             │
└──────────────────────┴─────────────────────────────────────────────┘

Detection is automatic and mechanical:

  1. After report generation, query all Codex findings with
     severity HIGH or REJECT from the current audit
  2. For each, check if a (:Decision) node exists linked to that
     finding via [:RESOLVED_BY]
  3. If the final report shows a different severity than Codex's
     original AND no Decision node exists → emit PROTOCOL_VIOLATION

PROTOCOL_VIOLATION signals are:
  - Always HIGH priority (they indicate the pipeline itself failed)
  - Never auto-resolved (they always surface in the report)
  - Tracked as a separate metric in D9 System Health:
    | Protocol violations (all time) | {n} |

Pattern detection (D2):
  ≥2 PROTOCOL_VIOLATION signals across any audits → pattern type
  SYSTEMATIC_BYPASS. This pattern always generates a CRITICAL-tier
  proposal because it means the orchestrator is routinely skipping
  gates.

───────────────────────────────────────────────────────────
D14.4 WHAT THIS WOULD HAVE CAUGHT
───────────────────────────────────────────────────────────

Applied retroactively to the OpSuite audit failure:

  1. Codex flags redirect loop as HIGH
  2. D14.1: Claude must individually process this finding
     → Claude says DISAGREE, proposes LOW (delta = 2)
     → Mandatory deliberation triggers
  3. D14.2: Claude must cite evidence
     → Claude cites code comment → REJECTED (not valid evidence)
     → Claude must read middleware.ts and verify behavior
     → Claude reads middleware.ts, finds no auth-state redirect
     → Claude cannot produce valid evidence for dismissal
     → Codex's HIGH stands
  4. D14.3: If Claude somehow still bypasses the gate, the
     post-generation check catches it:
     → Codex finding = HIGH, report shows LOW, no Decision node
     → PROTOCOL_VIOLATION signal emitted
     → Next audit's REFLECT detects the violation

  Three layers of defense. The original failure penetrated all
  existing layers because none of them existed.

───────────────────────────────────────────────────────────
D14.5 CROSS-VERIFICATION OF DISMISSALS (amends A16)
───────────────────────────────────────────────────────────

What failed: Claude dismissed a finding that Codex got right.
Nobody checked Claude's work.

The build pipeline already has three-way consensus (Claude + Codex +
Gemini) in Gate 3 deliberation, but the audit pipeline did not
enforce it for finding dismissals.

Rule:
  Any finding where Claude overrules Codex (proposes lower severity)
  MUST be sent to Gemini for a third opinion before the override
  takes effect.

Procedure:
  1. Codex finding arrives with severity X
  2. Claude proposes severity Y where Y < X
  3. Finding is sent to Gemini with:
     - The file(s) in question
     - Codex's finding and severity rationale
     - Claude's proposed severity and rationale
     - The stack context from (:Project)
  4. Gemini returns its independent severity assessment
  5. Resolution: two out of three wins
     - Codex + Gemini agree → their severity stands, Claude overruled
     - Claude + Gemini agree → Claude's severity stands
     - All three disagree → highest severity wins (conservative)
     - Security findings → highest severity always wins

Timeout: 60 seconds for Gemini's assessment
If Gemini times out: Codex's original severity stands (conservative)

This three-way check already exists conceptually in the build
pipeline. D14.5 makes it mandatory in the audit pipeline.

───────────────────────────────────────────────────────────
D14.6 NO SILENT STEP SKIPS (amends B1/B3)
───────────────────────────────────────────────────────────

What failed: Step 3 (Perplexity validation) was skipped entirely.
The final report looked complete. There was no way to know a step
was missing.

Rule:
  If a tool required by any audit step is unavailable, the audit
  pipeline MUST halt at that step and report the blockage. It may
  NOT silently skip the step and continue.

Blockage Procedure:
  1. Before executing a step, verify the required tool is connected:
     - Step 2: reviewer-codex-mcp → review_code
     - Step 2.5: gemini-verify → verify_dependencies
     - Step 3: perplexity-mcp → perplexity_search
     - Step 3.5: perplexity-mcp OR WebSearch (see D14.7)
     - Step 4: testrunner-mcp → run_quality_pipeline
     - Step 7: neo4j-memory → execute_query

  2. If the tool is not connected:
     → Emit: "Step {N} BLOCKED — {tool_name} not connected."
     → Offer substitute if available (e.g., WebSearch for Perplexity)
     → Wait for human response: proceed with substitute, or abort
     → Do NOT continue past the blocked step silently

  3. If the human approves a substitute:
     → Log the substitution in the audit metadata
     → The step is marked as [SUBSTITUTE] in the report header
     → Score is not capped (human approved the alternative)

  4. If the human says abort:
     → Audit stops. Partial results are stored but not scored.

Report Header (see D14.8):
  Every audit report includes a step execution summary showing
  which steps ran, which were substituted, and which were skipped.

───────────────────────────────────────────────────────────
D14.7 CRITICAL USER FLOW TESTING (new Step 3.5)
───────────────────────────────────────────────────────────

What failed: The redirect loop is a flow bug, not a file bug.
Codex reviews files individually — it caught the file-level issue
but couldn't see the multi-file chain:
  sign-up → env var (redirect URL = /) → root page (redirect to
  /sign-in) → middleware → loop

File-level review finds the pieces. Flow-level testing finds the
chain.

New audit step: Step 3.5 — Critical User Flow Tracing
Runs after Step 3 (Perplexity validation), before Step 4 (tests).

Purpose:
  Trace critical user flows end-to-end across files, identifying
  multi-file chains where file-level review cannot detect the bug.

Default Flows (stack-aware, derived from D0.5):

  For auth-enabled projects (Clerk, NextAuth, Better Auth, etc.):
  1. Sign up → where does the user land after sign-up?
  2. Sign in → where does the user land after sign-in?
  3. Signed-in user hits / → what happens?
  4. Unauthenticated user hits protected route → what happens?
  5. Wrong-role user hits role-gated route → what happens?

  For API projects (FastAPI, Express, Django, etc.):
  1. Unauthenticated request to protected endpoint → what happens?
  2. Expired token hits refresh flow → what happens?
  3. Rate-limited request → what response, what state?
  4. Webhook delivery → idempotency handling?

  For all projects:
  1. Error in middleware/interceptor → does it propagate or swallow?
  2. Environment variable missing → does the app crash or degrade?
  3. Database connection lost → graceful or catastrophic?

Procedure:

Agent: Claude (Orchestrator) + Perplexity (validation)
Input: Stack context from (:Project), flow definitions from A9,
       all files referenced in the flow chain
Timeout: 120 seconds per flow

Steps per flow:
  1. Identify the entry point (e.g., sign-up button, API endpoint)
  2. Trace the execution path across files:
     - Which file handles the initial action?
     - Which file(s) process the redirect/response?
     - Which middleware/interceptor runs in between?
     - What is the final state the user sees?
  3. For each hop in the chain, READ the actual code (not comments)
  4. Query Perplexity (or WebSearch as substitute):
     "For {framework} {version} with {auth_system}, is the pattern
      [{entry} → {redirect_url} → {landing_page}] a known failure
      pattern?"
  5. If Perplexity returns a known issue → flag as FLOW_RISK
  6. If the traced flow contains a loop or dead end → flag as
     FLOW_BUG with severity HIGH

Output per flow:
  {
    "flow_id": 1,
    "description": "Sign-up completion redirect",
    "chain": [
      {"file": "sign-up.tsx", "action": "Clerk onComplete", "next": "/"},
      {"file": "page.tsx", "action": "redirect('/sign-in')", "next": "/sign-in"},
      {"file": "middleware.ts", "action": "...", "next": "..."},
    ],
    "result": "LOOP_DETECTED" | "DEAD_END" | "PASS",
    "known_issue": true | false,
    "perplexity_source": "Clerk docs: redirect loop with custom flows",
    "severity": "HIGH"
  }

Flow findings are added to the audit report in a dedicated section
and stored as (:FlowFinding) nodes in Neo4j, linked to the audit
and project.

───────────────────────────────────────────────────────────
D14.8 AUDIT REPORT STEP EXECUTION HEADER (amends D9)
───────────────────────────────────────────────────────────

What failed: The final report looked complete. There was no way
to know Step 3 was skipped.

Every audit report MUST begin with a step execution summary:

  ## PIPELINE EXECUTION

  | Step | Name | Status | Tool | Notes |
  |------|------|--------|------|-------|
  | -1 | Context assembly | ✅ RAN | D16 | 11/18 blocks, 2 trimmed |
  | 0 | Neo4j context | ✅ RAN | neo4j-memory | |
  | 1 | Stack detection | ✅ RAN | orchestrator | Detected: next 14.x |
  | 2 | Codex reviews | ✅ RAN | reviewer-codex-mcp | 3 parallel agents |
  | 2.5 | Gemini deps | ✅ RAN | gemini-verify | |
  | 3 | Perplexity validate | ❌ SKIPPED | perplexity-mcp | Not connected |
  | 3.5 | Flow testing | ✅ RAN | orchestrator + perplexity | 5 flows traced |
  | 4 | Test runner | ✅ RAN | testrunner-mcp | |
  | 5 | Rule check | ✅ RAN | neo4j-memory | |
  | 6 | Report generation | ✅ RAN | orchestrator | |
  | 6.5 | Dedup findings | ✅ RAN | orchestrator | |
  | 7 | Neo4j storage | ✅ RAN | neo4j-memory | |

  Pipeline completeness: 10/11 steps (90.9%)

Score Capping Rule:
  If ANY step is SKIPPED (not SUBSTITUTE — substitutes are approved
  by human and count as RAN):

  - The overall audit score is capped at the maximum score achievable
    with incomplete data. The cap formula:

    max_score = base_score × (steps_executed / total_steps)

    Example: If the pipeline scores 6.3 but only ran 10/11 steps,
    the reported score is min(6.3, 6.3 × 10/11) = 5.73

  - The capped score is displayed alongside the uncapped score:

    Overall Score: 5.7/10 (capped from 6.3 — Step 3 skipped)

  Rationale: You can't claim a full score when you didn't run the
  full pipeline. The cap makes skipped steps visible in the one
  number everyone reads.

───────────────────────────────────────────────────────────
D14.9 PERPLEXITY AS MCP SERVER (tooling requirement)
───────────────────────────────────────────────────────────

What failed: Perplexity exists as src/lib/perplexity.ts (a library)
but is not in Claude Code's MCP server list. The orchestrator
cannot call it as a tool.

Requirement:
  Perplexity MUST be configured as an MCP server, not just an
  importable library. The audit pipeline calls tools, not imports.

MCP Server Specification:

  Server name: perplexity-mcp
  API: Perplexity Sonar API (sonar model)
  Env: PERPLEXITY_API_KEY (already exists in .env.local)

  Tool: perplexity_search
  Input:
    query: string        // The research question
    context: string      // Stack, framework, version info
    search_domain: string // Optional: limit to specific docs
  Output:
    answer: string       // Sonar's response
    sources: string[]    // URLs cited
    confidence: float    // 0-1

This is a tooling prerequisite for Steps 3 and 3.5. Until this
server is configured, those steps will be BLOCKED (per D14.6),
and the audit score will be capped (per D14.8).

Fallback: If perplexity-mcp is unavailable and human approves,
WebSearch can substitute. But the goal is to have it connected
permanently.

