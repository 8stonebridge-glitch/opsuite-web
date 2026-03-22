# Donor Target Registry

This file is the canonical donor-target registry for the full AES donor-selection universe.

It defines the 9 official targets that donor selection must cover before any donor app is chosen for study.

This registry is selection-layer only.
It does not start donor intake, donor packets, Hopper analysis, or reverse engineering.

## Official target universe

1. `approval_workflow`
2. `reporting`
3. `onboarding`
4. `notification_system`
5. `app_shell`
6. `shared_frontend_system`
7. `backend_platform`
8. `qa_release_hardening`
9. `launch_ops_layer`

## Common discovery boundaries

These boundaries apply to every target in the first pass:
- include strong B2B SaaS products
- include workflow-heavy web apps
- include high-quality desktop/web hybrids
- include strong dashboard and admin UIs
- include reputable UI kits and admin templates for UI-first targets
- include relevant installed apps already available locally
- stay in selection mode only
- do not start Hopper or binary inspection yet
- do not create donor packets yet

## Summary table

| Target | Primary donor mode | Secondary donor mode | Default risk | Selection priority |
|---|---|---|---|---|
| `approval_workflow` | logic | hybrid | high | state authority, approval gates, audit discipline |
| `reporting` | hybrid | ui | medium | dashboard clarity, freshness, drill-down usability |
| `onboarding` | hybrid | ui | medium | activation flow, resume logic, guided progression |
| `notification_system` | logic | hybrid | high | inbox behavior, causality, read-state and preference discipline |
| `app_shell` | ui | hybrid | medium | navigation, density, information hierarchy, shell clarity |
| `shared_frontend_system` | ui | hybrid | low | reusable patterns, consistency, dashboard building blocks |
| `backend_platform` | logic | hybrid | high | platform reliability, auth/data/deploy boundaries, operator clarity |
| `qa_release_hardening` | logic | hybrid | high | release gates, observability, rollback and defect containment |
| `launch_ops_layer` | logic | hybrid | high | controlled rollout, telemetry, flags, incident-aware launch discipline |

## Target definitions

### `approval_workflow`

- donor objective:
  find donor apps that demonstrate governed review, approval, rejection, delegation, escalation, and audit-aware state transitions
- preferred donor classes:
  `logic` first, `hybrid` second
- likely reusable logic types:
  `State`, `Transition`, `Rule`, `PermissionRule`, `FailureMode`, `Evaluation`, `ValidatorRequirement`, `Audit-related patterns`
- likely reusable UI types:
  queue layout, request detail hierarchy, action gating, approval chain visibility, escalation affordances
- recommended discovery boundaries:
  favor spend, service, engineering review, and enterprise request-approval products
- default risk profile:
  high
- selection priorities:
  approval authority, self-approval prevention, rejection discipline, auditability, queue clarity, validator friendliness

### `reporting`

- donor objective:
  find donors that show strong dashboards, freshness communication, drill-down flow, empty-state recovery, and operational metric presentation
- preferred donor classes:
  `hybrid` first, `ui` second
- likely reusable logic types:
  `Metric`, `Evaluation`, freshness rules, reporting aggregation surfaces, visibility discipline
- likely reusable UI types:
  dashboard layout, tabs, filters, comparison views, empty/loading/error states, chart/table composition
- recommended discovery boundaries:
  favor dashboard-heavy products, ops analytics surfaces, observability products, and reporting UI kits
- default risk profile:
  medium
- selection priorities:
  clarity under dense data, freshness communication, filter usability, portable dashboard patterns

### `onboarding`

- donor objective:
  find donors that show activation-oriented step flow, role-aware branching, save-and-resume behavior, and clear first-run guidance
- preferred donor classes:
  `hybrid` first, `ui` second
- likely reusable logic types:
  step state, progression rules, resume rules, milestone validation, invitation or auth handoff patterns
- likely reusable UI types:
  wizard shell, progress indicators, helper states, checklist presentation, form pacing, success states
- recommended discovery boundaries:
  favor products with strong first-run experiences, team onboarding, or guided setup rather than toy tutorials
- default risk profile:
  medium
- selection priorities:
  activation quality, resume clarity, enterprise-safe auth handoff, role branching, low-friction guided flow

