# Jira Donor Study Packet

## Packet Metadata
- packet_id: jira-hybrid-001
- donor_name: Jira
- donor_class: hybrid
- feature_area: approval_workflow, notification_system, qa_release_hardening
- packet_owner: Codex
- created_at: 2026-03-21
- updated_at: 2026-03-21
- packet_status: intake

## 1. Intake Summary
- study_goal: extract reusable governed workflow patterns for approvals, transitions, transition validation, and workflow-driven notifications
- relevance_reason: Jira is the strongest explicit workflow donor for approval and transition-heavy systems
- expected_reusable_value: governed state machine design, approval gating, transition requirements, issue-centric notification triggers, role-sensitive workflow visibility
- scope_boundary: public product and official docs first, authenticated runtime issue and workflow capture next
- out_of_scope: branding, unrelated Atlassian suite features, marketplace/plugin-specific extensions
- expected_risk_level: high

## 2. AES Mapping
- target_feature_area: `approval_workflow`, `notification_system`, `qa_release_hardening`
- target_work_item_type: issue, approval step, state transition, workflow-triggered notification
- target_flow: issue creation, state transition, blocked transition, approval handoff, approval resolution
- target_ui_surface: issue detail, transition controls, approval visibility, workflow and lock-state messaging
- target_operational_concepts: `State`, `Transition`, `Rule`, `PermissionRule`, `FailureMode`, `Evaluation`, `NotificationTrigger`, `AuditRule`
- target_ui_concepts: `UIPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## 3. Evidence Plan
- evidence_methods:
  - official docs review
  - public product review
  - Playwright runtime capture
  - screenshots
  - UI flow observation
  - network capture
- expected_evidence_artifacts:
  - status and transition semantics
  - transition blockers and permission signals
  - approval or lock-state surfaces
  - issue-linked notification behavior
- evidence_limitations:
  - deeper workflow customization may remain docs-backed at first
  - authenticated product capture may be needed for richer approval states
- open_questions:
  - how much approval visibility is exposed in current runtime issue views
  - what issue-linked notifications are easy to observe in live product use

## 4. Donor Observations

### Observation 1
- observation_id: jira-obs-001
- observation_type: product_frame
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/jira-public-home.yml`
- finding_summary: Jira publicly frames work as issue and task tracking with AI-assisted planning, automation, and progress visibility
- finding_detail: the public Jira product surface explicitly emphasizes project and task tracking, planning, status updates, automation, risk flagging, and staying in sync across teams and tools
- confidence: high
- notes: strong donor value for issue-centric workflow systems and notification-linked collaboration

### Observation 2
- observation_id: jira-obs-002
- observation_type: transition_semantics
- evidence_type: official_docs
- raw_evidence_ref: `https://support.atlassian.com/jira-software-cloud/docs/transition-an-issue/`
- finding_summary: Jira treats transitions, statuses, fields, and board movement as first-class issue workflow concepts
- finding_detail: the transition docs heavily emphasize issue status, workflow transitions, board movement, and field or screen handling, indicating that work moves through explicit transition semantics rather than implicit state changes
- confidence: high
- notes: strong donor value for explicit `State` and `Transition` modeling

### Observation 3
- observation_id: jira-obs-003
- observation_type: permission_locking
- evidence_type: official_docs
- raw_evidence_ref: `https://support.atlassian.com/jira/kb/how-to-lock-jira-issues-based-on-workflow-status/`
- finding_summary: Jira supports workflow-status-based edit locking through permission overrides and step properties
- finding_detail: Atlassian's lock-by-status guidance heavily emphasizes permissions, workflow steps, transitions, edit restrictions, and workflow properties, showing that workflow state can materially restrict what actions remain available
- confidence: high
- notes: strong donor value for governed transitions, permission-aware states, and blocked-state visibility

### Observation 4
- observation_id: jira-obs-004
- observation_type: approval_config
- evidence_type: official_docs
- raw_evidence_ref: `https://support.atlassian.com/jira-work-management/docs/troubleshoot-approvals-configuration/`
- finding_summary: Jira ties approvals to status-driven request flow rather than treating approval as a detached comment or side action
- finding_detail: the approvals troubleshooting guidance emphasizes approval status, request state, and field-linked configuration, indicating that approvals are structurally bound to workflow progression
- confidence: medium-high
- notes: strong donor value for approval-linked state handling, though richer runtime proof is still needed

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: jira-logic-001
- candidate_kind: Transition
- derived_from_observation_ids: jira-obs-002
- canonical_statement: Work items should move through explicit transitions between named statuses rather than through hidden or ad hoc state mutation
- target_feature_area: approval_workflow, qa_release_hardening
- preconditions: a work item exists and a user attempts to advance or move it
- postconditions: the resulting status change is visible, intentional, and tied to a known transition
- failure_path: work changes state without a clear transition boundary
- metric_implication: improves workflow traceability and transition auditability
- confidence: high
- status: draft

