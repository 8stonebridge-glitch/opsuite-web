# TLA PreCheck Setup

We added the first OpSuite machine here:

- [opsuiteTaskLifecycle.machine.ts](/Users/sunday/Desktop/opsuite/web/src/machines/opsuiteTaskLifecycle.machine.ts)

## What it models

This first machine is intentionally narrow. It captures the core task workflow:

- manager-created task -> `open`
- employee-raised task -> `pendingApproval`
- approve -> `open`
- decline -> `declined`
- open -> inProgress
- inProgress -> submitted
- submitted -> verified
- submitted -> rework
- rework -> inProgress

It also encodes these invariants:

- manager-created tasks never enter approval-only states
- approval-only states belong only to employee-raised tasks
- submitted/rework/verified require work to have started

## Important note

The machine uses the target workflow contract with `submitted`, and the current web shell has now been aligned to that review-state naming.

## Commands

From `/Users/sunday/Desktop/opsuite/web`:

```bash
npm run tla:check:tasks
npm run tla:build:tasks
```

## Current status

The machine is fully wired and the proof step is now working on this machine.

`npm run tla:check:tasks` passes with:

- state equivalence confirmed
- edge equivalence confirmed
- 13 runtime states
- 14 runtime edges

That gives us a formal check on the core task lifecycle before we rely on browser tests.

## Recommended next order

1. expand the machine for rework/no-change/accountability if needed
2. extend browser coverage beyond auth + People into task lifecycle flows
3. add deeper backend authorization checks for manager vs employee transitions
