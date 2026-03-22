# Donor Shortlist — shared_frontend_system

## Target context

- target: `shared_frontend_system`
- donor mode: `ui` first, `hybrid` second
- scoring emphasis:
  portability, composability, low noise, reusable view-state patterns, accessibility

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.74 | strongest hybrid reference for a coherent frontend system |
| `shadcn/ui` | ui | 4.60 | strongest portable component-system donor |
| `Tremor` | ui | 4.60 | strongest dashboard component donor |
| `Metabase` | hybrid | 4.51 | strong reporting-oriented UI pattern donor |
| `Linear` | hybrid | 4.46 | strong low-noise product-system donor |
| `Clerk` | hybrid | 4.43 | strong auth/setup UI-system donor |
| `Refine` | hybrid | 4.31 | strong admin-system donor |
| `Tailwind UI` | ui | 4.26 | polished application pattern donor |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `shadcn/ui` | ui | strongest portable component-system donor | minimal logic | reusable patterns, primitives, composition baseline | can feel generic if copied too literally | shallow | component/site review |
| 2 | `Tremor` | ui | strongest dashboard-system donor | minimal logic | metrics, cards, charts, KPI views, reporting states | reporting bias | shallow | component/site review |
| 3 | `Vercel` | hybrid | strongest coherent hybrid system donor | shell/context logic references | strong integrated page-system and status patterns | platform-specific styling tendencies | medium | public UI review |
| 4 | `Metabase` | hybrid | strong reusable reporting-system donor | lightweight report-flow references | dashboards, filters, tabs, empty states | heavier reporting bias | medium | public UI review |
| 5 | `Refine` | hybrid | strongest admin-system donor with implementation portability | moderate admin-flow logic | admin layouts, CRUD framing, system patterns | internal-tool feel can overfit | shallow-medium | template/site review |

## Recommendation layer

- strongest portable system donor:
  `shadcn/ui`
- strongest dashboard-system donor:
  `Tremor`
- strongest hybrid system donor:
  `Vercel`
- easiest first donor:
  `shadcn/ui`

## Selection gate note

If the first study should maximize:
- portable reusable components: start with `shadcn/ui`
- dashboard-heavy frontend reuse: start with `Tremor`
