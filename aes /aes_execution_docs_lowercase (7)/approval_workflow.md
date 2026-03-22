# approval_workflow

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- AES planning readiness: **YES**
- Risk level: **HIGH**
- WorkItemType: `WIT-APPROVAL`

## Why this file is first
This is the strongest current feature packet:
- 8 rules
- 8 failure modes
- 2 business rules
- 16 evaluations
- 5 metrics
- 2 flows
- 3 UI patterns

## Core capability
Multi-step approval chains with request/review/approve/reject, delegation, escalation, SLA tracking, audit, and notifications.

## Current plan shape
Use the 9-section canonical execution template.

## Key feature units
1. Approval queue and triage
2. Approve with optimistic update
3. Request detail and approval chain
4. Bulk approve
5. Delegation with auto-return
6. SLA escalation
7. Reject with required comment
8. Approval history and audit trail
9. Approval chain visualization
10. Status badges and comments
11. Role-aware landing
12. Notification integration

## Core blocking backend work
- approval mutations
- self-approval guard
- rejection comment guard
- immutable audit log writes
- SLA timer and escalation engine
- notification emission with causal event + deduplication

## Core blocking frontend work
- approval queue screen
- request detail screen
- reject dialog with required comment
- primary accessibility layer
- role-aware landing and field visibility

## Core QA focus
- self-approval prevention
- audit log immutability
- bulk atomicity
- SLA escalation timer
- notification routing determinism
- role-based landing accuracy
- field visibility matrix
- activation milestone completion

## Key blocking rules
- `RULE-017` Self-Approval Prevention
- `RULE-029` Rejection Requires Reason
- `RULE-004` Audit Log Immutability
- `RULE-036` Notification Must Have Causal Event And Deduplication
- `RULE-NO-SELF-APPROVAL`
- `RULE-REJECT-REQUIRES-COMMENT`

## Important failure modes to prevent
- `FAIL-003` SoD Bypass Privilege Escalation
- `FAIL-018` Infinite Rejection Loop
- `FAIL-032` Ghost Notification
- `FAIL-035` Role-Blind Landing Experience
- `FAIL-036` Field Visibility Leak
- `FAIL-039` Activation Drift

## Metrics to wire in implementation
- `MET-054` Approval Bottleneck Time
- `MET-058` Notification Deduplication Success Rate
- `MET-059` Role-Based Landing Accuracy Rate
- `MET-057` Onboarding Activation Rate
- `MET-061` Activation Milestone Completion Rate

## Phased execution order
### Phase 0 — Foundation
- data model
- state machine
- blocking backend guards
- QA for blocking guards

### Phase 1 — Core UI
- queue screen
- request detail
- approve/reject flow
- accessibility
- happy path E2E

### Phase 2 — Integration
- notifications
- SLA timers
- escalation jobs
- integration QA

### Phase 3 — Power features
- bulk actions
- delegation
- advanced chain visualization

### Phase 4 — Metrics and acceptance
- metrics pipeline
- landing/onboarding integration
- production gates

## Known graph gaps
- no `FeatureConsultation` node yet for `approval_workflow`
- `RULE-029` has no direct TESTS evaluation
- `FAIL-018` has no direct DETECTS evaluation

## Execution verdict
Use this as the first real execution plan.
