# Donor Target Stack Map

This file maps the 9 AES targets to the donor mix needed for grounded end-to-end app building.

The purpose is not just to shortlist apps.
It is to show what kinds of truth each target needs before a bridge contract should be trusted:
- `ui truth`
- `logic truth`
- `runtime truth`
- `ops truth`

## Donor stack rules

- `UI donors` teach shell structure, view states, information hierarchy, pacing, loading, and degraded-state presentation.
- `Logic donors` teach state transitions, permission rules, workflow discipline, notification behavior, and failure handling.
- `Runtime donors` teach executable recovery behavior, packaging boundaries, deep-link/open flows, and actual shipped fallback surfaces.
- `Ops donors` teach observability, release controls, auditability, rollout gates, and validator discipline.

No single donor should usually define all four truths for a target.

The preferred shape is:
- one strong primary donor for the target's main truth
- one support donor for the secondary truth
- one runtime or ops donor to keep the target executable and governable

## Summary matrix

| Target | Must-have truth | Preferred donor stack | Typical first donor mix |
|---|---|---|---|
| `approval_workflow` | logic truth | logic + hybrid + ops | `Ramp` + `GitHub` + `Jira Service Management` |
| `reporting` | hybrid truth | hybrid + ui + ops | `Metabase` + `Tremor` + `Datadog` |
| `onboarding` | hybrid truth | hybrid + ui + runtime | `Clerk` + `Linear` + `Canva` |
| `notification_system` | logic truth | logic + hybrid + ops | `GitHub` + `Linear` + `Slack` |
| `app_shell` | ui truth | ui + hybrid + runtime | `shadcn/ui` + `Linear` + `Canva` |
| `shared_frontend_system` | ui truth | ui + hybrid + ops | `shadcn/ui` + `Refine` + `Vercel` |
| `backend_platform` | logic truth | logic + hybrid + ops | `Convex` + `Vercel` + `Sentry` |
| `qa_release_hardening` | ops truth | logic + hybrid + ops | `LaunchDarkly` + `GitHub` + `Sentry` |
| `launch_ops_layer` | ops truth | logic + hybrid + ops | `LaunchDarkly` + `PostHog` + `Datadog` |

## Target maps

### `approval_workflow`

- primary truth needed:
  `logic truth`
- why:
  approvals fail when state authority, permissions, escalation, or audit rules are fuzzy
- donor stack:
  - `logic donor`: `Ramp` or `Brex`
    teaches approval authority, sign-off discipline, policy-aware gating
  - `hybrid donor`: `GitHub`
    teaches review flow visibility, action gating, queue/detail balance
  - `ops donor`: `Jira Service Management` or `ServiceNow`
    teaches auditability, assignment discipline, queue governance
- what UI donors can help with:
  request detail layout, chain visibility, action clarity
- what should never come from UI donors:
  approval authority, rejection rules, escalation truth
- key gap to watch:
  avoiding donor overfitting to finance-specific approval semantics

### `reporting`

- primary truth needed:
  `hybrid truth`
- why:
  reporting needs both metric logic and clear information presentation
- donor stack:
  - `hybrid donor`: `Metabase`
    teaches dashboard framing, filter flow, chart/table composition
  - `ui donor`: `Tremor`
    teaches portable reporting components and dense dashboard building blocks
  - `ops donor`: `Datadog` or `Grafana`
    teaches freshness clarity, operational signal surfacing, drill-down posture
- what runtime donors help with:
  loading, query recovery, stale-data communication
- what should never come from pure UI donors:
  metric definitions, freshness rules, aggregation truth
- key gap to watch:
  confusing beautiful dashboards with correct operational measurement

### `onboarding`

- primary truth needed:
  `hybrid truth`
- why:
  onboarding is both flow logic and UI pacing
- donor stack:
  - `hybrid donor`: `Clerk`
    teaches auth handoff, organization-aware setup, identity-safe progression
  - `ui donor`: `Linear`
    teaches focused pacing, guidance clarity, low-noise first-run experience
  - `runtime donor`: `Canva`
    teaches shell entry continuity, preload behavior, recovery-state presentation
- support donor:
  `Slack`
  teaches workspace activation and team-oriented first-run context
- what should never come from Canva:
  onboarding milestone truth, identity rules, backend setup logic
- key gap to watch:
  separating onboarding feel from onboarding completion criteria

### `notification_system`

- primary truth needed:
  `logic truth`
- why:
  notification systems fail through noisy causality, bad routing, or weak preference discipline
- donor stack:
  - `logic donor`: `GitHub`
    teaches event causality, subscription discipline, notification-to-object linkage
  - `hybrid donor`: `Linear`
    teaches inbox calmness, triage clarity, low-noise notification presentation
  - `ops donor`: `Slack`
    teaches read-state pressure, team communication urgency, multi-surface notification expectations
