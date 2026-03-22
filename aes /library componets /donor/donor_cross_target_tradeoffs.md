# Donor Cross-Target Tradeoffs

This file is the recommendation layer that sits on top of the target registry, candidate registry, per-target shortlists, and the master landscape.

Its job is to make the selection gate easier by stating the most important tradeoffs directly.

## Broadest-coverage tradeoffs

### `Vercel` vs `GitHub`

- `Vercel`
  - best when you want one donor that covers shell, platform, reporting, release, and launch operations
  - strongest hybrid platform donor
  - risk: platform-cloud assumptions can spread too far if not constrained

- `GitHub`
  - best when you want one donor that covers governed workflow, notifications, release gating, and validator-friendly state
  - strongest workflow/governance donor
  - risk: engineering language and review metaphors may overfit non-engineering flows

## Approval tradeoffs

### `Ramp` / `Brex` vs `GitHub`

- `Ramp` and `Brex`
  - best for direct approval policy, sign-off, requester/reviewer separation, and business approval structure
  - stronger domain fit for approval behavior
  - weaker cross-target reuse than `GitHub`

- `GitHub`
  - best for reusable review-state logic, comments, checks, and validator pathways
  - stronger cross-target reuse
  - weaker direct fit for finance-style approvals

## Reporting tradeoffs

### `Metabase` vs `Vercel` vs `Grafana`

- `Metabase`
  - best for portable dashboard patterns and the easiest first reporting donor
  - strongest portability

- `Vercel`
  - best for polished hybrid reporting tied to a strong shell and project context
  - strongest product-level reporting donor

- `Grafana`
  - best for dense operational dashboards and observability-style reporting
  - strongest ops-heavy reporting donor

## Onboarding tradeoffs

### `Clerk` vs `Linear` vs `Slack`

- `Clerk`
  - best for auth handoff, org-aware onboarding, and safe setup boundaries
  - strongest enterprise-safe onboarding donor

- `Linear`
  - best for onboarding feel, guided pacing, and polished minimal UX
  - easiest first onboarding donor

- `Slack`
  - best for team activation, workspace setup, and collaborative onboarding signals
  - strongest team-onboarding donor

## Notification tradeoffs

### `GitHub` vs `Linear` vs `Slack`

- `GitHub`
  - best for actionable inbox triage and governed notification handling
  - strongest logic donor

- `Linear`
  - best for polished work-inbox design and low-noise triage
  - strongest design donor

- `Slack`
  - best for delivery expectations, urgency cues, and routing behavior
  - strongest routing/urgency donor

## Shared UI tradeoffs

### `shadcn/ui` vs `Tremor` vs `Vercel`

- `shadcn/ui`
  - best for portable component primitives and low-risk first study
  - strongest reusable system donor

- `Tremor`
  - best for dashboard-heavy shared frontend reuse
  - strongest reporting UI-kit donor

- `Vercel`
  - best for hybrid system polish and integrated product-shell behavior
  - strongest hybrid system donor

## Backend platform tradeoffs

### `Convex` vs `Clerk` vs `Vercel`

- `Convex`
  - best for backend-core logic and platform authority
  - strongest backend logic donor

- `Clerk`
  - best for auth, organizations, user setup, and account boundaries
  - strongest auth-platform donor

- `Vercel`
  - best for deploy, environments, and operator-facing platform experience
  - strongest hybrid backend-platform donor

## Release and launch tradeoffs

### `LaunchDarkly` vs `Vercel` vs `Sentry`

- `LaunchDarkly`
  - best for controlled rollout and progressive exposure
  - strongest pure launch-ops donor

- `Vercel`
  - best for deployment-linked release and launch continuity
  - strongest hybrid release donor

- `Sentry`
  - best for issue-aware launch operations and release health response
  - strongest issue-response donor

## Most useful donor combinations

If you want combinations instead of one donor:

- approval + notifications:
  `GitHub` + `Ramp`

- reporting + shared frontend:
  `Metabase` + `Tremor`

- onboarding + backend platform:
  `Clerk` + `Linear`

- shell + shared frontend:
  `Vercel` + `shadcn/ui`

- release hardening + launch ops:
  `Vercel` + `LaunchDarkly` + `Sentry`

## Recommended decision patterns

Use these if you want a simple decision heuristic:

- if you want the strongest single donor:
  choose `Vercel`

- if you want the strongest workflow donor:
  choose `GitHub`

- if you want the easiest first donor:
  choose `shadcn/ui`, `Metabase`, or `Clerk` depending target

- if you want the cleanest UI donor:
  choose `shadcn/ui` or `Tremor`

- if you want the strongest launch-control donor:
  choose `LaunchDarkly`

## Final rule

This file highlights tradeoffs.
It does not make the donor choice automatically.

Human input still decides the first donor order.
