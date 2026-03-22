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
D10. BOOTSTRAPPING — First 5 Audits
───────────────────────────────────────────────────────────────────────

The improvement loop requires accumulated data to function. During
the first 5 audits, the system operates in BOOTSTRAP mode:

Audit 1: Full audit. COLLECT runs. No REFLECT (< 3 signals). No
         proposals. Baseline established.

Audit 2: Delta audit. COLLECT runs. If ≥3 signals accumulated,
         REFLECT runs. Proposals may be generated but are held
         (not applied) — flagged as [BOOTSTRAP_HOLD].

Audit 3: Delta audit. COLLECT + REFLECT + PROPOSE all run.
         STANDARD proposals may be applied. RESTRICTED/CRITICAL
         proposals are held for human.

Audit 4: Full loop runs. VERIFY checks any applications from
         audit 3.

Audit 5: Full loop runs. Governance review (B4) becomes eligible.
         Bootstrap mode ends. System operates normally from here.

During bootstrap, the improvement success rate metric is not
calculated (insufficient data). It starts reporting at audit 6.

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

───────────────────────────────────────────────────────────────────────
D12. MIGRATION FROM v9 IMPROVEMENT PROCESS
───────────────────────────────────────────────────────────────────────

v9 had no formal improvement process. "Step 8" in audit.md was a
post-audit reflection prompt. v10 replaces this with a mechanical
pipeline.

Migration steps:
1. Add (:Project), (:Signal), (:Pattern), (:Proposal),
   (:GlobalProposal), (:Application), (:VerificationResult),
   (:ValidationResult), (:Rollback), (:RuleVersion),
   (:PromptVersion), (:ConfigSnapshot) node types to Neo4j schema
2. Add all new relationships to the schema (see D8 for full list)
3. Create (:Project) nodes for each existing audited repository.
   Run stack detection (D0.5) for each.
4. Backlink existing (:Audit) nodes to their (:Project) via
   (:Project)-[:AUDITED_BY]->(:Audit)
5. Set IMPROVEMENT_LOOP_ENABLED=true
6. First audit after migration starts in BOOTSTRAP mode (D10)
7. Any existing "improvement tickets" from v9 Step 8 can be manually
   converted to (:Proposal) nodes with status = 'pending',
   safety_tier = 'RESTRICTED', and scope = 'PROJECT'
   (since they were never validated or generalized)

