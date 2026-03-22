# AES State Machines

This file defines bridge, build, and validator lifecycles, the authority for each transition, and invalid transitions.

## 1. Bridge Lifecycle

States:
- `DRAFT`
- `VALIDATED`
- `REJECTED`
- `STALE`
- `SUPERSEDED`
- `EXECUTING`
- `EXECUTED`

Authority:
- Planner / Bridge Compiler: `DRAFT`
- Pre-Build Validator: `VALIDATED`, `REJECTED`
- Freshness Checker: `STALE`
- Orchestrator: `SUPERSEDED`, `EXECUTING`, `EXECUTED`

Invalid transitions:
- builder setting any bridge state
- `REJECTED -> EXECUTING`
- `STALE -> EXECUTING`
- `DRAFT -> EXECUTING`
- `EXECUTED -> DRAFT`

## 2. Build Lifecycle

States:
- `QUEUED`
- `AUTHORIZED`
- `RUNNING`
- `BLOCKED`
- `FAILED`
- `PASSED`

Authority:
- Orchestrator: `QUEUED`, `AUTHORIZED`, `BLOCKED`
- Builder runtime: `RUNNING`
- Post-build Validator Coordinator: `PASSED`, `FAILED`

Invalid transitions:
- builder setting `PASSED`
- validator setting `RUNNING`
- `QUEUED -> PASSED`
- `FAILED -> RUNNING` without a new build record

## 3. Validator Lifecycle

States:
- `QUEUED`
- `RUNNING`
- `PASS`
- `PASS_WITH_CONCERNS`
- `FAIL`

Authority:
- Validator Coordinator: `QUEUED`
- Validator Runner: `RUNNING`, terminal recommendation
- Orchestrator: may supersede a validator run by triggering a new run, not mutating the old one

Invalid transitions:
- builder mutating validator state
- terminal run being reopened in place
- validator returning terminal result without evidence

## 4. Dependency and Invalidation Notes

- hard dependencies must complete before downstream bridge execution
- upstream `STALE`, `REJECTED`, or `SUPERSEDED` invalidates downstream hard dependencies
- soft dependency failures trigger review rather than immediate block
