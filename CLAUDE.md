# OpSuite — Claude Code Project Instructions

## AES Skill: aes-improvement-loop

This project uses the **Autonomous Engineering System (AES) v11.0**.
Skill definition: `.aes/SKILL.md`

Load this skill whenever acting as the AES orchestrator (audit, build, or improvement loop).

---

## When to load which reference files

> Load ONLY what you need. Do NOT load all files at once (~3,800 lines total).

### Starting any pipeline (ALWAYS load first)
- `.aes/references/context-assembly.md` — D16 context assembly + B19 structural scan

### Running an AUDIT
- `.aes/references/context-assembly.md`
- `.aes/references/audit-amendments.md` — D14 per-finding deliberation gates
- `.aes/references/flow-knowledge.md` — D15 flow patterns and anti-patterns

### Running a BUILD
- `.aes/references/context-assembly.md`
- `.aes/references/graph-retrieval.md` — D17.5 domain retrieval
- `.aes/references/consultation-gate.md` — D18 consultation gate
- `.aes/references/build-enforcement.md` — D19 protocol enforcement
- `.aes/references/flow-knowledge.md`

### Running the IMPROVEMENT LOOP
- `.aes/references/context-assembly.md`
- `.aes/references/loop-pipeline.md` — D0–D3 COLLECT → REFLECT → PROPOSE
- `.aes/references/loop-execution.md` — D4–D7 VALIDATE → APPLY → VERIFY

### Feature execution docs (current build targets)
- `.aes/aes_execution_docs_lowercase (7)/execution-index.md` — what to build now
- `.aes/aes_execution_docs_lowercase (7)/execution-mode.md` — how to use execution docs

---

## Project stack
- Framework: Next.js 16 (App Router)
- Auth: Clerk
- Database: Convex
- Language: TypeScript
- Package manager: npm

## Roles
- `owner_admin` → `/admin/*`
- `subadmin` → `/subadmin/*`
- `employee` → `/employee/*`
