# Linear Donor Study Packet

## Packet Metadata
- packet_id: linear-hybrid-001
- donor_name: Linear
- donor_class: hybrid
- feature_area: onboarding, app_shell, notification_system
- packet_owner: Codex
- created_at: 2026-03-21
- updated_at: 2026-03-21
- packet_status: first_pass_complete

## 1. Intake Summary
- study_goal: extract reusable hybrid patterns for shell clarity, issue-centric workflow visibility, and guided product flow
- relevance_reason: Linear combines low-noise UI with explicit workflow objects and visible team/product operations
- expected_reusable_value: shell hierarchy, work navigation, issue-detail framing, inbox continuity, guided first-run pacing
- scope_boundary: public website plus authenticated workspace shell, active issues, issue detail, assignment, project attachment, subscriber management, notification setup, and inbox empty state
- out_of_scope: exact backend semantics, admin-only surfaces, hidden notification preference rules
- expected_risk_level: medium

## 2. AES Mapping
- target_feature_area: `onboarding`, `app_shell`, `notification_system`
- target_work_item_type: `WorkItem`-adjacent issue-driven flow in first pass
- target_flow: work navigation flow, inbox-to-detail flow, issue progression visibility
- target_ui_surface: homepage hero, public product screenshot, issue detail surface, left navigation model
- target_operational_concepts: object-linked work visibility, state visibility, review and triage posture
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## 3. Evidence Plan
- evidence_methods:
  - Playwright browser open against `https://linear.app/`
  - saved browser snapshot review
  - public page-source inspection
  - keyword extraction from public HTML
  - authenticated workspace capture
- expected_evidence_artifacts:
  - browser snapshot showing visible product shell
  - public marketing copy and navigation
  - extracted workflow-related terms
  - authenticated workspace onboarding, issue list, issue detail, assignee, project, subscriber, notification preference, and inbox states
- evidence_limitations:
  - notification delivery rules remain bounded to what runtime surfaces visibly prove
  - exact backend transition semantics remain bounded to what runtime surfaces visibly prove
- open_questions:
  - how much notification preference behavior is hidden behind authenticated settings
  - how much explicit transition-change behavior still needs a state mutation capture

## 4. Donor Observations

### Observation 1
- observation_id: linear-obs-001
- observation_type: layout
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- finding_summary: Linear presents itself as a product-development system with an intentionally calm shell and clear top-level product framing
- finding_detail: the homepage hero says `The product development system for teams and agents` and keeps the marketing navigation compact and low-noise
- confidence: high
- notes: good donor value for onboarding posture and shell restraint

### Observation 2
- observation_id: linear-obs-002
- observation_type: navigation
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- finding_summary: Linear’s product screenshot shows an explicit left-nav work model centered on inbox, personal work, reviews, and planning objects
- finding_detail: visible nav entries include `Inbox`, `My issues`, `Reviews`, `Pulse`, `Initiatives`, and `Projects`
- confidence: high
- notes: strong donor value for `app_shell` and `notification_system`

### Observation 3
- observation_id: linear-obs-003
- observation_type: detail_view
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- finding_summary: Linear keeps work anchored to a visible detail view with state, ownership, and parent context all exposed together
- finding_detail: the visible issue detail shows status `In Progress`, priority `High`, labels, cycle, project, and activity in one coherent surface
- confidence: high
- notes: strong hybrid donor signal for work-item truth presentation

### Observation 4
- observation_id: linear-obs-004
- observation_type: workflow
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- finding_summary: Linear links notifications and automation activity directly to a concrete work object rather than isolating them in a detached feed
- finding_detail: the visible issue includes activity entries like issue creation, label application, state movement, and GitHub Copilot interaction inside the issue context itself
- confidence: high
- notes: strong donor value for notification-to-object linkage

### Observation 5
- observation_id: linear-obs-005
- observation_type: hybrid_ai
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- finding_summary: Linear publicly frames AI agents as participants in the same product workflow surface as humans
- finding_detail: visible terms include `Agent tasks`, `Agents Insights`, and `GitHub Copilot`, all shown in the same workspace and issue context
- confidence: medium-high
- notes: useful for AES because it shows agent work as an in-band workflow concept, not a separate novelty surface