### `notification_system`

- donor objective:
  find donors that show disciplined inbox behavior, read/unread state, preference controls, routing clarity, and causal notification grouping
- preferred donor classes:
  `logic` first, `hybrid` second
- likely reusable logic types:
  `NotificationTrigger`, `Rule`, `VisibilityRule`, `FailureMode`, `Evaluation`, read-state rules, preference gates
- likely reusable UI types:
  inbox layout, badge behavior, grouping, bulk actions, preference panel, empty state, notification detail affordances
- recommended discovery boundaries:
  favor products with real work inboxes rather than purely social notifications
- default risk profile:
  high
- selection priorities:
  causality, routing determinism, noise control, preference discipline, inbox triage clarity

### `app_shell`

- donor objective:
  find donors that demonstrate strong navigation shells, dense but readable information layouts, and durable dashboard scaffolding
- preferred donor classes:
  `ui` first, `hybrid` second
- likely reusable logic types:
  minimal; mostly shell-level state, navigation visibility, and contextual affordances
- likely reusable UI types:
  sidebar patterns, header patterns, notification entry points, page framing, panel rhythm, cross-screen consistency
- recommended discovery boundaries:
  favor mature SaaS dashboards and strong admin/product shells
- default risk profile:
  medium
- selection priorities:
  clarity, density control, navigation confidence, multi-surface consistency, responsiveness

### `shared_frontend_system`

- donor objective:
  find reusable UI systems, kits, and app patterns that can support multiple AES surfaces without importing another product's identity
- preferred donor classes:
  `ui` first, `hybrid` second
- likely reusable logic types:
  minimal; emphasis is on presentation patterns that support multiple flows
- likely reusable UI types:
  `UIPattern`, `LayoutPattern`, `InteractionPattern`, `ViewState`, `DesignConstraint`, component families
- recommended discovery boundaries:
  favor component systems, admin kits, dashboard libraries, and mature SaaS UI patterns
- default risk profile:
  low
- selection priorities:
  portability, low noise, composability, accessibility, repeatable pattern value

### `backend_platform`

- donor objective:
  find donors that demonstrate clear platform surfaces for auth, data, deploy, developer workflow, and operator confidence
- preferred donor classes:
  `logic` first, `hybrid` second
- likely reusable logic types:
  access boundaries, platform state visibility, deployment and environment surfaces, operator actions, validator-friendly workflows
- likely reusable UI types:
  project settings, env management, auth and org setup, integration panels, deploy status framing
- recommended discovery boundaries:
  favor modern developer platforms and infrastructure products with strong operator UX
- default risk profile:
  high
- selection priorities:
  platform clarity, auth/data/deploy boundaries, observability, portability, operator trust

### `qa_release_hardening`

- donor objective:
  find donors that show real release gates, deployment confidence signals, rollback awareness, issue visibility, and quality enforcement
- preferred donor classes:
  `logic` first, `hybrid` second
- likely reusable logic types:
  quality gates, release-state checks, environment awareness, rollback rules, defect visibility, validator discipline
- likely reusable UI types:
  release dashboards, test-status framing, issue severity surfacing, rollout blockers, readiness summaries
- recommended discovery boundaries:
  favor CI/CD, release control, alerting, and production-quality surfaces
- default risk profile:
  high
- selection priorities:
  explicit gates, rollback confidence, production visibility, release-stage accountability

### `launch_ops_layer`

- donor objective:
  find donors that show controlled rollout, telemetry-driven launch decisions, feature gating, incident-aware release behavior, and post-launch feedback loops
- preferred donor classes:
  `logic` first, `hybrid` second
- likely reusable logic types:
  rollout rules, feature gate behavior, experiment/telemetry triggers, issue response paths, incident-linked launch decisions
- likely reusable UI types:
  flag consoles, rollout views, alert-to-action flow, live status surfaces, launch checklists
- recommended discovery boundaries:
  favor feature-flag, telemetry, incident, and launch-control products
- default risk profile:
  high
- selection priorities:
  safe rollout, progressive exposure, feedback loops, incident awareness, governance fit

## Final rule

This registry defines the official donor universe for the first pass.

No donor selection work should expand beyond these 9 targets until the current selection gate has been completed and reviewed.
