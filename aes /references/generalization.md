───────────────────────────────────────────────────────────────────────
D13. GENERALIZE — Cross-Project Validation Gate
───────────────────────────────────────────────────────────────────────

Purpose
The system may learn from any audit, but it must not generalize
project-specific behavior into global governance without repeated
validation across multiple projects or stacks. D13 is the gate
between project-local knowledge and system-wide rules.

Without D13: a pattern observed in OpSuite (Expo + Convex + Clerk)
could produce a rule that makes no sense for a FastAPI backend or
a Go CLI tool. With D13: project-local knowledge stays local until
the evidence crosses project boundaries.

Trigger
Runs after VERIFY completes on any audit. Evaluates all
(:Proposal {scope: 'PROJECT', status: 'verified'}) nodes that have
VERIFIED_PASS outcomes.

Generalization Criteria

A project-scoped proposal is eligible for promotion to GLOBAL when:

1. VERIFIED_PASS in its source project (required)
2. The same pattern type (e.g., RECURRING_MISS) has been detected
   independently in ≥2 OTHER projects (required)
3. Those other projects are not all the same stack (required if ≥3
   projects exist in the system). Rationale: if all your projects
   are Next.js, cross-project validation is weaker but still
   acceptable. Once a non-Next.js project enters the system, the
   evidence bar rises.
4. The proposal target makes sense across stacks (evaluated by
   Claude). A RULE like "detect dual auth providers" is stack-
   agnostic. A CRITICAL_PATH like "middleware.ts" is Next.js-specific.

Promotion Procedure

Agent: Claude (Orchestrator)
Input: The verified project-scoped proposal + matching patterns from
       other projects + stack context from (:Project) nodes
Timeout: 120 seconds

Steps:
1. Query all (:Pattern) nodes with the same type across all projects
2. Filter to patterns that independently surfaced (not copied)
3. Check stack diversity: are the matching projects on different
   stacks, or the same stack?
4. Evaluate whether the proposed change is stack-agnostic or
   stack-specific:
   - Stack-agnostic changes (RULE, SCORING_WEIGHT, SEVERITY_THRESHOLD,
     CONFIDENCE_THRESH): can be promoted to GLOBAL if criteria 1-3 met
   - Stack-specific changes (FLOW_DEFINITION, CRITICAL_PATH,
     PROMPT_REFINEMENT): can only be promoted to STACK-scoped (applied
     to all projects with the same stack), never GLOBAL
5. If eligible, create a (:GlobalProposal) derived from the project
   proposal

Scope Levels

┌──────────────────────┬─────────────────────────────────────────────┐
│ Scope                │ Meaning                                     │
├──────────────────────┼─────────────────────────────────────────────┤
│ PROJECT              │ Applies only to the originating project.     │
│                      │ Default scope for all new proposals.         │
├──────────────────────┼─────────────────────────────────────────────┤
│ STACK                │ Applies to all projects with the same stack/ │
│                      │ framework. For stack-specific changes only.  │
├──────────────────────┼─────────────────────────────────────────────┤
│ GLOBAL               │ Applies to all projects regardless of stack. │
│                      │ For stack-agnostic changes only. Requires    │
│                      │ evidence from ≥2 projects on different stacks.│
└──────────────────────┴─────────────────────────────────────────────┘

Safety: ALL scope promotions are RESTRICTED tier minimum. The system
cannot auto-promote a project finding to global governance. Human
approval is always required for STACK and GLOBAL promotion.

Output

  (:GlobalProposal {
    id: "GPROP-{seq}",
    source_proposal_id: "PROP-001",
    source_project_id: "PROJ-opsuite",
    target: "RULE",
    action: "add",
    scope: "GLOBAL" | "STACK",
    stack_filter: null | "next",     // non-null for STACK scope
    supporting_projects: ["PROJ-opsuite", "PROJ-api-backend"],
    supporting_patterns: ["PAT-003", "PAT-017"],
    evidence_summary: "...",
    status: "pending_human",         // always requires human
    created_at: "2026-03-19T...",
  })

  (:Proposal)-[:PROMOTED_TO]->(:GlobalProposal)
  (:GlobalProposal)-[:SUPPORTED_BY]->(:Pattern)  // from other projects
  (:GlobalProposal)-[:APPLIED_TO]->(:Project)     // when approved

Report Section Addition

Add to the IMPROVEMENT LOOP STATUS section of the audit report:

  ### Cross-Project Generalizations ({count})
  | # | Source Project | Target | Scope | Supporting Projects | Status |

