# onboarding

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- Execution readiness: `READY TO FINISH`
- Risk level: `MEDIUM`
- WorkItemType: `WIT-REQUEST`

## Goal
Ship onboarding as a complete feature by closing Sprint 3 and Sprint 4 with explicit gates for:
- wizard completeness
- SSO entry correctness
- resume correctness
- activation instrumentation
- acceptance and release sign-off

## Core capability
Multi-step onboarding wizard with role-aware branching, persistence, guided activation, and milestone measurement.

## Current governance coverage
- `RULE-045` First Session Must Drive Activation Milestone
- `FAIL-039` Activation Drift
- `EVAL-048` Onboarding Activation Completion
- `EVAL-054` Activation Milestone Completion
- `MET-057` Onboarding Activation Rate
- `MET-061` Activation Milestone Completion Rate
- `FLOW-002` Invitation and Member Onboarding
- `FLOW-015` First Session Activation Flow
- `UI-012` Onboarding Checklist UI
- `UI-017` Guided Empty State

## Remaining execution scope
### Sprint 3
- replace placeholder steps with production field controls
- implement field validation and upload constraints
- wire auto-save into real step transitions
- complete SSO/token landing into the wizard
- close the full Sprint 3 QA pass

### Sprint 4
- wire and validate activation metrics
- validate milestone completion logic
- run final branch/role QA
- close acceptance criteria
- achieve ship readiness

## Hard blockers
- no phase is complete until its gate in `phase_completion_gates.md` passes
- Sprint 4 does not start until Sprint 3 is closed
- metrics are not accepted unless validated against real branch and resume paths

## Verdict
Onboarding is no longer in planning limbo. It is a finishable feature with two remaining execution sprints and a clear release gate.
