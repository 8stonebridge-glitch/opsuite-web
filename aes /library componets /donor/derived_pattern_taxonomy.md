# Derived Pattern Taxonomy

This document defines what AES can derive from donor apps beyond raw logic and UI observations.

The purpose is to turn donor capture into a reusable build grammar for app creation.

## Core rule

Derive only what can be evidenced.

A derived pattern is allowed when:
- it comes from observed runtime or documented truth
- it can be normalized into AES concepts
- it can be validated later in a rebuild

## Derived pattern classes

AES can derive the following classes from donor studies:
- `StateMachine`
- `PermissionModel`
- `VisibilityModel`
- `NotificationCausalityModel`
- `FailureModel`
- `RecoveryModel`
- `OperatorConsolePattern`
- `CollaborationModel`
- `WorkItemSemanticModel`
- `OnboardingModel`
- `UISystemPattern`
- `ValidatorTemplate`
- `BridgeContractTemplate`
- `PatternLibraryEntry`

Each class should be treated as a reusable output, not just a note.

## 1. StateMachine

### What it is

A reusable model of:
- states
- transitions
- allowed moves
- blocked moves
- terminal or completion states

### Derive from

- issue status menus
- approval transitions
- payment recovery stages
- onboarding steps
- activity triage states

### Typical evidence

- visible state labels
- transition menus
- activity timeline entries
- workflow docs
- status-specific actions

### Output fields

- `state_machine_id`
- `subject_type`
- `states`
- `transitions`
- `blocked_transitions`
- `entry_state`
- `terminal_states`
- `evidence_refs`

### Feeds

- AES workflow graph
- bridge constraints
- transition validators

## 2. PermissionModel

### What it is

A reusable model of:
- who can act
- which action requires which role or status
- when actions are hidden, disabled, or blocked

### Derive from

- approval actions
- org switching
- member roles
- assignment controls
- admin-only actions

### Typical evidence

- role labels
- blocked actions
- invite-and-assign flows
- admin tabs
- approval controls

### Output fields

- `permission_model_id`
- `actor_types`
- `roles`
- `action_permissions`
- `visibility_conditions`
- `blocking_conditions`
- `evidence_refs`

### Feeds

- authorization rules
- UI visibility rules
- bridge write constraints

## 3. VisibilityModel

### What it is

A reusable model of what information must remain visible together.

### Derive from

- issue detail layouts
- payment dashboards
- activity surfaces
- inbox surfaces
- channel headers

### Typical evidence

- state next to owner
- balance next to payouts
- activity next to object
- filters next to empty states

### Output fields

- `visibility_model_id`
- `primary_object`
- `required_visible_fields`
- `co_visible_groups`
- `visibility_failures`
- `evidence_refs`

### Feeds

- view-model rules
- layout validators
- UX acceptance gates

## 4. NotificationCausalityModel

### What it is

A reusable model of:
- what event caused a notification
- why a user received it
- how it can be filtered, muted, or triaged

### Derive from

- GitHub notifications
- Linear notification setup
- Slack activity and unread filters

### Typical evidence

- reason filters
- event toggles
- unread filters
- subscribe or snooze state

### Output fields

- `notification_model_id`
- `trigger_events`
- `recipient_conditions`
- `reason_labels`
- `triage_actions`
- `preference_controls`
- `evidence_refs`

### Feeds

- notification system design
- preference models
- inbox triage validators

## 5. FailureModel

### What it is

A reusable model of known failure classes and how they are exposed.

### Derive from

- failed payments
- blocked transitions
- noisy notifications
- quiet-state confusion
- hidden dependencies

### Typical evidence

- error states
- blocked controls
- decline-reason tables
- hidden-state risks proven by docs/runtime

### Output fields

- `failure_model_id`
- `failure_modes`
- `symptoms`
- `visibility_requirements`
- `impact_scope`
- `evidence_refs`

### Feeds

- failure mode graph
- evaluations
- alerting and QA gates

## 6. RecoveryModel

### What it is

A reusable model of what the product does after failure or degradation.

### Derive from

- payment retries
- recovery emails
- automations
- offline fallback
- empty-state next actions

### Typical evidence

- retries tab
- restore or reconnect flows
- actionable empty states
- degraded banners

### Output fields

- `recovery_model_id`
- `failure_trigger`
- `recovery_paths`
- `manual_actions`
- `automated_actions`
- `recovery_visibility`
- `evidence_refs`

### Feeds

- recovery flows
- launch ops
- resilience validators

## 7. OperatorConsolePattern

### What it is

A reusable pattern for internal operator and debug surfaces.

### Derive from

- Stripe dashboard
- Stripe workbench
- GitHub workflow runs
- reporting consoles

### Typical evidence

- chart plus drill-in layout
- logs with filters
- status and metadata together
- reports near actions

### Output fields

- `operator_console_id`
- `console_type`
- `core_regions`
- `required_filters`
- `required_metrics`
- `drill_in_paths`
- `evidence_refs`

### Feeds

- admin/operator UI
- backend platform
- launch ops layer

## 8. CollaborationModel

### What it is

A reusable model of collaboration modes and handoff structure.

### Derive from

- Slack channels
- Slack DMs
- Linear subscribers
- GitHub review and comments

### Typical evidence

- channel versus DM separation
- subscribers versus assignee
- review comments and activity
- invite actions

### Output fields

- `collaboration_model_id`
- `collaboration_modes`
- `participant_types`
- `handoff_actions`
- `follow_vs_owner_rules`
- `evidence_refs`

### Feeds

- collaboration features
- comment and watcher systems
- team workflow patterns

## 9. WorkItemSemanticModel

### What it is

