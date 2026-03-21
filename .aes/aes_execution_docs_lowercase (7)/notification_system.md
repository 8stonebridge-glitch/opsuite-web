# notification_system

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- AES planning readiness: **CONDITIONAL YES**
- Risk level: **MEDIUM**

## Core capability
Push notifications, in-app notification center, badge management, and notification preferences.

## Current governance coverage
Notification system is now usable because it can reach:
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
Two absences are expected, not fatal:
- no `WorkItemType` bridge because notifications are not work items
- no notification-specific `Flow` yet in the ops graph

## Backend priorities
- preference-aware notification dispatch
- causal event linking
- deduplication/suppression logic
- retry/dead-letter handling
- delivery timing instrumentation

## Frontend priorities
- in-app notification center
- badge state management
- preference controls
- notification list rendering
- notification interaction states

## QA priorities
- preference enforcement
- dead-letter handling
- delivery timing
- routing determinism
- deduplication behavior

## Metrics priorities
- `MET-058`

## Known remaining gaps
- no BusinessRule bridge
- no FeatureConsultation node
- no notification flow in ops graph
- `RULE-022` Notification Decouple exists in ops graph but is not bridged yet

## Execution verdict
Usable for planning. Structural gaps are expected for an infrastructure-style feature, but governance is now good enough to proceed.
