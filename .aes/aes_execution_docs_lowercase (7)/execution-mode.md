# EXECUTION MODE

## Purpose
This file explains how the AES should use the current execution docs.

## Two layers

### Layer 1 — AES Core System Docs
These remain the permanent system docs for:
- consultation
- retrieval
- audit
- enforcement
- schema
- safety
- loops
- migration

They explain **how the AES works**.

### Layer 2 — Feature Execution Docs
These are the current feature-specific execution files:
- `approval_workflow.md`
- `reporting.md`
- `onboarding.md`
- `notification_system.md`

They explain **what the AES should build right now**.

## Usage rule
If a feature has a current execution file:
- prefer that file over generating a new freeform plan from scratch
- still use the AES core docs for consultation, enforcement, and audit
- regenerate only if the graph or packet changed materially

## Execution flow
1. identify feature type
2. generate or load current packet
3. load matching execution doc if present
4. use execution doc as the planning baseline
5. use AES core docs for enforcement, review, and audit
6. if graph gaps block implementation, record them and propose a small bridge/fix batch

## Blocking vs advisory
Execution docs preserve blocking vs advisory distinctions from the packet and planner template.
Do not downgrade a blocking item during implementation unless the graph and packet are updated first.

## If no execution file exists
Use the canonical execution template and current packet to generate a new plan, then save it as a new feature execution doc.
