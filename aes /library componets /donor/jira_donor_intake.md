# Jira Donor Intake

## Basic identity
- donor_name: Jira
- donor_class: hybrid
- platform: web SaaS, workflow and project-management product
- version: current public product and support/docs surfaces as observed on 2026-03-21
- source_location: `https://www.atlassian.com/software/jira`, `https://support.atlassian.com/jira/`
- analyst: Codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: approval_workflow, notification_system, qa_release_hardening
- target_work_item_type: issue, request, approval step, workflow transition, notification-causing state change
- target_flow: issue creation, status transition, approval handoff, blocked transition, approval completion, workflow-driven notification change
- target_ui_surface: issue detail, workflow transition UI, approval state UI, notification-linked issue surfaces, admin workflow settings where visible
- target_operational_concepts: `State`, `Transition`, `Rule`, `PermissionRule`, `FailureMode`, `Evaluation`, `NotificationTrigger`, `AuditRule`
- target_ui_concepts: `UIPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## Study goal
- study_goal: extract reusable governed workflow patterns for approvals, state transitions, transition validation, and workflow-driven notifications
- relevance_reason: Jira is the strongest high-governance workflow donor in the current target set because it exposes explicit statuses, transitions, permissions, and admin-configurable workflow behavior
- expected_reusable_value: governed state machine design, approval gating, transition requirements, issue-centric notification triggers, role-sensitive workflow visibility
- out_of_scope: branding, backlog-specific team rituals, unrelated marketing copy, deep admin internals beyond what supports workflow truth

## Scope boundary
- exact_surface_in_scope: public Jira product surface, official workflow docs, transition docs, approval troubleshooting docs, any authenticated runtime issue or approval surfaces captured later
- exact_surface_out_of_scope: ecosystem/plugin marketplace, unrelated Atlassian suite behavior, non-workflow-heavy Jira modules
- depth_limit: first pass uses official public product and support/docs plus later Playwright-captured runtime workflow surfaces

## Donor quality assessment
- why_this_donor_is_strong: Jira is unusually strong for explicit workflow semantics, permissioned transitions, approval control, and rule-backed issue movement
- likely_noise_or_wrapper_risk: product breadth is large, so the study must stay tightly constrained to workflow and approval surfaces
- portability_risk: medium; workflow ideas are highly portable, but Jira-specific terminology and admin complexity must be abstracted
- confidence_before_study: high

## Evidence plan
- evidence_methods:
  - public docs review
  - public product review
  - Playwright runtime capture
  - screenshots
  - UI flow observation
  - network capture
- expected_evidence_artifacts:
  - workflow status and transition semantics
  - role and permission effects on transitions
  - approval or lock behavior tied to workflow state
  - issue and notification-linked runtime behavior
- expected_limitations:
  - some richer approval states may require authenticated product access
  - admin workflow customization may be docs-backed before runtime-backed

## Candidate outputs expected
- logic_candidates_expected:
  - explicit transition rules
  - approval gating rules
  - workflow-state permission constraints
  - state-linked notification triggers
- ui_candidates_expected:
  - issue detail state presentation
  - transition UI patterns
  - approval status visibility
  - blocked-state explanation patterns
- likely_states:
  - open
  - in progress
  - pending approval
  - blocked
  - approved
  - done
- likely_transitions:
  - create -> triage
  - triage -> active
  - active -> pending approval
  - pending approval -> approved or rejected
  - blocked -> unblocked
  - approved -> done
- likely_rules:
  - certain transitions require permissions or required fields
  - workflow state can restrict what can be edited or advanced
  - approvals should be visible and traceable
- likely_failure_modes:
  - transition blocked without explanation
  - incorrect permission leading to hidden workflow failure
  - issue state and approval state diverging
  - notification spam from poorly scoped transition events
- likely_ui_patterns:
  - stateful issue detail shell
  - explicit workflow transition actions
  - approval and blocked-state messaging
  - history/timeline activity surfaces
- likely_view_states:
  - editable issue
  - blocked issue
  - pending approval
  - approval complete
  - permission-restricted state

## Review plan
- review_scope: hybrid
- expected_risk_level: high
- likely_required_reviewers: domain reviewer, governance reviewer, validator owner
- likely_required_validators:
  - transition-gate check
  - approval-state clarity check
  - permission-visibility check
  - auditability check
- likely_constraints_if_accepted:
  - abstract Jira terminology into AES-native concepts
  - avoid importing Jira complexity that does not improve governed execution
  - require runtime proof before promoting high-stakes approval behavior as canonical

## Success definition
- study_is_successful_if: it yields portable rules for state transitions, approvals, permission gating, and issue-linked notifications that can strengthen AES workflow execution
- minimum_bridge_ready_output: accepted logic candidates for governed transitions and approval-aware state handling
- minimum_validator_ready_output: concrete checks proving blocked transitions, approval state, and permission context are visible and justified

## Notes
- Jira is the first donor because it covers the highest-risk parts of AES directly:
  - governed transitions
  - approval workflow behavior
  - workflow-linked notifications
  - permission-aware state movement
