───────────────────────────────────────────────────────────────────────
D8. NEO4J SCHEMA ADDITIONS
───────────────────────────────────────────────────────────────────────

New Node Types

  (:Project)        — a codebase the system audits (D0.5)
  (:Signal)         — raw signal from an audit, scoped to project
  (:Pattern)        — cluster of signals indicating a systemic issue, scoped to project
  (:Proposal)       — specific change proposed to the system, scoped to project
  (:GlobalProposal) — cross-project promotion of a verified proposal (D13)
  (:Application)    — record of an applied change, scoped to project
  (:VerificationResult) — outcome of verifying an applied change
  (:ValidationResult)   — outcome of validating a proposal
  (:Rollback)       — record of a reverted change
  (:RuleVersion)    — historical version of a modified rule
  (:PromptVersion)  — historical version of a modified agent prompt
  (:FindingOverride) — record of a 1-level severity downgrade (D14.1)
  (:FlowFinding)   — result of a critical user flow trace (D14.7)
  (:AppArchetype)   — classifier for project types (D15.1)
  (:FlowPattern)    — prescriptive flow state machine template (D15.1)
  (:FlowStage)      — one stage in a flow’s state machine (D15.1)
  (:FlowTransition) — guarded edge between flow stages (D15.1)
  (:FlowAntiPattern)— known-bad flow pattern (D15.1)
  (:ConfigSnapshot) — point-in-time snapshot of scoring weights,
                      severity thresholds, or timeout configs

  // Prescriptive graph and build enforcement (D17-D19)
  (:FeatureConsultation) — pre-build knowledge proof artifact (D18)
  (:FailureCase)         — project-scoped build failure record (D19.2)
  (:ProtocolViolation)   — build or audit protocol bypass record (D19.1)

New Relationships

  // Project scoping
  (:Project)-[:AUDITED_BY]->(:Audit)
  (:Project)-[:HAS_SIGNAL]->(:Signal)
  (:Project)-[:HAS_PATTERN]->(:Pattern)
  (:Project)-[:HAS_PROPOSAL]->(:Proposal)
  (:Project)-[:HAS_APPLICATION]->(:Application)

  // Improvement loop flow
  (:Audit)-[:PRODUCED_SIGNAL]->(:Signal)
  (:Signal)-[:CONTRIBUTED_TO]->(:Pattern)
  (:Pattern)-[:DETECTED_IN]->(:Audit)
  (:Pattern)-[:GENERATED]->(:Proposal)
  (:Proposal)-[:VALIDATED_BY]->(:ValidationResult)
  (:Proposal)-[:APPLIED_AS]->(:Application)
  (:Application)-[:VERIFICATION]->(:VerificationResult)
  (:Application)-[:ROLLED_BACK_BY]->(:Rollback)
  (:Rule)-[:HAS_VERSION]->(:RuleVersion)
  (:Prompt)-[:HAS_VERSION]->(:PromptVersion)
  (:Proposal)-[:MODIFIED]->(:Rule)

  // Cross-project generalization (D13)
  (:Proposal)-[:PROMOTED_TO]->(:GlobalProposal)
  (:GlobalProposal)-[:SUPPORTED_BY]->(:Pattern)
  (:GlobalProposal)-[:APPLIED_TO]->(:Project)

  // Audit pipeline amendments (D14)
  (:AuditFinding)-[:OVERRIDDEN_BY]->(:FindingOverride)
  (:AuditFinding)-[:RESOLVED_BY]->(:Decision)
  (:Audit)-[:TRACED_FLOW]->(:FlowFinding)
  (:Project)-[:HAS_FLOW_FINDING]->(:FlowFinding)

  // UX flow knowledge (D15)
  (:FlowPattern)-[:FOR_ARCHETYPE]->(:AppArchetype)
  (:Project)-[:IS_ARCHETYPE]->(:AppArchetype)
  (:FlowPattern)-[:HAS_STAGE]->(:FlowStage)
  (:FlowStage)-[:TRANSITIONS_TO]->(:FlowStage)
  (:FlowStage)-[:HAS_TRANSITION]->(:FlowTransition)
  (:FlowTransition)-[:TARGETS]->(:FlowStage)
  (:FlowAntiPattern)-[:FOR_ARCHETYPE]->(:AppArchetype)
  (:FlowAntiPattern)-[:VIOLATES]->(:FlowPattern)
  (:Knowledge)-[:INFORMS]->(:FlowPattern)
  (:Knowledge)-[:INFORMS]->(:FlowAntiPattern)
  (:Build)-[:USED_FLOW]->(:FlowPattern)
  (:AuditFinding)-[:MATCHES_ANTIPATTERN]->(:FlowAntiPattern)
  (:FlowPattern)-[:FOR_PROJECT]->(:Project)

  // Prescriptive graph normalization (D17)
  (:FeatureDomain)-[:ALIAS_OF]->(:FeatureDomain)
  (:FeatureType)-[:REQUIRES_DOMAIN]->(:FeatureDomain)  // rewired to canonical targets

  // Consultation gate (D18)
  (:Project)-[:HAS_CONSULTATION]->(:FeatureConsultation)
  (:FeatureConsultation)-[:FOR_FEATURE_TYPE]->(:FeatureType)
  (:FeatureConsultation)-[:CONSULTED_DOMAIN]->(:FeatureDomain)
  (:FeatureConsultation)-[:USED_SPEC]->(:FeatureSpec)

  // Build-side enforcement (D19)
  (:Project)-[:HAS_FAILURE]->(:FailureCase)
  (:Project)-[:HAS_PROTOCOL_VIOLATION]->(:ProtocolViolation)

