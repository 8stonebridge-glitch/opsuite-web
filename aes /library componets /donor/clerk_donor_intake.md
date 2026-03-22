# Clerk Donor Intake

## Basic identity
- donor_name: Clerk
- donor_class: hybrid
- platform: web platform, auth and user-management product
- version: public website and docs surfaces as observed on 2026-03-21
- source_location: `https://clerk.com`, `https://clerk.com/docs`
- analyst: Codex
- intake_date: 2026-03-21

## AES mapping
- target_feature_area: onboarding, backend_platform, shared_frontend_system
- target_work_item_type: identity, membership, organization, invitation, and session-adjacent workflow in first pass
- target_flow: sign-in, sign-up, organization creation and switching, invitation and membership flow, account and profile management
- target_ui_surface: homepage auth components, organization management components, docs-backed organization and membership model
- target_operational_concepts: authentication, session management, role-based access, organization membership, invitations, account switching
- target_ui_concepts: `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `DesignConstraint`, `NavigationPattern`

## Study goal
- study_goal: extract reusable hybrid patterns for auth-aware onboarding, organization and membership flow, and secure account or workspace setup
- relevance_reason: Clerk is one of the strongest auth and B2B onboarding donors because it combines visible auth UI, organization-management surfaces, and explicit docs around sessions, invitations, roles, and multi-tenant behavior
- expected_reusable_value: onboarding/auth handoff, membership and invitation logic, organization-aware setup, account switching, secure settings framing
- out_of_scope: Clerk-specific SDK internals, hosted auth implementation internals, billing logic beyond visible surface references

## Scope boundary
- exact_surface_in_scope: public homepage, public docs landing, public organizations overview, visible auth and organization components, documented session and role concepts
- exact_surface_out_of_scope: private dashboard internals, tenant-specific customer configuration, Clerk infrastructure internals
- depth_limit: first pass is public surface and docs only; deeper dashboard capture may follow later if needed

## Donor quality assessment
- why_this_donor_is_strong: explicit auth and user-management focus, visible sign-in/sign-up and organization components, strong B2B and multi-tenant positioning, clear role and invitation language
- likely_noise_or_wrapper_risk: product-marketing surfaces can over-polish developer experience and under-show messy edge cases
- portability_risk: low-medium; auth and organization concepts are highly portable, but Clerk-specific component names and platform framing must be abstracted
- confidence_before_study: high

## Evidence plan
- evidence_methods:
  - Playwright snapshot of public homepage
  - public docs review
  - public organizations overview review
  - keyword extraction from docs page
- expected_evidence_artifacts:
  - auth and user-management product framing
  - visible sign-in, sign-up, user profile, user button, and organization UI components
  - public docs language around organizations, members, roles, invitations, sessions, and multi-tenant B2B patterns
- expected_limitations:
  - no signed-in dashboard or live auth flow captured yet
  - some setup and invitation edge cases remain unproven without authenticated product use

## Candidate outputs expected
- logic_candidates_expected:
  - invitation and membership rules
  - session and account-selection patterns
  - role-aware organization access patterns
  - secure sign-in/sign-up progression
- ui_candidates_expected:
  - auth entry surfaces
  - account and organization switchers
  - profile and security settings framing
  - create/join organization presentation
- likely_states:
  - sign in
  - sign up
  - user profile
  - account switcher
  - organization switcher
  - create organization
  - join organization
  - role/member settings
- likely_transitions:
  - sign up -> profile/session
  - sign in -> account or organization context
  - create organization -> membership context
  - invitation -> membership acceptance
  - account switch -> workspace/org switch
- likely_rules:
  - role and membership govern access context
  - sessions and account choice affect onboarding continuity
  - invitations and organization selection should be explicit, not implied
- likely_failure_modes:
  - ambiguous account/org context
  - invite without visible membership outcome
  - role assignment or access ambiguity
  - auth success without clear next-step orientation
- likely_ui_patterns:
  - modular auth surfaces
  - account and organization switchers
  - profile/security settings separation
  - organization creation and join flows
- likely_view_states:
  - unauthenticated entry
  - authenticated account context
  - organization context
  - invitation or membership context

## Review plan
- review_scope: hybrid
- expected_risk_level: medium-high
- likely_required_reviewers: domain reviewer, design reviewer, governance reviewer
- likely_required_validators:
  - onboarding continuity check
  - account-context clarity check
  - role and membership visibility check
  - terminology abstraction check
- likely_constraints_if_accepted:
  - do not copy Clerk component naming directly into product truth
  - do not infer undocumented auth policies from marketing alone
  - map auth and org patterns onto app-specific onboarding and membership concepts

## Success definition
- study_is_successful_if: it yields portable auth and organization patterns that strengthen onboarding, membership creation, session continuity, and role-aware setup
- minimum_bridge_ready_output: accepted hybrid candidates for onboarding and auth-aware context switching
- minimum_validator_ready_output: concrete checks proving users know which account, organization, or membership context they are in

## Notes
- Playwright snapshot of `https://clerk.com/` captured:
  - headline `More than authentication, Complete User Management`
  - visible auth components including sign up, sign in, user button, user profile, and waitlist
  - visible organization surfaces including create organization, organization switcher, organization profile, and organization list
- public site imagery also shows:
  - account switching
  - manage account
  - sign out
  - profile, security, billing, and API keys surfaces
- public organizations docs strongly emphasize:
  - organizations
  - members
  - roles
  - invitations
  - sessions
  - access
  - B2B and multi-tenant use cases
- first pass is already strong for onboarding and org-context truth, even without authenticated dashboard capture
- authenticated runtime capture now confirms:
  - post-sign-up lands in a concrete app-creation flow rather than a vague generic account page
  - signed-in shell makes personal workspace, plan tier, switch organization, invite, team, settings, and user menu explicit
  - organization switching exposes active workspace, role, manage action, and create workspace inside one controlled surface
