# onboarding

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- AES planning readiness: **CONDITIONAL YES**
- Risk level: **MEDIUM**
- WorkItemType: `WIT-REQUEST`

## Core capability
Multi-step onboarding wizard with role-based branching, progressive disclosure, skip/resume, and first-session activation.

## Current governance coverage
Onboarding is now usable because it can reach:
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

## Core build focus
1. onboarding wizard shell
2. step persistence and resume
3. role-based branching
4. checklist/progress state
5. guided empty states
6. activation milestone completion

## Backend priorities
- onboarding progress persistence
- role-aware branching resolution
- resume/skip state handling
- activation milestone recording

## Frontend priorities
- multi-step wizard
- step indicator
- guided empty states
- resume and skip UX
- first-session flow transitions

## QA priorities
- activation milestone completion
- step resume persistence
- onboarding completion path
- branch correctness by role

## Metrics priorities
- `MET-057`
- `MET-061`

## Known remaining gaps
- no BusinessRule bridge
- no FeatureConsultation node yet for onboarding
- still thin governance: broader onboarding rules remain unbridged
- future bridge improvement could add `RULE-039`, `RULE-041`, `RULE-044`

## Execution verdict
Usable for core activation flow, but still thinner than approval_workflow and reporting.