Query Examples

"Show all proposals that were applied but failed verification":
  MATCH (p:Proposal)-[:APPLIED_AS]->(a:Application)-[:VERIFICATION]->(v:VerificationResult)
  WHERE v.outcome = 'VERIFIED_FAIL'
  RETURN p, a, v

"Show the system's false positive rate over time":
  MATCH (a:Audit)-[:PRODUCED_SIGNAL]->(s:Signal {type: 'FALSE_POSITIVE'})
  RETURN a.date, count(s) ORDER BY a.date

"Show which proposals actually improved outcomes":
  MATCH (p:Proposal)-[:APPLIED_AS]->(a:Application)-[:VERIFICATION]->(v:VerificationResult)
  WHERE v.outcome = 'VERIFIED_PASS'
  RETURN p.target, p.action, count(v)

"Show the improvement velocity (proposals applied per audit)":
  MATCH (a:Audit)
  OPTIONAL MATCH (app:Application)
  WHERE app.applied_at > a.date
  RETURN a.id, count(app) ORDER BY a.date

"What's the system's current rule effectiveness?":
  MATCH (r:Rule {state: 'ACTIVE'})
  OPTIONAL MATCH (r)<-[:MODIFIED]-(p:Proposal)-[:APPLIED_AS]->(app:Application)-[:VERIFICATION]->(v:VerificationResult)
  RETURN r.id, r.description, v.outcome, count(v)

"Show all proposals for a specific project":
  MATCH (proj:Project {id: 'PROJ-opsuite'})-[:HAS_PROPOSAL]->(p:Proposal)
  RETURN p.id, p.target, p.action, p.status, p.scope

"Which patterns have been detected across multiple projects?":
  MATCH (p:Pattern)
  WITH p.type AS pattern_type, collect(DISTINCT p.project_id) AS projects
  WHERE size(projects) >= 2
  RETURN pattern_type, projects

"Show global proposals awaiting human approval":
  MATCH (gp:GlobalProposal {status: 'pending_human'})
  RETURN gp.id, gp.target, gp.scope, gp.supporting_projects, gp.evidence_summary

"Compare improvement velocity across projects":
  MATCH (proj:Project)-[:HAS_APPLICATION]->(app:Application)
  RETURN proj.name, proj.stack, count(app) AS applied_changes ORDER BY applied_changes DESC

