# Canva Donor Study Packet

## Packet Metadata
- packet_id: canva-ui-001
- donor_name: Canva
- donor_class: ui
- feature_area: app_shell, onboarding
- packet_owner: Codex
- created_at: 2026-03-21
- updated_at: 2026-03-21
- packet_status: under_review

## 1. Intake Summary
- study_goal: extract reusable UI patterns for shell clarity, creation-first entry, onboarding feel, and visible state presentation
- relevance_reason: Canva is a polished creation product with a strong desktop shell and visible home/create orientation
- expected_reusable_value: shell framing, creation-first home design, help/update/troubleshooting state handling, onboarding and setup feel
- scope_boundary: packaged desktop shell and first-pass bundle cues only
- out_of_scope: backend logic, internal editor implementation, deep collaboration workflows, monetization
- expected_risk_level: medium

## 2. AES Mapping
- target_feature_area: `app_shell`, `onboarding`
- target_work_item_type: none in first pass
- target_flow: home/create shell flow, onboarding/help flow
- target_ui_surface: shell, home, creation entry surface, visible error/help/update states
- target_operational_concepts: minimal; UI-state visibility only
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `DesignConstraint`, `NavigationPattern`

## 3. Evidence Plan
- evidence_methods:
  - local bundle inspection
  - `Info.plist` extraction
  - `app.asar` string analysis
  - future Hopper study if shell-specific behavior needs deeper confirmation
- expected_evidence_artifacts:
  - Electron packaging evidence
  - local desktop metadata
  - packaged strings and counts
- evidence_limitations:
  - Hopper MCP timed out during first attempt
  - current packet reflects high-confidence UI signals, not deep logic reconstruction
- open_questions:
  - how much of Canva’s shell state is local desktop behavior vs packaged web surface
  - whether first-run onboarding state is exposed enough in the bundle for later structured extraction

## 4. Donor Observations

### Observation 1
- observation_id: canva-obs-001
- observation_type: layout
- evidence_type: config
- raw_evidence_ref: `/Applications/Canva.app/Contents/Info.plist`
- finding_summary: Canva ships as an Electron desktop app shell rather than a thin native Cocoa app
- finding_detail: `NSPrincipalClass` is `AtomApplication`, Electron framework is bundled, and helper apps exist for Renderer/GPU/Plugin roles
- confidence: high
- notes: supports treating Canva as a packaged web-product shell donor

### Observation 2
- observation_id: canva-obs-002
- observation_type: routing
- evidence_type: config
- raw_evidence_ref: `/Applications/Canva.app/Contents/Info.plist`
- finding_summary: Canva supports a desktop deep-link path and many document/viewer associations
- finding_detail: `CFBundleURLSchemes` includes `canva`, and the app declares many viewer extensions including image, video, PDF, and Office file formats
- confidence: high
- notes: suggests strong “open into app” and creation/view shell behavior

### Observation 3
- observation_id: canva-obs-003
- observation_type: view_state
- evidence_type: binary_string
- raw_evidence_ref: `strings -a /Applications/Canva.app/Contents/Resources/app.asar`
- finding_summary: packaged strings strongly emphasize home, create, design, templates, and recent items
- finding_detail: keyword counts include `create: 5357`, `design: 1551`, `home: 491`, `template: 259`, `recent: 101`
- confidence: high
- notes: strong evidence for a creation-first shell and home surface model

### Observation 3b
- observation_id: canva-obs-003b
- observation_type: layout
- evidence_type: filesystem_artifact
- raw_evidence_ref: `/Applications/Canva.app/Contents/Resources/app.asar -> build_assets/page_preload/home.ltr.html`
- finding_summary: Canva has a dedicated packaged home preload surface
- finding_detail: the asar file list contains `build_assets/page_preload/home.ltr.html` and `home.rtl.html`, which strongly suggests the home surface is treated as a first-class shell entry
- confidence: high
- notes: strengthens the interpretation that home is an intentional shell state, not just a label

### Observation 4
- observation_id: canva-obs-004
- observation_type: notification
- evidence_type: binary_string
- raw_evidence_ref: `strings -a /Applications/Canva.app/Contents/Resources/app.asar`
- finding_summary: packaged strings include notification and invite-related cues, but they are secondary to design/create flows
- finding_detail: keyword counts include `notification: 330`, `invite: 50`, `team: 213`
- confidence: medium
- notes: useful for shell signals, but not strong enough to treat Canva as a notification logic donor

