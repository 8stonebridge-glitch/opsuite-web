# Slack Donor Intake

## Basic identity
- donor_name: Slack
- donor_class: hybrid
- platform: web platform
- version: authenticated workspace as observed on 2026-03-21
- source_location: `https://app.slack.com/client`
- analyst: Codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: notification_system, collaboration_system, approval_workflow, onboarding, app_shell, launch_ops_layer
- target_work_item_type: channel, direct-message, activity-item, subscriber, and collaboration-thread adjacent objects in first pass
- target_flow: workspace shell, channel collaboration, DM collaboration, activity triage, invite flows, huddles, self-DM onboarding
- target_ui_surface: left shell, top tabs, activity view, DM view, channel view, composer, starter templates
- target_operational_concepts: inbox/activity triage, unread filtering, collaboration routing, direct versus shared conversation contexts, channel-level invite and huddle actions, self-space productivity patterns
- target_ui_concepts: `UIPattern`, `NavigationPattern`, `ViewState`, `InteractionPattern`, `DesignConstraint`

## Study goal
- study_goal: extract reusable logic and hybrid patterns for notifications, collaboration routing, channel/DM separation, activity triage, and action-rich collaboration shells
- relevance_reason: Slack exposes one of the clearest runtime systems for separating direct communication, shared channels, activity triage, and lightweight workflow handoff
- expected_reusable_value: collaboration shell structure, activity-state handling, composer actions, notification or unread filtering, self-space and team-space separation
- out_of_scope: enterprise admin internals, unreached preferences panels, unreached thread-specific detail views, voice/video runtime internals

## Scope boundary
- exact_surface_in_scope: authenticated workspace shell, channel home, activity view, DMs view, self-DM details, visible channel actions and templates
- exact_surface_out_of_scope: account-wide notification preferences panels, hidden enterprise settings, unreached thread detail and message-action menus
- depth_limit: first pass is authenticated runtime capture without mutating workspace content

## Donor quality assessment
- why_this_donor_is_strong: Slack keeps channel collaboration, direct collaboration, activity triage, and composer tooling visibly separate while staying fast to navigate
- likely_noise_or_wrapper_risk: Slack-specific vocabulary like channels, huddles, canvases, and Slackbot can overfit if copied literally
- portability_risk: medium; collaboration patterns are strong and portable, but exact product naming and culture-specific usage need abstraction
- confidence_before_study: high

## Evidence plan
- evidence_methods:
  - Playwright authenticated runtime capture
  - snapshot review across channel, activity, and DM surfaces
- expected_evidence_artifacts:
  - workspace shell and left-navigation model
  - activity surface with unread filter and caught-up state
  - DM list and self-DM workspace
  - channel actions and collaboration templates
  - composer and send-later controls
- expected_limitations:
  - no explicit thread detail screen was captured
  - notification settings were only observed indirectly through onboarding guidance and status indicators
  - no message mutations were performed

## Candidate outputs expected
- logic_candidates_expected:
  - activity should be a distinct triage surface, not just another chat list
  - direct conversations and shared channels should remain separate collaboration modes
  - self-space can be a first-class operational surface for drafts and personal workflow
  - unread or attention filters should remain explicit
- ui_candidates_expected:
  - dense collaboration shell with tabbed modes
  - action-rich channel headers
  - composer with mention, schedule, and attachment controls
  - actionable empty or caught-up states
- likely_states:
  - home
  - DMs
  - activity caught up
  - direct message active
  - channel active
  - notifications snoozed
  - unread filter
- likely_transitions:
  - workspace shell -> activity
  - workspace shell -> channel
  - workspace shell -> DM
  - caught up -> new activity
  - invite teammate -> shared collaboration
  - compose now -> schedule later
- likely_rules:
  - collaboration mode should be explicit
  - activity views should expose triage state even when quiet
  - self-space should support lightweight personal workflow
  - channels should expose invite and huddle actions from the channel surface
- likely_failure_modes:
  - notifications hidden inside chat noise
  - channel and DM semantics collapsing together
  - quiet states becoming dead-end blank screens
  - collaboration entry points buried behind too many clicks
- likely_ui_patterns:
  - tabbed workspace shell
  - activity inbox with caught-up state
  - action-dense channel header
  - self-DM to-do canvas
- likely_view_states:
  - channel home
  - activity caught-up state
  - DM list
  - self-DM composer
  - starter templates and onboarding prompts

## Review plan
- review_scope: hybrid
- expected_risk_level: medium-high
- likely_required_reviewers: domain reviewer, governance reviewer, design reviewer
- likely_required_validators:
  - collaboration-mode-separation check
  - activity-triage check
  - composer-action check
  - quiet-state continuity check
  - terminology abstraction check
- likely_constraints_if_accepted:
  - do not copy Slack’s exact product vocabulary where generic collaboration language is more appropriate
  - do not infer unseen notification-routing logic from visual status icons alone
  - keep collaboration patterns portable to WorkItem-linked systems

## Success definition
- study_is_successful_if: it yields portable patterns for collaboration shells, activity triage, DM/channel separation, and composer/action surfaces
- minimum_bridge_ready_output: accepted logic and UI candidates for notification_system and collaboration-heavy shells
- minimum_validator_ready_output: concrete checks proving collaboration mode separation, triage visibility, and quiet-state continuity

## Notes
- Authenticated Slack surfaces captured:
  - [slack-auth-channel-home.yml](/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home.yml)
  - [slack-auth-activity.yml](/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-activity.yml)
  - [slack-auth-dms.yml](/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml)
  - [slack-auth-dm-actions.yml](/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dm-actions.yml)
  - [slack-auth-channel-home-2.yml](/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home-2.yml)
