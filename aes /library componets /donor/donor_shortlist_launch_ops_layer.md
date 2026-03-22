# Donor Shortlist — launch_ops_layer

## Target context

- target: `launch_ops_layer`
- donor mode: `logic` first, `hybrid` second
- scoring emphasis:
  rollout safety, progressive exposure, telemetry feedback, incident-aware launch operations

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.89 | strongest hybrid donor for deployment-linked launch operations |
| `LaunchDarkly` | hybrid | 4.63 | strongest pure launch-control donor |
| `GitHub` | hybrid | 4.60 | strong workflow-linked launch donor |
| `Sentry` | hybrid | 4.49 | strong launch health and issue response donor |
| `PostHog` | hybrid | 4.26 | strong telemetry and experiment feedback donor |
| `Grafana` | hybrid | 4.23 | strong operational visibility donor |
| `Slack` | hybrid | 4.20 | strong cross-team communication reserve donor |
| `Datadog` | hybrid | 4.17 | strong production telemetry reserve donor |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Vercel` | hybrid | strongest hybrid donor for deployment-to-launch continuity | deploy-linked launch flow, project visibility | strong deployment and project status surfaces | deployment-platform bias | medium | docs + public UI review |
| 2 | `LaunchDarkly` | hybrid | strongest pure launch-ops donor | progressive rollout, flag gates, controlled exposure | launch-control console patterns | feature-flag worldview may dominate | medium | docs-first review |
| 3 | `Sentry` | hybrid | strongest donor for issue-aware launch response | issue-linked launch health, release error response | clean issue triage and release views | incident-heavy lens | medium | docs-first review |
| 4 | `PostHog` | hybrid | strongest telemetry-feedback donor | experiment and telemetry-driven launch decisions | practical analytics and growth surfaces | product analytics emphasis may overfit | medium | docs + public UI review |
| 5 | `GitHub` | hybrid | strong release-workflow reserve donor | workflow-linked launch readiness | strong checks and release visibility | engineering terminology bleed | medium | public UI review |

## Recommendation layer

- strongest launch-control donor:
  `LaunchDarkly`
- strongest deployment-linked donor:
  `Vercel`
- strongest telemetry-feedback donor:
  `PostHog`
- easiest first donor:
  `LaunchDarkly`

## Selection gate note

If the first study should maximize:
- rollout control: start with `LaunchDarkly`
- deployment-linked launch operations: start with `Vercel`
