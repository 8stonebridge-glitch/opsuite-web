D19. BUILD-SIDE ENFORCEMENT — Protocol Violations and Failure Memory
───────────────────────────────────────────────────────────────────────

Origin
D14 added protocol violation detection to the audit pipeline, triggered
when Claude bypassed per-finding deliberation gates during audits. The
build pipeline had no equivalent mechanism. A build that proceeded without
consultation, skipped required steps, or failed due to inadequate coverage
produced no persisted evidence of what went wrong or why.

D19 adds the same class of enforcement to the build pipeline. Protocol
violations are written to the graph, not just surfaced in console output.
Build failures caused by knowledge gaps are written as FailureCases.
Project-scoped failure history is queryable. The pattern-detection loop
(D1-D2) can consume these signals in the next audit cycle.

───────────────────────────────────────────────────────────
D19.1 BUILD PROTOCOL VIOLATIONS
───────────────────────────────────────────────────────────

New node type: (:ProtocolViolation)

Properties:

  | Property  | Type     | Description                                     |
  |-----------|----------|-------------------------------------------------|
  | id        | string   | PV-{uuid}, unique                               |
  | stage     | string   | build \| audit \| improvement                   |
  | reason    | string   | Human-readable violation description            |
  | severity  | string   | INFO \| WARNING \| CRITICAL                     |
  | createdAt | datetime | When the violation was detected                 |

Relationship: (Project)-[:HAS_PROTOCOL_VIOLATION]->(ProtocolViolation)

Violation trigger table:

  | Trigger Condition                                         | Severity |
  |-----------------------------------------------------------|----------|
  | Codex called before consultation artifact creation        | CRITICAL |
  | Build attempted with missing required domain coverage     | CRITICAL |
  | FeatureType not classified before build                   | WARNING  |
  | Consultation artifact status = incomplete, build proceeded| CRITICAL |
  | No FeatureSpecs loaded for a required domain              | WARNING  |
  | Project has zero test files (empty tests/ directory)      | CRITICAL |
  | Autocontext Phase 0 scan not run before audit/build       | WARNING  |

Severity semantics:

  CRITICAL: The build is halted immediately. The violation node is written
  before the halt. The build must not produce output. The only path
  forward is to resolve the cause and restart the pipeline from the
  appropriate step.

  WARNING: The violation is written. The build continues. The WARNING is
  visible in the build summary and in the next audit's signal collection
  (D1 COLLECT). Two WARNING violations of the same type in the same
  project within a 7-day window trigger a pattern (D2) of type
  REPEATED_BUILD_WARNING and generate a proposal (D3).

  INFO: The violation is written for observability. No build impact.

Rule D19.1-A: CRITICAL violations halt the build. This rule is
non-negotiable. There is no severity_override parameter, no human
approval bypass, and no "log and continue" mode for CRITICAL violations.

Rule D19.1-B: The violation node MUST be written to Neo4j before the
halt is executed. If the graph write fails (e.g., Neo4j unavailable),
the violation is written to a local fallback log and the build halts
regardless. The inability to write to the graph does not permit the
build to continue.

Rule D19.1-C: Violation detection is the orchestrator's responsibility
(Claude). Codex does not detect protocol violations. Codex is a build
tool; it is called only after consultation is complete.

Cypher — write a protocol violation node:

  CREATE (pv:ProtocolViolation {
    id:        $violationId,
    stage:     $stage,
    reason:    $reason,
    severity:  $severity,
    createdAt: datetime()
  })
  WITH pv
  MATCH (proj:Project {id: $projectId})
  MERGE (proj)-[:HAS_PROTOCOL_VIOLATION]->(pv)
  RETURN pv.id;

