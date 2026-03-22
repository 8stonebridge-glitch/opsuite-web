# Slack Donor Study Packet

## Packet Metadata
- packet_id: slack-hybrid-001
- donor_name: Slack
- donor_class: hybrid
- feature_area: notification_system, collaboration_system, approval_workflow, onboarding, app_shell, launch_ops_layer
- packet_owner: Codex
- created_at: 2026-03-21
- updated_at: 2026-03-21
- packet_status: first_pass_complete

## 1. Intake Summary
- study_goal: extract reusable logic and hybrid patterns for activity triage, collaboration routing, channel and DM separation, and action-rich communication surfaces
- relevance_reason: Slack makes direct communication, shared collaboration, and triage behavior visible inside a dense but legible workspace shell
- expected_reusable_value: collaboration-shell structure, activity empty-state handling, channel-level actions, DM/self-space patterns, composer controls
- scope_boundary: authenticated Slack shell, activity view, DM view, self-DM, and channel home surfaces
- out_of_scope: unreached notification preferences screens, hidden thread detail menus, admin-only collaboration settings
- expected_risk_level: medium-high

## 2. AES Mapping
- target_feature_area: `notification_system`, `collaboration_system`, `approval_workflow`, `onboarding`, `app_shell`, `launch_ops_layer`
- target_work_item_type: conversation-adjacent and activity-adjacent collaboration objects in first pass
- target_flow: workspace shell routing, channel collaboration, direct collaboration, activity triage, invite and huddle actions, self-space productivity
- target_ui_surface: tabbed workspace shell, left navigation, activity view, DM list, channel header, composer, starter templates
- target_operational_concepts: activity and unread triage, collaboration-mode separation, self-space versus team-space, invite routing, huddle visibility, notification-snooze awareness
- target_ui_concepts: `UIPattern`, `NavigationPattern`, `ViewState`, `InteractionPattern`, `DesignConstraint`

## 3. Evidence Plan
- evidence_methods:
  - Playwright authenticated runtime capture
  - snapshot review of shell, channel, activity, and DM states
- expected_evidence_artifacts:
  - workspace shell
  - activity triage surface
  - DM list and self-DM surface
  - channel collaboration surface
  - composer controls and starter templates
- evidence_limitations:
  - no explicit notification preferences panel was captured
  - no thread detail view was captured
  - no message creation or state mutation was performed
- open_questions:
  - how Slack’s full notification settings map onto activity and unread states
  - how explicit thread-level triage differs from channel-level triage in this workspace

## 4. Donor Observations

### Observation 1
- observation_id: slack-obs-001
- observation_type: runtime_shell
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home.yml`
- finding_summary: Slack’s workspace shell separates Home, DMs, Activity, Files, and Admin as first-class modes
- finding_detail: the authenticated shell exposed tabbed top-level modes for Home, DMs, Activity, Files, More, and Admin, with a left navigation tree for channels, direct messages, apps, and huddles
- confidence: high
- notes: strong donor value for multi-mode collaboration shells

### Observation 2
- observation_id: slack-obs-002
- observation_type: runtime_channel
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home.yml`
- finding_summary: Channel surfaces expose collaboration actions directly from the header
- finding_detail: the channel header showed Invite teammates, Huddle, All new posts, Search in channel, and More channel actions without hiding them behind deep navigation
- confidence: high
- notes: strong donor value for shared-space collaboration controls

### Observation 3
- observation_id: slack-obs-003
- observation_type: runtime_channel_onboarding
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home-2.yml`
- finding_summary: Slack uses starter templates to turn a new channel into a structured collaboration workspace
- finding_detail: the new-channel surface promoted templates like Run a project, Chat with your team, Collaborate with external partners, and Invite teammates
- confidence: high
- notes: useful donor value for onboarding and collaboration handoff

### Observation 4
- observation_id: slack-obs-004
- observation_type: runtime_activity
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-activity.yml`
- finding_summary: Slack treats activity as a dedicated triage surface with explicit unread filtering and a real caught-up state
- finding_detail: the activity view exposed an Unreads filter and a `You’re all caught up` state with explanatory copy instead of collapsing into a blank message list
- confidence: high
- notes: strongest donor value for notification and collaboration triage

