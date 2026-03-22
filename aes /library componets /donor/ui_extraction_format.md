# UI Extraction Format

This document defines the exact UI extraction format for AES donor studies.

It is designed for Playwright-driven runtime capture.

The goal is to make UI donor work:
- screen-by-screen
- evidence-backed
- reviewable
- reusable in bridge contracts

## Core rule

Capture what is visibly true.

Do not infer hidden design systems.
Do not invent interaction rules.
Do not turn aesthetic preference into canonical truth.

Every UI finding must come from an observed surface.

## Capture unit

The main unit of UI extraction is:
- one screen state

A screen state is a specific visible UI condition, for example:
- dashboard home with data
- dashboard home with no data
- activity page caught-up state
- issue detail with status menu open
- notification preferences modal
- onboarding step 2
- billing recovery page with tabs visible

Each screen state can produce:
- raw UI observations
- normalized UI candidates
- validator requirements

## UI extraction pipeline

1. open the real runtime surface in Playwright
2. capture the screen state
3. record visible structure and behavior
4. record action affordances
5. record state and mode context
6. normalize into reusable UI truth
7. review before bridge promotion

## What to capture for every screen

Each screen capture must record these sections.

### 1. Screen identity

Required fields:
- `screen_id`
- `donor_name`
- `feature_area`
- `screen_name`
- `route_or_location`
- `capture_ref`
- `captured_at`

Example:
- `screen_name: activity_caught_up`
- `route_or_location: /activity`

### 2. Screen purpose

Required fields:
- `primary_user_goal`
- `secondary_user_goal`
- `screen_role`

Suggested `screen_role` values:
- `shell`
- `list`
- `detail`
- `settings`
- `modal`
- `drawer`
- `wizard_step`
- `empty_state`
- `loading_state`
- `error_state`
- `success_state`

### 3. State context

Required fields:
- `state_type`
- `mode_context`
- `data_density`
- `attention_level`

Suggested `state_type` values:
- `default`
- `empty`
- `loading`
- `error`
- `success`
- `selection`
- `editing`
- `preferences`
- `confirmation`
- `degraded`

Suggested `mode_context` values:
- `personal`
- `team`
- `admin`
- `operator`
- `customer`
- `sandbox`
- `live`

Suggested `data_density` values:
- `low`
- `medium`
- `high`

Suggested `attention_level` values:
- `calm`
- `active`
- `urgent`

### 4. Layout structure

Required fields:
- `layout_type`
- `primary_regions`
- `navigation_pattern`
- `information_hierarchy`

Suggested `layout_type` values:
- `single_panel`
- `split_panel`
- `sidebar_detail`
- `tabbed_workspace`
- `dashboard_grid`
- `wizard`
- `modal_overlay`
- `drawer_overlay`

`primary_regions` should name visible regions such as:
- header
- left nav
- filter bar
- content list
- detail pane
- composer
- right rail
- footer actions

`information_hierarchy` should be recorded as short ordered statements:
- primary object name first
- state and metadata second
- activity and actions third

### 5. Visible objects

Required fields:
- `primary_object`
- `secondary_objects`
- `state_labels`
- `metadata_labels`

Examples:
- `primary_object: issue`
- `secondary_objects: assignee, project, subscribers`
- `state_labels: Todo, In Progress`
- `metadata_labels: priority, labels, updated_at`

### 6. Action affordances

Required fields:
- `primary_actions`
- `secondary_actions`
- `hidden_actions`
- `action_grouping`

Examples:
- `primary_actions: invite, huddle, search`
- `secondary_actions: more menu, filters`
- `hidden_actions: advanced settings behind overflow`

`action_grouping` should explain whether actions are:
- top header actions
- row actions
- context menu actions
- sticky footer actions

### 7. Navigation and flow links

Required fields:
- `entry_paths`
- `exit_paths`
- `related_surfaces`

Examples:
- `entry_paths: inbox -> issue detail`
- `exit_paths: back to active issues, open project, open settings`
- `related_surfaces: activity, subscribers modal, status menu`

### 8. Empty/loading/error/success treatment

Required when present:
- `message_style`
- `recovery_actions`
- `guidance_present`
- `dead_end_risk`

Suggested `message_style` values:
- `instructional`
- `reassuring`
- `technical`
- `minimal`
- `action_first`

Suggested `dead_end_risk` values:
- `low`
- `medium`
- `high`

### 9. Collaboration and attention signals

Required when present:
- `presence_signals`
- `unread_signals`
- `watcher_or_subscriber_signals`
- `activity_signals`
- `notification_state_signals`

Examples:
- active
- away
- notifications snoozed
- unread filter
- subscriber list

### 10. Composition and input behavior

Required when present:
- `input_type`
- `composition_actions`
- `submission_modes`
- `draft_support`

Examples:
- `input_type: rich composer`
- `composition_actions: attach, mention, emoji, schedule later`
- `submission_modes: send now, schedule`
- `draft_support: yes`

### 11. Accessibility and clarity notes

Required fields:
- `label_clarity`
- `control_discoverability`
- `keyboard_visibility`
- `semantic_risk`

Suggested `semantic_risk` values:
- `low`
- `medium`
- `high`

### 12. Portability notes

