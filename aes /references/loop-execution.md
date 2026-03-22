───────────────────────────────────────────────────────────────────────
D4. VALIDATE — Evidence Gate + Deliberation
───────────────────────────────────────────────────────────────────────

Purpose
Not every proposal is good. VALIDATE ensures proposals are
evidence-backed, non-contradictory, and safe before application.

Trigger
Runs for each (:Proposal {status: 'pending'}).

Three Validation Checks (sequential)

CHECK 1: EVIDENCE SUFFICIENCY (the hard evidence rule)
  Agent: Codex (Reviewer)
  Timeout: 60 seconds

  No agent may approve a proposal on intuition alone. Every approved
  proposal must cite at least one of:
  (a) External evidence: documentation, known CVE, framework docs,
      established best practice with a citable source
  (b) Prior validated deliberation: a previous deliberation outcome
      from A16 or D4.CHECK3 that supports this position
  (c) Repeated internal signal evidence: ≥2 signals from different
      audits that demonstrate the same issue

  Codex reviews the proposal and answers:
  - Does the rationale cite specific signals/patterns with IDs? (required)
  - Does the rationale satisfy at least one of (a), (b), or (c) above? (required)
  - Does the success_criterion reference a measurable outcome? (required)
  - Does the rollback_criterion define a specific trigger? (required)
  - Is the proposed_value syntactically valid for its target? (required)

  If ANY required check fails → status = 'rejected', reason logged.
  Rationale: Claude is powerful but can generate plausible-sounding
  proposals from pattern-matched intuition. The evidence rule forces
  every change to be grounded in something verifiable.

CHECK 2: CONTRADICTION SCAN
  Agent: Claude (Orchestrator)
  Timeout: 60 seconds

  Claude checks the proposal against:
  - All ACTIVE rules: does this proposal contradict an existing rule?
  - All other pending proposals: does this conflict with another proposal?
  - The permanent rule list in A17: does this retire a permanent rule?
  - The safety boundaries in D6: does this exceed its tier?

  If contradiction found → status = 'rejected', contradiction logged.
  If potential conflict (ambiguous) → escalate to CHECK 3.

CHECK 3: DELIBERATION (only if triggered by CHECK 2)
  Agents: Claude + Codex + Gemini
  Timeout: 60 seconds per agent, max 2 rounds
  Protocol: Same as A16 but applied to proposals, not findings.

  Resolution:
  - 2 of 3 approve → status = 'approved', BUT the approving agents
    must each independently cite evidence per the hard evidence rule.
    If 2 approve but neither cites evidence → status = 'rejected'
  - 2 of 3 reject → status = 'rejected'
  - All 3 disagree → status = 'rejected' (conservative default)
  - Security-related proposals → resolve to MORE conservative position

  If CHECK 3 is not triggered (no contradictions), the proposal
  is auto-approved after CHECK 1 + CHECK 2 pass.

Human Override Gate

After validation, proposals with safety_tier = RESTRICTED or CRITICAL
(see D6) are held for human approval regardless of agent consensus.
The audit report includes a section:

  ## PENDING IMPROVEMENTS

  | # | Proposal | Target | Action | Safety | Agent Verdict |
  |---|----------|--------|--------|--------|---------------|
  | PROP-001 | Add dual-auth detection rule | RULE | add | STANDARD | Auto-approved |
  | PROP-002 | Adjust Security weight 30%→35% | SCORING_WEIGHT | adjust | RESTRICTED | Awaiting human |

  STANDARD proposals: applied automatically.
  RESTRICTED proposals: applied only after human types "approve PROP-002".
  CRITICAL proposals: never applied automatically. Always human-only.

Output

  Proposal status updated to 'approved' or 'rejected'.
  If rejected: reason stored on the node.
  If approved: proceeds to APPLY.

  (:Proposal)-[:VALIDATED_BY]->(:ValidationResult {
    check1_pass: true,
    check2_pass: true,
    check3_needed: false,
    deliberation_outcome: null,
    final_status: "approved",
    approved_by: "auto" | "human" | "deliberation",
  })

───────────────────────────────────────────────────────────────────────
D5. APPLY — Implementation
───────────────────────────────────────────────────────────────────────

Purpose
Take approved proposals and apply them to the system's configuration.
This is where the system actually changes itself.

Trigger
Runs for each (:Proposal {status: 'approved'}).

Application Targets

Each target type has a defined application procedure:

RULE (add)
  1. Create (:Rule {state: 'CANDIDATE', ...}) in Neo4j
  2. Rule becomes ACTIVE after 2 consecutive audits with ≥1 trigger
  3. If 0 triggers in 2 audits → auto-retire

RULE (modify)
  1. Store previous version as (:RuleVersion) linked to the rule
  2. Update the (:Rule) node in-place
  3. Log modification in (:Proposal)-[:MODIFIED]->(:Rule)

RULE (retire)
  1. Set (:Rule {state: 'RETIRED'})
  2. Rule remains in Neo4j for history
  3. Rule can be re-proposed if a new pattern warrants it