A reusable model of how a primary work object is structured.

### Derive from

- Linear issue detail
- GitHub issues and PRs
- Jira issues

### Typical evidence

- state
- assignee
- subscribers
- project linkage
- activity
- labels

### Output fields

- `work_item_semantic_id`
- `core_fields`
- `secondary_fields`
- `ownership_fields`
- `linkage_fields`
- `activity_fields`
- `evidence_refs`

### Feeds

- WorkItem schema
- detail views
- bridge field constraints

## 10. OnboardingModel

### What it is

A reusable model of first-run activation.

### Derive from

- Clerk onboarding
- Linear workspace setup
- Slack channel and self-space onboarding

### Typical evidence

- first-run tasks
- workspace creation
- membership activation
- starter templates

### Output fields

- `onboarding_model_id`
- `entry_conditions`
- `setup_steps`
- `activation_actions`
- `completion_signals`
- `recovery_paths`
- `evidence_refs`

### Feeds

- onboarding flows
- activation metrics
- resume logic

## 11. UISystemPattern

### What it is

A reusable UI-system level pattern, not just one screen.

### Derive from

- repeated shell patterns
- repeated detail patterns
- repeated quiet-state patterns
- repeated action grouping

### Typical evidence

- multiple screens from same donor
- shared navigation grammar
- repeated header-action pattern
- repeated filter/empty-state continuity

### Output fields

- `ui_system_pattern_id`
- `pattern_family`
- `screen_refs`
- `shared_regions`
- `shared_actions`
- `shared_state_rules`
- `evidence_refs`

### Feeds

- shared frontend system
- design system guidance
- UI bridge templates

## 12. ValidatorTemplate

### What it is

A reusable validation rule derived from donor truth.

### Derive from

- any proven logic or UI pattern

### Typical evidence

- state changes must be logged
- activity must stay filterable
- mode must remain visible
- quiet states must keep controls

### Output fields

- `validator_template_id`
- `validator_name`
- `validator_goal`
- `pass_condition`
- `blocking_level`
- `derived_from`
- `evidence_refs`

### Feeds

- execution validators
- CI or QA checks
- release gates

## 13. BridgeContractTemplate

### What it is

A reusable bridge input pattern for a feature class.

### Derive from

- accepted logic and UI patterns
- validated donor lessons

### Typical evidence

- repeated accepted candidates
- stable validators
- proven outcomes

### Output fields

- `bridge_template_id`
- `feature_class`
- `required_outcomes`
- `forbidden_shortcuts`
- `required_validators`
- `approved_surface_scope`
- `evidence_refs`

### Feeds

- AES bridge generation
- constrained builder contracts

## 14. PatternLibraryEntry

### What it is

A packaged reusable donor-backed pattern for future builds.

### Derive from

- accepted donor outputs
- verified lessons
- validator templates

### Output fields

- `pattern_library_entry_id`
- `pattern_name`
- `pattern_type`
- `source_donors`
- `accepted_components`
- `validator_bundle`
- `reuse_scope`
- `evidence_refs`

### Feeds

- long-term AES reuse
- future donor compression
- faster bridge generation

## Derivation matrix

| Derived class | Best source donors | Typical evidence source | Most useful for |
|---|---|---|---|
| `StateMachine` | Linear, Jira, GitHub | runtime status + timeline | workflow systems |
| `PermissionModel` | Clerk, Jira, Linear | roles + blocked actions | auth and approvals |
| `VisibilityModel` | Linear, Stripe, Slack | detail and dashboard surfaces | shell and detail views |
| `NotificationCausalityModel` | GitHub, Linear, Slack | inbox/activity/preferences | notification systems |
| `FailureModel` | Stripe, Jira, GitHub | recovery/errors/blocked states | QA and resilience |
| `RecoveryModel` | Stripe, Canva, Dropbox | retries/degraded states | ops and resilience |
| `OperatorConsolePattern` | Stripe, GitHub, Metabase | dashboards/logs | backend and ops |
| `CollaborationModel` | Slack, GitHub, Linear | channel/DM/review/subscriber | collaboration systems |
| `WorkItemSemanticModel` | Linear, GitHub, Jira | issue detail | WorkItem core |
| `OnboardingModel` | Clerk, Linear, Slack | setup and first-run | onboarding |
| `UISystemPattern` | Slack, Linear, Canva | repeated screens | frontend system |
| `ValidatorTemplate` | all strong donors | accepted patterns | execution governance |
| `BridgeContractTemplate` | all accepted donors | accepted outputs | AES build contracts |
| `PatternLibraryEntry` | all validated donors | verified lessons | reuse layer |

## Recommended derivation order

After each donor study:

1. derive `VisibilityModel`
2. derive `StateMachine` if workflow is present
3. derive `NotificationCausalityModel` if alerts/activity exist
4. derive `FailureModel` and `RecoveryModel` if degraded or failed states exist
5. derive `WorkItemSemanticModel` if a primary object exists
6. derive `UISystemPattern` if at least 3 screens are captured
7. derive `ValidatorTemplate`
8. package into `PatternLibraryEntry`

## Minimum viable derivation pack

A donor study is ready for reusable AES value when it yields at least:
- 1 `VisibilityModel`
- 1 `ValidatorTemplate`
- 1 of:
  - `StateMachine`
  - `NotificationCausalityModel`
  - `CollaborationModel`
  - `RecoveryModel`
- 1 `PatternLibraryEntry`

## Final rule

Donor studies do not just give AES screens and notes.

They should produce reusable build grammar:
- how things move
- who can act
- what must stay visible
- what failures look like
- how recovery works
- what validators prove
- what bridge contracts should require
