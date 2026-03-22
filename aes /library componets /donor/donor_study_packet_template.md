# Donor Study Packet Template

Use this file to run a complete donor study from intake through bridge-ready output.

This packet is the working artifact for one donor study.
It should be filled as the study progresses.

It aligns with:
- [donor_intake_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_intake_template.md)
- [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
- [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)
- [donor_graph_mapping_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_graph_mapping_spec.md)
- [donor_review_workflow_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_review_workflow_spec.md)

## How to use this packet

This packet should be updated in order:

1. intake
2. evidence capture
3. normalized candidates
4. review decisions
5. bridge-ready outputs
6. validator requirements
7. execution evidence
8. verified lessons

This is the working file for one donor.

## Packet Template

```md
# Donor Study Packet

## Packet Metadata
- packet_id:
- donor_name:
- donor_class: logic | ui | hybrid
- feature_area:
- packet_owner:
- created_at:
- updated_at:
- packet_status: intake | observing | normalizing | under_review | bridge_ready | validated | archived

## 1. Intake Summary
- study_goal:
- relevance_reason:
- expected_reusable_value:
- scope_boundary:
- out_of_scope:
- expected_risk_level: low | medium | high

## 2. AES Mapping
- target_feature_area:
- target_work_item_type:
- target_flow:
- target_ui_surface:
- target_operational_concepts:
- target_ui_concepts:

## 3. Evidence Plan
- evidence_methods:
- expected_evidence_artifacts:
- evidence_limitations:
- open_questions:

## 4. Donor Observations

### Observation 1
- observation_id:
- observation_type:
- evidence_type:
- raw_evidence_ref:
- finding_summary:
- finding_detail:
- confidence: low | medium | high
- notes:

### Observation 2
- observation_id:
- observation_type:
- evidence_type:
- raw_evidence_ref:
- finding_summary:
- finding_detail:
- confidence: low | medium | high
- notes:

### Observation N
- observation_id:
- observation_type:
- evidence_type:
- raw_evidence_ref:
- finding_summary:
- finding_detail:
- confidence: low | medium | high
- notes:

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id:
- candidate_kind:
- derived_from_observation_ids:
- canonical_statement:
- target_feature_area:
- preconditions:
- postconditions:
- failure_path:
- metric_implication:
- confidence: low | medium | high
- status: draft | reviewed | accepted | rejected

### Logic Candidate N
- candidate_id:
- candidate_kind:
- derived_from_observation_ids:
- canonical_statement:
- target_feature_area:
- preconditions:
- postconditions:
- failure_path:
- metric_implication:
- confidence: low | medium | high
- status: draft | reviewed | accepted | rejected

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id:
- candidate_kind:
- derived_from_observation_ids:
- canonical_statement:
- target_feature_area:
- screen_name:
- layout_notes:
- interaction_notes:
- accessibility_notes:
- responsive_notes:
- confidence: low | medium | high
- status: draft | reviewed | accepted | rejected

### UI Candidate N
- candidate_id:
- candidate_kind:
- derived_from_observation_ids:
- canonical_statement:
- target_feature_area:
- screen_name:
- layout_notes:
- interaction_notes:
- accessibility_notes:
- responsive_notes:
- confidence: low | medium | high
- status: draft | reviewed | accepted | rejected

## 7. Review Decisions

### Review 1
- review_id:
- review_scope: logic | ui | hybrid
- target_artifact_id:
- decision: accept | accept_with_constraints | needs_more_evidence | reject
- review_reason:
- reviewed_by:
- constraints:
- required_follow_up:
- promotion_allowed: yes | no

### Review N
- review_id:
- review_scope: logic | ui | hybrid
- target_artifact_id:
- decision: accept | accept_with_constraints | needs_more_evidence | reject
- review_reason:
- reviewed_by:
- constraints:
- required_follow_up:
- promotion_allowed: yes | no

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id:
- contract_scope: logic_only | ui_only | logic_and_ui
- accepted_artifact_ids:
- required_outcomes:
- forbidden_shortcuts:
- required_validators:
- approved_filescope:
- approved_write_paths:
- approved_commands:
- required_evidence:

### Bridge Input N
- bridge_input_id:
- contract_scope: logic_only | ui_only | logic_and_ui
- accepted_artifact_ids:
- required_outcomes:
- forbidden_shortcuts:
- required_validators:
- approved_filescope:
- approved_write_paths:
- approved_commands:
- required_evidence:

## 9. Validator Requirements

### Validator 1
- validator_id:
- validator_kind:
- requirement_statement:
- pass_condition:
- blocking_level: blocking | advisory
- linked_bridge_input_id:

### Validator N
- validator_id:
- validator_kind:
- requirement_statement:
- pass_condition:
- blocking_level: blocking | advisory
- linked_bridge_input_id:

## 10. Execution Evidence

### Evidence 1
- evidence_id:
- evidence_kind:
- evidence_ref:
- evidence_summary:
- builder_run_id:
- validator_run_id:
- produced_at:

### Evidence N
- evidence_id:
- evidence_kind:
- evidence_ref:
- evidence_summary:
- builder_run_id:
- validator_run_id:
- produced_at:

## 11. Verified Lessons

### Lesson 1
- lesson_id:
- lesson_statement:
- verified_by_evidence_ids:
- source_artifact_ids:
- writeback_scope:
- failure_if_ignored:
- recommended_validator_pattern:

### Lesson N
- lesson_id:
- lesson_statement:
- verified_by_evidence_ids:
- source_artifact_ids:
- writeback_scope:
- failure_if_ignored:
- recommended_validator_pattern:

## 12. Promotion Summary
- accepted_logic_candidates:
- accepted_ui_candidates:
- promoted_operational_targets:
- promoted_ui_targets:
- rejected_candidates:
- deferred_candidates:

## 13. Final Status
- packet_status:
- bridge_ready: yes | no
- validator_ready: yes | no
- writeback_ready: yes | no
- next_action:
- owner_notes:
```

## Guidance

### Use one packet per donor scope

Do not mix unrelated donor scopes in one packet.

Good:
- one packet for `approval flow logic`
- one packet for `reporting dashboard UI`

Bad:
- one packet for all behavior in a full app

### Keep evidence references concrete

Good evidence refs:
- Hopper address or procedure name
- screenshot path
- network capture id
- plist or manifest file path
- test recording id

Bad evidence refs:
- `somewhere in the app`
- `looked like it did this`

### Do not skip normalization

Observations should not jump straight into bridge outputs.

The packet is only safe if it goes through:
- observations
- normalized candidates
- review
- bridge outputs

### UI and logic can coexist

If the donor is hybrid, use both sections:
- normalized logic candidates
- normalized UI candidates

Keep them separate even if they describe the same flow.

Example:
- logic candidate: `permission must be granted before save`
- UI candidate: `permission-required state must show a clear unblock action`

## Lightweight packet version

If you need a minimal working packet, keep only:
- packet metadata
- intake summary
- observations
- one normalized candidate section
- review decisions
- bridge-ready outputs
- validator requirements

## Final rule

If a donor packet cannot produce bridge-ready outputs and validator requirements, it is not mature enough to influence AES execution.
