# Execution Connection Spec

This document defines how execution should pull donor-backed reusable assets.

## Goal

A feature request should be able to pull:
- pattern library entry
- validator bundle
- bridge preset
- scenario pack

without reinterpreting donor studies manually.

## Execution pull contract

For each feature request, AES should resolve:

1. `feature_class`
2. `matching_pattern_entries`
3. `required_validator_bundles`
4. `bridge_preset`
5. `scenario_packs`

## Resolution order

1. identify feature class
   Example:
   - `notification_system`
   - `onboarding`
   - `payments_and_billing_verification`
   - `workflow`
   - `collaboration_system`

2. fetch matching pattern entries
   Output:
   - summaries
   - reuse scopes
   - confidence

3. fetch required validator bundles
   Output:
   - blocking validators
   - advisory validators

4. fetch bridge preset
   Output:
   - required outcomes
   - forbidden shortcuts
   - approved surface scope

5. fetch scenario packs
   Output:
   - seeded states to recreate
   - expected actions
   - expected validators

## Recommended execution payload

```json
{
  "feature_class": "notification_system",
  "patterns": [
    "pattern-github-notification-triage",
    "pattern-slack-collaboration-shell"
  ],
  "validator_bundles": [
    "bundle-notification-triage"
  ],
  "bridge_preset": "preset-notification-inbox",
  "scenario_packs": [
    "scenario-quiet-inbox"
  ]
}
```

## Feature-class starting map

### notification_system
- patterns:
  - `pattern-github-notification-triage`
  - `pattern-slack-collaboration-shell`
- validator_bundles:
  - `bundle-notification-triage`
- bridge_preset:
  - `preset-notification-inbox`
- scenario_packs:
  - `scenario-quiet-inbox`

### onboarding
- patterns:
  - `pattern-clerk-org-activation`
  - `pattern-linear-work-item-detail`
- validator_bundles:
  - `bundle-org-activation`
- bridge_preset:
  - `preset-org-onboarding`
- scenario_packs:
  - `scenario-invite-acceptance`

### payments_and_billing_verification
- patterns:
  - `pattern-stripe-recovery-console`
  - `pattern-stripe-operator-shell`
- validator_bundles:
  - `bundle-billing-recovery`
- bridge_preset:
  - `preset-billing-recovery`
- scenario_packs:
  - `scenario-failed-payment-recovery`

### workflow
- patterns:
  - `pattern-linear-work-item-detail`
  - `pattern-github-notification-triage`
- validator_bundles:
  - `bundle-work-item-detail`
- bridge_preset:
  - `preset-work-item-detail`
- scenario_packs:
  - `scenario-blocked-transition`

### collaboration_system
- patterns:
  - `pattern-slack-collaboration-shell`
- validator_bundles:
  - `bundle-collaboration-shell`
- bridge_preset:
  - `preset-collaboration-shell`
- scenario_packs:
  - `scenario-collaboration-handoff`

### backend_platform
- patterns:
  - `pattern-stripe-operator-shell`
- validator_bundles:
  - `bundle-operator-shell`
- bridge_preset:
  - `preset-operator-console`
- scenario_packs:
  - `scenario-operator-log-triage`

## Builder contract generation

The bridge preset should be converted into:
- required outcomes
- forbidden shortcuts
- approved surfaces
- required validators

The builder should never receive raw donor studies directly.

## Validator execution

Before completion:
- run all blocking validators from the bundle
- run scenario pack checks where applicable
- record result as execution evidence

## Writeback rule

Only after:
- pattern-backed implementation is built
- validator bundle passes
- scenario pack passes

should the system write:
- verified pattern usage
- strengthened confidence
- new lessons

## Final rule

Execution should consume donor-backed reusable assets, not donor notes.
