# Clerk Donor Study Packet

## Packet Metadata
- packet_id: clerk-hybrid-001
- donor_name: Clerk
- donor_class: hybrid
- feature_area: onboarding, backend_platform
- packet_owner: Codex
- created_at: 2026-03-21
- updated_at: 2026-03-21
- packet_status: under_review

## 1. Intake Summary
- study_goal: extract reusable hybrid patterns for auth-aware onboarding, organization setup, membership flows, and account-context clarity
- relevance_reason: Clerk exposes strong public evidence for auth, user management, organization management, and B2B onboarding semantics
- expected_reusable_value: secure sign-in/sign-up progression, account switching, organization switching, invitation and role patterns
- scope_boundary: public homepage and docs only
- out_of_scope: private dashboard internals, provider internals, hosted auth implementation details
- expected_risk_level: medium-high

## 2. AES Mapping
- target_feature_area: `onboarding`, `backend_platform`, `shared_frontend_system`
- target_work_item_type: identity, membership, organization, and session-adjacent flow
- target_flow: sign-in/sign-up flow, account context flow, organization create/join flow
- target_ui_surface: auth components, profile/security components, organization components
- target_operational_concepts: roles, memberships, invitations, sessions, organization context, account switching
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `DesignConstraint`, `NavigationPattern`

## 3. Evidence Plan
- evidence_methods:
  - Playwright snapshot of homepage
  - docs review
  - organizations overview review
  - keyword extraction on organizations docs
- expected_evidence_artifacts:
  - public auth and org-management components
  - public docs language around organizations, members, roles, invitations, sessions, and access
- evidence_limitations:
  - no authenticated dashboard capture yet
  - some membership workflows are still docs-level rather than runtime-observed
- open_questions:
  - how invite acceptance feels in a real session
  - how deeper team/member-management surfaces behave after workspace creation

## 4. Donor Observations

### Observation 1
- observation_id: clerk-obs-001
- observation_type: product_frame
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T15-46-55-978Z.yml`
- finding_summary: Clerk publicly positions itself as complete user management, not just sign-in
- finding_detail: the homepage headline is `More than authentication, Complete User Management`, and the supporting copy emphasizes full-stack auth plus user management
- confidence: high
- notes: strong donor signal for onboarding and backend identity boundaries

### Observation 2
- observation_id: clerk-obs-002
- observation_type: ui_surface
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T15-46-55-978Z.yml`
- finding_summary: Clerk exposes a broad set of auth and account-management components publicly
- finding_detail: visible components include `SignUp`, `SignIn`, `UserButton`, `UserProfile`, and account-management surfaces like profile and security settings
- confidence: high
- notes: strong donor value for onboarding and account-context UI

### Observation 3
- observation_id: clerk-obs-003
- observation_type: organization
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T15-46-55-978Z.yml`
- finding_summary: Clerk publicly exposes organization-aware UI components, not just personal account surfaces
- finding_detail: visible images show create organization, organization switcher, organization profile, and organization list with create or join options
- confidence: high
- notes: strong donor value for B2B onboarding and workspace context

### Observation 4
- observation_id: clerk-obs-004
- observation_type: logic
- evidence_type: keyword_extraction
- raw_evidence_ref: `curl -L https://clerk.com/docs/guides/organizations/overview | rg org terms`
- finding_summary: Clerk’s organization model strongly emphasizes roles, members, invitations, sessions, and access
- finding_detail: keyword extraction shows very high frequency for `organization`, `member`, `role`, `invitation`, `session`, `access`, `B2B`, and `multi-tenant`
- confidence: medium-high
- notes: supports the interpretation that organization membership and role logic are central, not incidental

