# Donor Shortlist — reporting

## Target context

- target: `reporting`
- donor mode: `hybrid` first, `ui` second
- scoring emphasis:
  feature relevance, UI value, dashboard clarity, filter usability, portability

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.76 | strongest hybrid dashboard donor with clear platform metrics and project views |
| `Metabase` | hybrid | 4.53 | strongest first-pass reporting UI donor with highly portable dashboard patterns |
| `Linear` | hybrid | 4.42 | strong compact reporting and project insight donor |
| `Grafana` | hybrid | 4.34 | strong operational dashboard donor with dense but usable data surfaces |
| `Tremor` | ui | 4.26 | strongest dashboard-focused UI-kit donor |
| `Datadog` | hybrid | 4.16 | strong ops reporting donor with alert and metric context |
| `PostHog` | hybrid | 4.11 | strong analytics and product telemetry donor |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Vercel` | hybrid | strongest overall reporting donor across clarity, freshness, and platform metrics | freshness framing, deployment/ops summary logic | shell-integrated reporting patterns | platform-specific metric vocabulary | medium | public UI + docs review |
| 2 | `Metabase` | hybrid | strongest portable reporting donor for dashboards, tabs, and filterable states | lightweight reporting logic, drill-down paths | highly reusable chart/table/filter patterns | lighter governance than ops-heavy tools | medium | public UI + docs review |
| 3 | `Linear` | hybrid | strong compact reporting donor for information density and project insights | simple trend and activity logic | clean, low-noise reporting surfaces | lower raw dashboard breadth | shallow-medium | public UI review |
| 4 | `Grafana` | hybrid | strong donor for dense operations reporting and observability views | operational metric grouping, alert context | multi-panel dashboard composition | ops-heavy visual density | medium | docs + UI review |
| 5 | `Tremor` | ui | best pure UI donor for reusable report surfaces | minimal logic; mostly UI reuse | dashboard blocks, charts, KPIs, empty states | no native operational truth | shallow | component/site review |

## Recommendation layer

- strongest hybrid reporting donor:
  `Vercel`
- strongest portable reporting donor:
  `Metabase`
- strongest pure UI dashboard donor:
  `Tremor`
- easiest first donor:
  `Metabase`

## Selection gate note

If the first study should maximize:
- operational dashboard sophistication: start with `Vercel` or `Grafana`
- portable reporting patterns: start with `Metabase`
