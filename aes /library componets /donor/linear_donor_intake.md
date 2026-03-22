# Linear Donor Intake

## Basic identity
- donor_name: Linear
- donor_class: hybrid
- platform: web app, desktop app brand with web-first product surface
- version: public marketing/product surface as observed on 2026-03-21
- source_location: `https://linear.app`
- analyst: Codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: onboarding, app_shell, notification_system, reporting
- target_work_item_type: issue-centric product workflow in first pass
- target_flow: first-run product orientation, inbox and issue triage flow, shell navigation flow, initiative/project flow
- target_ui_surface: marketing homepage hero, product screenshot surface, issue detail shell, inbox and project navigation
- target_operational_concepts: issue state visibility, triage posture, notification-to-object linkage, project and initiative framing
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## Study goal
- study_goal: extract reusable hybrid patterns for low-noise shell structure, guided product flow, issue-centric navigation, and inbox-to-work continuity
- relevance_reason: Linear is one of the strongest low-noise donors in the program because it shows a polished product shell with visible workflow concepts and a calm issue-driven operating model
- expected_reusable_value: shell hierarchy, work-focused navigation, inbox and issue continuity, onboarding feel, initiative/project framing
- out_of_scope: backend truth beyond visible workflow cues, private team configuration, billing, hidden admin behavior

## Scope boundary
- exact_surface_in_scope: public homepage, visible product screenshot surface, public marketing copy, observable navigation and issue-detail structure, accessible public docs/pages if later needed
- exact_surface_out_of_scope: authenticated workspace internals, hidden settings, private enterprise admin flows, exact backend mutation semantics
- depth_limit: first pass is public web evidence and browser snapshots only; deeper logged-in or desktop study may follow later

## Donor quality assessment
- why_this_donor_is_strong: exceptionally low-noise shell, strong issue-centric model, explicit inbox/projects/initiatives surfaces, and visible AI-agent workflow cues in the product screenshot
- likely_noise_or_wrapper_risk: marketing surfaces can over-polish the product story and under-represent edge cases or degraded states
- portability_risk: low-medium; the interaction model is portable, but the product voice and issue-centric bias must be filtered
- confidence_before_study: high

## Evidence plan
- evidence_methods:
  - browser automation snapshot of public product surface
  - page-source inspection
  - keyword extraction from public HTML
  - future deeper public-page walkthroughs if needed
- expected_evidence_artifacts:
  - homepage navigation and hero framing
  - product screenshot with visible issue shell, inbox, projects, initiatives, and reviews
  - public copy emphasizing planning, building, AI workflows, issues, projects, and triage
- expected_limitations:
  - first pass is public-web only
  - not all workflow or notification rules are provable without authenticated product access

## Candidate outputs expected
- logic_candidates_expected:
  - notification-to-object linkage patterns
  - issue-state visibility patterns
  - triage and review visibility patterns
- ui_candidates_expected:
  - low-noise shell hierarchy
  - inbox and issue-detail layout
  - initiative/project framing
  - guided onboarding feel and focus-preserving navigation
- likely_states:
  - inbox
  - my issues
  - reviews
  - projects
  - initiatives
  - issue detail
  - in progress
- likely_transitions:
  - inbox -> issue detail
  - project -> issue detail
  - issue -> review or in-progress work
  - onboarding orientation -> focused work surface
- likely_rules:
  - work items remain linked to a visible parent object and visible state
- likely_failure_modes:
  - over-minimal shell hides important status
  - issue-centric bias overfits non-issue workflows
  - public marketing view hides operational exceptions
- likely_ui_patterns:
  - low-noise navigation
  - issue-centric workspace shell
  - clear left-nav work modes
  - calm detail panel with visible metadata
- likely_view_states:
  - inbox state
  - focused issue state
  - project/initiative context state
  - triage/review state

## Review plan
- review_scope: hybrid
- expected_risk_level: medium
- likely_required_reviewers: domain reviewer, design reviewer, governance reviewer
- likely_required_validators:
  - navigation clarity check
  - object-linkage visibility check
  - workflow-state visibility check
  - copy/branding separation check
- likely_constraints_if_accepted:
  - no direct reuse of Linear branding or copy
  - no promotion of invisible backend semantics
  - keep issue-centric patterns abstract enough for `WorkItem`

## Success definition
- study_is_successful_if: it yields portable shell and workflow patterns that improve `onboarding`, `app_shell`, or `notification_system` without importing Linear-specific assumptions as truth
- minimum_bridge_ready_output: accepted hybrid candidates for shell structure and object-linked work visibility
- minimum_validator_ready_output: concrete checks proving users can understand where work lives and what state it is in

## Notes
- Playwright snapshot of `https://linear.app/` captured:
  - homepage navigation with `Product`, `Resources`, `Customers`, `Pricing`, `Now`, `Contact`
  - a hero headline: `The product development system for teams and agents`
  - a product screenshot showing `Inbox`, `My issues`, `Reviews`, `Pulse`, `Initiatives`, `Projects`
  - an issue detail view with visible status, priority, labels, cycle, project, and activity feed
  - visible AI-adjacent workflow cues including `Agent tasks`, `Agents Insights`, and `GitHub Copilot`
- page source and keyword extraction show strong public emphasis on:
  - `create`
  - `issue`
  - `project`
  - `workflow`
  - `initiative`
  - `triage`
  - `cycle`
- first pass is grounded in public web evidence, not authenticated workspace behavior
