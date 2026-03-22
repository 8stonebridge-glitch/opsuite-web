───────────────────────────────────────────────────────────────────────
D17. PRESCRIPTIVE GRAPH — Domain Normalization and FeatureType Enforcement
───────────────────────────────────────────────────────────────────────

Origin
The AES graph originally served as a retrieval aid: load some knowledge,
let Claude decide which domains were relevant, proceed to build. This
design placed domain selection inside Claude's reasoning process. The
result was inconsistent coverage — Claude sometimes included the right
domains, sometimes missed them, and there was no mechanism to detect or
penalize the miss.

The Codex analysis of build output (prescriptive-graph-upgrade-prompt.md)
identified the root cause: REQUIRES_DOMAIN relationships already existed
(88 of them, across 20 FeatureType nodes and 16 FeatureDomain nodes) but
were never used to drive retrieval. The graph had the prescription. The
pipeline ignored it.

D17 converts domain selection from intuitive to mechanical. After this
section is implemented, Claude does not decide which domains to consult.
The graph decides.

───────────────────────────────────────────────────────────
D17.1 DOMAIN NORMALIZATION MODEL
───────────────────────────────────────────────────────────

Current state (v10.4):
  16 FeatureDomain nodes exist. Three are duplicates of stronger canonical
  nodes. Several common prescriptive names (e.g., "security", "auth",
  "notification") do not match any domain name — they would never resolve
  in a query. Nine required domains for the next AES layer are absent
  entirely.

Normalization strategy: ALIAS_OF with canonical preservation.

  Do NOT rename or delete existing high-connectivity nodes. The graph has
  real edges (IN_DOMAIN, FOR_ARCHETYPE, INFORMS, REQUIRES_DOMAIN) on
  existing domain nodes. Destroying those edges is dangerous and
  irreversible. Instead, the normalization layer is additive:

  1. Existing high-connectivity nodes become canonical targets.
  2. Duplicate or legacy nodes get an ALIAS_OF edge pointing to the
     canonical target. Their existing edges are preserved.
  3. Prescriptive names that match no existing node also get thin alias
     nodes that ALIAS_OF to the canonical target.
  4. Truly missing domains are created as new canonical nodes.

Canonical preservation table:

  | Canonical Node           | Aliases (via ALIAS_OF)                   |
  |--------------------------|------------------------------------------|
  | notifications-alerts     | notification                             |
  | forms-input              | forms_validation                         |
  | auth-session-security    | security, auth                           |
  | approval-workflow        | approvals-workflows                      |
  | map-display-location     | maps-location                            |
  | image-camera-file-media  | media-files                              |

  ALIAS_OF is directional: (alias)-[:ALIAS_OF]->(canonical). An alias
  node is a lookup target only. It does not receive new REQUIRES_DOMAIN
  edges. It does not appear in consultation artifacts as a consulted
  domain. Retrieval always resolves through ALIAS_OF to the canonical
  node.

New canonical nodes to create (truly missing):

  | New Node Name      | Description                                      |
  |--------------------|--------------------------------------------------|
  | multi_tenant       | Tenant isolation, scoping, row-level security    |
  | api_architecture   | REST/GraphQL/RPC design, versioning, rate limits |
  | state_management   | Client-side state, stores, derived state, sync   |
  | real_time          | WebSocket, SSE, polling, presence, live updates  |
  | performance        | Caching, query optimization, bundle size, LCP    |
  | async_events       | Queues, workers, job scheduling, retry logic     |
  | failure_patterns   | Circuit breakers, fallback, graceful degradation |
  | error_states       | Error boundaries, toasts, empty states, 4xx/5xx  |
  | navigation         | Routing, guards, breadcrumbs, back-button safety |

  interaction-timing: Inspect on execution. If it has fewer than 3 edges
  across all relationship types, alias it to performance. If it has 3+
  edges with distinct semantics, keep it as canonical.

Enforcement rules:

  Rule D17.1-A: All REQUIRES_DOMAIN edges MUST point to canonical nodes,
  never to alias nodes. If an existing REQUIRES_DOMAIN edge points to an
  alias node (e.g., approvals-workflows), it must be rewired to point to
  the canonical node (approval-workflow) during migration.

  Rule D17.1-B: Retrieval queries that load domains MUST follow ALIAS_OF
  to resolve canonical names. A query that returns an alias node as a
  domain result is incorrect.

  Rule D17.1-C: New FeatureDomain nodes may only be created as canonical
  if they represent a domain with no existing canonical equivalent. If an
  equivalent exists, create an ALIAS_OF relationship instead.

