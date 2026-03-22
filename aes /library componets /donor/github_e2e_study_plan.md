# GitHub End-to-End Study Plan

This file defines how to study GitHub as a full end-to-end donor instead of only a strong public donor.

GitHub already provides unusually rich public evidence for:
- issue semantics
- notification semantics
- workflow linkage
- automation and security framing

That makes GitHub one of the rare donors where public evidence is already strong enough to promote some logic truth.

But to treat GitHub as a true end-to-end donor, we still need structured evidence across:
- `ui truth`
- `logic truth`
- `runtime truth`
- `ops truth`

## Purpose

The goal is to turn GitHub from:
- a high-confidence public hybrid donor

into:
- a fully grounded donor for notification, review, gate, and workflow systems

with evidence strong enough to guide bridge contracts for:
- `notification_system`
- `approval_workflow`
- `qa_release_hardening`
- `launch_ops_layer`

## Current state

Already completed:
- public homepage capture
- public keyword extraction
- official docs review for issues
- official docs review for notifications
- first-pass donor intake
- first-pass donor study packet

Current donor files:
- [github_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/github_donor_intake.md)
- [github_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/github_donor_study_packet.md)

Current strengths:
- issue hierarchy and dependency logic are publicly documented
- issue-to-review and issue-to-project linkage are publicly documented
- notification reasons, triage states, watch rules, and delivery modes are publicly documented

Current limitations:
- no signed-in inbox capture yet
- no signed-in pull-request review capture yet
- no signed-in checks/status surface capture yet
- no authenticated settings or repository-watch capture yet

## End-to-end study objective

Produce a donor record for GitHub that is strong enough to contribute grounded truth to:
- notification causality and triage
- review-linked approval or gating
- release and quality visibility
- linked work-object systems

The study should not attempt to absorb all of GitHub.
It should focus on the operational subsystems that map cleanly into AES.

## Required truth layers

### 1. UI truth

Must prove:
- dense but usable shell structure
- signed-in inbox layout
- issue detail and pull-request review framing
- checks or status surface layout
- saved/done/unsubscribe triage affordances

Typical output:
- `UIPattern`
- `NavigationPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`

### 2. Logic truth

Must prove:
- issue hierarchy and dependency visibility
- participation and watch rules
- object-linked notification semantics
- issue-to-review and issue-to-project linkage
- status and check gate concepts

Typical output:
- `Rule`
- `NotificationTrigger`
- `VisibilityRule`
- `FailureMode`
- `Evaluation`

### 3. Runtime truth

Must prove:
- what the signed-in UI actually does
- whether docs-backed triage states appear cleanly in the real inbox
- how issue and pull-request relationships are surfaced in the current product
- how checks and review state appear at the moment of action

Typical output:
- `RuntimeConstraint`
- `RecoveryPattern`
- `CapabilityBoundary`
- `InteractionPattern`

### 4. Ops truth

Must prove:
- notification delivery and preference granularity
- check visibility and gate signals
- release or merge blocking surfaces
- audit-like timelines and activity reasoning

Typical output:
- `ValidatorRequirement`
- `EvidenceRequirement`
- `AuditRule`
- `ReleaseRule`

## Evidence layers

### Layer A: Public product and docs

Status:
- already started

What it covers:
- top-level lifecycle framing
- issue semantics
- notification semantics
- project integration
- workflow and security product direction

Why it matters:
- provides strong first-pass logic truth
- reduces hallucination risk before any signed-in capture

What it cannot prove:
- exact current inbox UI layout
- real signed-in review surfaces
- exact checks/status interactions

### Layer B: Authenticated inbox and notification study

This is the first missing runtime layer.

Must capture:
- notifications inbox
- any visible `saved`, `done`, or `unread` handling
- notification reasons if exposed in the UI
- filters, grouping, or inbox segmentation
- repository watch or participation surfaces if accessible

Why it matters:
- validates whether the real UI matches the strong public docs model

Evidence methods:
- Playwright-driven signed-in browser walkthrough
- snapshots
- screenshots of triage states
- state-difference observation after inbox actions

### Layer C: Issue and project workflow study

Must capture:
- issue detail surface
- sub-issue or dependency visibility if available
- labels, milestones, project fields
- issue-to-project linkage
- issue activity or timeline

Why it matters:
- validates object-linked workflow and hierarchy truth

Evidence methods:
- signed-in repository or sample-project walkthrough
- snapshots of issue detail states
- linked-object observation

### Layer D: Pull-request review and approval/gate study

Must capture:
- pull-request detail surface
- review request and review state
- merge conditions
- linked issue references
- visible checks or status requirements