### Observation 5
- observation_id: canva-obs-005
- observation_type: failure
- evidence_type: binary_string
- raw_evidence_ref: `strings -a /Applications/Canva.app/Contents/Resources/app.asar`
- finding_summary: Canva exposes visible fallback and troubleshooting states for update, unsupported version, network diagnostics, and reset app data
- finding_detail: surfaced strings include `Update required`, `Run network diagnostics...`, `Offline Mode (Beta)`, `Reset App Data`, `This version of the Canva app is no longer supported on your device.`
- confidence: high
- notes: strong donor value for explicit shell-state handling

### Observation 5b
- observation_id: canva-obs-005b
- observation_type: layout
- evidence_type: filesystem_artifact
- raw_evidence_ref: `/Applications/Canva.app/Contents/Resources/app.asar -> dist/renderer/desktop_chrome_v2/`
- finding_summary: Canva ships a large dedicated desktop renderer bundle
- finding_detail: the asar file list shows a substantial `dist/renderer/desktop_chrome_v2/` tree, consistent with a mature desktop-specific shell rather than a trivial wrapper page
- confidence: high
- notes: supports treating Canva as a serious desktop UI donor even without successful Hopper procedure analysis

### Observation 5c
- observation_id: canva-obs-005c
- observation_type: view_state
- evidence_type: filesystem_artifact
- raw_evidence_ref: `/Applications/Canva.app/Contents/Resources/app.asar -> dist/renderer/desktop_offline_fallback/index.html`
- finding_summary: Canva has a dedicated offline fallback renderer rather than relying only on transient banners or browser-native error pages
- finding_detail: the packaged fallback surface has its own `index.html`, bootstrap config, CSS, runtime bundle, and localized strings for `You are currently offline`, `Reload`, `We’re having trouble connecting you to the internet`, `It’s time for an update`, and support contact guidance
- confidence: high
- notes: this is strong evidence for treating degraded shell states as first-class UI surfaces

### Observation 6
- observation_id: canva-obs-006
- observation_type: interaction
- evidence_type: binary_string
- raw_evidence_ref: `strings -a /Applications/Canva.app/Contents/Resources/app.asar`
- finding_summary: Canva has explicit new-design and home actions in the packaged desktop surface
- finding_detail: surfaced strings include `New Design...`, `Home`, `Continue`, `Downloads`, `Preferences`, `Canva Help`
- confidence: high
- notes: supports a shell pattern where creation, home, help, and troubleshooting are first-class actions

### Observation 7
- observation_id: canva-obs-007
- observation_type: layout
- evidence_type: filesystem_artifact
- raw_evidence_ref: `/Applications/Canva.app/Contents/Resources/app.asar -> build_assets/page_preload/home.ltr.html`
- finding_summary: Canva ships a purpose-built preload shell for the home surface with desktop and compact skeleton layouts
- finding_detail: `home.ltr.html` includes theme-aware loading behavior, a prominent shell header area, a visible sidebar region on wider layouts, repeated content skeleton sections, and a compact/mobile-style fallback layout for smaller surfaces
- confidence: high
- notes: this is stronger than string evidence because it shows real structure for how the shell loads before the full app is ready

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: canva-logic-001
- candidate_kind: VisibilityRule
- derived_from_observation_ids: canva-obs-005, canva-obs-005c, canva-obs-006
- canonical_statement: Shell-level health and support states should be explicitly visible when the app is offline, unsupported, or requires update
- target_feature_area: app_shell
- preconditions: unsupported version, offline mode, diagnostics requested
- postconditions: user sees visible support/update/troubleshooting affordance
- failure_path: hidden degraded-state messaging leaves the user without recovery action
- metric_implication: none
- confidence: medium
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: canva-ui-001
- candidate_kind: LayoutPattern
- derived_from_observation_ids: canva-obs-003, canva-obs-003b, canva-obs-006, canva-obs-007
- canonical_statement: The shell should foreground creation as a primary action while keeping home and recent-work entry points immediately visible
- target_feature_area: app_shell
- screen_name: home shell
- layout_notes: create/new action should read as primary; home and recent should remain close by; larger layouts can expose a persistent side region while compact layouts should preserve the same hierarchy without collapsing the primary action
- interaction_notes: moving from home to create should feel immediate, not buried in nested menus
- accessibility_notes: primary action hierarchy should remain obvious in keyboard and screen-reader order
- responsive_notes: creation entry should remain primary across smaller shell layouts
- confidence: high
- status: draft

