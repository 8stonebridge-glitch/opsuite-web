# Canva Donor Intake

## Basic identity
- donor_name: Canva
- donor_class: ui
- platform: macOS desktop app, Electron-based web app shell
- version: 1.110.0
- source_location: `/Applications/Canva.app`
- analyst: Codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: app_shell, onboarding
- target_work_item_type: none directly; UI donor only in first pass
- target_flow: onboarding shell flow, home-to-create flow, shell navigation flow
- target_ui_surface: app shell, home surface, creation entry points, first-run guidance surfaces
- target_operational_concepts: View-state visibility only; no backend truth claimed
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `DesignConstraint`, `NavigationPattern`

## Study goal
- study_goal: extract reusable UI patterns for shell clarity, creation-first home flow, onboarding feel, and state presentation
- relevance_reason: Canva is a strong design-first product with a mature desktop shell and clear creation-oriented interaction model
- expected_reusable_value: reusable shell patterns, home/create entry framing, empty/loading/help-state presentation, polished onboarding feel
- out_of_scope: backend truth, permission truth, notification rules, canonical workflow authority

## Scope boundary
- exact_surface_in_scope: desktop shell framing, home/create cues, onboarding/help cues, visible first-run and navigation patterns
- exact_surface_out_of_scope: internal editor logic, sync/network behavior, monetization, collaboration backend, asset pipeline internals
- depth_limit: first pass is bundle inspection and packaged-surface evidence only; Hopper study may follow later if needed

## Donor quality assessment
- why_this_donor_is_strong: strong product polish, large packaged frontend, clear design-first shell, many visible creation and home-oriented cues
- likely_noise_or_wrapper_risk: Electron shell and bundled web implementation add noise; product branding is strong and must not dominate extraction
- portability_risk: medium; UI patterns are reusable, but Canva-specific creation language must be abstracted carefully
- confidence_before_study: medium-high

## Evidence plan
- evidence_methods:
  - local app bundle inspection
  - `Info.plist` review
  - `app.asar` string analysis
  - future Hopper use if desktop-specific shell behavior needs deeper inspection
- expected_evidence_artifacts:
  - Electron packaging evidence
  - deep-link and document support metadata
  - packaged strings showing `home`, `create`, `template`, `design`, `notification`, `invite`, `presentation`
  - packaged home preload surface and desktop renderer-bundle structure
  - dedicated offline fallback renderer with recovery-oriented copy
- expected_limitations:
  - Hopper MCP timed out during the first attempt
  - current evidence is strong for UI direction, weaker for operational truth

## Candidate outputs expected
- logic_candidates_expected:
  - minimal; at most view-state gating or shell-state behavior
- ui_candidates_expected:
  - home surface composition patterns
  - creation-first shell entry patterns
  - onboarding/help-state presentation patterns
  - app-shell navigation and windowing patterns
- likely_states:
  - home
  - create/new design
  - recent work
  - update required
  - offline/network diagnostics
  - preferences/help
- likely_transitions:
  - home -> create
  - home -> recent/open existing
  - update-required -> relaunch/update
  - unsupported state -> help/update guidance
- likely_rules:
  - UI-only presentation rules for home/create emphasis
- likely_failure_modes:
  - unsupported version/device
  - offline mode / network diagnostics
  - app outside Applications folder
- likely_ui_patterns:
  - creation-first landing
  - shell with explicit home surface
  - prominent new-design affordance
  - troubleshooting and update affordances in shell
  - dedicated recovery surface for offline and load-failure states
- likely_view_states:
  - home
  - recent/open state
  - update required
  - offline/troubleshooting state

## Review plan
- review_scope: ui
- expected_risk_level: medium
- likely_required_reviewers: design reviewer, governance reviewer
- likely_required_validators:
  - design check
  - accessibility check
  - view-state visibility check
  - responsiveness and shell clarity review
- likely_constraints_if_accepted:
  - UI-only reuse
  - no backend truth promotion
  - no Canva branding or look-alike copying

## Success definition
- study_is_successful_if: it yields portable shell and onboarding UI patterns that can be expressed as `UIPattern`, `ViewState`, or `DesignConstraint`
- minimum_bridge_ready_output: accepted UI candidates for app shell and onboarding feel
- minimum_validator_ready_output: concrete UI checks proving the resulting shell shows the intended states clearly

## Notes
- `Info.plist` confirms:
  - Electron app shell
  - deep-link scheme `canva`
  - many viewer file associations
  - camera/microphone support for recorded presentation features
- packaged app evidence confirms:
  - `app.asar` present at roughly 15 MB
  - `home`, `create`, `template`, `design`, `notification`, `invite`, `presentation`, and `editor` are frequent surface terms
  - a dedicated preload file exists at `build_assets/page_preload/home.ltr.html`
  - the renderer bundle is organized under `dist/renderer/desktop_chrome_v2/`
  - a separate renderer exists at `dist/renderer/desktop_offline_fallback/` with its own `index.html`
  - the offline fallback renderer bootstraps against `https://www.canva.com/_online`, which suggests a deliberate desktop recovery surface rather than a generic browser error page
- first Hopper attempt timed out, so this intake is grounded in local bundle evidence rather than binary procedure analysis
