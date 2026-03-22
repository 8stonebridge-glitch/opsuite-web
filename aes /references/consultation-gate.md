D18. CONSULTATION GATE — Pre-Build Knowledge Proof
───────────────────────────────────────────────────────────────────────

Origin
The Codex analysis of AES build output identified a structural gap:
domain knowledge was loaded into context, but there was no artifact
proving the load happened, no comparison between what was required and
what was consulted, and no gate that blocked the build if coverage was
incomplete. The knowledge was present as a retrieval capability but
absent as an enforcement mechanism.

D18 is the consultation gate. It exists between D17 retrieval and any
build or Codex call. No build proceeds without a complete, persisted
FeatureConsultation artifact. The artifact is not a log — it is a gate.

───────────────────────────────────────────────────────────
D18.1 CONSULTATION PROCEDURE
───────────────────────────────────────────────────────────

The consultation procedure runs before ANY build, codegen, or Codex
call. The orchestrator agent (Claude) is responsible for executing it.
Codex is a build tool, not a consultation tool. Codex is never called
before this procedure completes.

Procedure:

  Step 1 — Classify FeatureType:
    Identify the FeatureType for the feature being built. The
    classification must resolve to an exact FeatureType node name in the
    graph. If no match exists, the build is HARD REJECTED (see D18.3).
    Acceptable inputs: exact node name, canonical alias. Guessing or
    fuzzy matching is not acceptable.

  Step 2 — Run D17.5 graph-driven retrieval:
    Execute the retrieval query from D17.5 with the projectId,
    featureType, and any available appArchetype and stack values.
    Retrieve the domainsRequired list and featureSpecs list.

  Step 3 — Load FeatureSpecs and dependencies:
    For each domain in domainsRequired, confirm that at least one active
    FeatureSpec was returned. If a domain returned zero specs, record it
    as EMPTY_DOMAIN. This is not a blocking failure at this step — it
    is recorded in the artifact.

  Step 4 — Create FeatureConsultation node in Neo4j:
    Write the (:FeatureConsultation) node immediately after retrieval,
    before any comparison. The node is created with status = 'pending'
    and populated with the retrieved data. This ensures the artifact
    exists even if the gate comparison fails.

  Step 5 — Compare required vs consulted domains:
    Compare domainsRequired (from graph) against domainsConsulted (the
    actual domains whose FeatureSpecs were loaded). Comparison is by
    exact canonical name. A match requires the exact string — not a
    substring, not a synonym, not an alias name.

  Step 6 — Set status and gate:
    Apply D18.3 coverage validation rules to set artifact status.
    If status = 'rejected', the build is blocked. Stop. Do not proceed
    to Codex. The only path forward is to add the missing domain
    knowledge to the graph and re-run consultation from Step 1.
    If status = 'complete', proceed to build.

Agent responsibility: Claude (Orchestrator) executes Steps 1-6.
Timeout: 15 seconds total for Steps 2-5 (retrieval and comparison).
If the retrieval query times out, the consultation status is set to
'rejected' with reason = 'retrieval_timeout'. Build is blocked.

───────────────────────────────────────────────────────────
D18.2 CONSULTATION ARTIFACT
───────────────────────────────────────────────────────────

New node type: (:FeatureConsultation)

Properties:

  | Property              | Type     | Description                         |
  |-----------------------|----------|-------------------------------------|
  | id                    | string   | CONS-{uuid}, unique                 |
  | createdAt             | datetime | When the consultation was created   |
  | status                | string   | complete \| incomplete \| rejected  |
  | projectId             | string   | The project this consultation is for|
  | featureType           | string   | Canonical FeatureType node name     |
  | domainsRequiredCount  | int      | Count of domains derived from graph |
  | domainsConsultedCount | int      | Count of domains with loaded specs  |
  | missingCoverage       | string[] | Domains in required but not consulted|