### UI Candidate 2
- candidate_id: canva-ui-002
- candidate_kind: ViewState
- derived_from_observation_ids: canva-obs-005, canva-obs-005b, canva-obs-005c
- canonical_statement: Update, offline, and diagnostics states should be treated as first-class shell states with explicit recovery actions
- target_feature_area: app_shell
- screen_name: shell support states
- layout_notes: degraded states should be legible and action-oriented rather than hidden in passive banners only; a dedicated fallback surface is acceptable when the primary shell cannot load
- interaction_notes: support actions like update, reload, troubleshoot, or reset should be obvious and paired with plain-language status text
- accessibility_notes: degraded states should be announced distinctly and not rely on subtle visual cues
- responsive_notes: recovery actions should stay visible in compact layouts
- confidence: high
- status: draft

### UI Candidate 3
- candidate_id: canva-ui-003
- candidate_kind: InteractionPattern
- derived_from_observation_ids: canva-obs-002, canva-obs-006
- canonical_statement: A desktop shell can improve continuity by supporting direct open/deep-link paths into the relevant creative surface
- target_feature_area: onboarding
- screen_name: entry and resume paths
- layout_notes: entry actions should preserve orientation after opening into the app
- interaction_notes: deep-link or open-file flows should land the user in a coherent surface, not a disconnected blank shell
- accessibility_notes: entry transitions should preserve context and not strand assistive users
- responsive_notes: none
- confidence: medium
- status: draft

### UI Candidate 4
- candidate_id: canva-ui-004
- candidate_kind: DesignConstraint
- derived_from_observation_ids: canva-obs-003, canva-obs-003b, canva-obs-005, canva-obs-005b, canva-obs-005c, canva-obs-006, canva-obs-007
- canonical_statement: A polished shell donor may shape hierarchy and state presentation, but its branding language must be stripped before reuse
- target_feature_area: app_shell, onboarding
- screen_name: global shell pattern
- layout_notes: extract structure, not Canva’s specific identity
- interaction_notes: keep creation-first flow value without mimicking copy or brand feel
- accessibility_notes: preserve clarity gains, not stylistic mimicry
- responsive_notes: preserve hierarchy under resizing
- confidence: high
- status: draft

## 7. Review Decisions

### Review 1
- review_id: canva-review-001
- review_scope: ui
- target_artifact_id: canva-ui-001
- decision: accept_with_constraints
- review_reason: strong portable shell pattern, but must remain UI-only and avoid Canva look-alike behavior
- reviewed_by: Codex
- constraints: UI-only reuse; no direct branding or copy mimicry
- required_follow_up: verify with live UI screenshots or Hopper when MCP is responsive
- promotion_allowed: yes

### Review 2
- review_id: canva-review-002
- review_scope: ui
- target_artifact_id: canva-ui-002
- decision: accept
- review_reason: explicit degraded-state visibility is highly reusable and validator-friendly, and the dedicated offline fallback renderer makes this more than a string-level inference
- reviewed_by: Codex
- constraints: none beyond normal UI-only boundary
- required_follow_up: later confirm actual state layout via runtime observation
- promotion_allowed: yes

### Review 3
- review_id: canva-review-003
- review_scope: hybrid
- target_artifact_id: canva-logic-001
- decision: needs_more_evidence
- review_reason: shell-state visibility is promising but still too inferred to promote as operational truth
- reviewed_by: Codex
- constraints: keep as provisional only
- required_follow_up: verify through direct UI or Hopper-backed behavior study
- promotion_allowed: no

## 8. Bridge-Ready Outputs

### Bridge Input 1
- bridge_input_id: canva-bridge-001
- contract_scope: ui_only
- accepted_artifact_ids: canva-ui-001, canva-ui-002, canva-ui-004
- required_outcomes:
  - shell shows a clearly dominant primary action for creation or next-step progression
  - home and recent/resume entry points remain visible
  - degraded shell states expose recovery actions explicitly
  - if the main shell cannot load, the product can still present a branded but plain-language recovery surface
  - extracted hierarchy remains portable and non-branded
- forbidden_shortcuts:
  - copying Canva copywriting or branding language
  - hiding update/offline/help states in low-visibility locations
  - making the primary action visually ambiguous
- required_validators:
  - design check
  - accessibility check
  - shell state visibility check
- approved_filescope: future app-shell and onboarding presentation layers only
- approved_write_paths: future UI shell files only
- approved_commands: none yet
- required_evidence: screenshots or live-state confirmations after implementation