Required fields:
- `portable_pattern`
- `non_portable_elements`
- `abstraction_rule`

Examples:
- `portable_pattern: channel header exposes collaboration entry points`
- `non_portable_elements: huddle branding`
- `abstraction_rule: map channel to shared work context`

## Raw UI observation artifact

Use this format for each observed screen state.

```json
{
  "artifact_type": "ui_screen_observation",
  "screen_id": "slack-activity-001",
  "donor_name": "Slack",
  "feature_area": "notification_system",
  "screen_name": "activity_caught_up",
  "route_or_location": "/activity",
  "capture_ref": "/abs/path/to/snapshot.yml",
  "captured_at": "2026-03-21T17:09:34Z",
  "primary_user_goal": "Review items that need attention",
  "secondary_user_goal": "Filter down to unread only",
  "screen_role": "empty_state",
  "state_type": "empty",
  "mode_context": "team",
  "data_density": "low",
  "attention_level": "calm",
  "layout_type": "sidebar_detail",
  "primary_regions": ["top tabs", "activity header", "filter bar", "quiet-state body"],
  "navigation_pattern": "tabbed_workspace",
  "information_hierarchy": [
    "activity title first",
    "unread filter second",
    "caught-up explanation third"
  ],
  "primary_object": "activity inbox",
  "secondary_objects": ["unread filter"],
  "state_labels": ["You're all caught up"],
  "metadata_labels": [],
  "primary_actions": ["toggle unread filter"],
  "secondary_actions": [],
  "hidden_actions": [],
  "action_grouping": "header filter",
  "entry_paths": ["workspace shell -> activity tab"],
  "exit_paths": ["back to channel", "back to DMs"],
  "related_surfaces": ["channel home", "DMs"],
  "message_style": "reassuring",
  "recovery_actions": [],
  "guidance_present": true,
  "dead_end_risk": "low",
  "presence_signals": [],
  "unread_signals": ["Unreads filter"],
  "watcher_or_subscriber_signals": [],
  "activity_signals": ["caught-up state"],
  "notification_state_signals": [],
  "label_clarity": "high",
  "control_discoverability": "high",
  "keyboard_visibility": "medium",
  "semantic_risk": "low",
  "portable_pattern": "quiet-state triage surface with persistent filter",
  "non_portable_elements": ["Slack-specific wording"],
  "abstraction_rule": "map activity to generic notification inbox"
}
```

## Normalization rules

Each screen observation can normalize into one or more of:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `NavigationPattern`
- `DesignConstraint`
- `PresentationRule`

### Examples

If a screen shows:
- top-level mode tabs
- clear separation between DMs and channels

Normalize into:
- `NavigationPattern`
- `DesignConstraint`

If a screen shows:
- no data
- still has filters and next actions

Normalize into:
- `ViewState`
- `PresentationRule`

If a screen shows:
- rich composer with attachments, mentions, send-later

Normalize into:
- `InteractionPattern`

## Screen-to-candidate mapping table

- `shell screen` -> `NavigationPattern`, `LayoutPattern`
- `detail screen` -> `LayoutPattern`, `PresentationRule`
- `settings screen` -> `UIPattern`, `InteractionPattern`
- `empty state` -> `ViewState`, `PresentationRule`
- `loading state` -> `ViewState`
- `error state` -> `ViewState`, `PresentationRule`
- `success state` -> `ViewState`
- `modal or drawer` -> `InteractionPattern`, `LayoutPattern`
- `composer surface` -> `InteractionPattern`

## Review rules for UI extraction

Promote a UI finding only if:
- it is clearly visible in the captured state
- it improves clarity or execution, not only aesthetics
- it is portable beyond the donor product
- it can be expressed without donor-specific branding

Reject or constrain when:
- it is just a style preference
- it depends too heavily on donor-specific language
- it adds novelty without usability gain
- it cannot survive abstraction into AES concepts

## Validator hooks

Each promoted UI pattern should suggest at least one validator.

Examples:
- `quiet_state_continuity_check`
- `mode_separation_check`
- `action_discoverability_check`
- `empty_state_actionability_check`
- `composer_capability_check`
- `hierarchy_clarity_check`

## Playwright capture checklist

For each donor UI surface:
1. capture default state
2. capture empty or quiet state if available
3. capture one action-open state
   Example: menu open, modal open, preferences open
4. capture one navigation transition into or out of the screen
5. record visible actions, labels, and state markers
6. normalize only what is visibly proven

## Minimum viable UI donor pack

A UI donor study is good enough for first-pass promotion when it has:
- 3 to 5 screen observations
- at least one shell or navigation surface
- at least one detail or working surface
- at least one empty, quiet, or degraded state
- at least one action-open state
- at least 2 normalized UI candidates
- at least 2 validator suggestions

## Recommended file outputs

For each UI donor study, produce:
- donor intake
- donor study packet
- raw captured snapshots
- optional screen observation appendix

Suggested optional file:
- `donor_ui_screen_observations.md`

## Final rule

The UI extraction format exists to turn runtime screens into reusable UI truth.

It should help AES answer:
- what should the user see here
- what actions must be visible here
- what state must be understandable here
- what should happen when this screen is empty, quiet, or degraded
