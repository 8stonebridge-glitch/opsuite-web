---
name: aes-improvement-loop
description: >-
  AES v11.0 Part D — The Improvement Loop. Use when running an audit pipeline,
  build pipeline, or improvement loop for any project. Covers signal collection,
  pattern detection, proposal generation, validation, application, verification,
  context assembly, flow knowledge, audit pipeline safety amendments,
  prescriptive graph enforcement, consultation gates, and build-side protocol
  violation detection. Load this skill whenever Claude is acting as the AES
  orchestrator.
metadata:
  version: '11.0'
  author: greyhaven
  part: D
  depends-on: Part A (Audit Intelligence), Part C (Neo4j Schema)
---

# AES v11.0 — Part D: The Improvement Loop

## Mission

The AES is a self-improving autonomous engineering system. It doesn't just
build and audit — it learns from every build, every audit, every failure, and
every success. Each cycle makes the next one better. The system grows its own
intelligence.

Every rule in this spec exists to serve that mission. When you hit an edge case
not covered by a specific rule, reason from this: does this action make the
system smarter for next time? If yes, do it. If no, don't.

## What This Skill Covers

This skill defines how the Autonomous Engineering System learns from its own
output. The audit pipeline (Parts A–C) produces scored reports. The improvement
loop consumes those reports and makes the system better. The build pipeline
produces features. The consultation gate (D18) ensures knowledge is provably
consulted before building. Protocol enforcement (D19) ensures violations are
recorded and failures become project-scoped memory.

## Fundamental Rules

1. **Project scoping**: Every artifact — signal, pattern, proposal, application,
   verification, rollback, consultation, failure case, protocol violation — is
   scoped to a `(:Project)`. Lessons from one project are local until
   generalized through D13.

2. **Evidence over intuition**: No agent may approve a proposal or dismiss a
   finding on intuition alone. Every decision must cite external evidence,
   prior validated deliberation, or repeated internal signal evidence.

3. **Context assembly first**: Before any pipeline runs, D16 assembles all
   relevant knowledge from Neo4j into a structured context bundle. The
   orchestrator never starts with less knowledge than the system has available.

4. **Consultation before build**: Before any build or Codex call, D18 requires
   a complete FeatureConsultation artifact proving the right domains were
   consulted. Domain selection is graph-driven (D17), not intuitive.

5. **Independent quality checks**: AutoContext evaluates build output
   independently (D19.3). It judges but never suggests. AES does the work,
   AutoContext checks it.

## Agent Roles

| Agent       | Role                                      |
|-------------|-------------------------------------------|
| Claude      | Orchestrator — runs the loop, decisions   |
| Codex       | Deep code reviewer — finds what Claude misses |
| Gemini      | Pre-build research — docs, APIs, compatibility |
| Perplexity  | Real-time web knowledge — current practices |
| AutoContext | Quality gate — evaluates output, never suggests |

Nobody grades their own work. Claude builds → Codex reviews. Claude proposes →
the loop validates with evidence. Pipeline produces output → AutoContext checks.

## When to Load Which Reference

Load ONLY the reference files needed for your current task. Do NOT load all
files — they total ~3,700 lines. Each file is self-contained for its concern.

### Starting any pipeline (ALWAYS load first)
- `references/context-assembly.md` — D16. Query catalog, pipeline profiles,
  budget trimming. This runs before everything else.

### Running an AUDIT
- `references/context-assembly.md` — D16 (load first)
- `references/audit-amendments.md` — D14. Per-finding deliberation gates,
  evidence rules, protocol violation detection, flow testing, report header.
- `references/flow-knowledge.md` — D15. Flow patterns, anti-patterns,
  archetype catalog, Step 3.5 Phase 2 prescriptive comparison.

### Running a BUILD
- `references/context-assembly.md` — D16 (load first)
- `references/graph-retrieval.md` — D17.5. Graph-driven domain retrieval.
  Replaces manual relevantDomains. Required before D18.
- `references/consultation-gate.md` — D18. Consultation procedure, artifact
  creation, coverage validation. Required before calling Codex.
- `references/build-enforcement.md` — D19. Protocol violations, failure memory,
  AutoContext quality gate. Runs throughout and after build.
- `references/flow-knowledge.md` — D15. Flow patterns as design constraints.

### Running the IMPROVEMENT LOOP (proposing changes)
- `references/context-assembly.md` — D16 (load first)
- `references/loop-pipeline.md` — D0–D3. COLLECT → REFLECT → PROPOSE. Signal
  extraction, pattern recognition, change generation.

### Running the IMPROVEMENT LOOP (executing changes)
- `references/context-assembly.md` — D16 (load first)
- `references/loop-execution.md` — D4–D7. VALIDATE → APPLY → VERIFY. Evidence
  gates, implementation, outcome measurement.

### First audit / new project setup
- `references/bootstrap-and-migration.md` — D0.5 (stack detection), D10
  (bootstrapping first 5 audits), D12 (migration from v9/v10).

### Schema questions or graph queries
- `references/schema.md` — D8. All node types, relationships, query examples.
  Updated for v11 with FeatureConsultation, FailureCase, ProtocolViolation.

