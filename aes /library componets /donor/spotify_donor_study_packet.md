# Spotify Donor Study Packet

## Packet Metadata
- packet_id: spotify-hybrid-001
- donor_name: Spotify Web Player
- donor_class: hybrid
- feature_area: app_shell, shared_frontend_system, onboarding, notification_system
- packet_owner: Codex
- created_at: 2026-03-22
- updated_at: 2026-03-22
- packet_status: first_pass_complete

## 1. Intake Summary
- study_goal: extract reusable hybrid patterns for persistent shell design, search-led discovery, object-detail continuity, collection tables, and gated player behavior
- relevance_reason: Spotify exposes a polished, high-density shell where navigation, discovery, list/detail transitions, and action gating remain clear under real runtime pressure
- expected_reusable_value: omnibox search, multi-surface shell continuity, action-bar placement, object-card density, preview-mode fallback, empty-library prompting
- scope_boundary: signed-in home, focused search, search results, artist detail, attempted playback, device handoff attempt, and anonymous playlist preview detail
- out_of_scope: recommendation ranking, actual playback backend semantics, account settings, collaborative sharing flows
- expected_risk_level: medium

## 2. AES Mapping
- target_feature_area: `app_shell`, `shared_frontend_system`, `onboarding`, `notification_system`
- target_work_item_type: object-and-collection navigation model in first pass
- target_flow: home-to-search discovery, result-to-detail navigation, detail-to-action attempt, preview fallback
- target_ui_surface: sticky top bar, left library rail, now-playing footer, search results grid/list, artist header, collection track table
- target_operational_concepts: shell persistence, searchable discovery, object metadata adjacency, capability gating, degraded-state fallback
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `NavigationPattern`, `DesignConstraint`

## 3. Evidence Plan
- evidence_methods:
  - Playwright authenticated runtime capture
  - Playwright snapshot review
  - Playwright deep-link navigation for collection preview
- expected_evidence_artifacts:
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-home.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-home-focused.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-search-miles-davis.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-artist-miles-davis.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-artist-playing.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-device-picker.yml`
  - `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-playlist-miles-greatest-hits.yml`
- evidence_limitations:
  - playback did not enter a fully active player state in observed runtime
  - device-picker affordance was invoked but did not expose a distinct visible device-selection surface in the captured DOM
  - playlist detail was captured in preview mode after deep-link navigation left the authenticated session
- open_questions:
  - what exact runtime state is required for full web playback activation on this account
  - how queue and device transfer surfaces differ once a real track session is active

## 4. Donor Observations

### Observation 1
- observation_id: spotify-obs-001
- observation_type: runtime_home_shell
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-home.yml`
- finding_summary: Spotify keeps a three-part shell visible at rest: top discovery bar, left library rail, and bottom now-playing bar
- finding_detail: the signed-in home exposed `Home`, a central search combobox, a left `Your Library` rail with creation prompts, and a persistent now-playing bar with queue and device affordances even before playback activated
- confidence: high
- notes: strong donor value for persistent shell continuity and footer action persistence

### Observation 2
- observation_id: spotify-obs-002
- observation_type: runtime_empty_library
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-home.yml`
- finding_summary: Spotify handles an empty personal library with stacked prompt cards instead of a blank rail
- finding_detail: the library rail showed explicit prompts for `Create your first playlist`, `Browse podcasts`, and `Import your music from other apps`
- confidence: high
- notes: useful donor value for onboarding and quiet-state continuity

### Observation 3
- observation_id: spotify-obs-003
- observation_type: runtime_focused_search
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-home-focused.yml`
- finding_summary: the global search box can become the primary interaction mode without leaving the shell
- finding_detail: focusing the `What do you want to play?` combobox preserved the rest of the app shell while promoting search as the central active control
- confidence: high
- notes: strong donor value for omnibox-driven navigation

### Observation 4
- observation_id: spotify-obs-004
- observation_type: runtime_search_results
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-search-miles-davis.yml`
- finding_summary: Spotify search results combine object-type filters with a mixed first-pass result view
- finding_detail: the search results for `Miles Davis` exposed filter tabs for `All`, `Artists`, `Albums`, `Profiles`, `Songs`, `Playlists`, `Podcasts & Shows`, `Genres & Moods`, and `Audiobooks`, with a top-result card and a songs list on the same surface
- confidence: high
- notes: strong donor value for multi-type search and faceted result narrowing

### Observation 5
- observation_id: spotify-obs-005
- observation_type: runtime_artist_detail
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-artist-miles-davis.yml`
- finding_summary: artist detail keeps summary metadata, primary actions, and popular-item lists in one vertically coherent surface
- finding_detail: the Miles Davis page exposed monthly listeners, action buttons for `Play`, `Follow`, and `More options`, then a `Popular` grid with per-track play, like, duration, and more-options actions attached directly to each row
- confidence: high
- notes: strong donor value for hero-plus-list detail framing