Cypher — create alias relationships:

  // Legacy/duplicate aliases
  MATCH (alias:FeatureDomain {name: 'approvals-workflows'}),
        (canon:FeatureDomain {name: 'approval-workflow'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  MATCH (alias:FeatureDomain {name: 'maps-location'}),
        (canon:FeatureDomain {name: 'map-display-location'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  MATCH (alias:FeatureDomain {name: 'media-files'}),
        (canon:FeatureDomain {name: 'image-camera-file-media'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  // Prescriptive name aliases (create thin nodes if absent, then alias)
  MERGE (alias:FeatureDomain {name: 'notification'})
    ON CREATE SET alias.isAlias = true, alias.createdAt = datetime()
  WITH alias
  MATCH (canon:FeatureDomain {name: 'notifications-alerts'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  MERGE (alias:FeatureDomain {name: 'forms_validation'})
    ON CREATE SET alias.isAlias = true, alias.createdAt = datetime()
  WITH alias
  MATCH (canon:FeatureDomain {name: 'forms-input'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  MERGE (alias:FeatureDomain {name: 'security'})
    ON CREATE SET alias.isAlias = true, alias.createdAt = datetime()
  WITH alias
  MATCH (canon:FeatureDomain {name: 'auth-session-security'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

  MERGE (alias:FeatureDomain {name: 'auth'})
    ON CREATE SET alias.isAlias = true, alias.createdAt = datetime()
  WITH alias
  MATCH (canon:FeatureDomain {name: 'auth-session-security'})
  MERGE (alias)-[:ALIAS_OF]->(canon);

Cypher — create missing canonical domains:

  UNWIND [
    'multi_tenant', 'api_architecture', 'state_management',
    'real_time', 'performance', 'async_events',
    'failure_patterns', 'error_states', 'navigation'
  ] AS domainName
  MERGE (d:FeatureDomain {name: domainName})
    ON CREATE SET d.isCanonical = true,
                  d.createdAt = datetime(),
                  d.createdBy = 'D17-migration-v11';

Cypher — rewire stale REQUIRES_DOMAIN edges to canonical targets:

  // Find REQUIRES_DOMAIN edges pointing to alias nodes and redirect them
  MATCH (ft:FeatureType)-[r:REQUIRES_DOMAIN]->(alias:FeatureDomain)
        -[:ALIAS_OF]->(canon:FeatureDomain)
  MERGE (ft)-[:REQUIRES_DOMAIN]->(canon)
  DELETE r;

───────────────────────────────────────────────────────────
D17.2 FEATURETYPE PRESCRIPTIVE WIRING
───────────────────────────────────────────────────────────

Current state: 20 FeatureType nodes and 88 REQUIRES_DOMAIN relationships
exist. Not all 20 FeatureType nodes are verified to have at least one
REQUIRES_DOMAIN edge. After D17.1 rewires stale edges, some FeatureType
nodes may end up with zero valid REQUIRES_DOMAIN edges.

The REQUIRES_DOMAIN relationship is the authoritative source for which
domains must be consulted before building a feature of a given type. If
a FeatureType has no REQUIRES_DOMAIN edges, the consultation gate (D18)
cannot run for features of that type.

Rule D17.2-A: Every FeatureType node MUST have at least one REQUIRES_DOMAIN
edge pointing to a canonical FeatureDomain. A FeatureType with zero
REQUIRES_DOMAIN edges MUST NOT be used as the basis for a build or
consultation gate. It is flagged as UNWIRED.

Rule D17.2-B: REQUIRES_DOMAIN is write-once from the migration Cypher
during setup. New edges may be added as domain knowledge expands, but
existing edges may not be silently deleted. Deletion of a REQUIRES_DOMAIN
edge requires a migration script with a documented rationale.

Rule D17.2-C: During FeatureType audit, any node classified as a
duplicate or legacy alias of another FeatureType must have an ALIAS_OF
edge created before its REQUIRES_DOMAIN edges are removed.

Cypher — audit FeatureType wiring status:

  // Show all FeatureTypes with their required domain count
  MATCH (ft:FeatureType)
  OPTIONAL MATCH (ft)-[:REQUIRES_DOMAIN]->(fd:FeatureDomain)
  WHERE NOT (fd)-[:ALIAS_OF]->()
  RETURN ft.name AS featureType,
         count(fd) AS canonicalDomainCount,
         collect(fd.name) AS domains
  ORDER BY canonicalDomainCount ASC;

  // Identify UNWIRED FeatureTypes (zero canonical REQUIRES_DOMAIN edges)
  MATCH (ft:FeatureType)
  WHERE NOT (ft)-[:REQUIRES_DOMAIN]->(:FeatureDomain)
  RETURN ft.name AS unwiredFeatureType;

  // Show FeatureTypes still wired to alias domains (need rewiring)
  MATCH (ft:FeatureType)-[:REQUIRES_DOMAIN]->(alias:FeatureDomain)
        -[:ALIAS_OF]->(:FeatureDomain)
  RETURN ft.name AS featureType, alias.name AS staleAlias;

Failure mode: A FeatureType exists in the graph but has only REQUIRES_DOMAIN
edges that pointed to aliases. After D17.1 rewiring, it ends up with zero
canonical edges. This FeatureType appears UNWIRED in the audit query. The
correct remediation is to add REQUIRES_DOMAIN edges to the appropriate
canonical domains — not to delete the FeatureType node.

───────────────────────────────────────────────────────────
D17.3 CONSTRAINT ENFORCEMENT
───────────────────────────────────────────────────────────

Current state: Uniqueness constraints are missing for FeatureDomain.name,
FeatureSpec.id, Rule.id, and Knowledge.topic. Without constraints,
duplicate nodes accumulate silently. The orphan counts (125 Rules,
119 Decisions) are a direct consequence of the absence of structural
enforcement.

Required constraints:

  | Node Type          | Property  | Constraint Type | Action if Duplicate  |
  |--------------------|-----------|-----------------|----------------------|
  | FeatureDomain      | name      | UNIQUE          | Report, do not drop  |
  | FeatureSpec        | id        | UNIQUE          | Report, do not drop  |
  | Rule               | id        | UNIQUE          | Report, do not drop  |
  | Knowledge          | topic     | UNIQUE          | Conditional (below)  |
  | FeatureConsultation| id        | UNIQUE          | New in D18           |
  | FailureCase        | id        | UNIQUE          | New in D19           |
  | ProtocolViolation  | id        | UNIQUE          | New in D19           |

Knowledge.topic constraint: Apply only if inspection confirms Knowledge.topic
is unique in practice. If multiple Knowledge nodes legitimately share a
topic string (e.g., two nodes with topic = "auth" from different ingestion
runs), do NOT force uniqueness — instead, add a compound key or scope the
constraint to (topic, projectId). Report the result of the inspection
before applying.

Cypher — add constraints (run after deduplication):

  CREATE CONSTRAINT feat_domain_name_unique IF NOT EXISTS
    FOR (d:FeatureDomain) REQUIRE d.name IS UNIQUE;

  CREATE CONSTRAINT feat_spec_id_unique IF NOT EXISTS
    FOR (s:FeatureSpec) REQUIRE s.id IS UNIQUE;

  CREATE CONSTRAINT rule_id_unique IF NOT EXISTS
    FOR (r:Rule) REQUIRE r.id IS UNIQUE;

  CREATE CONSTRAINT feat_consultation_id_unique IF NOT EXISTS
    FOR (c:FeatureConsultation) REQUIRE c.id IS UNIQUE;

  CREATE CONSTRAINT failure_case_id_unique IF NOT EXISTS
    FOR (f:FailureCase) REQUIRE f.id IS UNIQUE;

  CREATE CONSTRAINT protocol_violation_id_unique IF NOT EXISTS
    FOR (p:ProtocolViolation) REQUIRE p.id IS UNIQUE;

Cypher — detect duplicates before applying FeatureDomain constraint:

  MATCH (d:FeatureDomain)
  WITH d.name AS domainName, collect(d) AS nodes
  WHERE size(nodes) > 1
  RETURN domainName, size(nodes) AS duplicateCount,
         [n IN nodes | id(n)] AS nodeIds;

Rule D17.3-A: If any duplicate query returns results, the constraint for
that property MUST NOT be applied until the duplicates are resolved. Each
duplicate pair must be individually inspected: determine which node has
more edges, preserve that node as canonical, and either merge edges from
the other or alias it (per D17.1 rules).

Rule D17.3-B: Constraint creation failures must be surfaced explicitly.
Never use silent CALL apoc.cypher with error-swallowing. If a constraint
fails to create, the migration log must show the exact error and the
offending duplicate data.

───────────────────────────────────────────────────────────
D17.4 ORPHAN CLEANUP PROTOCOL
───────────────────────────────────────────────────────────

Current state: 125 orphaned Rule nodes and 119 orphaned Decision nodes
exist — nodes with no relationships connecting them to the rest of the
graph. These orphans represent either legitimate knowledge that was never
attached, historical data from deleted parents, or ingest failures.

Do NOT mass-delete. Data volume does not justify the risk. An orphaned
Rule may contain valid logic that simply lost its parent during a graph
migration. Deleting it destroys that knowledge permanently.

Classification taxonomy:

  | Class           | Definition                                              |
  |-----------------|---------------------------------------------------------|
  | salvageable     | Has meaningful properties, matches a known domain or    |
  |                 | FeatureType by content analysis                        |
  | legacy-unused   | Properties indicate an old version or superseded rule;  |
  |                 | safe to archive (not delete) with a DEPRECATED label   |
  | duplicate       | Properties are identical or near-identical to an        |
  |                 | existing attached node — merge, do not delete          |
  | malformed       | Missing required properties, empty, or unparseable —   |
  |                 | log and quarantine, do not delete                      |

Cypher — identify orphaned Rules:

  // Rules with no relationships of any kind
  MATCH (r:Rule)
  WHERE NOT (r)--()
  RETURN r.id, r.description, r.domain, r.createdAt
  ORDER BY r.createdAt DESC;

  // Rules with properties that suggest a domain
  MATCH (r:Rule)
  WHERE NOT (r)--()
    AND r.domain IS NOT NULL
  RETURN r.id, r.domain, r.description;

Cypher — identify orphaned Decisions:

  MATCH (d:Decision)
  WHERE NOT (d)--()
  RETURN d.id, d.outcome, d.rationale, d.createdAt
  ORDER BY d.createdAt DESC;

Remediation procedure:

  1. Run orphan detection queries. Count by class.
  2. For salvageable Rules: attach to the matching FeatureDomain or
     FeatureType using INFORMS or GOVERNS relationships. If the target
     domain was merged (e.g., approvals-workflows → approval-workflow),
     attach to the canonical node.
  3. For salvageable Decisions: link to the closest matching Proposal or
     AuditFinding via RESOLVED_BY. If no match exists, link to the
     Project that most likely produced it, with a RECOVERED flag.
  4. For legacy-unused: add label :Deprecated and set r.deprecated = true.
     Do not delete. They remain queryable for historical audits.
  5. For duplicates: merge edge sets onto the canonical node, then add
     ALIAS_OF from the duplicate. Do not delete.
  6. For malformed: add label :Quarantine and set r.quarantined = true,
     r.quarantineReason = 'malformed-missing-properties'. Log count.

Cypher — attach a salvageable orphan Rule to its domain:

  MATCH (r:Rule {id: $ruleId}), (d:FeatureDomain {name: $canonicalDomain})
  MERGE (r)-[:GOVERNS]->(d)
  SET r.recoveredAt = datetime(), r.recoveredBy = 'D17-orphan-cleanup';

Cypher — deprecate legacy-unused orphans in batch:

  MATCH (r:Rule)
  WHERE NOT (r)--()
    AND r.createdAt < datetime('2024-01-01T00:00:00')
  SET r:Deprecated, r.deprecated = true, r.deprecatedAt = datetime()
  RETURN count(r) AS deprecatedCount;

Rule D17.4-A: The remediation plan must be produced and reviewed before
any node state changes. The plan must include a count per classification
class and a sample of nodes in each class.

Rule D17.4-B: Unsalvageable nodes (malformed, no meaningful properties,
no resolvable parent) must be individually listed in a cleanup report and
quarantined with the :Quarantine label. They are not deleted.