Relationships:

  (Project)-[:HAS_CONSULTATION]->(FeatureConsultation)
  (FeatureConsultation)-[:FOR_FEATURE_TYPE]->(FeatureType)
  (FeatureConsultation)-[:CONSULTED_DOMAIN]->(FeatureDomain)
  (FeatureConsultation)-[:USED_SPEC]->(FeatureSpec)

Artifact shape (JSON representation for in-memory use during build):

  ```json
  {
    "id": "CONS-a1b2c3d4-...",
    "projectId": "PROJ-opsuite",
    "featureType": "authentication-flow",
    "domainsRequired": [
      "auth-session-security",
      "forms-input",
      "error_states",
      "navigation"
    ],
    "domainsConsulted": [
      "auth-session-security",
      "forms-input",
      "error_states",
      "navigation"
    ],
    "featureSpecsLoaded": [
      "SPEC-clerk-redirect-guard",
      "SPEC-form-validation-patterns",
      "SPEC-error-boundary-auth",
      "SPEC-post-auth-navigation"
    ],
    "dependenciesLoaded": [
      "SPEC-session-token-refresh"
    ],
    "missingCoverage": [],
    "status": "complete"
  }
  ```

Cypher — create consultation artifact node:

  CREATE (c:FeatureConsultation {
    id:                    $consultationId,
    createdAt:             datetime(),
    status:                'pending',
    projectId:             $projectId,
    featureType:           $featureType,
    domainsRequiredCount:  $domainsRequiredCount,
    domainsConsultedCount: 0,
    missingCoverage:       []
  })
  WITH c
  MATCH (proj:Project {id: $projectId})
  MERGE (proj)-[:HAS_CONSULTATION]->(c)
  WITH c
  MATCH (ft:FeatureType {name: $featureType})
  MERGE (c)-[:FOR_FEATURE_TYPE]->(ft)
  RETURN c.id;

Cypher — update consultation after coverage check:

  MATCH (c:FeatureConsultation {id: $consultationId})
  SET c.status                = $status,
      c.domainsConsultedCount = $domainsConsultedCount,
      c.missingCoverage       = $missingCoverage,
      c.completedAt           = datetime()
  WITH c
  UNWIND $consultedDomainNames AS domainName
  MATCH (fd:FeatureDomain {name: domainName})
  MERGE (c)-[:CONSULTED_DOMAIN]->(fd)
  WITH c
  UNWIND $usedSpecIds AS specId
  MATCH (fs:FeatureSpec {id: specId})
  MERGE (c)-[:USED_SPEC]->(fs)
  RETURN c.id, c.status;