### Observation 5
- observation_id: clerk-obs-005
- observation_type: docs
- evidence_type: official_docs
- raw_evidence_ref: `https://clerk.com/docs/guides/organizations/overview`
- finding_summary: Clerk explicitly frames organizations as the basis for multi-tenant B2B apps with role-based access and streamlined enrollment
- finding_detail: the public docs title and description emphasize organization management, multi-tenant B2B applications, team workspaces, RBAC, and enrollment
- confidence: high
- notes: strong donor value for role-aware onboarding and membership logic

### Observation 6
- observation_id: clerk-obs-006
- observation_type: invitation_flow
- evidence_type: official_docs
- raw_evidence_ref: `https://clerk.com/docs/guides/organizations/add-members/invitations`
- finding_summary: Clerk treats invitation handling as an explicit organization flow with redirect, role, email, and metadata semantics
- finding_detail: the invitations guide strongly emphasizes invitation issuance, email-based targeting, role assignment, redirect handling, and invitation metadata rather than treating invites as an invisible side effect
- confidence: high
- notes: strong donor value for onboarding and membership-state clarity

### Observation 7
- observation_id: clerk-obs-007
- observation_type: custom_flow
- evidence_type: official_docs
- raw_evidence_ref: `https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations`
- finding_summary: Clerk documents invitation acceptance as a first-class custom flow with token, session, redirect, and active-organization implications
- finding_detail: the custom-flow docs heavily emphasize invitation tokens, session handling, redirect decisions, and acceptance flow instead of collapsing invite acceptance into generic sign-in
- confidence: high
- notes: strong donor value for explicit invite acceptance and post-auth context continuity

### Observation 8
- observation_id: clerk-obs-008
- observation_type: organization_management
- evidence_type: official_docs
- raw_evidence_ref: `https://clerk.com/docs/guides/organizations/create-and-manage`
- finding_summary: Clerk treats organization switching and active organization selection as explicit management interactions
- finding_detail: the create-and-manage docs emphasize organization management components, switching, create flows, and `setActive` style active-context control rather than leaving org context implicit
- confidence: high
- notes: strong donor value for active-context visibility and safe switching

### Observation 9
- observation_id: clerk-obs-009
- observation_type: runtime_onboarding
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-app-setup.yml`
- finding_summary: Clerk lands new users in a concrete first-run app setup flow after sign-up
- finding_detail: the live dashboard redirects to `dashboard.clerk.com/apps/new?signed_up=true` and presents a generated application name, sign-in option toggles, and a real preview rather than a vague success state
- confidence: high
- notes: strong runtime donor value for post-auth onboarding continuity and setup momentum

### Observation 10
- observation_id: clerk-obs-010
- observation_type: runtime_shell
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-apps.yml`
- finding_summary: Clerk’s signed-in dashboard makes workspace context, invite entry, navigation, and settings explicit at the shell level
- finding_detail: the apps dashboard shows `Personal workspace`, plan tier `Hobby`, `Switch organization`, `Invite`, user menu, and navigation to `Applications`, `Team`, and `Settings`
- confidence: high
- notes: strong runtime donor value for explicit account or org context and management affordances

