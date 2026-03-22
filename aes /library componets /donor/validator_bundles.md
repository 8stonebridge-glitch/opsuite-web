# Validator Bundles

## 1. bundle-work-item-detail
- bundle_name: `Work Item Detail Bundle`
- feature_class: `workflow`
- validator_ids:
  - `linear-validator-002`
  - `linear-validator-004`
  - `linear-validator-005`
  - `linear-validator-008`
- blocking_validators:
  - `linear-validator-002`
  - `linear-validator-004`
  - `linear-validator-005`
  - `linear-validator-008`
- advisory_validators: none
- derived_from_patterns:
  - `pattern-linear-work-item-detail`

## 2. bundle-notification-triage
- bundle_name: `Notification Triage Bundle`
- feature_class: `notification_system`
- validator_ids:
  - `github-validator-001`
  - `github-validator-002`
  - `slack-validator-002`
  - `slack-validator-004`
- blocking_validators:
  - `github-validator-001`
  - `github-validator-002`
  - `slack-validator-002`
  - `slack-validator-004`
- advisory_validators: none
- derived_from_patterns:
  - `pattern-github-notification-triage`
  - `pattern-slack-collaboration-shell`

## 3. bundle-billing-recovery
- bundle_name: `Billing Recovery Bundle`
- feature_class: `payments_and_billing_verification`
- validator_ids:
  - `stripe-validator-001`
  - `stripe-validator-002`
  - `stripe-validator-003`
  - `stripe-validator-004`
  - `stripe-validator-005`
- blocking_validators:
  - `stripe-validator-001`
  - `stripe-validator-002`
  - `stripe-validator-003`
  - `stripe-validator-004`
- advisory_validators:
  - `stripe-validator-005`
- derived_from_patterns:
  - `pattern-stripe-recovery-console`
  - `pattern-stripe-operator-shell`

## 4. bundle-collaboration-shell
- bundle_name: `Collaboration Shell Bundle`
- feature_class: `collaboration_system`
- validator_ids:
  - `slack-validator-001`
  - `slack-validator-002`
  - `slack-validator-003`
  - `slack-validator-004`
- blocking_validators:
  - `slack-validator-001`
  - `slack-validator-002`
  - `slack-validator-004`
- advisory_validators:
  - `slack-validator-003`
- derived_from_patterns:
  - `pattern-slack-collaboration-shell`

## 5. bundle-org-activation
- bundle_name: `Organization Activation Bundle`
- feature_class: `onboarding`
- validator_ids:
  - `clerk-validator-001`
  - `clerk-validator-002`
  - `clerk-validator-003`
  - `clerk-validator-004`
- blocking_validators:
  - `clerk-validator-001`
  - `clerk-validator-002`
  - `clerk-validator-003`
- advisory_validators:
  - `clerk-validator-004`
- derived_from_patterns:
  - `pattern-clerk-org-activation`

## 6. bundle-operator-shell
- bundle_name: `Operator Shell Bundle`
- feature_class: `backend_platform`
- validator_ids:
  - `stripe-validator-001`
  - `stripe-validator-002`
  - `stripe-validator-004`
- blocking_validators:
  - `stripe-validator-001`
  - `stripe-validator-002`
  - `stripe-validator-004`
- advisory_validators: none
- derived_from_patterns:
  - `pattern-stripe-operator-shell`
