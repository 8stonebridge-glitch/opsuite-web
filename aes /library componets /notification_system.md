# notification_system

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- Execution readiness: `READY TO FINISH`
- Risk level: `MEDIUM`

## Goal
Ship notifications as a full operational feature, including:
- reliable backend dispatch
- visible in-app center
- preference controls
- operator visibility for retries and dead letters
- validated deduplication metric

## Current governance coverage
- `RULE-008` Notification Preference Check
- `RULE-036` Notification Must Have Causal Event And Deduplication
- `FAIL-006` Notification Storm
- `FAIL-007` Silent Notification Drop
- `FAIL-032` Ghost Notification
- `EVAL-008` Notification Preference Enforcement
- `EVAL-010` Dead Letter Queue on Failure
- `EVAL-030` Notification Delivery Timing
- `EVAL-045` Notification Routing Determinism
- `MET-058` Notification Deduplication Success Rate
- `UI-003` Inbox Triage Queue

## Structural note
These gaps are real but non-fatal for release:
- no `WorkItemType` bridge
- no notification-specific `Flow`
- `RULE-022` exists but is not bridged

## Remaining execution scope
### Sprint 1
- preference gate
- causal linking
- deduplication
- retry and dead-letter
- timing instrumentation

### Sprint 2
- notification center
- unread badge
- preference controls
- app shell integration
- accessibility baseline

### Sprint 3
- timing refinement
- retry visibility
- dead-letter operations view
- preference UX improvement
- routing determinism validation

### Sprint 4
- wire and validate `MET-058`
- final QA pass
- acceptance closure
- release readiness

## Hard blockers
- dispatch cannot bypass preference gate
- failures cannot disappear without retry or dead-letter
- badge must reflect real unread state
- dedup metric must be wired and validated before release

## Verdict
Notification system is now a bounded four-sprint execution target, not an exploratory infrastructure bucket.
