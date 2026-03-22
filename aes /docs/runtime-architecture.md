# AES Runtime Architecture

This file covers the platform shape, core runtime components, trust boundaries, and end-to-end data flow for AES.

## 1. Platform Shape

AES should be built as four cooperating planes:

1. Control plane
   - decides whether a build can happen
   - computes confidence
   - enforces hard vetoes
   - generates and validates bridges
   - owns state transitions

2. Data plane
   - stores graph truth, artifacts, evidence, and metrics
   - preserves replay and audit history

3. Execution plane
   - runs Claude builder sessions
   - enforces `read_scope` and `write_scope`
   - coordinates validators

4. Governance plane
   - handles human escalation
   - approves or blocks sensitive decisions
   - reviews write-back and conflicts

The platform should begin as one orchestrated runtime with adapters, but each subsystem should be designed so it can later become a separate service without changing the operating contract.

## 2. Core Components

| Component | Role | Trust level |
|---|---|---|
| `Request Intake API` | accepts feature/build requests, creates request records, normalizes metadata | trusted |
| `Orchestrator Core` | owns sequencing, policy application, state transitions, and authority checks | trusted |
| `Graph Query Service` | reads Neo4j truth for specs, rules, flows, patterns, anti-patterns, dependencies, and domain risk | trusted |
| `Graph Snapshot Service` | captures `graph_snapshot_id`, referenced node set, and `graph_truth_hash` for bridge freshness | trusted |
| `Hard Veto Engine` | evaluates stop conditions before confidence scoring | trusted |
| `Confidence Engine` | computes `GraphCoverage`, `PatternStrength`, `RuleConsistency`, `EvidenceLevel`, and final confidence | trusted |
| `Bridge Compiler` | converts graph truth into bridge JSON | trusted |
| `Bridge Validator` | validates bridge schema, freshness, test mapping, dependency readiness, and hard veto pass | independent trusted gate |
| `Dependency Resolver` | evaluates `depends_on_bridge_ids`, `predecessor_build_ids`, and dependency invalidation | trusted |
| `Claude Session Manager` | starts, tracks, and ends orchestrator and builder Claude sessions | trusted |
| `Scope Guard` | enforces `read_scope`, `write_scope`, interface limits, and approved amendments | trusted runtime gate |
| `Builder Adapter` | feeds bridge JSON into Claude Code and captures build outputs | untrusted execution boundary |
| `Validator Coordinator` | invokes validator agents/tools, aggregates outcomes, and classifies hard-domain failures | trusted |
| `Validator Adapters` | run file review, test execution, diff review, AST checks, security checks, and e2e checks | independent verification boundary |
| `Artifact Registry` | stores immutable JSON artifacts and status history | trusted |
| `Evidence Store` | stores large artifacts: diffs, logs, test outputs, screenshots, traces | trusted |
| `Write-Back Manager` | applies write-back policy and promotes knowledge into graph truth | trusted |
| `Research Gateway` | calls Perplexity/Gemini only when trigger rules require it | untrusted external boundary |
| `Governance Gateway` | routes human escalation for finance, security, compliance, permissions, and conflicting truths | human authority boundary |
| `Operator Console` | UI for replay, audit, queue inspection, bridge review, conflict review, and write-back approval | trusted operational interface |
| `Metrics/Telemetry Service` | tracks runtime metrics, build integrity, drift, completion honesty, and validator performance | trusted |

## 3. Trust Boundaries

1. Trusted policy boundary
   - orchestrator, veto checks, confidence, bridge validation, dependency checks, freshness checks, state transitions

2. Trusted truth boundary
   - Neo4j graph truth
   - graph snapshots
   - canonical and verified write-back targets

3. Untrusted generation boundary
   - Claude builder session
   - generated code
   - external research results

4. Independent verification boundary
   - validators must be separate from builder context
   - validators can fail the build

5. Human governance boundary
   - high-risk conflicts and approvals that AES cannot resolve alone

## 4. End-to-End Data Flow

1. Request enters `Request Intake API`
2. `Orchestrator Core` classifies feature and requests graph truth
3. `Graph Query Service` returns relevant truth and references
4. `Graph Snapshot Service` creates snapshot and truth hash
5. `Hard Veto Engine` evaluates stop conditions
6. `Confidence Engine` computes score if no veto triggered
7. `Bridge Compiler` creates bridge JSON
8. `Bridge Validator` validates the bridge
9. `Dependency Resolver` confirms hard dependencies are satisfied
10. `Orchestrator Core` authorizes build and starts builder session via `Claude Session Manager`
11. `Scope Guard` enforces read/write/interface boundaries during execution
12. Builder outputs code, tests, and runtime artifacts
13. `Validator Coordinator` triggers validators and gathers evidence
14. `Orchestrator Core` sets build/bridge terminal state based on validator results
15. `Write-Back Manager` writes approved learnings back to Neo4j and artifact store
16. `Metrics/Telemetry Service` records system outcomes
