# Donor Master Landscape

This file is the combined donor landscape across the full 9-target AES universe.

It complements the per-target shortlist files by showing:
- which donors recur across many targets
- which donors are strongest by donor class
- which donors are easiest to study first
- which donors carry the most noise or portability risk

This is still a selection artifact.
It is not permission to start donor study.

## Highest-coverage donors

These donors appear across the most target shortlists or filtered pools:

| Donor | Class | Cross-target role |
|---|---|---|
| `Vercel` | hybrid | strongest hybrid donor across reporting, shell, frontend system, backend platform, release hardening, launch ops |
| `GitHub` | hybrid | strongest governance-friendly donor across approvals, notifications, shell, backend platform, release, launch |
| `Linear` | hybrid | strongest low-noise hybrid donor across reporting, onboarding, notifications, shell, shared frontend |
| `Clerk` | hybrid | strongest auth/setup donor across onboarding, frontend system, backend platform |
| `LaunchDarkly` | hybrid | strongest release and launch-control donor across QA/release and launch ops |
| `Metabase` | hybrid | strongest portable reporting donor across reporting and frontend system |
| `shadcn/ui` | ui | strongest portable UI-system donor across shell and shared frontend |

## Strongest donors by class

### Logic-heavy donors

| Donor | Why it matters |
|---|---|
| `Convex` | strongest backend-core logic donor |
| `LaunchDarkly` | strongest rollout-control logic donor |
| `GitHub` | strongest validator-friendly workflow donor |
| `Ramp` | strongest direct approval-policy donor |
| `Brex` | strongest finance-style sign-off donor |

### UI-heavy donors

| Donor | Why it matters |
|---|---|
| `shadcn/ui` | strongest portable UI-system donor |
| `Tremor` | strongest dashboard UI donor |
| `Tailwind UI` | strongest polished application UI reserve donor |
| `Canva` | strongest local UI-polish reserve donor |

### Hybrid donors

| Donor | Why it matters |
|---|---|
| `Vercel` | strongest platform-shell-reporting-release hybrid donor |
| `GitHub` | strongest workflow-notification-release hybrid donor |
| `Linear` | strongest low-noise shell-reporting-inbox hybrid donor |
| `Clerk` | strongest auth-onboarding-backend hybrid donor |
| `Metabase` | strongest reporting/frontend hybrid donor |

## Easiest first donors

These are the best first donors if the goal is to prove the donor system quickly with low ambiguity:

| Donor | Why it is easy first |
|---|---|
| `shadcn/ui` | pure UI donor, very portable, low ambiguity, high scope control |
| `Metabase` | strong reporting donor with clear UI and reusable patterns |
| `GitHub` | high evidence accessibility, strong validator path, broad cross-target value |
| `Linear` | polished hybrid donor with low-noise surfaces and clear scope boundaries |
| `Clerk` | focused auth/onboarding platform donor with clear docs and boundaries |

## Highest portability donors

These donors are least tied to one narrow product identity:

- `GitHub`
- `Vercel`
- `shadcn/ui`
- `Metabase`
- `Tremor`
- `Clerk`

## Highest governance-fit donors

These donors best match AES values around gating, state visibility, and validator-friendly behavior:

- `GitHub`
- `LaunchDarkly`
- `Vercel`
- `Clerk`
- `Convex`
- `Jira Service Management`

## Highest noise-risk donors

These donors are still useful, but they require stronger filtering discipline:

| Donor | Why noise risk is higher |
|---|---|
| `ServiceNow` | enterprise surface area is broad and hard to isolate cleanly |
| `Notion` | high UI value, but lower governance fit and more brand/style noise |
| `Canva` | high polish value, lower validator value |
| `Outlook` | inbox value is real, but email assumptions can overfit |
| `Notion Web Clipper.app` | wrapper-heavy architecture makes it weak as a first-pass logic donor |

## Best donor by selection intent

| If the goal is... | Start from... |
|---|---|
| strongest single cross-target hybrid donor | `Vercel` |
| strongest workflow/governance donor | `GitHub` |
| strongest approval-specific donor | `Ramp` |
| strongest reporting-first donor | `Metabase` |
| strongest onboarding/auth donor | `Clerk` |
| strongest notification inbox donor | `GitHub` or `Linear` |
| strongest shared UI system donor | `shadcn/ui` |
| strongest launch-control donor | `LaunchDarkly` |

## Final rule

The master landscape exists to show coverage and tradeoffs.

The per-target shortlist files still control actual donor choice for a specific target.
