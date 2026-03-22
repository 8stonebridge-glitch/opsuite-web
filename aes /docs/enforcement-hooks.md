# AES Enforcement Hooks

This file defines the runtime guardrails that make AES enforceable rather than advisory.

## 1. Read Scope Enforcement

- every builder read goes through `Scope Guard`
- deny reads outside `read_scope` plus approved amendments
- log denied reads as boundary violations
- security/compliance/finance path expansion requires elevated approval

## 2. Write Scope Enforcement

- every write/edit goes through `Scope Guard`
- deny writes outside `write_scope`
- violation triggers immediate hard fail
- post-build diff confirms writes stayed in allowed scope

## 3. Interface Enforcement

- builder may not create API outside `api_contracts`
- may not emit events outside `events`
- may not mutate DB outside `db_touches`
- any undefined interface touch is a boundary failure

## 4. Bridge Freshness Checks

- run before authorization
- run again immediately before execution
- compare `graph_snapshot_id`, `graph_truth_hash`, and referenced critical nodes
- critical changes invalidate the bridge immediately
- non-critical changes require revalidation

## 5. Dependency Blocking

- hard dependencies must be `EXECUTED` and upstream builds `PASSED`
- soft dependency misses are allowed but flagged
- upstream stale/superseded hard dependency makes downstream bridge `STALE`

## 6. Validator Evidence Capture

- validator output is invalid without typed evidence
- evidence types:
  - `file_line`
  - `test_run`
  - `diff`
  - `runtime_observation`
- evidence is stored separately but linked through artifact refs

## 7. Completion Gating

- builder cannot self-certify
- builder may only signal candidate completion
- final completion requires post-build validation and orchestrator acceptance

## 8. Write-Back Gating

- `PASS` may write back as `VERIFIED`
- `PASS_WITH_CONCERNS` may write back only as `VERIFIED_RESTRICTED`
- `FAIL` cannot write back
- conflicting knowledge follows the locked conflict rules

## 9. Controlled Read-Scope Expansion

- builder may request expansion
- builder may not self-expand read scope
- only validator/orchestrator-authorized amendment can widen scope
- protected domains require elevated approval
