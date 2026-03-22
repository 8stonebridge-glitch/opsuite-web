# Donor Artifact Schema

This document extends the donor logic model with a concrete artifact schema.

The goal is to make donor analysis structured enough that:
- reverse-engineering does not become loose note-taking
- UI inspiration does not get mixed with operational truth
- bridge contracts can be generated from accepted artifacts
- validators can check the right thing
- feedback can be written back with provenance

This schema covers both:
- logic donors
- UI donors

## Core principle

Every donor study should produce a fixed set of artifacts.

Those artifacts move through this lifecycle:

1. donor selected
2. donor observed
3. findings normalized
4. candidates reviewed
5. accepted items compiled into bridge inputs
6. build executed under contract
7. validators confirm or reject the rebuild
8. only verified lessons go back into the graph

## Artifact set

Each donor study should be able to produce these artifacts:
- `donor_profile`
- `donor_observation`
- `normalized_logic_candidate`
- `normalized_ui_candidate`
- `acceptance_review`
- `bridge_contract_input`
- `validator_requirement`
- `execution_evidence`
- `verified_lesson`

## Common fields

All artifacts should carry these fields unless explicitly marked optional:
- `id`
- `artifact_type`
- `created_at`
- `updated_at`
- `source_status`
- `confidence`
- `owner`
- `notes`

Suggested enums:

### `source_status`
- `observed`
- `normalized`
- `reviewed`
- `accepted`
- `rejected`
- `validated`

### `confidence`
- `low`
- `medium`
- `high`
- `validated`

## 1. donor_profile

This identifies the donor and the reason it is being studied.

Required fields:
- `id`
- `artifact_type = donor_profile`
- `donor_name`
- `donor_class`
- `platform`
- `feature_area`
- `study_goal`
- `relevance_reason`
- `scope_boundary`
- `created_at`

Optional fields:
- `product_url`
- `binary_path`
- `app_store_link`
- `version`
- `analyst`
- `target_features`
- `known_limitations`

### `donor_class`
- `logic`
- `ui`
- `hybrid`

### `scope_boundary`

This should describe exactly what is in scope.

Examples:
- `onboarding wizard only`
- `notification center and unread behavior`
- `approval flow state changes`
- `dashboard layout and reporting filters`

## 2. donor_observation

This records a raw observed finding before it becomes accepted logic.

Required fields:
- `id`
- `artifact_type = donor_observation`
- `donor_profile_id`
- `feature_area`
- `observation_type`
- `evidence_type`
- `raw_evidence_ref`
- `finding_summary`
- `finding_detail`
- `confidence`
- `created_at`

Optional fields:
- `address_or_symbol`
- `file_or_resource`
- `screenshot_ref`
- `network_ref`
- `ui_flow_ref`
- `tags`
- `ambiguities`

### `observation_type`
- `behavior`
- `state`
- `transition`
- `permission`
- `failure`
- `notification`
- `layout`
- `interaction`
- `view_state`
- `routing`

### `evidence_type`
- `binary_string`
- `procedure`
- `pseudo_code`
- `manifest`
- `config`
- `network_capture`
- `filesystem_artifact`
- `ui_observation`
- `screenshot`
- `manual_test`

## 3. normalized_logic_candidate

This converts raw donor findings into operational units that AES can reason about.

Required fields:
- `id`
- `artifact_type = normalized_logic_candidate`
- `donor_profile_id`
- `derived_from_observation_ids`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `confidence`
- `created_at`

Optional fields:
- `related_actor`
- `related_artifact`
- `preconditions`
- `postconditions`
- `failure_path`
- `metric_implication`
- `acceptance_notes`

### `candidate_kind`
- `State`
- `Transition`
- `Rule`
- `PermissionRule`
- `VisibilityRule`
- `FailureMode`
- `Evaluation`
- `ValidatorRequirement`
- `Metric`
- `NotificationTrigger`
- `Actor`
- `Artifact`

### Example

- `candidate_kind`: `PermissionRule`
- `canonical_statement`: `A user cannot complete save until required account permission is granted`

## 4. normalized_ui_candidate

This converts raw UI donor findings into presentation and interaction units.

Required fields:
- `id`
- `artifact_type = normalized_ui_candidate`
- `donor_profile_id`
- `derived_from_observation_ids`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `confidence`
- `created_at`

Optional fields:
- `screen_name`
- `layout_notes`
- `interaction_notes`
- `accessibility_notes`
- `responsive_notes`
- `acceptance_notes`

