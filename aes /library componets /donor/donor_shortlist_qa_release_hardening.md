# Donor Shortlist — qa_release_hardening

## Target context

- target: `qa_release_hardening`
- donor mode: `logic` first, `hybrid` second
- scoring emphasis:
  explicit gates, release confidence, rollback awareness, defect visibility, validator friendliness

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.89 | strongest end-to-end deploy and preview confidence donor |
| `GitHub` | hybrid | 4.74 | strongest workflow-linked quality and status donor |
| `LaunchDarkly` | hybrid | 4.63 | strongest release-control donor |
| `GitLab` | hybrid | 4.51 | strong pipeline and release gate donor |
| `Sentry` | hybrid | 4.49 | strongest issue and release observability donor |
| `Datadog` | hybrid | 4.17 | strong production telemetry reserve donor |
| `PostHog` | hybrid | 4.11 | strong product analytics reserve donor |
| `Jira Service Management` | hybrid | 4.00 | enterprise workflow reserve donor |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Vercel` | hybrid | strongest donor for preview-driven release confidence and project-level readiness visibility | deployment confidence, environment gates, release-stage clarity | strong release and project shell patterns | deployment-platform bias | medium | docs + public UI review |
| 2 | `GitHub` | hybrid | strongest donor for workflow-linked quality checks and status surfaces | checks, reviews, merge gates, audit-friendly release states | strong status UI, timelines, checks views | engineering context bias | medium | public UI + docs review |
| 3 | `LaunchDarkly` | hybrid | strongest donor for runtime release control and safe rollout gating | feature gate logic, staged release control | clear launch controls and release views | feature-flag emphasis may overfit | medium | docs-first review |
| 4 | `Sentry` | hybrid | strongest issue and release observability donor | issue severity, release health, environment-linked visibility | issue triage and release-status surfaces | incident focus can outweigh build gates | medium | docs-first review |
| 5 | `GitLab` | hybrid | strong release-pipeline reserve donor | pipeline gate and deployment workflow logic | strong CI/CD views | broader DevOps complexity | medium | docs + public UI review |

## Recommendation layer

- strongest pre-release confidence donor:
  `Vercel`
- strongest workflow-gate donor:
  `GitHub`
- strongest runtime release-control donor:
  `LaunchDarkly`
- easiest first donor:
  `GitHub`

## Selection gate note

If the first study should maximize:
- deploy confidence and previews: start with `Vercel`
- controlled launch gates after build: start with `LaunchDarkly`