### Configuration or safety questions
- `references/safety-and-config.md` — D6 (rate limits, cooldowns), D9 (report
  template), D11 (scoring weights, severity thresholds).

### Cross-project knowledge sharing
- `references/generalization.md` — D13. How verified, project-scoped proposals
  get promoted to global proposals.

### Graph migration / domain normalization
- `references/domain-normalization.md` — D17.1–D17.4. ALIAS_OF pattern,
  canonical domain mapping, constraint enforcement, orphan cleanup.
- `references/graph-retrieval.md` — D17.5. Graph-driven retrieval query,
  7-step procedure replacing manual domain selection.

## Quick Reference Tables

### Pipeline Flow — Audit
```
B19 (Structural Scan) → D16 (Context) → D0.5 (Stack) → D1 (Collect) →
D2 (Reflect) → D3 (Propose) → D4 (Validate) → D5 (Apply) → D7 (Verify) →
D13 (Generalize)
```

### Pipeline Flow — Build
```
B19 (Structural Scan) → D16 (Context) → D17.5 (Graph Retrieval) →
D18 (Consultation Gate) → Codex Build → D19.3 (AutoContext Gate) → D7 (Verify)
Protocol enforcement (D19.1) runs throughout. CRITICAL violations halt.
```

### Pipeline Flow — Improvement Loop
```
B19 (Structural Scan) → D16 (Context) → D1 (Collect) → D2 (Reflect) →
D3 (Propose) → D4 (Validate) → D5 (Apply) → D7 (Verify) → D13 (Generalize)
```

### 14 Proposal Targets
| Target              | What it changes                        |
|---------------------|----------------------------------------|
| RULE                | Add, modify, or deprecate a rule       |
| SEVERITY_THRESHOLD  | Change severity classification         |
| SCORING_WEIGHT      | Adjust bucket scoring weights          |
| FLOW_DEFINITION     | Modify critical path definition        |
| CRITICAL_PATH       | Change what counts as critical path    |
| TIMEOUT_CONFIG      | Adjust agent timeouts                  |
| BATCH_CONFIG        | Change batch processing parameters     |
| CONFIDENCE_THRESH   | Adjust pattern confidence threshold    |
| PROMPT_REFINEMENT   | Modify an agent's review prompt        |
| FLOW_PATTERN        | Add/modify a flow pattern (D15)        |
| FLOW_ANTIPATTERN    | Add/modify a flow anti-pattern (D15)   |
| CONTEXT_CONFIG      | Adjust context budgets/profiles (D16)  |
| DOMAIN_WIRING       | Add/modify REQUIRES_DOMAIN edges (D17) |

### Context Budget Defaults
| Pipeline    | Budget   |
|-------------|----------|
| AUDIT       | 12,000 tokens |
| BUILD       | 8,000 tokens  |
| IMPROVEMENT | 10,000 tokens |

### 5 PROTECTED Context Blocks (never trimmed)
B1 (Project Context), B2 (Stack), B5 (Anti-Patterns), B11 (Dead Ends), B19 (Structural Scan)

### v11 New Node Types
| Node                | Purpose                                    |
|---------------------|--------------------------------------------|
| FeatureConsultation | Pre-build knowledge proof artifact (D18)   |
| FailureCase         | Project-scoped build failure record (D19)  |
| ProtocolViolation   | Build/audit protocol bypass record (D19)   |

### v11 Key Rules
- D17.1-A: All REQUIRES_DOMAIN edges must point to canonical domains
- D18.3-E: Claude cannot override a rejected consultation artifact
- D19.1-A: CRITICAL violations halt the build, non-negotiable
- D19.3-A: AutoContext is examiner only — never suggests fixes

## Reference File Sizes (for context budget planning)
| File                       | Lines | Sections            |
|----------------------------|-------|---------------------|
| loop-pipeline.md           | 465   | D0–D3               |
| loop-execution.md          | 373   | D4–D7               |
| domain-normalization.md    | 366   | D17.1–D17.4          |
| graph-retrieval.md         | 117   | D17.5                |
| context-assembly.md        | 495   | D16 (incl. B19)      |
| audit-amendments.md        | 423   | D14                  |
| flow-knowledge.md          | 410   | D15                  |
| build-enforcement.md       | 369   | D19                  |
| consultation-gate.md       | 280   | D18                  |
| safety-and-config.md       | 156   | D6, D9, D11          |
| schema.md                  | 139   | D8                   |
| bootstrap-and-migration.md | 116   | D0.5, D10, D12       |
| generalization.md          | 106   | D13                  |
| **Total**                  | **3,815** |                  |

Max file size: 495 lines (context-assembly.md). No file exceeds 500 lines.

Max load per task (build pipeline, worst case):
  context-assembly + graph-retrieval + consultation-gate + build-enforcement + flow-knowledge
  = 495 + 117 + 280 + 369 + 410 = **1,671 lines**

Max load per task (improvement loop, worst case):
  context-assembly + loop-pipeline + loop-execution
  = 495 + 465 + 373 = **1,333 lines**