### `candidate_kind`
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`
- `NavigationPattern`
- `PresentationRule`

### Example

- `candidate_kind`: `ViewState`
- `canonical_statement`: `When no results exist, the interface must show a clear empty state with a next-step action`

## 5. acceptance_review

This artifact decides whether a normalized donor candidate is allowed to influence the graph and bridge.

Required fields:
- `id`
- `artifact_type = acceptance_review`
- `donor_profile_id`
- `target_artifact_id`
- `review_scope`
- `decision`
- `review_reason`
- `reviewed_by`
- `created_at`

Optional fields:
- `required_follow_up`
- `human_override`
- `linked_validator_requirements`

### `review_scope`
- `logic`
- `ui`
- `hybrid`

### `decision`
- `accept`
- `accept_with_constraints`
- `needs_more_evidence`
- `reject`

## 6. bridge_contract_input

This is the donor-derived material that is allowed to influence the build contract.

Required fields:
- `id`
- `artifact_type = bridge_contract_input`
- `feature_area`
- `accepted_artifact_ids`
- `contract_scope`
- `required_outcomes`
- `forbidden_shortcuts`
- `required_validators`
- `created_at`

Optional fields:
- `approved_filescope`
- `approved_write_paths`
- `approved_commands`
- `required_evidence`
- `delivery_notes`

### `contract_scope`
- `logic_only`
- `ui_only`
- `logic_and_ui`

### `required_outcomes`

This should be a concrete list of things the builder must produce.

Examples:
- `permission gate exists before save action`
- `failure state is visible to the user`
- `approval transition writes audit evidence`
- `empty state follows accepted UI pattern`

## 7. validator_requirement

This defines what independent proof is needed before the work can be marked complete.

Required fields:
- `id`
- `artifact_type = validator_requirement`
- `feature_area`
- `validator_kind`
- `requirement_statement`
- `pass_condition`
- `created_at`

Optional fields:
- `blocking_level`
- `linked_contract_input_id`
- `linked_candidate_ids`
- `test_or_check_ref`

### `validator_kind`
- `unit_test`
- `integration_test`
- `e2e_test`
- `review`
- `policy_check`
- `schema_check`
- `accessibility_check`
- `design_check`
- `evidence_check`

### `blocking_level`
- `blocking`
- `advisory`

## 8. execution_evidence

This records what actually happened during implementation and validation.

Required fields:
- `id`
- `artifact_type = execution_evidence`
- `feature_area`
- `evidence_kind`
- `evidence_ref`
- `evidence_summary`
- `produced_at`

Optional fields:
- `builder_run_id`
- `validator_run_id`
- `git_ref`
- `diff_ref`
- `screenshot_ref`
- `test_output_ref`
- `review_output_ref`

### `evidence_kind`
- `diff`
- `test_result`
- `review_result`
- `policy_result`
- `screenshot`
- `trace`
- `log`
- `audit_record`

## 9. verified_lesson

This is the only kind of donor-derived knowledge that should be written back as proven guidance.

Required fields:
- `id`
- `artifact_type = verified_lesson`
- `feature_area`
- `lesson_statement`
- `verified_by_evidence_ids`
- `source_artifact_ids`
- `writeback_scope`
- `created_at`

Optional fields:
- `applies_to_features`
- `applies_to_donor_classes`
- `failure_if_ignored`
- `recommended_validator_pattern`

### `writeback_scope`
- `graph_candidate_only`
- `graph_canonical`
- `bridge_template`
- `validator_library`
- `ui_pattern_library`

## Artifact relationships

The normal chain should look like this:

- `donor_profile`
  -> many `donor_observation`
- `donor_observation`
  -> many `normalized_logic_candidate`
  -> many `normalized_ui_candidate`
- `normalized_logic_candidate` or `normalized_ui_candidate`
  -> one or more `acceptance_review`
- accepted candidates
  -> `bridge_contract_input`
  -> `validator_requirement`
- validator results and build outputs
  -> `execution_evidence`
- proven outcomes
  -> `verified_lesson`

## Acceptance rules by donor class

### Logic donor acceptance

Logic donor material can influence:
- workflow state
- transitions
- permissions
- failure handling
- validator requirements
- notification behavior

Logic donor material should not be accepted if:
- it is only inferred from code shape
- it has weak evidence
- it cannot be mapped to a real operational concept

### UI donor acceptance

UI donor material can influence:
- layout structure
- view states
- interaction patterns
- navigation patterns
- presentation constraints

UI donor material should not be accepted as:
- backend truth
- permission truth
- data model truth
- audit truth

## Minimal required fields for first-pass donor studies

If you want a lightweight version, the smallest acceptable set is:

- `donor_profile`
  - `donor_name`
  - `donor_class`
  - `feature_area`
  - `study_goal`

- `donor_observation`
  - `finding_summary`
  - `evidence_type`
  - `raw_evidence_ref`
  - `confidence`

- `normalized_logic_candidate` or `normalized_ui_candidate`
  - `candidate_kind`
  - `canonical_statement`
  - `derived_from_observation_ids`

- `acceptance_review`
  - `decision`
  - `review_reason`

## Recommended graph mapping

These artifacts do not all need to become top-level canonical nodes.

A safe mapping is:
- keep `donor_profile`, `donor_observation`, and review metadata in a donor evidence layer
- map accepted candidates to bridge-relevant graph concepts
- map `verified_lesson` into the reusable lesson or pattern layer

This preserves:
- donor provenance
- separation of observed vs accepted truth
- clean bridge generation

## Practical examples

### Logic donor example

Observed:
- a donor app blocks approval submission until required fields are complete

Stored as:
- `donor_observation`
- `normalized_logic_candidate` with `candidate_kind = Rule`
- `acceptance_review`
- `bridge_contract_input`
- `validator_requirement` proving submission is impossible when fields are incomplete

### UI donor example

Observed:
- a donor reporting dashboard uses a strong empty state with a clear filter reset action

Stored as:
- `donor_observation`
- `normalized_ui_candidate` with `candidate_kind = ViewState`
- `acceptance_review`
- `bridge_contract_input`
- `validator_requirement` proving the empty state is visible and actionable

## Final rule

If an artifact cannot be traced to evidence, it should not enter the bridge.

If it cannot survive validation, it should not go back into the graph.