### Observation 5
- observation_id: slack-obs-005
- observation_type: runtime_dms
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml`
- finding_summary: Slack keeps direct messages as a separate collaboration mode with its own search, unread filter, and onboarding nudges
- finding_detail: the DMs surface exposed Find a DM search, Unreads filter, New message, Add Coworkers prompt, and a direct-messages list distinct from channels
- confidence: high
- notes: strong donor value for direct versus shared collaboration separation

### Observation 6
- observation_id: slack-obs-006
- observation_type: runtime_self_space
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml`
- finding_summary: Slack treats self-DM as a first-class personal workspace rather than only a conversation endpoint
- finding_detail: the self-DM surface described itself as space for drafts, to-dos, links, and files, and included a built-in to-do list canvas with onboarding tasks
- confidence: high
- notes: strong donor value for personal work capture inside a collaboration app

### Observation 7
- observation_id: slack-obs-007
- observation_type: runtime_composer
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml`
- finding_summary: Slack’s composer treats mentions, attachments, formatting, and scheduled send as first-class actions
- finding_detail: the self-DM composer exposed formatting controls, attach, emoji, mention, more options, Send now, and Schedule for later actions
- confidence: high
- notes: strong donor value for action-rich collaboration composition

### Observation 8
- observation_id: slack-obs-008
- observation_type: runtime_notification_status
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml`
- finding_summary: Slack surfaces notification state inline with user presence in conversation views
- finding_detail: the DM surface showed `Active, notifications snoozed` alongside the user presence indicator, proving that attention state is visible within collaboration context
- confidence: medium-high
- notes: useful donor value, but deeper routing rules remain unproven

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: slack-logic-001
- candidate_kind: Rule
- derived_from_observation_ids: slack-obs-001, slack-obs-005
- canonical_statement: Shared channels, direct conversations, and activity triage should remain distinct collaboration modes in the shell
- target_feature_area: collaboration_system, notification_system, app_shell
- preconditions: the system supports multiple collaboration contexts
- postconditions: users can distinguish where shared work, direct communication, and triage live
- failure_path: collaboration and notification behavior collapse into one noisy surface
- metric_implication: improves routing clarity and communication hygiene
- confidence: high
- status: draft

### Logic Candidate 2
- candidate_id: slack-logic-002
- candidate_kind: ViewState
- derived_from_observation_ids: slack-obs-004
- canonical_statement: Activity or inbox surfaces should keep a meaningful caught-up state and explicit unread filtering even when no items need action
- target_feature_area: notification_system
- preconditions: there is little or no pending activity
- postconditions: users understand that the system is quiet and can still filter for unread items
- failure_path: quiet states look broken or contextless
- metric_implication: improves trust in the activity surface
- confidence: high
- status: draft

### Logic Candidate 3
- candidate_id: slack-logic-003
- candidate_kind: Rule
- derived_from_observation_ids: slack-obs-002, slack-obs-003
- canonical_statement: Shared collaboration spaces should expose invite, live-call, and search actions directly from the collaboration header
- target_feature_area: collaboration_system, onboarding
- preconditions: a user is inside a shared conversation or workspace channel
- postconditions: the user can invite people, start live collaboration, and search without leaving the context
- failure_path: channel collaboration requires too much navigation to perform common coordination actions
- metric_implication: improves collaboration activation and handoff speed
- confidence: high
- status: draft