Cypher — query violations for a project:

  MATCH (proj:Project {id: $projectId})-[:HAS_PROTOCOL_VIOLATION]->(pv)
  RETURN pv.id,
         pv.stage,
         pv.reason,
         pv.severity,
         pv.createdAt
  ORDER BY pv.createdAt DESC;

  // Count CRITICAL violations by stage for all projects
  MATCH (proj:Project)-[:HAS_PROTOCOL_VIOLATION]->(pv:ProtocolViolation)
  WHERE pv.severity = 'CRITICAL'
  RETURN proj.id, pv.stage, count(pv) AS criticalCount
  ORDER BY criticalCount DESC;

  // Detect repeated WARNING pattern within 7 days
  MATCH (proj:Project {id: $projectId})-[:HAS_PROTOCOL_VIOLATION]->(pv:ProtocolViolation)
  WHERE pv.severity = 'WARNING'
    AND pv.reason = $reasonType
    AND pv.createdAt > datetime() - duration('P7D')
  RETURN count(pv) AS recentWarnings;

───────────────────────────────────────────────────────────
D19.2 FAILURE MEMORY
───────────────────────────────────────────────────────────

New node type: (:FailureCase)

Properties:

  | Property    | Type     | Description                                   |
  |-------------|----------|-----------------------------------------------|
  | id          | string   | FC-{uuid}, unique                             |
  | featureType | string   | The FeatureType that was being built          |
  | domain      | string   | The domain where the failure originated       |
  | cause       | string   | Why the build failed or produced bad output   |
  | fixPattern  | string   | What was needed to fix it                     |
  | scope       | string   | Always 'project' for new FailureCases         |
  | createdAt   | datetime | When the failure was recorded                 |

Relationship: (Project)-[:HAS_FAILURE]->(FailureCase)

Failure triggers:

  | Trigger Condition                                     | Domain Field     |
  |-------------------------------------------------------|------------------|
  | Wrong FeatureSpec selected — build produced incorrect | Domain of the    |
  | output because the wrong spec was consulted           | wrong spec       |
  | Required domain logic missing — build failed because  | The missing      |
  | a domain wasn't in REQUIRES_DOMAIN                   | domain           |
  | Anti-pattern slipped through — D15 knowledge existed | Domain of the    |
  | but did not prevent the anti-pattern in output        | anti-pattern     |
  | Stack mismatch — feature built for wrong framework    | Domain of the    |
  | assumptions despite stack being known                 | spec used        |

Scope rule: FailureCase.scope is always 'project'. FailureCases are
project-scoped evidence. A FailureCase for Project A is not automatically
applied to Project B, even if the featureType and domain match exactly.
Cross-project generalization is handled by D13. The D13 generalization
pathway requires ≥2 independent FailureCases of the same type across ≥2
projects, followed by the existing proposal and validation pipeline.

Rule D19.2-A: FailureCases are created after a build failure is confirmed
— not speculatively. The trigger conditions above define when a failure
meets the threshold for recording. A WARNING-level ProtocolViolation
during the build does not automatically create a FailureCase; a confirmed
output quality failure or build failure does.

Rule D19.2-B: The fixPattern field must describe what knowledge addition,
graph change, or spec correction would have prevented the failure. It is
not a log message. It is actionable. If the orchestrator cannot produce a
fixPattern, it writes 'undetermined' and flags the FailureCase for manual
review.

Rule D19.2-C: FailureCases are never deleted. They are the project's
failure history. If a fix is applied and verified (D7), the FailureCase
is updated with resolvedAt and resolvedBy fields, but the node remains.

Cypher — write a failure case:

  CREATE (fc:FailureCase {
    id:          $failureCaseId,
    featureType: $featureType,
    domain:      $domain,
    cause:       $cause,
    fixPattern:  $fixPattern,
    scope:       'project',
    createdAt:   datetime()
  })
  WITH fc
  MATCH (proj:Project {id: $projectId})
  MERGE (proj)-[:HAS_FAILURE]->(fc)
  RETURN fc.id;

