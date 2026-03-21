───────────────────────────────────────────────────────────
D17.5 GRAPH-DRIVEN RETRIEVAL (replaces manual domain selection)
───────────────────────────────────────────────────────────

Old behavior (broken):
  Retrieval code accepted a relevantDomains array that was either
  manually specified in the prompt, injected from project context, or
  guessed by Claude based on feature description. The fs.domain IN
  $relevantDomains filter meant that domain selection was a human
  (or Claude) judgment call at runtime.

New behavior:
  Given (projectId, featureType, optional appArchetype, optional stack),
  the graph derives the required domains automatically. No
  relevantDomains parameter is accepted. Domain selection is not a
  judgment call — it is a read from the graph.

Retrieval procedure:

  Step 1 — Load Project:
    Load the (:Project) node by projectId. Read its stack, appArchetype
    link, and any project-level FeatureSpec overrides.

  Step 2 — Load FeatureType:
    Load the (:FeatureType) node by the featureType string. If the
    featureType string does not match any node, retrieval FAILS. Do not
    proceed with a partial match or a guessed type.

  Step 3 — Derive required domains:
    Traverse FeatureType-[:REQUIRES_DOMAIN]->FeatureDomain. For each
    returned domain node, check whether it has an ALIAS_OF edge. If it
    does, resolve to the canonical target. The output is a list of
    canonical FeatureDomain names.

  Step 4 — Load active FeatureSpecs:
    For each canonical domain, load all FeatureSpec nodes where
    fs.status = 'active' AND fs.domain = domain.name (or linked via
    IN_DOMAIN relationship). If a domain has zero active FeatureSpecs,
    the domain is flagged as EMPTY_DOMAIN. This is a WARNING condition
    that must be returned in the consultation object (not a silent skip).

  Step 5 — Load FeatureSpec dependencies:
    For each loaded FeatureSpec, traverse -[:DEPENDS_ON]->(:FeatureSpec).
    Load the dependency specs. Detect cycles — if a DEPENDS_ON chain
    loops, log a graph integrity warning and break the cycle at the first
    repeated node.

  Step 6 — Filter and rank by AppArchetype and stack:
    If appArchetype is provided: prefer FeatureSpecs linked via
    FOR_ARCHETYPE to the matching AppArchetype. Rank those first.
    If stack is provided: prefer FeatureSpecs whose stack property
    matches. Rank those above unspecified-stack specs.
    Do not exclude non-matching specs — include them at lower rank.
    Exclusion is the consultation gate's job (D18), not retrieval's.

  Step 7 — Return consultation object:
    Return a machine-readable object containing the resolved domains,
    loaded FeatureSpecs, dependencies, and any warnings (EMPTY_DOMAIN,
    UNWIRED FeatureType, cycle detected).

Full Cypher — graph-driven retrieval query:

  // Input: $projectId (string), $featureType (string),
  //        $appArchetype (string, optional), $stack (string, optional)

  MATCH (proj:Project {id: $projectId})
  MATCH (ft:FeatureType {name: $featureType})

  // Step 3: derive canonical domains (resolving ALIAS_OF)
  MATCH (ft)-[:REQUIRES_DOMAIN]->(fd:FeatureDomain)
  OPTIONAL MATCH (fd)-[:ALIAS_OF]->(canon:FeatureDomain)
  WITH proj, ft,
       CASE WHEN canon IS NOT NULL THEN canon ELSE fd END AS domain

  // Step 4: load active FeatureSpecs
  OPTIONAL MATCH (fs:FeatureSpec)
  WHERE (fs)-[:IN_DOMAIN]->(domain)
     OR fs.domain = domain.name
  AND fs.status = 'active'

  // Step 5: load FeatureSpec dependencies
  OPTIONAL MATCH (fs)-[:DEPENDS_ON]->(dep:FeatureSpec)
  WHERE dep.status = 'active'

  // Step 6: rank by AppArchetype and stack
  OPTIONAL MATCH (ft)-[:FOR_ARCHETYPE]->(arch:AppArchetype {name: $appArchetype})
  OPTIONAL MATCH (fs)-[:FOR_ARCHETYPE]->(fsArch:AppArchetype)

  RETURN
    proj.id                                  AS projectId,
    ft.name                                  AS featureType,
    collect(DISTINCT domain.name)            AS domainsRequired,
    collect(DISTINCT {
      id:     fs.id,
      name:   fs.name,
      domain: domain.name,
      stack:  fs.stack,
      rank:   CASE
                WHEN fs.stack = $stack AND fsArch.name = $appArchetype THEN 1
                WHEN fs.stack = $stack OR fsArch.name = $appArchetype  THEN 2
                ELSE 3
              END
    })                                       AS featureSpecs,
    collect(DISTINCT dep.id)                 AS dependencyIds;

What This Prevents:
  - Claude selecting domains based on feature description keywords instead
    of graph-encoded requirements
  - Missing domain coverage that is undetectable until after a build fails
  - Inconsistent builds of the same FeatureType across different sessions
    where Claude's intuition varies
  - Silent skip of domains whose canonical name differs from the string
    Claude would have guessed (e.g., "security" never matching
    "auth-session-security" in the old filter)


───────────────────────────────────────────────────────────────────────