- support donor:
  `Outlook`
  useful only as a reserve inbox-pattern donor
- what should never come from UI donors:
  trigger truth, routing rules, read-state semantics
- key gap to watch:
  copying inbox visuals without grounding notification causality

### `app_shell`

- primary truth needed:
  `ui truth`
- why:
  the shell must make the whole app legible before any feature logic can be trusted by users
- donor stack:
  - `ui donor`: `shadcn/ui`
    teaches portable shell primitives and reusable accessibility-friendly structure
  - `hybrid donor`: `Linear` or `Vercel`
    teaches polished app-shell framing and page rhythm
  - `runtime donor`: `Canva`
    teaches creation-first shell hierarchy, preload structure, explicit recovery states
- support donor:
  `GitHub`
  teaches dense shell navigation and status surfacing
- what should never come from Canva:
  brand identity, product copy, workflow truth
- key gap to watch:
  building a polished shell that lacks grounded navigation semantics

### `shared_frontend_system`

- primary truth needed:
  `ui truth`
- why:
  this layer must be reusable across many flows without importing another product's identity
- donor stack:
  - `ui donor`: `shadcn/ui`
    teaches portable primitives and composable foundations
  - `hybrid donor`: `Refine`
    teaches admin-style pattern reuse and screen composition
  - `ops donor`: `Vercel`
    teaches consistency across product surfaces and settings shells
- support donors:
  `Tailwind UI`, `Tremor`
  useful for reserves, not canonical system truth
- what should never come from UI-system donors:
  business rules, validation truth, workflow truth
- key gap to watch:
  accidentally turning the frontend system into a style kit without state discipline

### `backend_platform`

- primary truth needed:
  `logic truth`
- why:
  backend platforms need real boundaries around auth, data, deploys, and operator actions
- donor stack:
  - `logic donor`: `Convex`
    teaches backend-core surface clarity and operator trust
  - `hybrid donor`: `Vercel`
    teaches environment/deploy/project framing with good operator UX
  - `ops donor`: `Sentry`
    teaches issue visibility, operational feedback, and production confidence signals
- support donor:
  `Clerk`
  teaches auth/org setup boundaries
- what should never come from UI donors:
  data truth, deploy truth, access boundaries
- key gap to watch:
  mistaking developer-facing polish for safe platform control

### `qa_release_hardening`

- primary truth needed:
  `ops truth`
- why:
  this layer exists to prevent fake completion and unsafe release confidence
- donor stack:
  - `logic donor`: `LaunchDarkly`
    teaches release-stage control and gated exposure
  - `hybrid donor`: `GitHub`
    teaches checks, review visibility, and status discipline
  - `ops donor`: `Sentry`
    teaches defect visibility, severity framing, and incident-linked release awareness
- support donor:
  `Jira Service Management`
  teaches operational handoff and accountability
- what should never come from pure UI donors:
  release gates, production readiness truth, rollback criteria
- key gap to watch:
  presenting readiness without independently validated evidence

### `launch_ops_layer`

- primary truth needed:
  `ops truth`
- why:
  launch is where rollout, telemetry, incidents, and governance all converge
- donor stack:
  - `logic donor`: `LaunchDarkly`
    teaches rollout controls, flags, progressive exposure
  - `hybrid donor`: `PostHog`
    teaches telemetry feedback and product-observation loops
  - `ops donor`: `Datadog` or `Sentry`
    teaches live operational awareness and alert-linked action
- support donor:
  `GitHub`
  teaches workflow accountability around release changes
- what should never come from UI donors:
  rollout logic, incident thresholds, launch authority
- key gap to watch:
  over-prioritizing dashboards while under-defining launch decisions

## Donor-type contribution rules

### When a target is `ui truth` first

- required minimum:
  one strong UI donor and one support hybrid donor
- still needed:
  one runtime or ops donor so shell quality does not drift away from executable behavior
- examples:
  `app_shell`, `shared_frontend_system`

### When a target is `logic truth` first

- required minimum:
  one strong logic donor and one support hybrid or ops donor
- UI donors are optional:
  only for visibility, framing, or legibility
- examples:
  `approval_workflow`, `notification_system`, `backend_platform`

### When a target is `ops truth` first

- required minimum:
  one strong ops donor and one strong logic donor
- hybrid donors help:
  connect controls to product-facing surfaces
- examples:
  `qa_release_hardening`, `launch_ops_layer`

### When a target is `hybrid truth` first

- required minimum:
  one hybrid donor and one support UI or logic donor depending on where ambiguity remains
- examples:
  `reporting`, `onboarding`

## Final rule

This map exists to stop donor studies from being too shallow or too one-sided.

The builder should not receive a bridge contract for a target just because one donor looked good.

A target is better grounded when:
- UI truth has a donor
- logic truth has a donor
- runtime or ops truth has a donor
- each donor is constrained to the kind of truth it can actually prove