Cypher — query failures by project and featureType:

  MATCH (proj:Project {id: $projectId})-[:HAS_FAILURE]->(fc:FailureCase)
  WHERE fc.featureType = $featureType
  RETURN fc.id,
         fc.domain,
         fc.cause,
         fc.fixPattern,
         fc.createdAt,
         fc.resolvedAt
  ORDER BY fc.createdAt DESC;

  // Show unresolved failures for a project
  MATCH (proj:Project {id: $projectId})-[:HAS_FAILURE]->(fc:FailureCase)
  WHERE fc.resolvedAt IS NULL
  RETURN fc.featureType,
         fc.domain,
         fc.cause,
         fc.createdAt
  ORDER BY fc.createdAt DESC;

  // Find repeated failure causes across builds (same project)
  MATCH (proj:Project {id: $projectId})-[:HAS_FAILURE]->(fc:FailureCase)
  WITH fc.featureType AS ft, fc.cause AS cause, count(fc) AS occurrences
  WHERE occurrences > 1
  RETURN ft, cause, occurrences
  ORDER BY occurrences DESC;

  // Identify candidates for D13 cross-project generalization
  MATCH (proj:Project)-[:HAS_FAILURE]->(fc:FailureCase)
  WITH fc.featureType AS ft, fc.cause AS cause,
       collect(DISTINCT proj.id) AS projects,
       count(fc) AS total
  WHERE size(projects) >= 2
  RETURN ft, cause, projects, total
  ORDER BY total DESC;

───────────────────────────────────────────────────────────
D19.3 AUTOCONTEXT QUALITY GATE
───────────────────────────────────────────────────────────

AutoContext is an independent MCP-based evaluator. Its role in the build
pipeline is strictly evaluative: it examines build output against a rubric
derived from the consultation artifact and returns a pass/fail score. It
does not suggest fixes. It does not modify the pipeline. It does not
communicate with Codex.

The separation is intentional: AES does the work, AutoContext checks the
work. This prevents the "marking your own exam" problem where the same
system that generated the output also certifies its quality.

Gate procedure:

  Step 1 — Build pipeline produces output:
    Codex completes its build/codegen task and returns output.
    The output is held in a review buffer. It is not applied to the
    project until this gate passes.

  Step 2 — Construct evaluation rubric:
    Derive the rubric from the consultation artifact (D18.2):
    - For each domain in domainsConsulted: load the domain's active
      FeatureSpecs and their quality criteria
    - For each FeatureSpec in featureSpecsLoaded: extract its acceptance
      criteria and known anti-patterns
    - Combine into a structured rubric object passed to AutoContext

  Step 3 — Submit to autocontext_evaluate_output:
    Call: autocontext_evaluate_output(output, rubric, consultationId)
    The consultationId links the evaluation to the artifact for traceability.
    Timeout: 30 seconds. If AutoContext does not respond within 30 seconds,
    treat as FAIL (conservative default).

  Step 4 — Process result:
    PASS: output proceeds to D7 verification pipeline.
    FAIL: output is rejected. A FailureCase node is written (D19.2) with
          cause = AutoContext's failure reason. The build must retry.
          Retry does not mean re-calling Codex with the same inputs.
          Retry means re-running the build pipeline from D18.1 with
          updated knowledge (add missing specs, fix REQUIRES_DOMAIN wiring,
          etc.) to address the rubric failure before regenerating.

  Step 5 — Store evaluation result:
    Regardless of pass/fail, the AutoContext result is stored as a
    property on the relevant FailureCase or as a linked node (if PASS,
    linked to the consultation artifact).

Rule D19.3-A: AutoContext is an examiner only. It returns scores and
pass/fail. It does not suggest what to change. If AutoContext's reasoning
is inspected, it must not be used as a "fix prompt" for Codex. Fixes
come from updating the AES knowledge graph and re-running the pipeline.

Rule D19.3-B: If autocontext MCP is not connected, this gate is skipped.
D7 verification remains the primary quality check. The skip is logged as
a ProtocolViolation with severity = INFO and reason =
'autocontext_gate_skipped_mcp_unavailable'. This is informational only
and does not block the build.

