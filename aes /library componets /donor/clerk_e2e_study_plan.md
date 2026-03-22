# Clerk End-to-End Study Plan

This file defines how to study Clerk as a full end-to-end donor instead of only a strong public auth and organizations donor.

Clerk already provides unusually strong public evidence for:
- auth-aware onboarding
- organization and membership context
- invitation handling
- role-aware access
- account and organization switching

That makes Clerk one of the rare donors where public docs already ground important onboarding logic.

But to treat Clerk as a true end-to-end donor, we still need structured evidence across:
- `ui truth`
- `logic truth`
- `runtime truth`
- `ops truth`

## Purpose

The goal is to turn Clerk from:
- a high-confidence public hybrid donor

into:
- a fully grounded donor for onboarding, identity context, organization membership, and auth-adjacent frontend or backend patterns

with evidence strong enough to guide bridge contracts for:
- `onboarding`
- `backend_platform`
- `shared_frontend_system`

## Current state

Already completed:
- public homepage capture
- public keyword extraction
- official docs review for organizations
- official docs review for invitations
- official docs review for custom invitation acceptance flow
- official docs review for organization creation and switching
- first-pass donor intake
- first-pass donor study packet

Current donor files:
- [clerk_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/clerk_donor_intake.md)
- [clerk_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/clerk_donor_study_packet.md)

Current strengths:
- explicit organization and membership semantics are publicly documented
- invitation acceptance is treated as a first-class flow
- active organization and switching semantics are publicly signaled
- account, auth, profile, and org surfaces are visibly separated but connected

Current limitations:
- authenticated dashboard capture is now available
- live post-sign-up runtime capture is now available
- live org-switching walkthrough is now available
- no live invitation acceptance walkthrough yet
- no settings, audit, or operator-facing admin capture yet

## End-to-end study objective

Produce a donor record for Clerk that is strong enough to contribute grounded truth to:
- auth-aware onboarding continuity
- organization-aware identity context
- invitation-to-membership transitions
- role-aware access framing
- secure account, profile, and switching UX

The study should not attempt to absorb all of Clerk.
It should isolate the reusable identity and onboarding subsystems that map cleanly into AES.

## Required truth layers

### 1. UI truth

Must prove:
- sign-in and sign-up surface structure
- account and profile layout
- organization switcher or list layout
- create or join organization layout
- invitation acceptance and post-acceptance state presentation

Typical output:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `NavigationPattern`
- `ViewState`

### 2. Logic truth

Must prove:
- authentication does not equal correct access context
- membership, invitation, and role state affect available actions
- invitation acceptance is its own transition
- active organization is explicit and safe to switch
- account and organization context remain visible through onboarding

Typical output:
- `Rule`
- `PermissionRule`
- `Transition`
- `VisibilityRule`
- `FailureMode`

### 3. Runtime truth

Must prove:
- what live auth and org flows actually do
- where redirects land after sign-in, sign-up, or invite acceptance
- how switching changes visible context
- what empty, pending, and post-acceptance states look like
- how protected routes behave without the right membership or session

Typical output:
- `RuntimeConstraint`
- `RecoveryPattern`
- `CapabilityBoundary`
- `InteractionPattern`

### 4. Ops truth

Must prove:
- how sessions and active-context changes affect continuity
- what admin or management surfaces explain membership state
- how invite issuance and acceptance are made observable
- how account or organization context can be verified by the user

Typical output:
- `ValidatorRequirement`
- `EvidenceRequirement`
- `AuditRule`
- `AccessRule`

## Evidence layers

### Layer A: Public product and docs

Status:
- already started

What it covers:
- auth framing
- user-management framing
- organization model
- membership and invitation semantics
- active-context and switching semantics

Why it matters:
- gives strong first-pass onboarding and identity logic truth
- sharply reduces hallucination risk before live runtime capture

What it cannot prove:
- exact current signed-in layouts
- invitation acceptance feel in a real session
- actual post-auth redirect behavior in a live product

### Layer B: Authenticated product or demo walkthrough

This is the first missing runtime layer.

Must capture:
- sign-in or sign-up landing
- post-auth home or account landing
- account or profile management
- organization list or switcher
- create organization or join organization flow
- member or role management surface if visible

Why it matters:
- validates whether the live product behaves like the strong public model

Evidence methods:
- Playwright-driven signed-in browser walkthrough
- snapshots
- screenshots for context and switching states
- state-difference notes after context changes

Status:
- partially complete

Already captured:
- post-sign-up app setup landing
- signed-in apps dashboard
- live organization switcher

### Layer C: Invitation and membership flow study

Must capture:
- invitation receipt or acceptance
- post-acceptance redirect
- resulting active organization or membership state
- role or membership visibility after acceptance
- failure or pending states if the invite is invalid or incomplete

Why it matters:
- this is the most important missing logic bridge for `onboarding`

Evidence methods:
- authenticated browser walkthrough
- invite-acceptance snapshots
- state-difference observation

### Layer D: Protected-route and session continuity study

Must capture:
- route behavior before auth
- route behavior after auth without org membership
- route behavior after org activation
- session continuity after switching account or organization
- visible recovery states when context is missing or stale

Why it matters:
- this is the key bridge from `onboarding` to `backend_platform`

Evidence methods:
- authenticated browser walkthrough
- controlled route-entry attempts
- snapshot comparison across auth and context states

### Layer E: Settings, security, and account-context study

Must capture:
- profile and security surfaces
- current account visibility
- current organization visibility
- switching affordances
- any session or device-management surface if exposed

Why it matters:
- this is where Clerk becomes stronger as a donor for identity-context trust, not just sign-in UX

Evidence methods:
- authenticated browser walkthrough
- settings capture
- context-change observation

## Minimum evidence needed before stronger promotion

Clerk can already contribute limited bridge-ready truth from public evidence.

But before we treat Clerk as a fully grounded end-to-end donor, the study must capture at least:
- one live post-auth account context
- one live organization list or switcher
- one live create/join/invite-related flow
- one example of resulting active-context visibility after a change

Without these, Clerk remains:
- a strong public donor

but not yet:
- a fully grounded runtime donor

Current runtime grounding now proves:
- post-auth landing continuity
- explicit signed-in workspace context
- explicit role-aware switching context

Still missing for fuller promotion:
- live invite acceptance
- deeper team or member-management flow

## Anti-hallucination rules

- Do not infer security or access policy details that are not explicitly shown or documented.
- Do not assume Clerk's hosted defaults match the desired app architecture.
- Do not treat provider component names as canonical product concepts.
- Do not treat docs-only invitation semantics as proven runtime UX until a live flow is captured.
- Do not promote high-stakes auth or access behavior without either runtime proof or a strong validator membrane.

## Expected donor outputs if completed

If the end-to-end study succeeds, Clerk should become one of the strongest donors for:
- auth-aware onboarding contracts
- invitation and membership transition design
- active-context visibility patterns
- account and organization switching UX
- identity-context validators

## Final rule

Clerk should teach:
- how to keep auth, account, org, invite, and membership context explicit

Clerk should not define:
- app-specific business permissions
- canonical domain terminology
- provider-specific implementation details
