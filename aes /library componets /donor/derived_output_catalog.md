# Derived Output Catalog

This catalog defines the concrete reusable outputs AES should produce from donor studies.

It turns derived patterns into named deliverables that can be stored, reviewed, and reused.

## Output families

AES should package donor-derived outputs into these families:
- `core_models`
- `ui_models`
- `ops_models`
- `validator_bundles`
- `bridge_presets`
- `pattern_library_entries`
- `scenario_packs`
- `metric_packs`
- `audit_packs`
- `release_bundles`

## 1. core_models

Used for app behavior and workflow truth.

Includes:
- `StateMachine`
- `PermissionModel`
- `VisibilityModel`
- `NotificationCausalityModel`
- `FailureModel`
- `RecoveryModel`
- `CollaborationModel`
- `WorkItemSemanticModel`
- `OnboardingModel`

Minimum output shape:
- `id`
- `model_type`
- `name`
- `derived_from_donors`
- `accepted_components`
- `evidence_refs`
- `validator_refs`
- `reuse_scope`

## 2. ui_models

Used for frontend and interaction truth.

Includes:
- `UISystemPattern`
- `NavigationPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`
- `PresentationRule`

Minimum output shape:
- `id`
- `ui_model_type`
- `screen_family`
- `derived_from_screens`
- `accepted_components`
- `evidence_refs`
- `validator_refs`
- `reuse_scope`

## 3. ops_models

Used for operator and platform truth.

Includes:
- `OperatorConsolePattern`
- `EnvironmentPolicy`
- `IntegrationPattern`
- `AlertPolicy`
- `ReleaseControlPattern`

Minimum output shape:
- `id`
- `ops_model_type`
- `operational_scope`
- `derived_from_donors`
- `required_surfaces`
- `evidence_refs`
- `validator_refs`
- `reuse_scope`

## 4. validator_bundles

Used to group related validators into reusable packs.

Examples:
- `notification_bundle`
- `workflow_bundle`
- `billing_bundle`
- `collaboration_bundle`
- `release_bundle`

Minimum output shape:
- `id`
- `bundle_name`
- `feature_class`
- `validator_ids`
- `blocking_validators`
- `advisory_validators`
- `derived_from_patterns`

## 5. bridge_presets

Used to generate reusable bridge contracts for recurring feature classes.

Examples:
- `approval_preset`
- `notification_preset`
- `billing_recovery_preset`
- `operator_console_preset`

Minimum output shape:
- `id`
- `preset_name`
- `feature_class`
- `required_outcomes`
- `forbidden_shortcuts`
- `required_validators`
- `approved_surface_scope`
- `derived_from_patterns`

## 6. pattern_library_entries

Used as the long-term reusable AES asset.

Examples:
- `linear_work_item_detail_pattern`
- `github_notification_triage_pattern`
- `stripe_recovery_console_pattern`
- `slack_collaboration_shell_pattern`

Minimum output shape:
- `id`
- `pattern_name`
- `pattern_family`
- `pattern_type`
- `source_donors`
- `accepted_components`
- `validator_bundle`
- `bridge_preset_refs`
- `evidence_refs`
- `reuse_scope`

## 7. scenario_packs

Used for repeatable runtime validation and seeded behavior checks.

Examples:
- `failed_payment_scenario`
- `blocked_transition_scenario`
- `quiet_inbox_scenario`
- `invite_acceptance_scenario`

Minimum output shape:
- `id`
- `scenario_name`
- `feature_class`
- `setup_conditions`
- `expected_states`
- `expected_actions`
- `expected_validators`
- `derived_from_donors`

## 8. metric_packs

Used for feature-specific measurement.

Examples:
- `onboarding_metrics`
- `approval_metrics`
- `notification_metrics`
- `billing_recovery_metrics`

Minimum output shape:
- `id`
- `metric_pack_name`
- `feature_class`
- `metrics`
- `definitions`
- `source_patterns`
- `evidence_refs`

## 9. audit_packs

Used to define what must be logged and inspectable.

Examples:
- `approval_audit_pack`
- `billing_audit_pack`
- `state_transition_audit_pack`

Minimum output shape:
- `id`
- `audit_pack_name`
- `feature_class`
- `required_audit_fields`
- `required_actor_fields`
- `required_before_after_fields`
- `required_context_fields`
- `source_patterns`

## 10. release_bundles

Used to decide whether a feature class is ready to ship.

Examples:
- `notification_release_bundle`
- `billing_release_bundle`
- `workflow_release_bundle`

Minimum output shape:
- `id`
- `release_bundle_name`
- `feature_class`
- `required_validator_bundles`
- `required_metric_packs`
- `required_audit_packs`
- `required_operator_surfaces`
- `source_patterns`

## Recommended production order

For each mature donor study:

1. produce `core_models`
2. produce `ui_models`
3. produce `validator_bundles`
4. produce `bridge_presets`
5. publish `pattern_library_entries`
6. optionally add `scenario_packs`, `metric_packs`, and `audit_packs`
7. assemble `release_bundles`

## Minimum viable reusable output set

Each strong donor should yield at least:
- 1 core model
- 1 UI or ops model
- 1 validator bundle
- 1 bridge preset
- 1 pattern library entry

## Final rule

Derived outputs should become reusable AES assets, not just research conclusions.
