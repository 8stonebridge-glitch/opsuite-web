# AES Docs Map

## Core system docs
These are the permanent source-of-truth system docs:
- `AES PROMPT.md`
- `AUDIT.md`
- `BUILD ENFORMENT.md`
- `CONSULTATION GATE.md`
- `CONTEX.md`
- `DOMAIN.md`
- `FLOW KNOWLEDGE.md`
- `GENERALIZATION.md`
- `GRAPH RETRIVAL.md`
- `LOOP.md`
- `LOOPS.md`
- `MIGRATION.md`
- `SAFETY.md`
- `SCHEMA.md`
- `SKILL.md`

## What they do
- define the AES operating model
- define consultation and retrieval
- define schema and enforcement rules
- define audit and safety behavior
- define loops and learning behavior

## Execution docs
These are output docs produced from the graph and packet runtime:
- `approval_workflow.md`
- `reporting.md`
- `onboarding.md`
- `notification_system.md`
- `execution-index.md`
- `EXECUTION-MODE.md`

## What they do
- package current feature-specific planning outputs
- keep files small enough for reliable use
- let the AES reuse an approved plan instead of regenerating it every time

## Source-of-truth hierarchy
1. live graph
2. canonical packet spec + runtime contract
3. current feature packet
4. current feature execution doc
5. freeform reasoning

## Practical rule
If the graph and packet disagree with an execution doc, update the execution doc.
If an execution doc disagrees with freeform reasoning, prefer the execution doc.