Rule D19.3-C: AutoContext evaluates output, not process. It does not
receive the consultation artifact itself as context. It receives only
the build output and the derived rubric. This prevents AutoContext from
grading the process rather than the result.

Rubric construction example:

  // For featureType = 'authentication-flow', domains consulted =
  // [auth-session-security, forms-input, error_states, navigation]:
  {
    "domains": ["auth-session-security", "forms-input", "error_states", "navigation"],
    "criteria": [
      "No redirect loop possible in sign-in/sign-up flow",
      "Form validation errors shown inline, not as page-level alerts",
      "Error boundary present on auth route tree",
      "Post-auth navigation resolves to a non-auth-guarded route"
    ],
    "antiPatterns": [
      "Redirect URL pointing to root route without auth-state check",
      "Silent auth failure with no user-visible error state"
    ],
    "consultationId": "CONS-a1b2c3d4-..."
  }

───────────────────────────────────────────────────────────
D19.4 WHAT THIS PREVENTS
───────────────────────────────────────────────────────────

Building without consulting specs:
  D18 blocks the build at the gate level. D19.1 writes a CRITICAL
  ProtocolViolation if the gate was somehow bypassed. Together they
  create two detection layers: a prevention layer (D18 gate) and an
  evidence layer (D19.1 violation node). Bypassing the gate is detectable
  even if it succeeds.

Repeating the same build failure:
  Without FailureCases, each build starts with no memory of what went
  wrong in previous builds for the same project and featureType. D19.2
  gives the pipeline queryable failure history. Before a build starts,
  the orchestrator can query HAS_FAILURE for the project and featureType
  to see whether this build has failed before and for what reason.

No paper trail for build failures:
  A build failure that is not written to the graph is invisible to D1
  COLLECT, D2 pattern detection, and D13 generalization. FailureCases
  ensure that every confirmed build failure is a node in the graph,
  linked to the project, and available for pattern analysis.

The "marking your own exam" problem:
  AutoContext is independent of AES's build logic. It evaluates output
  against a rubric the pipeline itself derived — but the evaluation
  judgment is external. This is the same structural separation that
  D14.5 applied to audit finding dismissals (Claude cannot override
  Codex without Gemini's agreement). D19.3 applies the same principle
  to build output quality.

───────────────────────────────────────────────────────────
D19.5 SCHEMA ADDITIONS (v11)
───────────────────────────────────────────────────────────

New node types added by D17-D19:

  (:FeatureConsultation) — pre-build knowledge proof artifact (D18)
  (:FailureCase)         — project-scoped build failure record (D19.2)
  (:ProtocolViolation)   — build or audit protocol bypass record (D19.1)

New relationship types added by D17-D19:

  (:FeatureDomain)-[:ALIAS_OF]->(:FeatureDomain)
    — normalization layer; alias resolves to canonical (D17.1)

  (:FeatureType)-[:REQUIRES_DOMAIN]->(:FeatureDomain)
    — already existed; rewired to canonical targets in D17.1

  (:Project)-[:HAS_CONSULTATION]->(:FeatureConsultation)
  (:FeatureConsultation)-[:FOR_FEATURE_TYPE]->(:FeatureType)
  (:FeatureConsultation)-[:CONSULTED_DOMAIN]->(:FeatureDomain)
  (:FeatureConsultation)-[:USED_SPEC]->(:FeatureSpec)

  (:Project)-[:HAS_FAILURE]->(:FailureCase)
  (:Project)-[:HAS_PROTOCOL_VIOLATION]->(:ProtocolViolation)

New constraints added by D17-D19:

  FeatureDomain.name      UNIQUE  (D17.3)
  FeatureSpec.id          UNIQUE  (D17.3)
  Rule.id                 UNIQUE  (D17.3)
  FeatureConsultation.id  UNIQUE  (D18.2)
  FailureCase.id          UNIQUE  (D19.2)
  ProtocolViolation.id    UNIQUE  (D19.1)
