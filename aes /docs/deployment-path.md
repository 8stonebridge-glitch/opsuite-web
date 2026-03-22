# AES Deployment Path

This file defines what must be real from day one, what can be mocked first, and the recommended implementation order.

## 1. What Must Be Real from Day One

- Neo4j truth queries
- graph snapshots and freshness hashes
- immutable bridge artifacts
- immutable validator artifacts
- hard veto checks
- pre-build validation
- post-build validation
- read/write scope enforcement
- orchestrator-owned state transitions
- write-back gating

## 2. What Can Be Mocked Initially

- research adapter
- full operator console UI
- multi-validator council beyond 1-2 validators
- AST-level semantic diff, if path diff plus evidence capture is enough for first pass
- automated promotion from `VERIFIED_RESTRICTED` to `VERIFIED`

## 3. Suggested Build Order

1. Artifact registry and evidence store
2. Neo4j query and graph snapshot services
3. hard veto engine and confidence engine
4. bridge compiler and bridge validator
5. orchestrator core and state machines
6. Claude builder session manager and scope guard
7. validator coordinator and validator adapters
8. write-back manager
9. governance gateway
10. operator console
11. research gateway

## 4. MVP vs Full Platform

### MVP
- one orchestrator runtime
- one builder session
- one or two validators
- file-based or database-backed artifact registry
- full enforcement on scope, freshness, and completion

### Full Platform
- multi-bridge scheduling
- dependency propagation
- operator console
- governance review workflows
- full telemetry and dashboards
- replay tooling
- promotion workflows for graph learning
- external research integration

## 5. Final Platform Definition

AES is a governed execution platform where:
- Neo4j provides truth
- the orchestrator compiles truth into bridges
- builders execute only within those bridges
- validators independently verify reality
- artifacts make every decision replayable
- governance handles unresolved risk
- validated outcomes enrich future truth

The result is not an AI coding assistant. It is a controlled software execution platform that uses AI as one runtime component inside a stricter system.
