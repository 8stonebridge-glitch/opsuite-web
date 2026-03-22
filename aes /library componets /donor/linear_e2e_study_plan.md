# Linear End-to-End Study Plan

This file defines how to study Linear as a full end-to-end donor rather than only a public-surface donor.

The goal is to move from:
- public shell evidence

to:
- `ui truth`
- `logic truth`
- `runtime truth`
- `ops truth`

without collapsing speculation into canonical donor output.

## Purpose

Linear is one of the strongest hybrid donors in the AES donor system.

A full end-to-end study matters because Linear appears to combine:
- low-noise shell design
- strong issue and project framing
- inbox and triage behavior
- review and agent-assisted workflow surfaces

But those strengths only become donor-grade end-to-end truth if we capture them through structured evidence layers.

## Current state

Already completed:
- public homepage capture
- public product screenshot capture
- public copy and workflow-term extraction
- first-pass donor intake
- first-pass donor study packet

Current donor files:
- [linear_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/linear_donor_intake.md)
- [linear_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/linear_donor_study_packet.md)

Current limitations:
- no authenticated workspace evidence yet
- no notification-preferences evidence yet
- no real onboarding flow capture yet
- no desktop/runtime packaging evidence yet

## End-to-end study objective

Produce a donor record for Linear that is strong enough to contribute grounded truth to:
- `onboarding`
- `app_shell`
- `notification_system`

and potentially selected parts of:
- `approval_workflow`
- `reporting`

The end-to-end study should not assume that every part of Linear is equally valuable.
It should isolate the specific subsystems that provide reusable truth.

## Required truth layers

### 1. UI truth

Must prove:
- shell hierarchy
- work-mode navigation
- issue detail structure
- inbox presentation
- onboarding pacing and guidance
- review surface layout

Typical output:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `NavigationPattern`
- `ViewState`

### 2. Logic truth

Must prove:
- visible work-item state model
- review or triage transitions
- assignment and ownership signals
- object-linked notification behavior
- project/initiative linkage rules

Typical output:
- `State`
- `Transition`
- `VisibilityRule`
- `NotificationTrigger`
- `Rule`
- `FailureMode`

### 3. Runtime truth

Must prove:
- what actually happens in the logged-in product
- creation and edit flows
- navigation continuity
- degraded-state handling
- search and command/shortcut behavior if relevant

Typical output:
- `RuntimeConstraint`
- `RecoveryPattern`
- `CapabilityBoundary`
- `InteractionPattern`

### 4. Ops truth

Must prove:
- notification preference surfaces
- review/inbox discipline
- agent or automation participation boundaries
- activity-feed evidence and accountability patterns

Typical output:
- `ValidatorRequirement`
- `AuditRule`
- `EvidenceRequirement`
- `NotificationRule`

## Evidence layers

### Layer A: Public product surface

Status:
- already started

What it covers:
- homepage positioning
- screenshot-level shell structure
- visible issue-detail framing
- public AI/agent positioning

Why it matters:
- gives safe first-pass UI and shell truth
- helps define which authenticated flows matter most

What it cannot prove:
- hidden settings
- preferences
- real onboarding branching
- exact mutation flows

### Layer B: Authenticated workspace walkthrough

This is the most important next layer.

Must capture:
- sign up or login landing flow
- first workspace landing
- inbox view
- my issues view
- issue creation
- issue detail editing
- review flow if visible
- project flow
- initiative flow
- command/search behavior if central to navigation

Evidence methods:
- Playwright-driven browser walkthrough
- structured snapshots
- screenshots for key states
- field-by-field notes only after observation

Must not infer:
- backend state transitions not visible in the UI
- permission rules not explicitly surfaced

### Layer C: Notification and preference surfaces

Must capture:
- inbox behavior
- read/unread behavior
- notification grouping
- preference settings
- delivery or routing surfaces if exposed

Why it matters:
- this is the missing layer for `notification_system`

Evidence methods:
- authenticated browser walkthrough
- settings capture
- state-difference observation

### Layer D: Onboarding and workspace setup

Must capture:
- sign-up and/or login transition
- organization/workspace creation or joining
- first-use prompts
- empty states
- guided setup if present
- resume or skip behavior if visible

Why it matters:
- this is the missing layer for `onboarding`

Evidence methods:
- authenticated browser walkthrough
- step-by-step snapshots
- screenshot capture of transitions and checkpoints

### Layer E: Docs/help/release-note layer

