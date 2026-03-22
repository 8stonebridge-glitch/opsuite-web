# Scenario Packs

## 1. scenario-quiet-inbox
- id: `scenario-quiet-inbox`
- scenario_name: `Quiet Inbox`
- feature_class: `notification_system`
- setup_conditions:
  - no unread notifications
  - inbox/activity surface reachable
- expected_states:
  - caught-up or no-notifications state
  - filters remain visible
- expected_actions:
  - toggle unread filter
  - navigate back to source work
- expected_validators:
  - `slack-validator-002`
  - `slack-validator-004`
- derived_from_donors:
  - `Slack`
  - `Linear`

## 2. scenario-blocked-transition
- id: `scenario-blocked-transition`
- scenario_name: `Blocked Transition`
- feature_class: `approval_workflow`
- setup_conditions:
  - work item in a state with an unavailable or gated transition
  - required field, permission, or approval missing
- expected_states:
  - current state visible
  - blocked move visible or explained
- expected_actions:
  - inspect blocked transition
  - satisfy missing requirement
  - retry transition
- expected_validators:
  - `linear-validator-005`
  - `github-validator-002`
- derived_from_donors:
  - `Linear`
  - `Jira`
  - `GitHub`

## 3. scenario-failed-payment-recovery
- id: `scenario-failed-payment-recovery`
- scenario_name: `Failed Payment Recovery`
- feature_class: `payments_and_billing_verification`
- setup_conditions:
  - payment or invoice in failed state
  - recovery tooling available
- expected_states:
  - failure cause visible
  - retry/email/automation options visible
  - mode visible
- expected_actions:
  - inspect decline cause
  - inspect retry policy
  - inspect recovery communication path
- expected_validators:
  - `stripe-validator-001`
  - `stripe-validator-003`
  - `stripe-validator-004`
- derived_from_donors:
  - `Stripe Dashboard`

## 4. scenario-invite-acceptance
- id: `scenario-invite-acceptance`
- scenario_name: `Invite Acceptance`
- feature_class: `onboarding`
- setup_conditions:
  - pending invite exists
  - user not yet active in target org
- expected_states:
  - invite context visible
  - org and role context visible after acceptance
- expected_actions:
  - open invite
  - accept invite
  - land in active org context
- expected_validators:
  - `clerk-validator-001`
  - `clerk-validator-002`
  - `clerk-validator-003`
- derived_from_donors:
  - `Clerk`

## 5. scenario-collaboration-handoff
- id: `scenario-collaboration-handoff`
- scenario_name: `Collaboration Handoff`
- feature_class: `collaboration_system`
- setup_conditions:
  - shared channel or thread exists
  - at least one teammate can be invited or mentioned
- expected_states:
  - channel/shared-space actions visible
  - direct space remains distinct
- expected_actions:
  - invite collaborator
  - search in collaboration surface
  - open direct space or personal space
- expected_validators:
  - `slack-validator-001`
  - `slack-validator-003`
- derived_from_donors:
  - `Slack`

## 6. scenario-operator-log-triage
- id: `scenario-operator-log-triage`
- scenario_name: `Operator Log Triage`
- feature_class: `backend_platform`
- setup_conditions:
  - logs or events visible
  - filter controls available
- expected_states:
  - mode visible
  - filters visible
  - empty or populated results understandable
- expected_actions:
  - filter by date
  - filter by status
  - clear or reset filters
- expected_validators:
  - `stripe-validator-001`
  - `stripe-validator-004`
- derived_from_donors:
  - `Stripe Dashboard`