### Logic Candidate 4
- candidate_id: slack-logic-004
- candidate_kind: Rule
- derived_from_observation_ids: slack-obs-006, slack-obs-007
- canonical_statement: A personal collaboration surface can double as a lightweight workbench for drafts, notes, to-dos, files, and scheduled messages
- target_feature_area: onboarding, app_shell, collaboration_system
- preconditions: users need a personal space inside a broader collaboration system
- postconditions: users can capture unfinished work without polluting shared channels
- failure_path: personal reminders and draft work leak into shared collaboration spaces
- metric_implication: improves personal workflow containment and reduces channel noise
- confidence: high
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: slack-ui-001
- candidate_kind: NavigationPattern
- derived_from_observation_ids: slack-obs-001
- canonical_statement: A collaboration shell can stay dense if top-level modes are separated into home, direct communication, activity, files, and admin surfaces
- target_feature_area: app_shell, collaboration_system
- screen_name: workspace shell
- layout_notes: top-level tabs should represent collaboration modes, not random destinations
- interaction_notes: users should switch between communication and triage modes quickly
- accessibility_notes: mode names should be explicit and keyboard reachable
- responsive_notes: top-level mode separation should survive reduced space
- confidence: high
- status: draft

### UI Candidate 2
- candidate_id: slack-ui-002
- candidate_kind: LayoutPattern
- derived_from_observation_ids: slack-obs-002, slack-obs-003
- canonical_statement: Shared collaboration spaces should keep header actions and starter templates close to the conversation view
- target_feature_area: onboarding, collaboration_system
- screen_name: channel home
- layout_notes: invites, live collaboration actions, and starter templates should sit near the top of the shared context
- interaction_notes: users should move from an empty or new channel into structured collaboration with minimal setup friction
- accessibility_notes: template and header actions should remain clearly labeled
- responsive_notes: header actions should remain visible before deep scrolling
- confidence: high
- status: draft

### UI Candidate 3
- candidate_id: slack-ui-003
- candidate_kind: ViewState
- derived_from_observation_ids: slack-obs-004, slack-obs-005
- canonical_statement: Quiet collaboration states should still preserve filters, structure, and explanation instead of collapsing into blankness
- target_feature_area: notification_system, collaboration_system
- screen_name: activity and DMs
- layout_notes: keep unread filters and core controls visible when there is little activity
- interaction_notes: users should understand what the view represents even when nothing needs attention
- accessibility_notes: empty or quiet-state messaging should be explicit and concise
- responsive_notes: control visibility should survive narrow layouts
- confidence: high
- status: draft

### UI Candidate 4
- candidate_id: slack-ui-004
- candidate_kind: InteractionPattern
- derived_from_observation_ids: slack-obs-006, slack-obs-007
- canonical_statement: Personal spaces should combine rich composition tools with lightweight structured surfaces like notes or to-do canvases
- target_feature_area: onboarding, app_shell, collaboration_system
- screen_name: self-DM and composer
- layout_notes: composer controls and personal templates should coexist without crowding each other
- interaction_notes: users should be able to move between notes, tasks, and messages fluidly
- accessibility_notes: composition actions and personal templates should remain clearly labeled
- responsive_notes: composition richness should remain usable in compact layouts
- confidence: high
- status: draft

### UI Candidate 5
- candidate_id: slack-ui-005
- candidate_kind: DesignConstraint
- derived_from_observation_ids: slack-obs-001, slack-obs-002, slack-obs-004, slack-obs-005, slack-obs-006, slack-obs-007
- canonical_statement: Slack’s collaboration rigor is valuable, but its exact vocabulary like channel, huddle, and Slackbot must be abstracted before reuse
- target_feature_area: collaboration_system, notification_system, onboarding
- screen_name: global collaboration pattern
- layout_notes: preserve collaboration-mode clarity without copying Slack’s product language wholesale
- interaction_notes: map conversations and activity onto AES concepts carefully
- accessibility_notes: semantic clarity matters more than brand mimicry
- responsive_notes: preserve mode boundaries and action visibility under resizing
- confidence: high
- status: draft

## 7. Review Decisions

### Review 1
- review_id: slack-review-001
- review_scope: logic
- target_artifact_id: slack-logic-001
- decision: accept
- review_reason: the shell and DMs surfaces strongly prove mode separation between channels, direct messages, and activity
- reviewed_by: Codex
- constraints: abstract Slack-specific vocabulary into broader collaboration terms
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 2
- review_id: slack-review-002
- review_scope: logic
- target_artifact_id: slack-logic-002
- decision: accept
- review_reason: the activity surface clearly proved unread filtering and a meaningful caught-up state
- reviewed_by: Codex
- constraints: do not infer unseen delivery-routing rules from this alone
- required_follow_up: full notification settings could be studied later
- promotion_allowed: yes

