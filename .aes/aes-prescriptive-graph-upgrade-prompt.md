# AES Prescriptive Graph Upgrade — Full Migration Prompt

You are updating my Neo4j graph and retrieval logic for the Autonomous Engineering System (AES).

You must work from the CURRENT graph state below and make targeted upgrades, not a greenfield redesign.

---

## CURRENT GRAPH FACTS

- FeatureType already exists: 20 nodes
- FeatureDomain already exists: 16 nodes
- REQUIRES_DOMAIN already exists: 88 relationships
- FeatureSpec exists: 166 nodes
- AppArchetype exists: 6 nodes
- Project exists: 8 nodes
- FeatureConsultation does NOT exist
- FailureCase does NOT exist
- ProtocolViolation does NOT exist
- Duplicate / empty domains exist:
  - approvals-workflows
  - maps-location
  - media-files
- Zero-coverage / alias-mismatch domains exist:
  - auth-session-security
  - interaction-timing
- Several required domains for the next AES layer are missing or only exist under different names:
  - multi_tenant (missing)
  - api_architecture (missing)
  - state_management (missing)
  - real_time (missing)
  - notification (maps to notifications-alerts)
  - performance (missing)
  - async_events (missing)
  - security (maps to auth-session-security)
  - failure_patterns (missing)
  - forms_validation (maps to forms-input)
  - error_states (missing)
  - auth (maps to auth-session-security)
  - navigation (missing)
- Constraints are incomplete:
  - missing uniqueness on FeatureDomain.name
  - missing uniqueness on FeatureSpec.id
  - missing uniqueness on Rule.id
  - missing uniqueness on Knowledge.topic
- Orphans exist:
  - 125 orphaned Rule nodes
  - 119 orphaned Decision nodes

---

## GOAL

Convert the graph from "helpful descriptive retrieval" to "prescriptive pre-build enforcement" for AES, while respecting the current graph and avoiding unnecessary destructive changes.

---

## WHAT TO DO

### PHASE 1 — INSPECT FIRST

Inspect the current Neo4j schema, labels, relationships, constraints, and retrieval code before changing anything.

Show me:
1. the current retrieval/query path that chooses domains
2. whether manual relevantDomains or equivalent is still used
3. where FeatureType and REQUIRES_DOMAIN are already being consumed, if anywhere

---

### PHASE 2 — NORMALIZE DOMAIN MODEL

Do NOT blindly create duplicate domains.

**Use Strategy A for domain normalization:** preserve existing high-connectivity FeatureDomain nodes as canonical targets where possible, add ALIAS_OF relationships from duplicates/legacy names to canonical domains, and create new canonical FeatureDomain nodes only for truly missing domains. Do not do rename-in-place unless a node has near-zero connectivity and the rename is clearly safe.

**Rationale:**
- The graph already has real edges (IN_DOMAIN, FOR_ARCHETYPE, INFORMS) on existing domains — destroying those is risky
- Rename-in-place can break assumptions in retrieval code and historical ingestion
- A canonicalName-only property is too soft for AES because it keeps enforcement logic fuzzy
- ALIAS_OF gives a clean prescriptive layer without destroying the old graph
- Existing rich domains become the canonical target; new nodes only where truly needed

**Required canonical mapping:**

Existing strong domains to KEEP as canonical (do not rename or replace):
- `notifications-alerts` — canonical for notification
- `forms-input` — canonical for forms_validation
- `auth-session-security` — canonical for both security and auth
- `approval-workflow` — canonical (merge approvals-workflows into it)
- `map-display-location` — canonical (merge maps-location into it)
- `image-camera-file-media` — canonical (merge media-files into it)

Duplicate/legacy domains to ALIAS to canonical:
- `approvals-workflows` -[:ALIAS_OF]-> `approval-workflow`
- `maps-location` -[:ALIAS_OF]-> `map-display-location`
- `media-files` -[:ALIAS_OF]-> `image-camera-file-media`

Prescriptive names to ALIAS to existing canonical:
- `notification` -[:ALIAS_OF]-> `notifications-alerts`
- `forms_validation` -[:ALIAS_OF]-> `forms-input`
- `security` -[:ALIAS_OF]-> `auth-session-security`
- `auth` -[:ALIAS_OF]-> `auth-session-security`

Truly missing domains — CREATE as new canonical nodes:
- `multi_tenant`
- `api_architecture`
- `state_management`
- `real_time` (evaluate whether offline-sync covers this; if not, create new)
- `performance`
- `async_events`
- `failure_patterns`
- `error_states`
- `navigation`

After normalization:
- Rewire any REQUIRES_DOMAIN edges that point to alias nodes so they resolve through ALIAS_OF to the canonical target
- Or: point REQUIRES_DOMAIN directly to canonical nodes and keep ALIAS_OF as a lookup aid
- Either approach is fine as long as the retrieval query resolves correctly

Also handle:
- `interaction-timing` — classify as keep, alias, or remove based on inspection

---

### PHASE 3 — ADD MISSING CONSTRAINTS

Add uniqueness constraints if safe and if data quality allows:
- FeatureDomain.name
- FeatureSpec.id
- Rule.id
- Knowledge.topic (only if truly unique in practice; otherwise explain why not)

If duplicates prevent constraint creation:
- detect them
- report them
- propose safe remediation
- do not silently drop data

---

### PHASE 4 — ADD NEW AES ENFORCEMENT NODES

Create these node types if missing:

**1. FeatureConsultation**
Properties: id, createdAt, status, projectId, featureType, domainsRequiredCount, domainsConsultedCount, missingCoverage

**2. FailureCase**
Properties: id, featureType, domain, cause, fixPattern, scope, createdAt