### Observation 6
- observation_id: spotify-obs-006
- observation_type: runtime_action_gating
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-artist-playing.yml`
- finding_summary: the player surface can expose rich controls while clearly signaling that playback is not currently active
- finding_detail: after a play attempt, the now-playing bar still showed disabled previous, pause, next, repeat, progress, and full-screen controls while keeping queue, device, and volume affordances visible
- confidence: medium-high
- notes: strong donor value for capability-gated controls and partial-action visibility

### Observation 7
- observation_id: spotify-obs-007
- observation_type: runtime_device_handoff_attempt
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-device-picker.yml`
- finding_summary: Spotify surfaces device transfer as a first-class player action even before the transport is active
- finding_detail: the now-playing bar kept `Connect to a device` as an always-present footer action; invoking it changed button state to pressed even though a distinct device list was not exposed in the captured DOM
- confidence: medium
- notes: useful donor value for transfer/handoff affordance persistence

### Observation 8
- observation_id: spotify-obs-008
- observation_type: preview_mode_collection_detail
- evidence_type: browser_snapshot
- raw_evidence_ref: `/Users/sunday/Desktop/hopperpymcp/output/playwright/spotify-auth-playlist-miles-greatest-hits.yml`
- finding_summary: deep-link collection preview falls back to a public playlist detail that retains collection metadata and track-table structure while replacing authenticated actions with signup and login prompts
- finding_detail: the playlist surface exposed `Public Playlist`, title, curator, saves, song count, total duration, play/save/more actions, and a structured track table, while the top chrome shifted to `Sign up`, `Log in`, and `Preview of Spotify`
- confidence: high
- notes: strongest donor value for degraded-mode continuity and preview fallback

## 5. Normalized Logic Candidates

### Logic Candidate 1
- candidate_id: spotify-logic-001
- candidate_kind: VisibilityRule
- derived_from_observation_ids: spotify-obs-001, spotify-obs-003, spotify-obs-004
- canonical_statement: Search-first products should preserve the global shell while moving users from broad discovery into filtered results
- target_feature_area: app_shell, shared_frontend_system
- preconditions: a user begins searching from a global surface
- postconditions: navigation, search context, and results remain visible without a hard context reset
- failure_path: entering search breaks orientation or hides the broader app shell
- metric_implication: improves discovery speed and orientation retention
- confidence: high
- status: draft

### Logic Candidate 2
- candidate_id: spotify-logic-002
- candidate_kind: Rule
- derived_from_observation_ids: spotify-obs-005
- canonical_statement: Detail surfaces should keep object summary, primary actions, and top child items together so users can inspect and act without a context jump
- target_feature_area: app_shell, shared_frontend_system
- preconditions: a user opens a top-level object detail view
- postconditions: summary metadata and first-order actions remain adjacent to the object’s most relevant children
- failure_path: detail surfaces fragment actions away from object context
- metric_implication: improves action confidence and detail-view efficiency
- confidence: high
- status: draft

### Logic Candidate 3
- candidate_id: spotify-logic-003
- candidate_kind: FailureMode
- derived_from_observation_ids: spotify-obs-006, spotify-obs-007
- canonical_statement: Action-rich player or operator surfaces become confusing when unavailable controls disappear instead of remaining visible in a gated state
- target_feature_area: shared_frontend_system, onboarding
- preconditions: a user reaches a high-capability action area without full runtime eligibility
- postconditions: the user can still understand which actions exist and which ones are currently unavailable
- failure_path: hidden controls make the system seem smaller or inconsistent than it really is
- metric_implication: improves capability clarity and reduces confusion during gated states
- confidence: medium-high
- status: draft

### Logic Candidate 4
- candidate_id: spotify-logic-004
- candidate_kind: RecoveryModel
- derived_from_observation_ids: spotify-obs-002, spotify-obs-008
- canonical_statement: Empty or unauthenticated states should preserve structural continuity and teach the next action instead of collapsing the surface
- target_feature_area: onboarding, app_shell
- preconditions: a personal area is empty or a deep link is opened without authenticated context
- postconditions: the user still sees meaningful structure plus a clear next-step prompt
- failure_path: quiet or preview states turn into dead ends
- metric_implication: improves activation continuity and degraded-state usability
- confidence: high
- status: draft

## 6. Normalized UI Candidates