Cypher — query consultation history for a project:

  MATCH (proj:Project {id: $projectId})-[:HAS_CONSULTATION]->(c:FeatureConsultation)
  OPTIONAL MATCH (c)-[:FOR_FEATURE_TYPE]->(ft:FeatureType)
  OPTIONAL MATCH (c)-[:CONSULTED_DOMAIN]->(fd:FeatureDomain)
  RETURN c.id,
         c.featureType,
         c.status,
         c.domainsRequiredCount,
         c.domainsConsultedCount,
         c.missingCoverage,
         c.createdAt,
         collect(fd.name) AS domains
  ORDER BY c.createdAt DESC;

  // Show rejection rate by featureType for a project
  MATCH (proj:Project {id: $projectId})-[:HAS_CONSULTATION]->(c:FeatureConsultation)
  RETURN c.featureType,
         count(c) AS total,
         sum(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         sum(CASE WHEN c.status = 'complete' THEN 1 ELSE 0 END) AS complete
  ORDER BY rejected DESC;

───────────────────────────────────────────────────────────
D18.3 COVERAGE VALIDATION RULES
───────────────────────────────────────────────────────────

Coverage is evaluated by comparing the domainsRequired list (derived
from the graph in D17.5 Step 3) against the domainsConsulted list
(the canonical domain names whose FeatureSpecs were successfully loaded
in D18.1 Steps 3-5).

Validation outcomes:

  | Condition                                      | Status     | Build? |
  |------------------------------------------------|------------|--------|
  | domainsConsulted contains every domain in      | complete   | YES    |
  | domainsRequired (100% coverage)                |            |        |
  |                                                |            |        |
  | 80% or more of domainsRequired are consulted   | incomplete | NO     |
  | but at least one domain is missing             |            |        |
  |                                                |            |        |
  | Fewer than 80% of domainsRequired consulted    | rejected   | NO     |
  |                                                |            |        |
  | FeatureType could not be classified (Step 1    | rejected   | NO     |
  | returned no match)                             |            |        |
  |                                                |            |        |
  | Retrieval query timed out                      | rejected   | NO     |

Rule D18.3-A — PASS condition: domainsConsulted is a superset of
domainsRequired. Comparison is by exact canonical name string. Extra
domains in domainsConsulted are allowed and do not affect the result.

Rule D18.3-B — FAIL condition: any domain in domainsRequired is absent
from domainsConsulted. Artifact status = 'rejected'. Build is blocked.
The missingCoverage list in the artifact identifies the exact gaps.

Rule D18.3-C — Partial condition: 80%+ but not 100% coverage. Status =
'incomplete'. This is a protocol violation (D19.1 violation type: "Build
attempted with missing required domain coverage"). Build is blocked.
The incomplete artifact is stored. A ProtocolViolation node is written.
This is not a soft warning — it is a hard block identical to 'rejected'
for the purpose of proceeding to build.

Rule D18.3-D — Zero classification: if FeatureType classification fails
(no node found in Step 1), status = 'rejected' immediately. This is a
HARD REJECT. No coverage calculation is attempted. A ProtocolViolation
node is written with reason = 'FeatureType not classified before build'.

Rule D18.3-E — Override prohibition: Claude cannot override a rejected
or incomplete consultation artifact. There is no "proceed anyway" path.
The only remediation is:
  1. Identify the missing domain(s) from missingCoverage
  2. Ensure the domain exists as a canonical FeatureDomain node
  3. Ensure relevant FeatureSpecs exist for that domain with status='active'
  4. Ensure the FeatureType has a REQUIRES_DOMAIN edge to that domain
  5. Re-run consultation from D18.1 Step 1

Rule D18.3-F — EMPTY_DOMAIN handling: if a required domain exists in
domainsRequired but has zero active FeatureSpecs, it counts as
a consulted domain for coverage purposes only if the orchestrator
explicitly acknowledges the gap and records it in the artifact's
missingCoverage field with type = 'empty_domain'. The build may proceed
if all other domains have coverage, but the empty domain is flagged as
a WARNING in the artifact and a ProtocolViolation with severity WARNING
is written (D19.1).

───────────────────────────────────────────────────────────
D18.4 WHAT THIS PREVENTS
───────────────────────────────────────────────────────────

Building without checking specs:
  The core problem Codex identified: domain knowledge existed in the
  graph but was never provably consulted before a build. D18 makes
  consultation a mandatory, measurable, persisted step. Consultation
  history is queryable. Skips are detectable.

Guessing domain relevance:
  D17.5 derives required domains from the graph. D18 requires that those
  specific domains are consulted. There is no path where Claude can
  proceed with a self-selected domain list that doesn't match the
  graph-derived list.

Skipping consultation entirely:
  Without D18, the pipeline could move from feature description to Codex
  call with no intermediate step. D18 inserts a mandatory gate with a
  persisted artifact. The artifact's absence is itself detectable (see
  D19.1: "Codex called before consultation artifact creation").

Partial consultation that looks complete:
  The 80% threshold prevents an edge case where Claude loads 3 of 4
  required domains and considers coverage "good enough." Under D18.3,
  any missing required domain is a block, not a warning.


───────────────────────────────────────────────────────────────────────