### Logic Candidate 2
- candidate_id: jira-logic-002
- candidate_kind: PermissionRule
- derived_from_observation_ids: jira-obs-003
- canonical_statement: Workflow state may change what can be edited, transitioned, or acted on, so blocked or locked states must be permission-aware and explicitly explained
- target_feature_area: approval_workflow, qa_release_hardening
- preconditions: a work item enters a state with restricted edits or transition rules
- postconditions: available actions narrow in a way that is justified by visible permission or workflow state
- failure_path: users encounter hidden restrictions or unexplained blocked transitions
- metric_implication: reduces silent workflow failures and improves blocked-state clarity
- confidence: high
- status: draft

### Logic Candidate 3
- candidate_id: jira-logic-003
- candidate_kind: Rule
- derived_from_observation_ids: jira-obs-004
- canonical_statement: Approval should be modeled as workflow-linked state progression rather than as an unstructured side conversation
- target_feature_area: approval_workflow
- preconditions: a work item reaches an approval-requiring stage
- postconditions: approval state is visible and tied to whether the workflow can proceed
- failure_path: approvals happen informally while workflow state remains ambiguous
- metric_implication: improves approval traceability and completion certainty
- confidence: medium-high
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: jira-ui-001
- candidate_kind: ViewState
- derived_from_observation_ids: jira-obs-002, jira-obs-003, jira-obs-004
- canonical_statement: Issue detail surfaces should make current status, allowed transitions, and blocked or approval-bound conditions visible in one operational context
- target_feature_area: approval_workflow, notification_system
- screen_name: issue detail and transition state
- layout_notes: current state and available next actions should be close together, not scattered across unrelated surfaces
- interaction_notes: when a transition is blocked or approval-bound, the reason should be visible at the point of action
- accessibility_notes: restricted or approval-dependent state must be understandable without relying only on color or icon cues
- responsive_notes: status and next actions should stay visible in compact issue views
- confidence: high
- status: draft

## 7. Review Decisions

### Review 1
- review_id: jira-review-001
- review_scope: logic
- target_artifact_id: jira-logic-001
- decision: accept
- review_reason: explicit transition-driven workflow is strongly evidenced and highly portable
- reviewed_by: Codex
- constraints: abstract Jira terminology into AES-native transition language
- required_follow_up: runtime capture will strengthen UI and interaction proof
- promotion_allowed: yes

### Review 2
- review_id: jira-review-002
- review_scope: logic
- target_artifact_id: jira-logic-002
- decision: accept
- review_reason: permission-aware lock states are strongly evidenced and directly valuable to governed execution
- reviewed_by: Codex
- constraints: carry forward only the behavior, not Jira-specific admin/property mechanics
- required_follow_up: runtime blocked-state capture later is still useful
- promotion_allowed: yes

### Review 3
- review_id: jira-review-003
- review_scope: logic
- target_artifact_id: jira-logic-003
- decision: accept_with_constraints
- review_reason: approval-state linkage is clearly signaled by official guidance, but deeper runtime proof should be gathered before using it as high-stakes canonical approval behavior
- reviewed_by: Codex
- constraints: require runtime capture before promoting fine-grained approval UI mechanics
- required_follow_up: authenticated issue or approval surface capture
- promotion_allowed: yes

### Review 4
- review_id: jira-review-004
- review_scope: hybrid
- target_artifact_id: jira-ui-001
- decision: accept
- review_reason: status, next action, and blocked-state visibility are strong reusable interface requirements for governed workflow
- reviewed_by: Codex
- constraints: preserve clarity without importing Jira visual density wholesale
- required_follow_up: runtime issue-detail capture will improve interaction detail later
- promotion_allowed: yes

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id: jira-bridge-001
- contract_scope: hybrid
- accepted_artifact_ids: jira-logic-001, jira-logic-002, jira-logic-003, jira-ui-001
- required_outcomes:
  - work items move through visible named transitions
  - blocked or locked states explicitly explain why actions are restricted
  - approval-requiring stages are structurally tied to workflow progression
  - issue detail surfaces show current state and realistic next actions together
