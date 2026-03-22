# Donor Candidate Registry

This is the base candidate registry for the full 9-target donor-selection program.

These are first-pass donor candidates, not approved donors.

The registry provides one shared base profile per candidate so target-specific scoring can change by:
- feature relevance
- target weighting mode

and not by inventing new facts per target.

## Scoring columns

- `L` = reusable logic depth
- `UI` = reusable UI value
- `E` = evidence accessibility
- `P` = portability
- `G` = governance fit
- `Clean` = low-noise / low-wrapper score
- `Scope` = ability to study narrowly
- `Val` = validator friendliness

All scores are `1-5`.

## Target abbreviations

- `AW` = `approval_workflow`
- `REP` = `reporting`
- `ONB` = `onboarding`
- `NOTIF` = `notification_system`
- `SHELL` = `app_shell`
- `FRONT` = `shared_frontend_system`
- `BACK` = `backend_platform`
- `QA` = `qa_release_hardening`
- `LAUNCH` = `launch_ops_layer`

## Base candidate table

| Candidate | Class | Platform / source | L | UI | E | P | G | Clean | Scope | Val | Likely targets | Local | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| `Jira Service Management` | hybrid | web SaaS | 5 | 3 | 3 | 4 | 5 | 3 | 3 | 5 | AW, QA | no | strong governed workflow donor |
| `ServiceNow` | hybrid | web SaaS | 5 | 3 | 3 | 3 | 5 | 2 | 2 | 4 | AW, QA | no | high-governance, high-complexity donor |
| `Brex` | hybrid | web SaaS | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 5 | AW | no | strong spend-approval donor |
| `Ramp` | hybrid | web SaaS | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 5 | AW | no | strong approval + policy donor |
| `GitHub` | hybrid | web + local familiarity | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | AW, NOTIF, SHELL, BACK, QA, LAUNCH | no | active high-governance donor study for notifications, review-linked workflow, and gate visibility |
| `GitLab` | hybrid | web SaaS | 5 | 4 | 4 | 5 | 5 | 3 | 4 | 5 | AW, BACK, QA | no | release and approval discipline donor |
| `Linear` | hybrid | web SaaS | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | REP, ONB, NOTIF, SHELL, FRONT | no | active hybrid donor study for shell clarity, inbox-to-object linkage, and low-noise workflow presentation |
| `Asana` | hybrid | web SaaS | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | AW, ONB, NOTIF, SHELL | no | balanced workflow donor |
| `Slack` | hybrid | web / desktop | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | ONB, NOTIF, LAUNCH | no | strong inbox + activation donor |
| `Notion` | hybrid | web / local brand familiarity | 3 | 5 | 4 | 4 | 3 | 3 | 3 | 3 | ONB, NOTIF, SHELL | no | high UI value, lower governance fit |
| `Vercel` | hybrid | web SaaS | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | REP, SHELL, FRONT, BACK, QA, LAUNCH | no | strongest platform-shell hybrid donor |
| `LaunchDarkly` | hybrid | web SaaS | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | QA, LAUNCH | no | strongest launch-control donor |
| `PostHog` | hybrid | web SaaS | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | REP, NOTIF, QA, LAUNCH | no | analytics + launch feedback donor |
| `Sentry` | hybrid | web SaaS | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | BACK, QA, LAUNCH | no | issue + release + alert donor |
| `Datadog` | hybrid | web SaaS | 4 | 4 | 4 | 4 | 5 | 3 | 3 | 5 | REP, BACK, QA, LAUNCH | no | strong ops reporting donor |
| `Metabase` | hybrid | web SaaS | 3 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | REP, FRONT | no | strongest first-pass reporting UI donor |
| `Grafana` | hybrid | web SaaS | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 4 | REP, LAUNCH | no | observability dashboard donor |
| `Convex` | logic | web platform | 5 | 3 | 5 | 4 | 5 | 5 | 4 | 5 | BACK | no | highest-fit backend platform logic donor |
| `Supabase` | hybrid | web platform | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | BACK | no | broad backend platform donor |
| `Clerk` | hybrid | web platform | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | ONB, FRONT, BACK | no | active donor study for onboarding, org context, invitation handling, and role-aware membership setup |
| `shadcn/ui` | ui | UI kit | 2 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | SHELL, FRONT | no | most portable UI-system donor |
| `Tailwind UI` | ui | UI kit | 2 | 5 | 4 | 5 | 3 | 5 | 5 | 3 | SHELL, FRONT | no | polished UI donor, lower governance value |
| `Tremor` | ui | UI kit | 2 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | REP, FRONT | no | strongest dashboard UI-kit donor |
| `Refine` | hybrid | admin toolkit | 3 | 4 | 5 | 5 | 4 | 4 | 4 | 4 | FRONT | no | admin-system donor with implementation portability |
| `Outlook` | hybrid | local desktop app | 3 | 4 | 5 | 3 | 4 | 3 | 4 | 3 | NOTIF | yes | local inbox donor reserve |
| `Canva` | ui | local desktop app | 2 | 5 | 4 | 4 | 3 | 4 | 4 | 2 | ONB, SHELL | yes | active UI donor study for shell clarity, onboarding feel, and explicit recovery-state presentation |

## Filtered local reserves

These were considered but are intentionally not in the scored registry:

| Candidate | Status | Reason |
|---|---|---|
| `Notion Web Clipper.app` | filtered | wrapper-heavy local app; weak first-pass logic donor despite interesting permission flow |
| `Spark Desktop.app` | reserve only | useful inbox UI reserve, but Outlook is the stronger first-pass email/inbox reference |
| `Google Docs/Sheets/Slides` | filtered | too document-centric for the current 9-target donor universe |
| `Microsoft Word/Excel/PowerPoint` | filtered | document-authoring focus does not map cleanly to current donor priorities |

## Cross-target anchors

These candidates are expected to appear repeatedly across shortlists:
- `GitHub`
- `Linear`
- `Vercel`
- `Clerk`
- `LaunchDarkly`
- `Metabase`
- `shadcn/ui`

That repetition is intentional.
It reflects strong cross-target donor value, not shortlist duplication by accident.

## Final rule

This registry is the base fact layer for donor scoring.

Per-target shortlists may change:
- feature relevance
- target weighting mode
- shortlist rank

They may not invent a new base profile for the same candidate.