### Observation 6
- observation_id: linear-obs-006
- observation_type: public_copy
- evidence_type: page_source
- raw_evidence_ref: `curl -L https://linear.app`
- finding_summary: public copy strongly emphasizes planning, building, workflows, issues, projects, and creation
- finding_detail: keyword extraction from the public HTML showed high counts for `create`, `issue`, `project`, `workflow`, `initiative`, `triage`, and `cycle`
- confidence: medium-high
- notes: reinforces the issue-centric workflow interpretation, but copy alone is weaker than visible product structure

### Observation 7
- observation_id: linear-obs-007
- observation_type: runtime_onboarding
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-current.yml`
- finding_summary: Linear begins authenticated onboarding by establishing workspace identity and shared operating context explicitly
- finding_detail: the live onboarding flow requires workspace name, workspace URL, hosting region, and shows the signed-in account while defining the workspace as the shared environment for projects, cycles, and issues
- confidence: high
- notes: strong donor value for onboarding and shared-context establishment

### Observation 8
- observation_id: linear-obs-008
- observation_type: runtime_shell
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-active-issues-2.yml`
- finding_summary: Linear’s live shell cleanly separates inbox, personal work, workspace views, team views, setup prompts, and active-work notification setup
- finding_detail: the authenticated shell shows `Inbox`, `My issues`, workspace `Projects` and `Views`, team-level `Issues`, `Projects`, and `Views`, plus explicit setup prompts for importing issues, inviting people, connecting GitHub, and setting up active-issues notifications
- confidence: high
- notes: strong donor value for shell clarity, activation flow, and notification-linked work setup

### Observation 9
- observation_id: linear-obs-009
- observation_type: runtime_issue_detail
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-detail.yml`
- finding_summary: Linear keeps state, ownership, metadata, collaboration, and engineering handoff actions attached to one issue surface
- finding_detail: the live issue detail exposes issue identity, breadcrumbs, `Todo` state, priority, assignee, labels, sub-issues, subscribers, comments, activity, and actions like copy branch name and work on issue without leaving the object view
- confidence: high
- notes: strongest runtime donor evidence yet for object-centered workflow presentation

### Observation 10
- observation_id: linear-obs-010
- observation_type: runtime_state_change
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-in-progress.yml`
- finding_summary: Linear exposes the state machine directly and records status transitions in the same issue activity timeline
- finding_detail: the live state menu offered `Backlog`, `Todo`, `In Progress`, and `Done`; after changing the issue from `Todo` to `In Progress`, the property updated immediately and the activity log recorded `moved from Todo to In Progress`
- confidence: high
- notes: strongest donor evidence so far for explicit transition options plus object-linked transition auditability

### Observation 11
- observation_id: linear-obs-011
- observation_type: runtime_priority_taxonomy
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-priority-menu.yml`
- finding_summary: Linear exposes a compact, explicit priority taxonomy directly from the issue surface
- finding_detail: the live priority menu showed `No priority`, `Urgent`, `High`, `Medium`, and `Low`, proving that priority changes are treated as first-class issue metadata rather than hidden configuration
- confidence: high
- notes: useful donor value for work-item metadata clarity and changeability

### Observation 12
- observation_id: linear-obs-012
- observation_type: runtime_notification_preferences
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-notification-setup.yml`
- finding_summary: Linear lets users scope inbox notifications to specific work-event types from the active-issues surface itself
- finding_detail: the live notification setup surface showed `Send inbox notifications for` with event-specific toggles for `An issue is added to active issues` and `An issue is marked completed or canceled`
- confidence: high
- notes: strongest runtime donor evidence so far for event-specific notification preference visibility

### Observation 13
- observation_id: linear-obs-013
- observation_type: runtime_inbox_empty_state
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-inbox-empty.yml`
- finding_summary: Linear’s inbox keeps filtering and display controls visible even when the inbox has no items
- finding_detail: the live inbox showed a clear `No notifications` empty state while retaining `Add filter` and `Display options`, which keeps inbox behavior understandable instead of collapsing into a dead-end blank page
- confidence: high
- notes: strong donor value for empty-state resilience and inbox continuity

### Observation 14
- observation_id: linear-obs-014
- observation_type: runtime_assignment_model
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-assignee-menu.yml`
- finding_summary: Linear treats assignment as an explicit, searchable issue property with support for unassigned, direct assignment, and invite-and-assign
- finding_detail: the live assignee menu showed `No assignee`, the current user as an assignable option, and `Invite and assign…`, keeping ownership changes close to the issue surface and coupling assignment with team growth when needed
- confidence: high
- notes: strong donor value for ownership state and assignment onboarding crossover