SEVERITY_THRESHOLD (adjust)
  1. Store previous thresholds as a snapshot
  2. Update the threshold definitions
  3. Log: which threshold changed, old value, new value

SCORING_WEIGHT (adjust)
  1. Store previous weights as a snapshot
  2. Update weights (must still sum to 100%)
  3. Constraint: no single weight can be < 5% or > 50%
  4. Constraint: max change per proposal is ±5% on any single category

FLOW_DEFINITION (add/modify/remove)
  1. Update the flow list in the system configuration
  2. New flows start as [UNVERIFIED] — they need test coverage before
     they can PASS
  3. Cannot remove flows 1–6 (permanent set, like permanent rules)

CRITICAL_PATH (add)
  1. Add glob/file to the project's critical-paths.json
  2. Next audit includes these files in mandatory set

TIMEOUT_CONFIG / BATCH_CONFIG (adjust)
  1. Update the configuration value
  2. Constraint: timeouts cannot be set below 30s or above 600s
  3. Constraint: batch sizes cannot exceed 20 files

CONFIDENCE_THRESH (adjust)
  1. Update the escalation threshold
  2. Constraint: cannot be set below 0.70 or above 0.95

PROMPT_REFINEMENT (modify)
  1. Store the previous prompt version
  2. Apply the new prompt
  3. The prompt change is tested on the next audit's first batch
     before being applied to all batches (canary deployment)

Application Log

Every application creates an (:Application) node:

  (:Application {
    id: "APP-{seq}",
    project_id: "PROJ-opsuite",  // scoped to project
    proposal_id: "PROP-001",
    target: "RULE",
    action: "add",
    previous_state: { ... },     // snapshot of what was there before
    new_state: { ... },          // what's there now
    applied_at: "2026-03-19T...",
    applied_by: "auto" | "human",
    rollback_available: true,
    verified: false,             // set to true by VERIFY stage
  })

  (:Project)-[:HAS_APPLICATION]->(:Application)
  (:Proposal)-[:APPLIED_AS]->(:Application)

Atomicity
Each proposal is applied independently. If proposal A succeeds and
proposal B fails, A remains applied. Failed applications are logged
with the error and the proposal status is set to 'apply_failed'.

───────────────────────────────────────────────────────────────────────
D6. SAFETY BOUNDARIES
───────────────────────────────────────────────────────────────────────

Purpose
The system can change itself, but not without limits. Safety tiers
define what requires human approval and what is off-limits entirely.

Three Safety Tiers

┌────────────┬────────────────────────────────────────────────────────┐
│ Tier       │ Scope                                                  │
├────────────┼────────────────────────────────────────────────────────┤
│ STANDARD   │ Changes that tune existing behavior within defined     │
│            │ bounds. Applied automatically after agent validation.  │
│            │                                                        │
│            │ Examples:                                               │
│            │ - Add a CANDIDATE rule                                 │
│            │ - Adjust timeout by ≤30s                               │
│            │ - Add a file to critical path                          │
│            │ - Retire a non-permanent rule                          │
│            │ - Adjust batch size by ≤5 files                        │
│            │                                                        │
│            │ NOT standard (common mistake):                         │
│            │ - Prompt refinements are RESTRICTED (see below)        │
├────────────┼────────────────────────────────────────────────────────┤
│ RESTRICTED │ Changes that alter scoring, severity definitions,      │
│            │ flow definitions, or agent prompts. Requires human     │
│            │ approval.                                              │
│            │                                                        │
│            │ Examples:                                               │
│            │ - Adjust scoring weights                               │
│            │ - Modify severity threshold criteria                   │
│            │ - Add or modify a flow definition                      │
│            │ - Change confidence escalation threshold               │
│            │ - Modify a reviewer prompt (PROMPT_REFINEMENT)          │
│            │   Rationale: prompt changes alter the behavior of the  │
│            │   entire agent. Even with canary deployment, the blast  │
│            │   radius of a bad prompt is the whole audit pipeline.   │
├────────────┼────────────────────────────────────────────────────────┤
│ CRITICAL   │ Changes that alter the improvement loop itself, the    │
│            │ safety boundaries, the deliberation protocol, or the   │
│            │ ship blocker logic. NEVER applied automatically.       │
│            │ Requires human approval + 3-agent unanimous consent.   │
│            │                                                        │
│            │ Examples:                                               │
│            │ - Modify D4 validation checks                          │
│            │ - Change D6 safety tier definitions                    │
│            │ - Alter A8 ship blocker logic                          │
│            │ - Change A16 deliberation resolution rules             │
│            │ - Modify permanent rule list                           │
│            │ - Change the improvement loop itself (Part D)          │
└────────────┴────────────────────────────────────────────────────────┘

Hard Boundaries (NEVER changeable, even by human + agents)
- The system cannot remove the human override gate (D4)
- The system cannot set all safety tiers to STANDARD
- The system cannot disable signal collection (D1)
- The system cannot delete Neo4j history nodes
- The system cannot modify its own mission statement
- The improvement loop cannot skip the VALIDATE stage

