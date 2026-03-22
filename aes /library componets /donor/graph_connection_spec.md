# Graph Connection Spec

This document defines how pattern entries, validator bundles, bridge presets, and scenario packs connect to the AES graph.

## Goal

Accepted donor outputs should become canonical reusable graph material without polluting donor evidence.

## Graph layers

- `DonorEvidence`
  raw donor observations and packets
- `AcceptedPattern`
  reusable library entries
- `ValidatorBundle`
  reusable validation groups
- `BridgePreset`
  reusable build contracts
- `ScenarioPack`
  reusable seeded runtime scenarios

## Node mappings

### Pattern library entry

Map to:
- `PatternLibraryEntry`

Required properties:
- `id`
- `pattern_name`
- `pattern_family`
- `pattern_type`
- `summary`
- `confidence`
- `reuse_scope`
- `status`

### Validator bundle

Map to:
- `ValidatorBundle`

Required properties:
- `id`
- `bundle_name`
- `feature_class`

### Bridge preset

Map to:
- `BridgePreset`

Required properties:
- `id`
- `preset_name`
- `feature_class`

### Scenario pack

Map to:
- `ScenarioPack`

Required properties:
- `id`
- `scenario_name`
- `feature_class`

## Edge mappings

- `DonorStudyPacket` -> `PatternLibraryEntry`
  edge: `PROMOTED_TO_PATTERN`

- `PatternLibraryEntry` -> `ValidatorBundle`
  edge: `REQUIRES_VALIDATOR_BUNDLE`

- `PatternLibraryEntry` -> `BridgePreset`
  edge: `FEEDS_BRIDGE_PRESET`

- `PatternLibraryEntry` -> `ScenarioPack`
  edge: `HAS_SCENARIO_PACK`

- `PatternLibraryEntry` -> `Rule` / `State` / `Flow` / `UIPattern`
  edge: `ABSTRACTS_ACCEPTED_COMPONENT`

- `BridgePreset` -> `FeatureType`
  edge: `APPLIES_TO_FEATURE`

- `ValidatorBundle` -> `FeatureType`
  edge: `VALIDATES_FEATURE`

- `ScenarioPack` -> `FeatureType`
  edge: `TESTS_FEATURE`

## Promotion rules

Only create graph nodes when:
- donor packet is accepted or first-pass complete
- source components are accepted
- validator bundle exists
- bridge preset exists or is planned

## Query path

Feature request should be able to resolve:

1. `FeatureType`
2. matching `PatternLibraryEntry`
3. required `ValidatorBundle`
4. required `BridgePreset`
5. available `ScenarioPack`

## Minimal graph query outputs

For a feature request, the graph should return:
- `pattern_entries`
- `validator_bundles`
- `bridge_presets`
- `scenario_packs`
- `source_donor_lineage`
- `confidence`

## Initial graph material to load

- `pattern-linear-work-item-detail`
- `pattern-github-notification-triage`
- `pattern-stripe-recovery-console`
- `pattern-slack-collaboration-shell`
- `pattern-clerk-org-activation`
- `pattern-stripe-operator-shell`

- `bundle-work-item-detail`
- `bundle-notification-triage`
- `bundle-billing-recovery`
- `bundle-collaboration-shell`
- `bundle-org-activation`
- `bundle-operator-shell`

- `preset-work-item-detail`
- `preset-notification-inbox`
- `preset-billing-recovery`
- `preset-collaboration-shell`
- `preset-org-onboarding`
- `preset-operator-console`

- `scenario-quiet-inbox`
- `scenario-blocked-transition`
- `scenario-failed-payment-recovery`
- `scenario-invite-acceptance`
- `scenario-collaboration-handoff`
- `scenario-operator-log-triage`

## Final rule

The graph should store donor-backed reusable build truth, not just donor notes.
