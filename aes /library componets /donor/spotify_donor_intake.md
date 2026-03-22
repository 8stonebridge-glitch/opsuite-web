# Spotify Donor Intake

## Basic identity
- donor_name: Spotify Web Player
- donor_class: hybrid
- platform: web app
- version: runtime surfaces observed on 2026-03-22
- source_location: `https://open.spotify.com`
- analyst: Codex
- intake_date: 2026-03-22

## AES mapping
- target_feature_area: app_shell, shared_frontend_system, onboarding, notification_system
- target_work_item_type: media-object and collection-object interaction model in first pass
- target_flow: search-to-result flow, artist-to-track flow, collection-detail flow, library empty-state flow, playback gating flow
- target_ui_surface: signed-in home, search results, artist detail, playlist preview detail, now-playing bar, library sidebar
- target_operational_concepts: object hierarchy, collection/detail continuity, action-bar behavior, capability gating, preview-mode fallback
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## Study goal
- study_goal: extract reusable patterns for dense consumer-grade shell navigation, fast search-driven object discovery, list/detail continuity, and clearly surfaced capability-gated states
- relevance_reason: Spotify is one of the strongest donors for search-first navigation, persistent shell behavior, media detail framing, and graceful degraded playback states
- expected_reusable_value: persistent shell, query persistence, object-card patterns, collection detail grids, disabled-control clarity, anonymous preview fallback
- out_of_scope: recommendation algorithms, audio backend semantics, subscription/billing internals, hidden notification delivery rules

## Scope boundary
- exact_surface_in_scope: signed-in home, focused search input, search results, artist detail, attempted playback/device flow, and anonymous playlist preview surface
- exact_surface_out_of_scope: mobile surfaces, full authenticated library population, collaborative playlists, account settings, hidden device handoff implementation
- depth_limit: first pass is Playwright runtime evidence only; no reverse engineering and no network-level API capture in this donor packet

## Donor quality assessment
- why_this_donor_is_strong: Spotify combines a sticky global shell, object-dense discovery surfaces, and explicit capability gating without losing orientation
- likely_noise_or_wrapper_risk: consumer-brand styling is high and must not be imported directly into AES
- portability_risk: medium; shell and flow logic are portable, but music-domain terminology and recommendation-heavy UI are not
- confidence_before_study: medium-high

## Evidence plan
- evidence_methods:
  - Playwright authenticated runtime capture
  - Playwright anonymous preview capture
  - snapshot review of shell, list, detail, and player surfaces
- expected_evidence_artifacts:
  - signed-in home shell and empty library
  - search query and results state
  - artist detail with popular-track grid
  - attempted playback and device-picker state
  - anonymous playlist preview surface
- expected_limitations:
  - direct playback did not fully activate in observed runtime
  - direct playlist navigation moved into preview-mode context
  - API semantics remain unproven in this pass

## Candidate outputs expected
- logic_candidates_expected:
  - search-to-detail continuity rules
  - capability-gated action patterns
  - preview-mode fallback rules
  - collection/detail linkage patterns
- ui_candidates_expected:
  - persistent shell
  - dense but legible search results
  - artist detail layout
  - playlist table layout
  - empty-library prompt cards
- likely_states:
  - signed-in home
  - focused search
  - search results
  - artist detail
  - playback-gated now-playing bar
  - anonymous preview mode
- likely_transitions:
  - home -> focused search
  - search -> results
  - results -> artist detail
  - artist detail -> attempted playback
  - artist detail -> device handoff attempt
  - deep link -> preview mode playlist detail
- likely_rules:
  - global shell stays present across discovery surfaces
  - object actions should remain adjacent to metadata
  - disabled or gated playback controls should still explain state implicitly through visible affordances
- likely_failure_modes:
  - playback controls appear but cannot activate
  - deep links lose authenticated context
  - empty library becomes a dead end
- likely_ui_patterns:
  - top nav plus left library plus persistent bottom bar
  - searchable omnibox with contextual filter tabs
  - detail hero with action bar
  - table-like collection detail
- likely_view_states:
  - quiet library state
  - high-density search state
  - artist detail state
  - preview-mode collection state

## Review plan
- review_scope: hybrid
- expected_risk_level: medium
- likely_required_reviewers: design reviewer, domain reviewer, governance reviewer
- likely_required_validators:
  - persistent shell continuity check
  - search-to-detail continuity check
  - action gating clarity check
  - preview-mode fallback clarity check
- likely_constraints_if_accepted:
  - no reuse of Spotify branding or music-domain language
  - no promotion of inferred playback backend semantics
  - treat preview-mode findings as degraded-state donor truth, not authenticated-product truth

## Success definition
- study_is_successful_if: it yields portable patterns for shell continuity, search/discovery behavior, object detail layout, and gated-action presentation
- minimum_bridge_ready_output: accepted patterns for persistent shell, search-first discovery, and capability-gated player controls
- minimum_validator_ready_output: concrete checks proving users can search, open detail views, and understand when actions are unavailable

## Notes
- captured signed-in home, focused search, search results, and artist detail from the live session
- captured anonymous preview playlist detail after direct deep-link navigation opened outside the authenticated context
- attempted playback and device handoff were observed as surfaced controls with gating, but not as a fully active player session