### Observation 15
- observation_id: linear-obs-015
- observation_type: runtime_project_linkage
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-project-menu.yml`
- finding_summary: Linear treats project association as an attachable issue context rather than hidden background metadata
- finding_detail: the live project menu exposed `Add to project` with a direct `Create new project…` path, showing that issue-to-project linkage is first-class and can originate from the issue itself
- confidence: high
- notes: useful donor value for linking work items into broader planning context from the object view

### Observation 16
- observation_id: linear-obs-016
- observation_type: runtime_subscriber_management
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-subscribers-menu.yml`
- finding_summary: Linear separates subscription state from assignment but keeps subscriber management inside the issue activity surface
- finding_detail: the live issue activity area exposed both `Subscribe` and `Change subscribers`, and the subscriber menu presented explicit participant selection for the issue
- confidence: high
- notes: strong donor value for watcher/follower semantics distinct from assignee semantics

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: linear-logic-001
- candidate_kind: VisibilityRule
- derived_from_observation_ids: linear-obs-003, linear-obs-004
- canonical_statement: Work items should remain visibly linked to their current state, owner, and parent context inside the same detail surface
- target_feature_area: app_shell, notification_system
- preconditions: user opens or is routed to a work item
- postconditions: user can see the work item’s state, ownership, and containing project or cycle without navigating away
- failure_path: detached item views hide important operational context
- metric_implication: improves state-comprehension and routing clarity
- confidence: high
- status: draft

### Logic Candidate 2
- candidate_id: linear-logic-002
- candidate_kind: NotificationTrigger
- derived_from_observation_ids: linear-obs-004
- canonical_statement: Notification-like activity should remain attached to the work object that caused it whenever possible
- target_feature_area: notification_system
- preconditions: a user receives or views work activity
- postconditions: activity is understandable in relation to the work object that changed
- failure_path: notifications become contextless feed noise
- metric_implication: supports lower notification noise and better triage
- confidence: medium-high
- status: draft

### Logic Candidate 3
- candidate_id: linear-logic-003
- candidate_kind: Rule
- derived_from_observation_ids: linear-obs-007, linear-obs-008
- canonical_statement: Onboarding should establish shared workspace context first, then connect users directly to actionable team setup and live work surfaces
- target_feature_area: onboarding, app_shell
- preconditions: a user is entering a new or newly authenticated workspace
- postconditions: the user understands the shared work context and sees concrete next actions like import, invite, connect integrations, or work review
- failure_path: users authenticate successfully but do not understand the shared environment or next actions
- metric_implication: improves onboarding continuation and workspace activation
- confidence: high
- status: draft

### Logic Candidate 4
- candidate_id: linear-logic-004
- candidate_kind: State
- derived_from_observation_ids: linear-obs-008, linear-obs-009
- canonical_statement: The work item should remain the center of the workflow, with state, metadata, collaboration, and execution-adjacent actions attached to the same object
- target_feature_area: app_shell, notification_system, onboarding
- preconditions: a user is viewing or acting on a work item
- postconditions: the user can understand state, collaboration history, and next actions without losing object context
- failure_path: work state and collaboration scatter across disconnected surfaces
- metric_implication: improves issue comprehension and reduces navigation friction
- confidence: high
- status: draft

### Logic Candidate 5
- candidate_id: linear-logic-005
- candidate_kind: Transition
- derived_from_observation_ids: linear-obs-009, linear-obs-010
- canonical_statement: Work items should expose explicit state options and record completed state changes in the same object timeline
- target_feature_area: notification_system, app_shell, onboarding
- preconditions: a user is changing the work-item state
- postconditions: the new state is immediately visible and the transition is recorded as object-linked activity
- failure_path: state changes occur with no visible transition options or no trace in activity history
- metric_implication: improves transition clarity and timeline auditability
- confidence: high
- status: draft