### Review 3
- review_id: slack-review-003
- review_scope: logic
- target_artifact_id: slack-logic-003
- decision: accept
- review_reason: channel headers and starter templates provided high-confidence evidence for collaboration activation and handoff actions
- reviewed_by: Codex
- constraints: preserve channel-header action density without overfitting to Slack’s specific set of tools
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 4
- review_id: slack-review-004
- review_scope: logic
- target_artifact_id: slack-logic-004
- decision: accept
- review_reason: the self-DM surface strongly proved personal-work containment inside a collaboration system
- reviewed_by: Codex
- constraints: keep personal space patterns distinct from public collaboration surfaces
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 5
- review_id: slack-review-005
- review_scope: hybrid
- target_artifact_id: slack-ui-001
- decision: accept
- review_reason: Slack’s top-level shell is a strong example of dense but legible collaboration navigation
- reviewed_by: Codex
- constraints: preserve structure without copying branding or exact iconography
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 6
- review_id: slack-review-006
- review_scope: hybrid
- target_artifact_id: slack-ui-002
- decision: accept
- review_reason: the channel home clearly showed header actions and starter templates working together
- reviewed_by: Codex
- constraints: reuse the pattern, not the exact template names
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 7
- review_id: slack-review-007
- review_scope: hybrid
- target_artifact_id: slack-ui-003
- decision: accept
- review_reason: both activity and DMs maintained visible filters and structure in quiet states
- reviewed_by: Codex
- constraints: preserve quiet-state continuity without imitating Slack’s exact phrasing
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 8
- review_id: slack-review-008
- review_scope: hybrid
- target_artifact_id: slack-ui-004
- decision: accept
- review_reason: the self-DM and composer provided strong evidence for mixing personal-work canvases with rich composition controls
- reviewed_by: Codex
- constraints: keep personal-work features additive, not distracting inside shared surfaces
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 9
- review_id: slack-review-009
- review_scope: hybrid
- target_artifact_id: slack-ui-005
- decision: accept
- review_reason: Slack is highly reusable as a collaboration donor, but language abstraction is mandatory
- reviewed_by: Codex
- constraints: do not leak Slack-specific nouns into AES canonical truth
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id: slack-bridge-001
- contract_scope: hybrid
- accepted_artifact_ids: slack-ui-001, slack-ui-002, slack-ui-003, slack-ui-004, slack-ui-005, slack-logic-001, slack-logic-002, slack-logic-003, slack-logic-004
- required_outcomes:
  - shared channels, direct conversations, and activity triage remain distinct modes
  - quiet activity states preserve filters and explanatory structure
  - shared collaboration headers expose invite, live collaboration, and search actions
  - personal spaces support drafts, notes, or to-dos without polluting shared collaboration
  - composer surfaces preserve rich controls like mention, attach, and schedule
- forbidden_shortcuts:
  - collapsing activity into the same surface as generic messages
  - hiding collaboration entry actions behind deep settings
  - treating self-space and shared-space as the same operational context
  - copying Slack-specific nouns directly into AES truth
- required_validators:
  - collaboration-mode-separation check
  - activity-triage check
  - quiet-state continuity check
  - composer-action check
  - terminology abstraction check
- approved_filescope: future collaboration, notification, onboarding, and shell layers only
- approved_write_paths: future UI and view-model layers only
- approved_commands: none yet
- required_evidence: screenshots or working states proving collaboration separation, activity triage, and composition affordances

## 9. Validator Requirements

### Validator 1
- validator_id: slack-validator-001
- validator_kind: collaboration_mode_separation_check
- requirement_statement: channels, direct conversations, and activity triage must remain distinguishable collaboration modes
- pass_condition: a reviewer can identify shared collaboration, direct collaboration, and triage surfaces without ambiguity
- blocking_level: blocking
- linked_bridge_input_id: slack-bridge-001