Must capture:
- official terminology
- workflow definitions
- reviews, projects, initiatives, triage language
- notification/help documentation if public
- agent feature explanations if public

Why it matters:
- separates observed surface behavior from officially described product behavior

Evidence methods:
- official docs/help-center reading
- release note review for recent feature boundaries

### Layer F: Desktop/runtime packaging layer

Optional, but valuable if the desktop app is available.

Must capture:
- desktop packaging model
- open/deep-link behavior
- desktop-specific shell behavior
- any offline/recovery or updater surfaces

Evidence methods:
- local app inspection
- Hopper or bundle inspection later if needed

Why it matters:
- upgrades Linear from a web donor to a more complete runtime donor

## Core flows to capture

### Flow 1: First landing

Questions to answer:
- what is the first meaningful surface after login?
- what does the user see immediately?
- is orientation clear without explanation?
- what primary actions are offered?

Targets helped:
- `onboarding`
- `app_shell`

### Flow 2: Inbox to work-item detail

Questions to answer:
- how does the user move from inbox to a concrete item?
- is the object context preserved?
- what metadata remains visible?

Targets helped:
- `notification_system`
- `app_shell`

### Flow 3: Work-item creation

Questions to answer:
- what fields are required?
- how lightweight is creation?
- what parent context is attached?
- what defaults are visible?

Targets helped:
- `onboarding`
- `app_shell`

### Flow 4: Work-item progression

Questions to answer:
- what states are visible?
- how is ownership shown?
- how do labels, cycles, projects, and initiatives connect?
- are changes logged in the activity surface?

Targets helped:
- `notification_system`
- `approval_workflow`

### Flow 5: Reviews and collaboration

Questions to answer:
- how are reviews represented?
- how do comments and activity coexist with state?
- how are human and agent actors shown?

Targets helped:
- `notification_system`
- `approval_workflow`

### Flow 6: Settings and notification preferences

Questions to answer:
- where do preferences live?
- how fine-grained are notification controls?
- how are noisy vs important notifications separated?

Targets helped:
- `notification_system`
- `launch_ops_layer`

### Flow 7: Empty, error, or degraded states

Questions to answer:
- how does Linear handle empty inboxes or no-project states?
- what happens when data is loading?
- what support or recovery cues exist?

Targets helped:
- `onboarding`
- `app_shell`

## Expected donor outputs by target

### `onboarding`

Likely outputs:
- shell-first orientation pattern
- calm first-run pacing
- issue or work-entry guidance
- resume-friendly workflow framing

Still needs support from:
- `Clerk`
- `Canva`

### `app_shell`

Likely outputs:
- grouped work-mode navigation
- low-noise side-nav rhythm
- object-centered detail layout
- search/new-item action prominence

Still needs support from:
- `shadcn/ui`
- `Canva`

### `notification_system`

Likely outputs:
- object-linked inbox behavior
- contextual activity presentation
- triage and read-state posture
- notification grouping direction

Still needs support from:
- `GitHub`
- `Slack`

## Study boundaries and anti-hallucination rules

- Do not infer hidden backend rules from visible UI alone.
- Do not infer permission truth unless the product explicitly exposes it.
- Do not infer agent runtime semantics from marketing copy alone.
- Do not promote issue-specific language into AES truth without mapping it onto `WorkItem`.
- Do not treat one screenshot as complete evidence for notification behavior.
- Do not claim end-to-end completion until authenticated flows are captured.

## Completion criteria

Linear reaches end-to-end donor quality only when all of these are true:

- authenticated workspace flows are captured
- inbox and notification settings are observed
- issue creation and issue progression are observed
- onboarding or first-run flow is observed
- at least one official doc/help layer is reviewed
- donor outputs are reviewed and constrained before promotion

## Recommended execution order

1. Capture authenticated workspace landing
2. Capture inbox and issue-detail flow
3. Capture issue creation and progression
4. Capture project and initiative linkage
5. Capture notification preferences
6. Capture onboarding or workspace setup path
7. Read official docs/help for terminology and boundaries
8. Decide whether desktop/runtime study is worth adding
9. Update donor packet with promoted findings

## Immediate next move

The next concrete step is:
- authenticated Playwright study of Linear

That is the layer required to move from:
- strong public donor

to:
- credible end-to-end donor

## Final rule

Linear should be treated as an end-to-end donor only after the authenticated product layer has been captured.

Until then, it remains:
- a strong public hybrid donor
- not yet a full end-to-end donor