### Logic Candidate 6
- candidate_id: linear-logic-006
- candidate_kind: NotificationTrigger
- derived_from_observation_ids: linear-obs-008, linear-obs-012, linear-obs-013
- canonical_statement: Notification preferences should be scoped to concrete work events and remain manageable from the same operational context where those events matter
- target_feature_area: notification_system, onboarding
- preconditions: a user is viewing or configuring a work-driven notification surface
- postconditions: the user can see and adjust event-specific notification triggers without leaving the work context entirely
- failure_path: notification preferences are detached from the work surface, making delivery behavior feel opaque
- metric_implication: improves notification trust and lowers unwanted inbox noise
- confidence: high
- status: draft

### Logic Candidate 7
- candidate_id: linear-logic-007
- candidate_kind: Rule
- derived_from_observation_ids: linear-obs-009, linear-obs-014, linear-obs-015, linear-obs-016
- canonical_statement: Ownership, project linkage, and subscriber state should remain editable from the work-item surface as separate but adjacent operational controls
- target_feature_area: app_shell, notification_system, onboarding
- preconditions: a user is viewing a work item and needs to route, organize, or follow it
- postconditions: the user can distinguish and modify assignee, project context, and subscribers without leaving the work object
- failure_path: assignment, planning context, and follower semantics become conflated or buried in distant settings
- metric_implication: improves routing clarity, planning linkage, and collaboration control
- confidence: high
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: linear-ui-001
- candidate_kind: NavigationPattern
- derived_from_observation_ids: linear-obs-001, linear-obs-002
- canonical_statement: The primary shell should separate communication, personal work, review, and planning modes in the first navigation layer
- target_feature_area: app_shell
- screen_name: primary shell
- layout_notes: navigation should expose distinct work modes early without overwhelming the user
- interaction_notes: users should move from inbox or personal work into detail view with very few steps
- accessibility_notes: navigation groups should remain understandable in keyboard order and with clear labels
- responsive_notes: grouped work modes should survive narrower layouts without losing meaning
- confidence: high
- status: draft

### UI Candidate 2
- candidate_id: linear-ui-002
- candidate_kind: LayoutPattern
- derived_from_observation_ids: linear-obs-003
- canonical_statement: A work detail view should show status, priority, labels, cycle, project, and activity in one readable frame
- target_feature_area: app_shell, onboarding
- screen_name: work detail
- layout_notes: metadata should remain adjacent to the work description rather than hidden in separate tabs
- interaction_notes: the detail surface should support understanding and action without heavy navigation context-switching
- accessibility_notes: metadata labels and values should be announced clearly and grouped semantically
- responsive_notes: preserve metadata meaning even if density is reduced
- confidence: high
- status: draft

### UI Candidate 3
- candidate_id: linear-ui-003
- candidate_kind: InteractionPattern
- derived_from_observation_ids: linear-obs-004, linear-obs-005
- canonical_statement: Human work, review work, and agent work can coexist in a shared operational surface if their context remains explicit
- target_feature_area: onboarding, notification_system
- screen_name: activity and collaboration surface
- layout_notes: machine-assisted activity should appear as part of the same operational thread, not a disconnected side product
- interaction_notes: transitions between human updates and agent updates should preserve object context
- accessibility_notes: different actor types should still be understandable in assistive reading order
- responsive_notes: actor context should stay readable in compact activity layouts
- confidence: medium-high
- status: draft

### UI Candidate 4
- candidate_id: linear-ui-004
- candidate_kind: DesignConstraint
- derived_from_observation_ids: linear-obs-001, linear-obs-002, linear-obs-003
- canonical_statement: Linear’s calm shell and issue-centric framing are valuable, but the product’s exact language and issue bias must be abstracted before reuse
- target_feature_area: onboarding, app_shell, notification_system
- screen_name: global shell pattern
- layout_notes: keep the low-noise hierarchy without copying Linear’s specific idiom
- interaction_notes: preserve clarity and focus while mapping the pattern onto `WorkItem`
- accessibility_notes: retain semantic clarity, not aesthetic mimicry
- responsive_notes: retain grouped navigation intent under resizing
- confidence: high
- status: draft