Rate Limits
- Max 5 proposals per audit cycle
- Max 3 STANDARD auto-applications per audit cycle
- Max 1 SCORING_WEIGHT change per 10 audits
- Max 1 SEVERITY_THRESHOLD change per 10 audits
- Max 1 PROMPT_REFINEMENT per 10 audits (per agent prompt)
- Max 1 RULE modification per 5 audits (per rule ID)
- New CANDIDATE rules: max 3 added per 10 audits
- Max 1 CONTEXT_CONFIG change per 10 audits

Anti-Oscillation Controls

Rationale: prevents oscillation. If the system adjusts weights every
audit, it will chase noise instead of learning signal. The same logic
applies to prompts and rules — if a rule is modified, then modified
again before verification completes, the system cannot learn which
change helped.

Oscillation detection:
- If a target (rule, prompt, weight, threshold) has been modified
  and then rolled back within 20 audits, it enters a COOLDOWN state.
  During cooldown, no proposals targeting that same entity are
  eligible for PROPOSE. Cooldown lasts 10 audits.
- If a target enters COOLDOWN twice (modified → rolled back →
  modified → rolled back), it is escalated to RESTRICTED tier
  regardless of its original tier, and flagged for human review.
- The system tracks modification history per target:
  (:Rule)-[:HAS_VERSION]->(:RuleVersion) already captures this.
  Add (:PromptVersion) for prompt history with the same structure.

───────────────────────────────────────────────────────────────────────
D7. VERIFY — Outcome Measurement
───────────────────────────────────────────────────────────────────────

Purpose
After a change is applied, the next audit measures whether it worked.
This closes the loop. Without VERIFY, the system changes itself
without knowing if the change helped.

Trigger
Runs during the next audit after an (:Application {verified: false})
exists.

Verification Procedure

For each unverified application:

1. Retrieve the success_criterion from the original proposal
2. Retrieve the project_id from the application
3. Compute the baseline: the moving average of the relevant metric
   over the last 5 audits of THIS project (not just the single
   previous audit). This prevents marking a change as successful
   due to random variation between repos or audit runs.
4. Evaluate the criterion against:
   (a) The current audit's data (does the criterion pass?)
   (b) The baseline comparison (is the metric better than the
       5-audit moving average, not just the previous audit?)
   Both (a) AND (b) must pass for VERIFIED_PASS.
5. Set the application's verified status

Baseline Comparison Rules
- For score-affecting changes (SCORING_WEIGHT, SEVERITY_THRESHOLD,
  RULE): compare category scores and finding counts against the
  5-audit moving average for the same project
- For coverage-affecting changes (FLOW_DEFINITION, CRITICAL_PATH):
  compare coverage percentage against the 5-audit moving average
- For operational changes (TIMEOUT_CONFIG, BATCH_CONFIG): compare
  timeout frequency and audit duration against the 5-audit average
- For PROMPT_REFINEMENT: compare false positive rate and finding
  quality scores against the 5-audit moving average
- If fewer than 5 prior audits exist (bootstrap period), use all
  available audits as the baseline

Outcome States

┌────────────────┬───────────────────────────────────────────────────┐
│ Outcome        │ Meaning                                           │
├────────────────┼───────────────────────────────────────────────────┤
│ VERIFIED_PASS  │ The success criterion was met. The change worked. │
│                │ The application remains in place.                 │
├────────────────┼───────────────────────────────────────────────────┤
│ VERIFIED_FAIL  │ The success criterion was NOT met. The change     │
│                │ did not help. Check rollback criterion.           │
├────────────────┼───────────────────────────────────────────────────┤
│ INCONCLUSIVE   │ The criterion could not be evaluated (e.g., no   │
│                │ relevant project was audited, or the pattern      │
│                │ condition didn't arise). Carry forward to the     │
│                │ next audit. Max 5 carry-forwards before marking   │
│                │ as STALE.                                         │
├────────────────┼───────────────────────────────────────────────────┤
│ ROLLBACK       │ VERIFIED_FAIL + rollback criterion is met.        │
│                │ Revert the change using the application's         │
│                │ previous_state snapshot.                          │
└────────────────┴───────────────────────────────────────────────────┘

Rollback Procedure
1. Retrieve previous_state from the (:Application) node
2. Restore the target to its previous state
3. Mark the application as status = 'rolled_back'
4. Mark the original proposal as status = 'rolled_back'
5. Create a (:Rollback) node linking the application to the reason
6. The pattern that generated the proposal remains — it may generate
   a different proposal in the future

Verification Timeout
If an application remains unverified for 10 audits (INCONCLUSIVE
5 times = STALE), mark it as STALE and leave the change in place.
Stale changes are flagged in the governance review (B4) for human
attention.

Output

  (:Application)-[:VERIFICATION]->(:VerificationResult {
    outcome: "VERIFIED_PASS" | "VERIFIED_FAIL" | "INCONCLUSIVE" | "ROLLBACK",
    criterion_evaluated: "...",
    evidence: "...",
    audit_id: "AUDIT-006",
    verified_at: "2026-03-19T...",
  })

