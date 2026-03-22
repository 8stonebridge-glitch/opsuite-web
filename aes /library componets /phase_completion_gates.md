# Phase Completion Gates

This file defines when a phase is actually complete.

## General rule
A phase is complete only when all of the following are true:
- implementation items are merged or otherwise accepted
- QA checks for that phase pass
- no blocker remains open
- all dependent downstream teams can begin without ambiguity

## Onboarding Sprint 3 gate
- all step placeholders replaced with real controls
- validation behavior confirmed
- uploads constrained correctly
- draft resume confirmed
- SSO landing confirmed
- Sprint 3 QA defect list closed

## Onboarding Sprint 4 gate
- start/completion/milestone events emitted correctly
- `MET-057` validated
- `MET-061` validated
- final branch QA pass complete
- acceptance signed

## Notification Sprint 1 gate
- preference gate blocks opted-out traffic
- causal linkage stored
- dedup suppression works
- retry/dead-letter path works
- timing instrumentation exists

## Notification Sprint 2 gate
- inbox is visible and accurate
- unread badge is accurate
- preferences save and take effect
- accessibility baseline passes

## Notification Sprint 3 gate
- timing refinement issues addressed
- retry state visible
- dead-letter operations view functional
- replay path works
- routing determinism pass succeeds

## Notification Sprint 4 gate
- `MET-058` wired
- `MET-058` validated
- final QA complete
- acceptance signed
- release notes / known gaps documented
