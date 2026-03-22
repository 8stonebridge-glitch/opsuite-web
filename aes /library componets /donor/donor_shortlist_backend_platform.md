# Donor Shortlist — backend_platform

## Target context

- target: `backend_platform`
- donor mode: `logic` first, `hybrid` second
- scoring emphasis:
  platform clarity, operator trust, auth/data/deploy boundaries, validator friendliness

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.89 | strongest overall platform donor with deploy/project/operator clarity |
| `Clerk` | hybrid | 4.71 | strongest auth and org-boundary donor |
| `Convex` | logic | 4.69 | strongest backend-core logic donor |
| `GitHub` | hybrid | 4.60 | strong platform workflow and integration donor |
| `GitLab` | hybrid | 4.37 | strong end-to-end platform and pipeline donor |
| `Supabase` | hybrid | 4.26 | strong data/auth/backend donor |
| `Sentry` | hybrid | 4.20 | strong platform observability donor |
| `Datadog` | hybrid | 3.89 | ops observability reserve donor |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Vercel` | hybrid | strongest platform donor for deploy/project/operator surfaces | deploy and environment authority, operator flows | highly usable platform shell and settings patterns | frontend-cloud bias | medium | docs + public UI review |
| 2 | `Clerk` | hybrid | strongest auth-and-organization donor | auth handoff, org/user boundaries, setup safety | strong auth/setup surfaces | auth-centric scope | medium | docs + product review |
| 3 | `Convex` | logic | strongest backend-core logic donor for data + function platform clarity | backend state, data, deploy, environment logic | lighter UI value | lower UI richness than hybrid donors | medium | docs-first review |
| 4 | `GitHub` | hybrid | strong developer platform donor with strong workflow visibility | integration, project, and review-linked platform operations | strong settings and system shell patterns | engineering terminology bleed | medium | public UI review |
| 5 | `Supabase` | hybrid | strong backend platform reserve donor | data/auth/backend product patterns | practical project and settings UI | broader but less focused than top donors | medium | docs + product review |

## Recommendation layer

- strongest backend-core logic donor:
  `Convex`
- strongest auth/platform donor:
  `Clerk`
- strongest hybrid platform donor:
  `Vercel`
- easiest first donor:
  `Clerk`

## Selection gate note

If the first study should maximize:
- backend-core clarity: start with `Convex`
- operator-facing platform UX: start with `Vercel`
- auth/setup platform discipline: start with `Clerk`