### UI Candidate 5
- candidate_id: linear-ui-005
- candidate_kind: LayoutPattern
- derived_from_observation_ids: linear-obs-008, linear-obs-009
- canonical_statement: The authenticated shell should separate work modes cleanly while the issue detail keeps properties, actions, and activity in one dense but readable frame
- target_feature_area: onboarding, app_shell, notification_system
- screen_name: authenticated shell and issue detail
- layout_notes: work modes should be distinguishable in the shell, and issue detail should keep key properties and activity adjacent
- interaction_notes: users should move from list to issue detail without losing breadcrumbs, state visibility, or next actions
- accessibility_notes: shell sections, issue properties, and activity should remain understandable with keyboard navigation and assistive reading order
- responsive_notes: shell clarity and issue-property visibility should survive smaller layouts
- confidence: high
- status: draft

### UI Candidate 6
- candidate_id: linear-ui-006
- candidate_kind: ViewState
- derived_from_observation_ids: linear-obs-012, linear-obs-013
- canonical_statement: Notification surfaces should preserve controls and explanatory structure even when the inbox is empty or preferences are being configured
- target_feature_area: notification_system, app_shell
- screen_name: inbox and notification setup
- layout_notes: keep filters, display controls, and event toggles visible alongside empty-state messaging
- interaction_notes: users should be able to understand and adjust notification behavior without waiting for new notifications to appear
- accessibility_notes: empty-state messages, filter controls, and toggle labels should remain fully perceivable and keyboard reachable
- responsive_notes: control visibility should survive reduced widths without hiding the meaning of the empty state
- confidence: high
- status: draft

### UI Candidate 7
- candidate_id: linear-ui-007
- candidate_kind: LayoutPattern
- derived_from_observation_ids: linear-obs-009, linear-obs-014, linear-obs-015, linear-obs-016
- canonical_statement: The work-item sidebar should keep ownership, project attachment, and subscriber controls visibly grouped near status and priority
- target_feature_area: app_shell, notification_system
- screen_name: issue properties and activity surface
- layout_notes: ownership and planning controls should sit near core work properties, while subscriber controls should remain near activity and collaboration
- interaction_notes: users should understand the difference between assignee, project context, and subscribers from placement and labeling alone
- accessibility_notes: control labels must clearly distinguish ownership from following or planning context
- responsive_notes: grouped property controls should remain scannable when the layout compresses
- confidence: high
- status: draft

## 7. Review Decisions

### Review 1
- review_id: linear-review-001
- review_scope: hybrid
- target_artifact_id: linear-ui-001
- decision: accept
- review_reason: strong portable shell pattern with clear donor value for app-level navigation clarity
- reviewed_by: Codex
- constraints: no direct copy of Linear product wording
- required_follow_up: validate against a second public or authenticated surface later
- promotion_allowed: yes

### Review 2
- review_id: linear-review-002
- review_scope: hybrid
- target_artifact_id: linear-ui-002
- decision: accept
- review_reason: highly portable detail-layout pattern for grounded work comprehension
- reviewed_by: Codex
- constraints: map issue-specific fields onto `WorkItem` language rather than copying issue semantics directly
- required_follow_up: validate with another detail surface later
- promotion_allowed: yes

### Review 3
- review_id: linear-review-003
- review_scope: logic
- target_artifact_id: linear-logic-001
- decision: accept_with_constraints
- review_reason: visible object-linkage and state visibility are strongly evidenced, but exact backend semantics remain unproven
- reviewed_by: Codex
- constraints: treat as visibility truth first, not state-transition truth
- required_follow_up: deeper product access if we want stronger logic promotion
- promotion_allowed: yes

### Review 4
- review_id: linear-review-004
- review_scope: logic
- target_artifact_id: linear-logic-002
- decision: accept_with_constraints
- review_reason: good donor value for notification design, but the public surface only proves the presentation layer and object linkage
- reviewed_by: Codex
- constraints: do not infer preference rules or delivery rules from this evidence
- required_follow_up: authenticated notification surface later if we want deeper notification truth
- promotion_allowed: yes

