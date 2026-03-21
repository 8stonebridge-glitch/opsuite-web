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
D9. REPORT TEMPLATE ADDITIONS
───────────────────────────────────────────────────────────────────────

Add the following sections to the end of the audit report template:

## IMPROVEMENT LOOP STATUS

### Signals Collected ({count})
| # | Type | Description | Related Files |

### Patterns Detected ({count})
| # | Type | Confidence | Signal Count | Description |

### Proposals Generated ({count})
| # | Target | Action | Safety | Status | Success Criterion |

### Pending Human Approvals ({count})
| # | Proposal | Target | Action | Agent Verdict | Approve? |

### Verifications ({count})
| # | Proposal | Applied In | Outcome | Evidence |

### Rollbacks ({count})
| # | Proposal | Reason | Rolled Back In |

### System Health
| Metric | Value |
|--------|-------|
| Total proposals (all time) | {n} |
| Applied | {n} |
| Verified pass | {n} |
| Verified fail | {n} |
| Rolled back | {n} |
| Pending verification | {n} |
| Improvement success rate | {pass / (pass + fail)}% |
| False positive rate (last 10 audits) | {n}% |
| Average signals per audit | {n} |

───────────────────────────────────────────────────────────────────────
D11. CONFIGURATION
───────────────────────────────────────────────────────────────────────

Environment Variables (add to existing config)

# Improvement loop
IMPROVEMENT_LOOP_ENABLED=true          # master switch
SIGNAL_MIN_FOR_REFLECT=3               # min signals before reflection
PATTERN_MIN_CONFIDENCE=MEDIUM          # min confidence to generate proposals
MAX_PROPOSALS_PER_AUDIT=5              # rate limit
MAX_AUTO_APPLY_PER_AUDIT=3             # rate limit for STANDARD tier
SCORING_WEIGHT_CHANGE_COOLDOWN=10      # audits between weight changes
SEVERITY_THRESHOLD_CHANGE_COOLDOWN=10  # audits between severity changes
PROMPT_REFINEMENT_COOLDOWN=10          # audits between prompt changes (per agent)
RULE_MODIFICATION_COOLDOWN=5           # audits between modifications (per rule)
MAX_NEW_CANDIDATE_RULES_PER_10=3       # max new CANDIDATE rules per 10 audits
OSCILLATION_COOLDOWN=10                # audits of cooldown after modify→rollback
VERIFY_CARRY_FORWARD_MAX=5             # max inconclusive before stale
VERIFY_BASELINE_WINDOW=5               # audits for moving average baseline
SIGNAL_STALE_THRESHOLD=10              # audits before unreflected signal goes stale
BOOTSTRAP_AUDIT_COUNT=5                # audits before full loop activation
GENERALIZE_MIN_PROJECTS=2              # min other projects for cross-project promotion
STACK_DETECTION_REFRESH=true           # re-detect stack on lockfile change

