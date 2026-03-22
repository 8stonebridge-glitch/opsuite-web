# Bridge Presets

## 1. preset-work-item-detail
- id: `preset-work-item-detail`
- preset_name: `Work Item Detail Preset`
- feature_class: `workflow`
- required_outcomes:
  - work item detail shows state, metadata, activity, and next actions together
  - ownership, project linkage, and subscribers remain distinct controls
  - state changes are visible and auditable from the same object surface
- forbidden_shortcuts:
  - splitting state and activity into unrelated views
  - collapsing assignee and follower semantics
- required_validators:
  - `bundle-work-item-detail`
- approved_surface_scope:
  - work item detail
  - status menus
  - activity timeline
- derived_from_patterns:
  - `pattern-linear-work-item-detail`

## 2. preset-notification-inbox
- id: `preset-notification-inbox`
- preset_name: `Notification Inbox Preset`
- feature_class: `notification_system`
- required_outcomes:
  - notifications expose cause and reason
  - triage actions remain visible in inbox or activity surfaces
  - quiet states preserve filters and explanatory structure
- forbidden_shortcuts:
  - read/unread only without triage semantics
  - alerts detached from source work object
- required_validators:
  - `bundle-notification-triage`
- approved_surface_scope:
  - inbox
  - activity
  - notification settings
- derived_from_patterns:
  - `pattern-github-notification-triage`
  - `pattern-slack-collaboration-shell`

## 3. preset-billing-recovery
- id: `preset-billing-recovery`
- preset_name: `Billing Recovery Preset`
- feature_class: `payments_and_billing_verification`
- required_outcomes:
  - failed-payment handling separates retries, messages, automations, and decline causes
  - mode remains visible across financial and debug surfaces
  - logs and event activity remain filterable
- forbidden_shortcuts:
  - one-screen generic failure totals with no breakdown
  - hidden sandbox or test mode
- required_validators:
  - `bundle-billing-recovery`
- approved_surface_scope:
  - payment recovery
  - balances
  - observability console
- derived_from_patterns:
  - `pattern-stripe-recovery-console`
  - `pattern-stripe-operator-shell`

## 4. preset-collaboration-shell
- id: `preset-collaboration-shell`
- preset_name: `Collaboration Shell Preset`
- feature_class: `collaboration_system`
- required_outcomes:
  - channels, DMs, and activity are separate modes
  - shared spaces expose invite, live collaboration, and search actions
  - personal spaces support drafts or to-dos without polluting shared spaces
- forbidden_shortcuts:
  - one collapsed message stream for all collaboration modes
  - quiet states with no filters or meaning
- required_validators:
  - `bundle-collaboration-shell`
- approved_surface_scope:
  - workspace shell
  - channel header
  - activity view
  - personal space
- derived_from_patterns:
  - `pattern-slack-collaboration-shell`

## 5. preset-org-onboarding
- id: `preset-org-onboarding`
- preset_name: `Organization Onboarding Preset`
- feature_class: `onboarding`
- required_outcomes:
  - post-auth landing keeps org and role context explicit
  - switching or joining organizations is visible and intentional
  - invite acceptance is treated as its own activation step
- forbidden_shortcuts:
  - dropping users into the app without active-context clarity
  - hiding role or organization state after sign-in
- required_validators:
  - `bundle-org-activation`
- approved_surface_scope:
  - post-auth landing
  - org switcher
  - invite acceptance
- derived_from_patterns:
  - `pattern-clerk-org-activation`

## 6. preset-operator-console
- id: `preset-operator-console`
- preset_name: `Operator Console Preset`
- feature_class: `backend_platform`
- required_outcomes:
  - operator shell separates financial or system domains from logs and diagnostics
  - environment mode is explicit
  - filters support resource, date, and status drill-in
- forbidden_shortcuts:
  - debug data hidden behind secondary tools by default
  - production/test ambiguity
- required_validators:
  - `bundle-operator-shell`
- approved_surface_scope:
  - dashboards
  - logs
  - event views
  - health views
- derived_from_patterns:
  - `pattern-stripe-operator-shell`