### UI Candidate 1
- candidate_id: spotify-ui-001
- candidate_kind: NavigationPattern
- derived_from_observation_ids: spotify-obs-001, spotify-obs-004
- canonical_statement: A media- or object-heavy shell can stay navigable by combining a sticky top search bar, a persistent side rail, and a persistent footer action area
- target_feature_area: app_shell, shared_frontend_system
- screen_name: persistent shell
- layout_notes: top bar for cross-app navigation and search, left rail for owned space, footer for transport or session actions
- interaction_notes: search should remain one keystroke away from any surface
- accessibility_notes: major shell regions should remain landmarked and predictable
- responsive_notes: shell should degrade without losing search or primary-owned-space access
- confidence: high
- status: draft

### UI Candidate 2
- candidate_id: spotify-ui-002
- candidate_kind: ViewState
- derived_from_observation_ids: spotify-obs-002
- canonical_statement: Empty personal-space states should use stacked educational prompt cards with direct actions
- target_feature_area: onboarding, app_shell
- screen_name: empty library rail
- layout_notes: short headline, short support copy, one direct CTA per card
- interaction_notes: empty states should invite different first actions, not just one path
- accessibility_notes: prompts should read as clear headings plus actions
- responsive_notes: cards should stack cleanly in narrow rails
- confidence: high
- status: draft

### UI Candidate 3
- candidate_id: spotify-ui-003
- candidate_kind: LayoutPattern
- derived_from_observation_ids: spotify-obs-005, spotify-obs-008
- canonical_statement: Detail surfaces can use a hero header plus structured child-item table or grid to preserve both overview and scanability
- target_feature_area: shared_frontend_system, app_shell
- screen_name: object detail and collection detail
- layout_notes: hero metadata and actions first, then child-item rows with local actions and secondary metadata
- interaction_notes: row-level actions should remain adjacent to titles and durations
- accessibility_notes: child lists should expose row semantics and headers clearly
- responsive_notes: metadata columns may collapse, but row identity and primary actions must remain visible
- confidence: high
- status: draft

### UI Candidate 4
- candidate_id: spotify-ui-004
- candidate_kind: ViewState
- derived_from_observation_ids: spotify-obs-006, spotify-obs-008
- canonical_statement: Preview or gated modes should keep the same overall surface structure while replacing unavailable actions with clear account or capability prompts
- target_feature_area: onboarding, shared_frontend_system
- screen_name: preview mode and gated player
- layout_notes: preserve shell and object structure while swapping high-trust calls to action into auth or upgrade prompts
- interaction_notes: disabled actions should stay visible enough to teach capability shape
- accessibility_notes: unavailable state should be explicit in labels or state, not only color
- responsive_notes: fallback prompts should remain visible without hiding core object context
- confidence: high
- status: draft

## 7. Bridge-Ready Outputs
- accepted_for_bridge_after_review:
  - persistent shell with omnibox search
  - stacked empty-state cards for quiet personal spaces
  - hero-plus-table detail composition
  - visible gated controls rather than disappearing controls
  - preview-mode fallback that preserves structure
- not_ready_for_bridge:
  - actual playback state semantics
  - queue semantics
  - hidden device-transfer internals

## 8. Validator Requirements
- validator_id: spotify-validator-001
  validator_kind: shell_continuity_check
  requirement_statement: global navigation, search, and owned-space entry must remain accessible across home, results, and detail surfaces
  pass_condition: a user can move from home to search to detail without losing the main shell
  blocking_level: blocking

- validator_id: spotify-validator-002
  validator_kind: empty_state_continuity_check
  requirement_statement: empty personal areas must show meaningful next-step prompts rather than blank containers
  pass_condition: empty states expose at least one explicit recovery or creation action
  blocking_level: blocking

- validator_id: spotify-validator-003
  validator_kind: gated_action_visibility_check
  requirement_statement: unavailable player or session actions must remain visible enough for users to understand capability shape
  pass_condition: gated actions are either disabled in place or replaced with explicit fallback messaging
  blocking_level: advisory

- validator_id: spotify-validator-004
  validator_kind: detail_scanability_check
  requirement_statement: detail surfaces must keep primary actions and top child items in one coherent view
  pass_condition: a user can identify the main object and act on a top child item without context switching
  blocking_level: blocking

## 9. Execution Notes
- playback mutation attempt was made on the artist page, but the captured runtime remained in a gated state
- device transfer affordance was invoked, but no distinct device list became visible in the captured DOM
- direct playlist navigation opened in preview mode, which is still useful donor evidence for degraded-state continuity

## 10. Recommended Derived Assets
- `UISystemPattern`: persistent top/side/footer shell
- `RecoveryModel`: preview-mode fallback continuity
- `ViewState`: quiet personal-space onboarding cards
- `InteractionPattern`: faceted global search results
- `ValidatorTemplate`: gated-action visibility