**3. ProtocolViolation**
Properties: id, stage, reason, severity, createdAt

Create uniqueness constraints on:
- FeatureConsultation.id
- FailureCase.id
- ProtocolViolation.id

Add relationships:
- (Project)-[:HAS_CONSULTATION]->(FeatureConsultation)
- (FeatureConsultation)-[:FOR_FEATURE_TYPE]->(FeatureType)
- (FeatureConsultation)-[:CONSULTED_DOMAIN]->(FeatureDomain)
- (FeatureConsultation)-[:USED_SPEC]->(FeatureSpec)
- (Project)-[:HAS_FAILURE]->(FailureCase)
- (Project)-[:HAS_PROTOCOL_VIOLATION]->(ProtocolViolation)

---

### PHASE 5 — MAKE FEATURETYPE PRESCRIPTIVE

FeatureType and REQUIRES_DOMAIN already exist. Audit them.

Tasks:
1. Inspect all 20 FeatureType nodes
2. Show which ones map cleanly to AES build-time feature classes
3. Identify bad/duplicate/legacy FeatureTypes
4. Verify whether REQUIRES_DOMAIN points to canonical or messy domains
5. Repair REQUIRES_DOMAIN wiring so it points to canonical domains (not aliases, not duplicates)

Do not duplicate FeatureType if existing nodes are salvageable.

---

### PHASE 6 — REPLACE MANUAL DOMAIN SELECTION

Find any retrieval logic that still depends on:
- relevantDomains
- prompt-selected domains
- fs.domain IN $relevantDomains
- equivalent manual filters

Replace it so retrieval is graph-driven.

New retrieval inputs:
- projectId
- featureType
- optional appArchetype
- optional detected stack/framework

New retrieval behavior:
1. Load Project
2. Load FeatureType
3. Derive required domains from FeatureType-[:REQUIRES_DOMAIN]->FeatureDomain (resolving through ALIAS_OF if needed)
4. Load active FeatureSpecs in those domains
5. Load FeatureSpec dependencies via DEPENDS_ON
6. Optionally filter/rank by AppArchetype and stack
7. Return a machine-readable consultation object

---

### PHASE 7 — ADD PRE-BUILD CONSULTATION GATE

Before any build / codegen / Codex call, AES must:
1. Classify featureType
2. Retrieve required domains from graph
3. Retrieve FeatureSpecs and dependencies
4. Create a FeatureConsultation artifact
5. Compare required domains vs consulted domains by exact canonical names
6. Reject if any are missing

No build should proceed if coverage is incomplete.

Expected artifact shape:

```json
{
  "id": "CONS-...",
  "projectId": "...",
  "featureType": "...",
  "domainsRequired": [...],
  "domainsConsulted": [...],
  "featureSpecsLoaded": [...],
  "dependenciesLoaded": [...],
  "missingCoverage": [...],
  "status": "complete|incomplete|rejected"
}
```

---

### PHASE 8 — ADD PROTOCOL VIOLATION LOGGING

If orchestrator/build pipeline attempts to continue without:
- consultation artifact
- full coverage
- valid retrieval evidence

Write a ProtocolViolation node linked to Project.

Examples:
- "Codex called before consultation artifact creation"
- "Build attempted with missing required domain coverage"

---

### PHASE 9 — ADD FAILURE MEMORY

If build fails later because:
- wrong FeatureSpec was selected
- required domain logic was missing
- anti-pattern slipped through
- stack mismatch occurred

Write a FailureCase node linked to Project.

This is project-scoped evidence. Do not auto-generalize across projects.

---

### PHASE 10 — ORPHAN CLEANUP AUDIT

Do not mass-delete orphaned Rules or Decisions.

Instead:
1. Identify why they are orphaned
2. Classify them into: salvageable, legacy-unused, duplicate, malformed
3. Produce a cleanup/remediation plan
4. If safe, attach obviously salvageable orphan nodes to the correct domains/archetypes/projects
5. Otherwise leave them untouched and report them

---

## DELIVERABLES

Return all of the following clearly:

1. Architecture summary
2. Graph normalization strategy chosen and why
3. Cypher migration script
4. Cypher for domain normalization / aliasing / merges
5. Cypher for new constraints
6. Updated retrieval query (resolving ALIAS_OF where needed)
7. TypeScript interfaces for: FeatureConsultation, FailureCase, ProtocolViolation, DomainCoverageResult, RetrievalResult
8. Coverage validator logic
9. Neo4j write queries for: FeatureConsultation, ProtocolViolation, FailureCase
10. Exact files changed
11. Migration risks / assumptions
12. Orphan cleanup report

---

## IMPORTANT RULES

- Do not redesign AES from scratch
- Do not create unnecessary duplicate FeatureDomains
- Do not assume the old graph is wrong; inspect first
- Prefer additive and reversible migration
- Make the graph prescriptive, not merely descriptive
- Keep everything project-scoped where applicable
- Stop manual domain selection from being the primary mechanism
- Show exact diffs and exact Cypher
- If constraints fail because of duplicate data, report the duplicates instead of hiding the issue

---

## WORK ORDER

Execute in this order:
1. Inspect current schema + retrieval code
2. Propose normalization strategy (Strategy A with canonical-preserving refinement)
3. Generate migration Cypher
4. Normalize domain model (ALIAS_OF + new canonical nodes)
5. Add new AES enforcement nodes
6. Refactor retrieval to FeatureType -> REQUIRES_DOMAIN (resolving aliases)
7. Add consultation gate
8. Add protocol violation + failure memory writes
9. Report changed files and exact diffs

Do the inspection first, then implement.
Stop being abstract and work directly against the repo and graph.