## 9. Validator Requirements

### Validator 1
- validator_id: canva-validator-001
- validator_kind: design_check
- requirement_statement: primary shell action must be visually dominant and clearly tied to the next meaningful user action
- pass_condition: a reviewer can identify the primary action without ambiguity in the final shell
- blocking_level: blocking
- linked_bridge_input_id: canva-bridge-001

### Validator 2
- validator_id: canva-validator-002
- validator_kind: accessibility_check
- requirement_statement: degraded shell states must expose recovery actions accessibly
- pass_condition: update/offline/help states are reachable and understandable with keyboard and screen-reader navigation, including any dedicated fallback surface
- blocking_level: blocking
- linked_bridge_input_id: canva-bridge-001

### Validator 3
- validator_id: canva-validator-003
- validator_kind: evidence_check
- requirement_statement: Canva-derived UI reuse must preserve structure without copying Canva-specific branding
- pass_condition: implemented shell reflects the accepted pattern while using project-native copy and styling
- blocking_level: advisory
- linked_bridge_input_id: canva-bridge-001

## 10. Execution Evidence

### Evidence 1
- evidence_id: canva-evidence-001
- evidence_kind: config
- evidence_ref: `/Applications/Canva.app/Contents/Info.plist`
- evidence_summary: confirms Electron app shell, deep-link scheme, document support, and desktop capability surfaces
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 2
- evidence_id: canva-evidence-002
- evidence_kind: bundle_string_analysis
- evidence_ref: `strings -a /Applications/Canva.app/Contents/Resources/app.asar`
- evidence_summary: surfaced strong counts for `create`, `design`, `home`, `template`, `recent`, `notification`, `invite`, `presentation`, and shell support/update strings
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 3
- evidence_id: canva-evidence-003
- evidence_kind: filesystem_artifact
- evidence_ref: `asar list /Applications/Canva.app/Contents/Resources/app.asar`
- evidence_summary: confirms a dedicated `build_assets/page_preload/home.ltr.html` surface and a large `dist/renderer/desktop_chrome_v2/` renderer tree
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 4
- evidence_id: canva-evidence-004
- evidence_kind: filesystem_artifact
- evidence_ref: `/var/folders/rm/nvx4s6yd0mb70zrv9y4kn_rc0000gn/T/tmp.HbsyxW89TL/dist/renderer/desktop_offline_fallback/index.html`
- evidence_summary: confirms a dedicated offline fallback HTML entrypoint with its own runtime bundles and bootstrap config for desktop recovery handling
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

### Evidence 5
- evidence_id: canva-evidence-005
- evidence_kind: filesystem_artifact
- evidence_ref: `/var/folders/rm/nvx4s6yd0mb70zrv9y4kn_rc0000gn/T/tmp.HbsyxW89TL/build_assets/page_preload/home.ltr.html`
- evidence_summary: confirms a theme-aware home preload shell with wide-layout sidebar framing, repeated content skeletons, and a compact fallback layout
- builder_run_id:
- validator_run_id:
- produced_at: 2026-03-21

## 11. Verified Lessons

### Lesson 1
- lesson_id: canva-lesson-001
- lesson_statement: Canva is a valid UI donor for shell clarity, creation-first hierarchy, and explicit recovery-state surfacing, but not a first-pass logic donor
- verified_by_evidence_ids: canva-evidence-001, canva-evidence-002, canva-evidence-003, canva-evidence-004, canva-evidence-005
- source_artifact_ids: canva-ui-001, canva-ui-002, canva-review-001, canva-review-002
- writeback_scope: ui_pattern_library
- failure_if_ignored: the donor may be misused as a backend or governance model instead of a presentation donor
- recommended_validator_pattern: pair any Canva-derived pattern with design and accessibility checks, not operational rule promotion

## 12. Promotion Summary
- accepted_logic_candidates: none
- accepted_ui_candidates: canva-ui-001, canva-ui-002, canva-ui-004
- promoted_operational_targets: none
- promoted_ui_targets: app_shell, onboarding
- rejected_candidates: none
- deferred_candidates: canva-logic-001, canva-ui-003

## 13. Final Status
- packet_status: under_review
- bridge_ready: yes, for UI-only reuse
- validator_ready: yes
- writeback_ready: partial
- next_action: confirm live UI states or restore Hopper MCP responsiveness for deeper shell-state observation
- owner_notes: Canva has now moved from reserve donor to active UI donor study with a constrained, non-logic-first scope