- forbidden_shortcuts:
  - silent state mutation without visible transition
  - permission-based lockout with no visible explanation
  - approval hidden in comments while workflow state stays ambiguous
- required_validators:
  - transition-boundary check
  - blocked-state clarity check
  - approval-state visibility check
- approved_filescope: future approval, workflow, and notification-linked issue surfaces only
- approved_write_paths: future workflow state, view-model, and validation layers only
- approved_commands: none yet
- required_evidence: runtime screenshots or states showing named transitions, blocked-state explanation, and approval-linked progression

## 9. Validator Requirements

### Validator 1
- validator_id: jira-validator-001
- validator_kind: transition_boundary_check
- requirement_statement: users must be able to see when a work item changes status and which transition caused it
- pass_condition: a reviewer can identify current state, next allowed transition, and resulting state without guesswork
- blocking_level: blocking
- linked_bridge_input_id: jira-bridge-001

### Validator 2
- validator_id: jira-validator-002
- validator_kind: blocked_state_clarity_check
- requirement_statement: blocked or locked states must explain why actions are unavailable
- pass_condition: a reviewer can tell why an edit or transition is blocked and what condition must change
- blocking_level: blocking
- linked_bridge_input_id: jira-bridge-001

### Validator 3
- validator_id: jira-validator-003
- validator_kind: approval_state_visibility_check
- requirement_statement: approval-dependent work must visibly communicate whether approval is pending, satisfied, or blocking progress
- pass_condition: a reviewer can distinguish approval state from generic issue commentary or passive status text
- blocking_level: blocking
- linked_bridge_input_id: jira-bridge-001

## 10. Execution Evidence

### Evidence 1
- evidence_id: jira-evidence-001
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/jira-public-home.yml`
- evidence_summary: confirms public Jira framing around issue/task tracking, planning, automation, progress, and staying in sync
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 2
- evidence_id: jira-evidence-002
- evidence_kind: official_docs
- evidence_ref: `https://support.atlassian.com/jira-software-cloud/docs/transition-an-issue/`
- evidence_summary: confirms statuses, transitions, fields, and board movement are explicit workflow concepts
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 3
- evidence_id: jira-evidence-003
- evidence_kind: official_docs
- evidence_ref: `https://support.atlassian.com/jira/kb/how-to-lock-jira-issues-based-on-workflow-status/`
- evidence_summary: confirms workflow-status-based lock behavior and permission-aware restrictions
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 4
- evidence_id: jira-evidence-004
- evidence_kind: official_docs
- evidence_ref: `https://support.atlassian.com/jira-work-management/docs/troubleshoot-approvals-configuration/`
- evidence_summary: confirms approvals are tied to status-driven request flow and configuration
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

## 11. Verified Lessons

### Lesson 1
- lesson_id: jira-lesson-001
- lesson_statement: Jira is a strong donor for explicit transitions, permission-aware blocked states, and workflow-linked approvals
- verified_by_evidence_ids: jira-evidence-001, jira-evidence-002, jira-evidence-003, jira-evidence-004
- source_artifact_ids: jira-logic-001, jira-logic-002, jira-logic-003, jira-ui-001, jira-review-001, jira-review-002, jira-review-003, jira-review-004
- writeback_scope: workflow_pattern_library, approval_pattern_library
- failure_if_ignored: systems drift toward hidden state changes, silent lockouts, and approval behavior that is not structurally tied to workflow progress
- recommended_validator_pattern: pair Jira-derived patterns with transition-boundary, blocked-state, and approval-state validators

## 12. Promotion Summary
- accepted_logic_candidates: jira-logic-001, jira-logic-002, jira-logic-003
- accepted_ui_candidates: jira-ui-001
- promoted_operational_targets: approval_workflow, qa_release_hardening
- promoted_ui_targets: notification_system
- rejected_candidates: none
- deferred_candidates: none

## 13. Final Status
- packet_status: under_review
- bridge_ready: yes, for constrained workflow reuse
- validator_ready: yes
- writeback_ready: no
- next_action: capture authenticated issue-detail and transition runtime if available to strengthen approval and blocked-state UI behavior
- owner_notes: Jira is now an active workflow donor with strong public and docs-backed evidence for governed transitions and approval-linked state progression