### Observation 11
- observation_id: clerk-obs-011
- observation_type: runtime_switcher
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-switch-org.yml`
- finding_summary: Clerk’s live organization switcher exposes the active workspace, role, manage action, and create-workspace path in one explicit context menu
- finding_detail: the switcher dialog shows `Personal workspace is active`, labels the current role as `Owner`, exposes `Manage`, and offers `Create workspace`
- confidence: high
- notes: strong runtime donor value for active-context visibility, role clarity, and safe switching

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: clerk-logic-001
- candidate_kind: Rule
- derived_from_observation_ids: clerk-obs-003, clerk-obs-004, clerk-obs-005
- canonical_statement: Authenticated users should have an explicit account or organization context that governs what membership and role-based actions are available
- target_feature_area: onboarding, backend_platform
- preconditions: user is authenticated and one or more org/account contexts exist
- postconditions: the user can tell which context is active and act within it safely
- failure_path: users act in the wrong org or account context
- metric_implication: improves onboarding clarity and access confidence
- confidence: high
- status: draft

### Logic Candidate 2
- candidate_id: clerk-logic-002
- candidate_kind: PermissionRule
- derived_from_observation_ids: clerk-obs-004, clerk-obs-005, clerk-obs-006
- canonical_statement: Membership, role, and invitation state should be explicit because access should not be inferred from authentication alone
- target_feature_area: onboarding, backend_platform
- preconditions: user is authenticated or invited
- postconditions: membership and role determine what access is granted
- failure_path: authenticated users receive ambiguous or incorrect access
- metric_implication: supports fewer access-context mistakes
- confidence: high
- status: draft

### Logic Candidate 3
- candidate_id: clerk-logic-003
- candidate_kind: Transition
- derived_from_observation_ids: clerk-obs-006, clerk-obs-007, clerk-obs-008
- canonical_statement: Invitation acceptance should be modeled as its own transition from invite context into authenticated membership context, with explicit redirect and active-organization resolution
- target_feature_area: onboarding, backend_platform
- preconditions: a valid invitation exists and the user signs in or signs up
- postconditions: the user lands in an explicit membership context with a clear resulting organization
- failure_path: a user authenticates successfully but lands without a clear org or membership result
- metric_implication: reduces post-auth confusion and invite-dropoff risk
- confidence: high
- status: draft

### Logic Candidate 4
- candidate_id: clerk-logic-004
- candidate_kind: Rule
- derived_from_observation_ids: clerk-obs-009, clerk-obs-010, clerk-obs-011
- canonical_statement: Post-auth onboarding should resolve immediately into a meaningful setup or workspace context rather than a generic authenticated success state
- target_feature_area: onboarding, backend_platform
- preconditions: a user has just authenticated or completed sign-up
- postconditions: the user lands in a concrete next-step state with visible current context and available setup actions
- failure_path: users authenticate successfully but lose momentum or context after entry
- metric_implication: improves onboarding continuation and reduces first-run ambiguity
- confidence: high
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: clerk-ui-001
- candidate_kind: LayoutPattern
- derived_from_observation_ids: clerk-obs-002, clerk-obs-003
- canonical_statement: Auth, account management, and organization management should be distinct but visibly connected surfaces
- target_feature_area: onboarding
- screen_name: auth and context setup
- layout_notes: sign-in/sign-up, profile/security, and organization flows should feel modular without becoming disconnected
- interaction_notes: users should move from auth into the correct account or org context without ambiguity
- accessibility_notes: account and org context must be understandable without relying on visual-only cues
- responsive_notes: account and org controls should remain legible in compact layouts
- confidence: high
- status: draft

### UI Candidate 2
- candidate_id: clerk-ui-002
- candidate_kind: InteractionPattern
- derived_from_observation_ids: clerk-obs-002, clerk-obs-003
- canonical_statement: Account switching and organization switching should be first-class interactions rather than hidden admin-only actions
- target_feature_area: onboarding, backend_platform
- screen_name: account or organization switcher
- layout_notes: current account and current organization should be visible and selectable
- interaction_notes: switching should preserve orientation and show the resulting context clearly
- accessibility_notes: the switcher should communicate current context and alternative contexts clearly
- responsive_notes: switching controls should not collapse into ambiguity on smaller screens
- confidence: high
- status: draft

### UI Candidate 3
- candidate_id: clerk-ui-003
- candidate_kind: DesignConstraint
- derived_from_observation_ids: clerk-obs-001, clerk-obs-002, clerk-obs-003, clerk-obs-005
- canonical_statement: Clerk’s auth and org patterns are valuable, but component names and provider-specific framing must be abstracted before reuse
- target_feature_area: onboarding, backend_platform, shared_frontend_system
- screen_name: auth and identity pattern library
- layout_notes: preserve explicit context and secure flow structure without copying vendor branding
- interaction_notes: map auth and org flow patterns into project-native naming
- accessibility_notes: preserve clarity and security cues, not branded feel
- responsive_notes: preserve context and hierarchy under resizing
- confidence: high
- status: draft

### UI Candidate 4
- candidate_id: clerk-ui-004
- candidate_kind: ViewState
- derived_from_observation_ids: clerk-obs-006, clerk-obs-007, clerk-obs-008
- canonical_statement: Invitation, active-organization, and switching states should be visible as distinct states rather than hidden behind generic authenticated UI
- target_feature_area: onboarding, backend_platform
- screen_name: invitation and organization context states
- layout_notes: the product should distinguish invite acceptance, active context, and switching states without overloading one generic account menu
- interaction_notes: after auth or invite acceptance, the user should see which org became active and what changed
- accessibility_notes: active-context and invitation-result states must be understandable without relying on subtle visual badges alone
- responsive_notes: context state should remain explicit in compact views where menus collapse
- confidence: high
- status: draft

### UI Candidate 5
- candidate_id: clerk-ui-005
- candidate_kind: NavigationPattern
- derived_from_observation_ids: clerk-obs-009, clerk-obs-010, clerk-obs-011
- canonical_statement: Identity-centered products should keep current workspace, invite entry, switching, team, and settings visible near the top-level shell
- target_feature_area: onboarding, backend_platform, shared_frontend_system
- screen_name: authenticated identity shell
- layout_notes: the shell should present current context and next management actions without burying them in secondary settings
- interaction_notes: users should move from first-run setup into team or settings management without losing context
- accessibility_notes: current workspace and role should remain understandable for keyboard and assistive-technology users
- responsive_notes: critical context and switching controls should survive compact shells
- confidence: high
- status: draft

## 7. Review Decisions

### Review 1
- review_id: clerk-review-001
- review_scope: logic
- target_artifact_id: clerk-logic-001
- decision: accept
- review_reason: explicit account or org context is strongly evidenced and highly portable
- reviewed_by: Codex
- constraints: none beyond terminology abstraction
- required_follow_up: authenticated dashboard capture later would strengthen runtime proof
- promotion_allowed: yes

### Review 2
- review_id: clerk-review-002
- review_scope: logic
- target_artifact_id: clerk-logic-002
- decision: accept_with_constraints
- review_reason: role, membership, and invitation logic are strongly signaled, but current proof is still docs-heavy
- reviewed_by: Codex
- constraints: treat as strong donor logic, but validate with a live flow later if used for high-stakes enforcement
- required_follow_up: capture a live invitation or org-membership surface later if needed
- promotion_allowed: yes

### Review 4
- review_id: clerk-review-004
- review_scope: logic
- target_artifact_id: clerk-logic-003
- decision: accept_with_constraints
- review_reason: invite acceptance as a distinct transition is strongly supported by Clerk's docs, but final redirect feel still benefits from runtime proof
- reviewed_by: Codex
- constraints: use it as grounded onboarding logic, but confirm final UI state in a live product before using it for high-stakes enforcement
- required_follow_up: capture a real invite-acceptance or org-join surface later if available
- promotion_allowed: yes

### Review 5
- review_id: clerk-review-005
- review_scope: logic
- target_artifact_id: clerk-logic-004
- decision: accept
- review_reason: the live dashboard strongly proves that Clerk resolves post-auth entry into meaningful setup context rather than a generic success shell
- reviewed_by: Codex
- constraints: reuse the pattern, not the app-creation wording
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 6
- review_id: clerk-review-006
- review_scope: hybrid
- target_artifact_id: clerk-ui-005
- decision: accept
- review_reason: the signed-in shell cleanly proves the value of explicit workspace, switching, invite, team, and settings visibility
- reviewed_by: Codex
- constraints: preserve context visibility without copying Clerk's exact navigation labels
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

### Review 3
- review_id: clerk-review-003
- review_scope: hybrid
- target_artifact_id: clerk-ui-001
- decision: accept
- review_reason: the separation and connection between auth, account, and org surfaces is highly reusable for onboarding
- reviewed_by: Codex
- constraints: no direct reuse of Clerk component labels
- required_follow_up: none required for first-pass promotion
- promotion_allowed: yes

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id: clerk-bridge-001
- contract_scope: hybrid
- accepted_artifact_ids: clerk-logic-001, clerk-logic-002, clerk-logic-003, clerk-ui-001, clerk-ui-002, clerk-ui-003, clerk-ui-004
- accepted_artifact_ids: clerk-logic-001, clerk-logic-002, clerk-logic-003, clerk-logic-004, clerk-ui-001, clerk-ui-002, clerk-ui-003, clerk-ui-004, clerk-ui-005
- required_outcomes:
  - users always know what account or organization context they are acting in
  - onboarding connects authentication to the correct membership context
  - role or invitation state is explicit enough to support safe access decisions
  - switching between accounts or organizations is visible and understandable
  - invitation acceptance resolves into a clear resulting org or membership context
  - post-auth entry resolves into a meaningful setup or workspace state with visible next actions
- forbidden_shortcuts:
  - treating authentication alone as proof of correct access
  - hiding account or org context behind unclear menus
  - treating invite acceptance as a generic sign-in success with no visible resulting context
  - copying Clerk component names directly into product truth
- required_validators:
  - context-clarity check
  - role-and-membership visibility check
  - onboarding continuity check
  - invitation-result clarity check
- approved_filescope: future onboarding, auth, and org-management layers only
- approved_write_paths: future UI, view-model, and access-context layers only
- approved_commands: none yet
- required_evidence: implementation screenshots or live states showing explicit context, membership, and switching
- required_evidence: implementation screenshots or live states showing explicit context, membership, switching, and post-auth landing continuity

## 9. Validator Requirements

### Validator 1
- validator_id: clerk-validator-001
- validator_kind: context_clarity_check
- requirement_statement: users must be able to tell which account or organization context is active
- pass_condition: a reviewer can identify current context and switching options without guesswork
- blocking_level: blocking
- linked_bridge_input_id: clerk-bridge-001

### Validator 2
- validator_id: clerk-validator-002
- validator_kind: role_membership_check
- requirement_statement: role, membership, or invitation state must be visible enough to explain access
- pass_condition: onboarding and org views show enough context to justify access-level differences
- blocking_level: blocking
- linked_bridge_input_id: clerk-bridge-001

### Validator 3
- validator_id: clerk-validator-003
- validator_kind: abstraction_check
- requirement_statement: reused Clerk patterns must be provider-agnostic at the product level
- pass_condition: the implementation reflects the pattern without vendor terminology leakage
- blocking_level: advisory
- linked_bridge_input_id: clerk-bridge-001

### Validator 4
- validator_id: clerk-validator-004
- validator_kind: invitation_result_clarity_check
- requirement_statement: invite acceptance must end in a visible and understandable resulting membership or organization state
- pass_condition: after invitation acceptance, a reviewer can tell what org became active, what role or membership exists, and what the user should do next
- blocking_level: blocking
- linked_bridge_input_id: clerk-bridge-001

## 10. Execution Evidence

### Evidence 1
- evidence_id: clerk-evidence-001
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/.playwright-cli/page-2026-03-21T15-46-55-978Z.yml`
- evidence_summary: confirms auth, account-management, and organization-management surfaces on the public homepage
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 2
- evidence_id: clerk-evidence-002
- evidence_kind: docs_page
- evidence_ref: `https://clerk.com/docs`
- evidence_summary: confirms public docs framing around complete user management
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 3
- evidence_id: clerk-evidence-003
- evidence_kind: docs_page
- evidence_ref: `https://clerk.com/docs/guides/organizations/overview`
- evidence_summary: confirms organizations, RBAC, multi-tenant B2B, and enrollment positioning
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 4
- evidence_id: clerk-evidence-004
- evidence_kind: keyword_extraction
- evidence_ref: `curl -L https://clerk.com/docs/guides/organizations/overview | rg org terms`
- evidence_summary: shows heavy emphasis on organizations, members, roles, invitations, sessions, access, and B2B
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 5
- evidence_id: clerk-evidence-005
- evidence_kind: official_docs
- evidence_ref: `https://clerk.com/docs/guides/organizations/add-members/invitations`
- evidence_summary: confirms invitations are explicit organization objects with role, email, redirect, and metadata semantics
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 6
- evidence_id: clerk-evidence-006
- evidence_kind: official_docs
- evidence_ref: `https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations`
- evidence_summary: confirms invite acceptance is a distinct flow with token, redirect, session, and active-context implications
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 7
- evidence_id: clerk-evidence-007
- evidence_kind: official_docs
- evidence_ref: `https://clerk.com/docs/guides/organizations/create-and-manage`
- evidence_summary: confirms organization create, manage, switch, and active-context behavior are explicit surfaces
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 8
- evidence_id: clerk-evidence-008
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-app-setup.yml`
- evidence_summary: confirms live post-sign-up landing goes to a concrete app-setup flow with generated defaults, provider toggles, and preview
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 9
- evidence_id: clerk-evidence-009
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-apps.yml`
- evidence_summary: confirms live shell exposes personal workspace, plan, switch organization, invite, user menu, team, and settings
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 10
- evidence_id: clerk-evidence-010
- evidence_kind: browser_snapshot
- evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-switch-org.yml`
- evidence_summary: confirms switch-organization dialog exposes active workspace, owner role, manage action, and create workspace
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

## 11. Verified Lessons

### Lesson 1
- lesson_id: clerk-lesson-001
- lesson_statement: Clerk is a strong donor for auth-aware onboarding, explicit account or organization context, role or membership-driven access setup, invitation-to-membership transition design, and post-auth landing continuity
- verified_by_evidence_ids: clerk-evidence-001, clerk-evidence-002, clerk-evidence-003, clerk-evidence-004, clerk-evidence-005, clerk-evidence-006, clerk-evidence-007, clerk-evidence-008, clerk-evidence-009, clerk-evidence-010
- source_artifact_ids: clerk-logic-001, clerk-logic-002, clerk-logic-003, clerk-logic-004, clerk-ui-001, clerk-ui-004, clerk-ui-005, clerk-review-001, clerk-review-002, clerk-review-003, clerk-review-004, clerk-review-005, clerk-review-006
- writeback_scope: onboarding_pattern_library, identity_context_library
- failure_if_ignored: the system may authenticate users successfully but still leave account, org, invitation, or membership context unclear
- recommended_validator_pattern: pair Clerk-derived patterns with context-clarity, role-visibility, and invitation-result checks

## 12. Promotion Summary
- accepted_logic_candidates: clerk-logic-001, clerk-logic-002, clerk-logic-003, clerk-logic-004
- accepted_ui_candidates: clerk-ui-001, clerk-ui-002, clerk-ui-003, clerk-ui-004, clerk-ui-005
- promoted_operational_targets: onboarding, backend_platform
- promoted_ui_targets: shared_frontend_system
- rejected_candidates: none
- deferred_candidates: none

## 13. Final Status
- packet_status: under_review
- bridge_ready: yes, for constrained hybrid reuse
- validator_ready: yes
- writeback_ready: partial
- next_action: capture a live invite acceptance or team-member management flow later if deeper runtime proof is needed beyond the current dashboard and switcher evidence
- owner_notes: Clerk is now an active onboarding and identity-context donor with especially high value for organization-aware setup, explicit invitation handling, active-context clarity, and post-auth landing continuity