### Review 5
- review_id: linear-review-005
- review_scope: logic
- target_artifact_id: linear-logic-003
- decision: accept
- review_reason: the live onboarding and shell surfaces strongly prove that Linear establishes shared workspace context before deep work
- reviewed_by: Codex
- constraints: preserve the pattern, not Linear’s exact workspace labels
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 6
- review_id: linear-review-006
- review_scope: logic
- target_artifact_id: linear-logic-004
- decision: accept
- review_reason: the live issue detail strongly proves object-centered workflow presentation with state and collaboration attached
- reviewed_by: Codex
- constraints: preserve object-centering without copying Linear’s exact action names
- required_follow_up: a future state-change capture will deepen transition truth
- promotion_allowed: yes

### Review 7
- review_id: linear-review-007
- review_scope: hybrid
- target_artifact_id: linear-ui-005
- decision: accept
- review_reason: the runtime shell and issue detail provide high-confidence evidence for a clean work-mode shell and dense object-centric issue frame
- reviewed_by: Codex
- constraints: preserve clarity without inheriting product-specific UI density blindly
- required_follow_up: settings and notification-preference capture later would deepen the shell model
- promotion_allowed: yes

### Review 8
- review_id: linear-review-008
- review_scope: logic
- target_artifact_id: linear-logic-005
- decision: accept
- review_reason: the live mutation proves Linear exposes explicit transition options and records the resulting change in the same issue activity log
- reviewed_by: Codex
- constraints: preserve the pattern without assuming Linear’s exact state names are canonical
- required_follow_up: none required for first-pass transition promotion
- promotion_allowed: yes

### Review 9
- review_id: linear-review-009
- review_scope: logic
- target_artifact_id: linear-logic-006
- decision: accept
- review_reason: the live notification setup and inbox surfaces provide high-confidence evidence for event-specific notification preference visibility and contextual configuration
- reviewed_by: Codex
- constraints: preserve event-scoped notification configuration without copying Linear’s exact event labels
- required_follow_up: delivery-channel depth can be studied later if needed
- promotion_allowed: yes

### Review 10
- review_id: linear-review-010
- review_scope: hybrid
- target_artifact_id: linear-ui-006
- decision: accept
- review_reason: the empty inbox and setup surfaces strongly prove that notification UIs should keep controls visible and useful even in low-activity states
- reviewed_by: Codex
- constraints: keep the continuity pattern without overfitting to Linear’s exact minimal aesthetic
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 11
- review_id: linear-review-011
- review_scope: logic
- target_artifact_id: linear-logic-007
- decision: accept
- review_reason: the live issue, assignee, project, and subscriber surfaces provide high-confidence evidence that these controls are distinct operational concepts that belong close to the work object
- reviewed_by: Codex
- constraints: preserve conceptual separation without copying Linear’s exact menu phrasing
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 12
- review_id: linear-review-012
- review_scope: hybrid
- target_artifact_id: linear-ui-007
- decision: accept
- review_reason: the runtime issue surface strongly proves the value of grouped property controls and nearby subscriber controls for collaboration-heavy work items
- reviewed_by: Codex
- constraints: preserve grouping and clarity without inheriting unnecessary density
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id: linear-bridge-001
- contract_scope: hybrid
- accepted_artifact_ids: linear-ui-001, linear-ui-002, linear-ui-004, linear-ui-005, linear-ui-006, linear-ui-007, linear-logic-001, linear-logic-002, linear-logic-003, linear-logic-004, linear-logic-005, linear-logic-006, linear-logic-007
- required_outcomes:
  - the shell exposes distinct work modes early
  - detail views keep work state and parent context visible together
  - notification or activity surfaces preserve linkage to the work object that caused them
  - reused patterns map onto `WorkItem` rather than issue-specific semantics
  - onboarding establishes shared workspace context before pushing users into deeper work
  - state changes expose explicit options and become object-linked activity entries after completion
  - notification preferences remain event-specific and understandable from the operational context
  - inbox empty states preserve actionable controls instead of collapsing into inert blank states
  - assignee, project, and subscriber controls remain distinct and editable from the work-item surface
- forbidden_shortcuts:
  - copying Linear branding, copy, or issue-specific language
  - separating notifications from object context without clear reason
  - hiding work metadata behind avoidable extra navigation
  - dropping users into generic dashboards without clear shared work context
