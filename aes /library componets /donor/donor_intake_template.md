# Donor Intake Template

Use this template to start any donor study in AES.

It is designed to keep donor work structured from the first step.
It should be filled before deep reverse engineering or detailed UI decomposition begins.

This template works for:
- logic donors
- UI donors
- hybrid donors

It aligns with:
- [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
- [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)
- [donor_graph_mapping_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_graph_mapping_spec.md)
- [donor_review_workflow_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_review_workflow_spec.md)

## How to use this template

Complete the intake before study begins.

The intake should answer:
- what donor is being studied
- why it matters
- what part of it is in scope
- whether it is a logic donor, UI donor, or hybrid
- what evidence methods will be used
- what AES feature area it maps to
- what success looks like

## Intake Template

```md
# Donor Intake

## Basic identity
- donor_name:
- donor_class: logic | ui | hybrid
- platform:
- version:
- source_location:
- analyst:
- intake_date:

## AES mapping
- target_feature_area:
- target_work_item_type:
- target_flow:
- target_ui_surface:
- target_operational_concepts:
- target_ui_concepts:

## Study goal
- study_goal:
- relevance_reason:
- expected_reusable_value:
- out_of_scope:

## Scope boundary
- exact_surface_in_scope:
- exact_surface_out_of_scope:
- depth_limit:

## Donor quality assessment
- why_this_donor_is_strong:
- likely_noise_or_wrapper_risk:
- portability_risk:
- confidence_before_study: low | medium | high

## Evidence plan
- evidence_methods:
  - binary inspection
  - strings
  - procedures
  - pseudo-code
  - manifests/config
  - screenshots
  - UI flow observation
  - network capture
  - manual test
- expected_evidence_artifacts:
- expected_limitations:

## Candidate outputs expected
- logic_candidates_expected:
- ui_candidates_expected:
- likely_states:
- likely_transitions:
- likely_rules:
- likely_failure_modes:
- likely_ui_patterns:
- likely_view_states:

## Review plan
- review_scope: logic | ui | hybrid
- expected_risk_level: low | medium | high
- likely_required_reviewers:
- likely_required_validators:
- likely_constraints_if_accepted:

## Success definition
- study_is_successful_if:
- minimum_bridge_ready_output:
- minimum_validator_ready_output:

## Notes
- notes:
```

## Field guidance

### `donor_class`

Use:
- `logic` when the donor is mainly useful for workflows, permissions, states, rules, failures
- `ui` when the donor is mainly useful for layout, interaction, navigation, and presentation
- `hybrid` when both are materially useful

### `target_feature_area`

This should match the AES feature the donor is meant to improve.

Examples:
- `approval_workflow`
- `reporting`
- `onboarding`
- `notification_system`

### `target_operational_concepts`

List the likely AES concepts involved.

Examples:
- `State`
- `Transition`
- `Rule`
- `FailureMode`
- `Evaluation`
- `Metric`
- `Notification`

### `target_ui_concepts`

List the likely UI-side concepts involved.

Examples:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`

### `depth_limit`

This keeps the donor study from sprawling.

Examples:
- `strings and manifests only`
- `UI observation plus screenshots only`
- `procedure-level review for one feature surface only`
- `no network capture in this phase`

### `expected_reusable_value`

Describe the reusable behavior you hope to extract.

Good examples:
- `role-aware onboarding step flow`
- `notification unread/read state behavior`
- `reporting empty state and filter reset pattern`
- `permission gate before save or submit action`

Bad examples:
- `copy their whole app`
- `make ours look exactly like theirs`

## Lightweight intake version

If you need a fast start, use this minimum version:

```md
# Donor Intake
- donor_name:
- donor_class:
- platform:
- target_feature_area:
- study_goal:
- scope_boundary:
- evidence_methods:
- expected_reusable_value:
- review_scope:
- expected_risk_level:
```

## Example: logic donor

```md
# Donor Intake

## Basic identity
- donor_name: Example Approval Tool
- donor_class: logic
- platform: web
- version: unknown
- source_location: binary + product inspection
- analyst: codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: approval_workflow
- target_work_item_type: ApprovalRequest
- target_flow: approval decision flow
- target_ui_surface: approval detail panel
- target_operational_concepts: State, Transition, Rule, FailureMode, AuditLog
- target_ui_concepts: ViewState

## Study goal
- study_goal: extract approval gating and audit-confirmation logic
- relevance_reason: improve governed transitions and visible approval status
- expected_reusable_value: reusable approval state machine and confirmation pattern
- out_of_scope: branding, analytics, unrelated dashboard areas
```

## Example: UI donor

```md
# Donor Intake

## Basic identity
- donor_name: Example Reporting UI
- donor_class: ui
- platform: web
- version: current public release
- source_location: live product inspection
- analyst: codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: reporting
- target_work_item_type: Report
- target_flow: reporting exploration flow
- target_ui_surface: dashboard and filters
- target_operational_concepts: Metric
- target_ui_concepts: UIPattern, LayoutPattern, InteractionPattern, ViewState

## Study goal
- study_goal: extract dashboard layout, filter interaction, and empty-state clarity patterns
- relevance_reason: improve reporting usability without changing canonical reporting truth
- expected_reusable_value: reusable dashboard structure and filter reset state pattern
- out_of_scope: backend data model, exports implementation, scheduler behavior
```

## Final rule

If a donor study cannot be described clearly at intake time, it is not ready for deep analysis yet.