### Validator 2
- validator_id: slack-validator-002
- validator_kind: activity_triage_check
- requirement_statement: activity surfaces must expose unread filtering and a meaningful quiet-state explanation
- pass_condition: a reviewer can identify what the activity view is for even when no items need action
- blocking_level: blocking
- linked_bridge_input_id: slack-bridge-001

### Validator 3
- validator_id: slack-validator-003
- validator_kind: composer_action_check
- requirement_statement: collaboration composition should expose rich actions such as mentions, attachments, and schedule/send-later when relevant
- pass_condition: a reviewer can identify more than one composition path beyond plain text entry
- blocking_level: advisory
- linked_bridge_input_id: slack-bridge-001

### Validator 4
- validator_id: slack-validator-004
- validator_kind: quiet_state_continuity_check
- requirement_statement: quiet or empty collaboration states must keep filters, structure, and explanation visible
- pass_condition: a reviewer can identify the quiet state and still see usable controls
- blocking_level: blocking
- linked_bridge_input_id: slack-bridge-001

## 10. Execution Evidence

### Evidence 1
- evidence_id: slack-evidence-001
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home.yml`
- evidence_summary: confirms top-level shell tabs, left navigation, channel header actions, and starter collaboration templates
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 2
- evidence_id: slack-evidence-002
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-activity.yml`
- evidence_summary: confirms activity is a dedicated triage surface with Unreads filter and a caught-up state
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 3
- evidence_id: slack-evidence-003
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml`
- evidence_summary: confirms DMs are a separate collaboration mode with search, unread filtering, self-DM, composer controls, and to-do canvas
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 4
- evidence_id: slack-evidence-004
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dm-actions.yml`
- evidence_summary: confirms DM context includes a self-work canvas with onboarding tasks linked to profile and notification settings help
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 5
- evidence_id: slack-evidence-005
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home-2.yml`
- evidence_summary: confirms channel header actions and starter templates remain visible from the shared channel context
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

## 11. Verified Lessons

### Lesson 1
- lesson_id: slack-lesson-001
- lesson_statement: Slack is a strong hybrid donor for collaboration-heavy systems because it separates channels, DMs, and activity triage clearly while preserving action-rich headers, quiet-state continuity, and personal-work containment inside the same workspace
- verified_by_evidence_ids: slack-evidence-001, slack-evidence-002, slack-evidence-003, slack-evidence-004, slack-evidence-005
- source_artifact_ids: slack-ui-001, slack-ui-002, slack-ui-003, slack-ui-004, slack-ui-005, slack-logic-001, slack-logic-002, slack-logic-003, slack-logic-004, slack-review-001, slack-review-002, slack-review-003, slack-review-004, slack-review-005, slack-review-006, slack-review-007, slack-review-008, slack-review-009
- writeback_scope: collaboration_pattern_library, notification_pattern_library, onboarding_pattern_library
- failure_if_ignored: collaboration systems may collapse direct and shared communication together, hide triage meaning in quiet states, or leak personal draft work into shared spaces
- recommended_validator_pattern: pair any Slack-derived pattern with collaboration-mode separation, activity-triage, quiet-state continuity, and composer-action checks

## 12. Promotion Summary
- accepted_logic_candidates: slack-logic-001, slack-logic-002, slack-logic-003, slack-logic-004
- accepted_ui_candidates: slack-ui-001, slack-ui-002, slack-ui-003, slack-ui-004, slack-ui-005
- promoted_operational_targets: notification_system, collaboration_system, onboarding, app_shell
- promoted_ui_targets: shared_frontend_system, app_shell, onboarding
- rejected_candidates: none
- deferred_candidates: full notification preferences routing, thread-detail semantics

## 13. Final Status
- packet_status: first_pass_complete
- bridge_ready: yes, for constrained hybrid reuse
- validator_ready: yes
- writeback_ready: partial
- next_action: deepen only if thread detail, full notification settings, or message-action flows become necessary
- owner_notes: Slack is now an active runtime-backed donor with especially high value for collaboration-mode separation, activity triage, quiet-state continuity, rich composition, and personal-work containment