- required_validators:
  - navigation clarity check
  - work-context visibility check
  - object-centering check
  - branding separation check
- approved_filescope: future shell, onboarding, and notification presentation layers only
- approved_write_paths: future UI and view-model layers only
- approved_commands: none yet
- required_evidence: screenshots or working implementation states showing object-linked navigation and detail framing

## 9. Validator Requirements

### Validator 1
- validator_id: linear-validator-001
- validator_kind: navigation_check
- requirement_statement: users must be able to distinguish inbox, personal work, reviews, and planning modes quickly from the shell
- pass_condition: shell navigation is understandable without exploratory clicking
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

### Validator 2
- validator_id: linear-validator-002
- validator_kind: context_visibility_check
- requirement_statement: detail views must keep state and parent context visible together
- pass_condition: a reviewer can identify the work item’s current state and parent context from the detail view alone
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

### Validator 3
- validator_id: linear-validator-003
- validator_kind: evidence_check
- requirement_statement: Linear-derived patterns must remain portable and `WorkItem`-native
- pass_condition: the implementation reflects the pattern without copying issue-centric branding or overfitting Linear-specific semantics
- blocking_level: advisory
- linked_bridge_input_id: linear-bridge-001

### Validator 4
- validator_id: linear-validator-004
- validator_kind: object_centering_check
- requirement_statement: issue detail must keep state, metadata, and collaboration attached to the work object rather than scattering them
- pass_condition: a reviewer can identify the work item state, key properties, activity, and next actions from the issue surface alone
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

### Validator 5
- validator_id: linear-validator-005
- validator_kind: transition_auditability_check
- requirement_statement: state changes must be visible both as a new property value and as a timeline event on the same work object
- pass_condition: after a state change, a reviewer can identify the new state and the recorded transition event from the same object view
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

### Validator 6
- validator_id: linear-validator-006
- validator_kind: notification_preference_clarity_check
- requirement_statement: notification preferences must expose concrete event triggers in language users can connect to the work surface
- pass_condition: a reviewer can identify what events trigger notifications and adjust them without leaving the operational context entirely
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

### Validator 7
- validator_id: linear-validator-007
- validator_kind: empty_state_continuity_check
- requirement_statement: empty inbox states must preserve control visibility and explain what the empty state means
- pass_condition: a reviewer can identify the empty state, available filters or display controls, and next interaction options from the same view
- blocking_level: advisory
- linked_bridge_input_id: linear-bridge-001

### Validator 8
- validator_id: linear-validator-008
- validator_kind: ownership_and_following_clarity_check
- requirement_statement: assignment, project linkage, and subscriber controls must be visible as distinct concepts from the work-item surface
- pass_condition: a reviewer can identify who owns the work, what broader project it belongs to, and who is following it without conflating those states
- blocking_level: blocking
- linked_bridge_input_id: linear-bridge-001

## 10. Execution Evidence