Why it matters:
- this is the critical bridge from `approval_workflow` to `qa_release_hardening`

Evidence methods:
- signed-in review walkthrough
- snapshots of review and status states
- comparison of open/reviewed/merge-blocked states where possible

### Layer E: Checks, Actions, and release-quality study

Must capture:
- checks UI
- workflow run or status surface
- pass/fail summary
- merge blocking or readiness signals
- security or alert visibility where accessible

Why it matters:
- this is where GitHub becomes a stronger donor for release and launch governance

Evidence methods:
- signed-in repo workflow view
- public docs for Actions/checks/security if needed
- snapshots of gate states

### Layer F: Settings and preference study

Must capture:
- notification settings
- watch settings if accessible
- email/on-GitHub delivery choices
- custom or repository-specific notification configuration

Why it matters:
- docs already prove the model, but settings capture proves practical UI and granularity

Evidence methods:
- signed-in settings walkthrough
- screenshots and snapshots

## Core flows to capture

### Flow 1: Notifications inbox triage

Questions to answer:
- how does a notification appear?
- is the reason visible?
- can it be saved, completed, unsubscribed, or filtered?
- how much context is available without leaving the inbox?

Targets helped:
- `notification_system`

### Flow 2: Issue detail and hierarchy

Questions to answer:
- how are issue metadata, dependencies, and related objects shown?
- what context is visible in one place?
- are timeline and assignment signals explicit?

Targets helped:
- `approval_workflow`
- `notification_system`

### Flow 3: Pull-request review and gate visibility

Questions to answer:
- how are review requests and approvals shown?
- how are linked issues surfaced?
- how are merge blockers or required checks expressed?

Targets helped:
- `approval_workflow`
- `qa_release_hardening`

### Flow 4: Checks and status

Questions to answer:
- what does a status or check surface look like?
- how is failure summarized?
- is gate state obvious before action?

Targets helped:
- `qa_release_hardening`
- `launch_ops_layer`

### Flow 5: Notification settings and watch rules

Questions to answer:
- how granular are settings?
- how are watching, participating, and custom scopes configured?
- does the UI make routing logic understandable?

Targets helped:
- `notification_system`
- `launch_ops_layer`

## Expected donor outputs by target

### `notification_system`

Likely outputs:
- reason-aware notifications
- richer triage states than unread-only
- subscription and participation routing model
- repository/object-linked notification context

Still needs support from:
- `Linear`
- `Slack`

### `approval_workflow`

Likely outputs:
- review-linked work progression
- visible approval or merge gate patterns
- timeline and traceability concepts
- linked-object context from issue to review

Still needs support from:
- `Ramp`
- `Brex`

### `qa_release_hardening`

Likely outputs:
- required checks visibility
- blocked/ready state patterns
- audit-like status history
- action gating before merge or release

Still needs support from:
- `LaunchDarkly`
- `Sentry`

### `launch_ops_layer`

Likely outputs:
- gate visibility and workflow automation framing
- status-linked operational awareness

Still needs support from:
- `LaunchDarkly`
- `PostHog`
- `Datadog`

## Study boundaries and anti-hallucination rules

- Do not infer current signed-in UI from docs alone.
- Do not infer merge policy specifics unless they are visible in the studied repository or settings.
- Do not promote repository terminology directly into AES truth; map to `WorkItem` and review/gate concepts.
- Do not treat Actions or security marketing as proof of real gate UI until the real surfaces are captured.
- Do not claim end-to-end GitHub donor completion without signed-in inbox and review evidence.

## Completion criteria

GitHub reaches end-to-end donor quality only when all of these are true:

- signed-in inbox is captured
- notification triage actions are observed
- issue detail and linked-object workflow are captured
- pull-request review or merge gate surface is captured
- checks/status surface is captured
- notification/settings granularity is observed
- donor outputs are reviewed and constrained before promotion

## Recommended execution order

1. Capture signed-in notifications inbox
2. Capture one issue detail with metadata and related context
3. Capture one pull-request review surface
4. Capture checks or status surface
5. Capture notification settings and watch/preferences surface
6. Read any additional official docs needed for unresolved semantics
7. Update donor packet with promoted findings

## Immediate next move

The next concrete step is:
- authenticated GitHub inbox and review capture

This is what upgrades GitHub from:
- excellent public logic donor

to:
- fully grounded end-to-end donor

## Final rule

GitHub is already one of the strongest public donors in the system.

But it should only be treated as a true end-to-end donor after authenticated workflow and gate surfaces are captured alongside the public docs model.