### Evidence 1
- evidence_id: linear-evidence-001
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T14-53-15-925Z.yml`
- evidence_summary: confirms homepage framing, visible left-nav work modes, issue detail structure, and public AI-agent workflow cues
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 2
- evidence_id: linear-evidence-002
- evidence_kind: page_source
- evidence_ref: `curl -L https://linear.app`
- evidence_summary: confirms public product positioning around planning and building products with AI agents
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 3
- evidence_id: linear-evidence-003
- evidence_kind: keyword_extraction
- evidence_ref: `curl -L https://linear.app | rg workflow terms`
- evidence_summary: shows strong public emphasis on `create`, `issue`, `project`, `workflow`, `initiative`, `triage`, and `cycle`
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 4
- evidence_id: linear-evidence-004
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-current.yml`
- evidence_summary: confirms authenticated onboarding starts with explicit workspace identity, URL, region, and signed-in account context
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 5
- evidence_id: linear-evidence-005
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-active-issues-2.yml`
- evidence_summary: confirms authenticated shell hierarchy, setup nudges, and active-issues notification setup entry point
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 6
- evidence_id: linear-evidence-006
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-detail.yml`
- evidence_summary: confirms issue detail keeps state, metadata, sub-issues, subscribers, comments, activity, and engineering handoff actions attached to one work object
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 7
- evidence_id: linear-evidence-007
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-status-menu.yml`
- evidence_summary: confirms the live status menu exposes explicit state options including Backlog, Todo, In Progress, and Done
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 8
- evidence_id: linear-evidence-008
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-in-progress.yml`
- evidence_summary: confirms a real transition from Todo to In Progress updated the property and created an activity entry on the same issue timeline
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 9
- evidence_id: linear-evidence-009
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-priority-menu.yml`
- evidence_summary: confirms the live issue surface exposes explicit priority options including No priority, Urgent, High, Medium, and Low
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 10
- evidence_id: linear-evidence-010
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-notification-setup.yml`
- evidence_summary: confirms active-issues notification setup uses explicit event toggles for issue-added and issue-completed-or-canceled events
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 11
- evidence_id: linear-evidence-011
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-inbox-empty.yml`
- evidence_summary: confirms the inbox preserves filter and display controls while showing a clear No notifications empty state
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 12
- evidence_id: linear-evidence-012
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-assignee-menu.yml`
- evidence_summary: confirms assignment is an issue-level property with explicit No assignee, direct user assignment, and Invite and assign options
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 13
- evidence_id: linear-evidence-013
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-project-menu.yml`
- evidence_summary: confirms project attachment can be initiated from the issue surface, including creating a new project from that context
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 14
- evidence_id: linear-evidence-014
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-subscribers-menu.yml`
- evidence_summary: confirms subscriber management is explicit and separate from assignment within the issue activity area
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

## 11. Verified Lessons

### Lesson 1
- lesson_id: linear-lesson-001
- lesson_statement: Linear is a strong hybrid donor for low-noise shell design, shared-workspace onboarding, object-centered issue views, explicit state transitions recorded on the same work timeline, event-specific notification preferences that stay understandable in-context, and clear separation between ownership, project linkage, and subscriber semantics
- verified_by_evidence_ids: linear-evidence-001, linear-evidence-002, linear-evidence-003, linear-evidence-004, linear-evidence-005, linear-evidence-006, linear-evidence-007, linear-evidence-008, linear-evidence-009, linear-evidence-010, linear-evidence-011, linear-evidence-012, linear-evidence-013, linear-evidence-014
- source_artifact_ids: linear-ui-001, linear-ui-002, linear-ui-004, linear-ui-005, linear-ui-006, linear-ui-007, linear-logic-001, linear-logic-002, linear-logic-003, linear-logic-004, linear-logic-005, linear-logic-006, linear-logic-007, linear-review-001, linear-review-002, linear-review-003, linear-review-004, linear-review-005, linear-review-006, linear-review-007, linear-review-008, linear-review-009, linear-review-010, linear-review-011, linear-review-012
- writeback_scope: shell_pattern_library, notification_pattern_library
- failure_if_ignored: the system may separate work activity from work context, lose shared workspace orientation, scatter issue state across multiple views, or hide transitions from the work timeline
- recommended_validator_pattern: pair any Linear-derived pattern with navigation, context-visibility, object-centering, and transition-auditability checks

## 12. Promotion Summary
- accepted_logic_candidates: linear-logic-001, linear-logic-002, linear-logic-003, linear-logic-004, linear-logic-005, linear-logic-006, linear-logic-007
- accepted_ui_candidates: linear-ui-001, linear-ui-002, linear-ui-004, linear-ui-005, linear-ui-006, linear-ui-007
- promoted_operational_targets: notification_system visibility and preference layer, app_shell visibility layer, onboarding workspace-context layer
- promoted_ui_targets: onboarding, app_shell, shared_frontend_system
- rejected_candidates: none
- deferred_candidates: linear-ui-003

## 13. Final Status
- packet_status: first_pass_complete
- bridge_ready: yes, for constrained hybrid reuse
- validator_ready: yes
- writeback_ready: partial
- next_action: deepen only if delivery-channel settings or project-generated notification behavior become necessary
- owner_notes: Linear is now an active runtime-backed donor with especially high value for shell clarity, shared-workspace onboarding, object-linked workflow presentation, explicit state-transition auditability, contextual notification preference visibility, and separation of assignee, project, and subscriber semantics
