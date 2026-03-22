# Donor Shortlist — app_shell

## Target context

- target: `app_shell`
- donor mode: `ui` first, `hybrid` second
- scoring emphasis:
  shell clarity, navigation confidence, information density, reusable framing patterns

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Vercel` | hybrid | 4.89 | strongest hybrid platform shell donor |
| `GitHub` | hybrid | 4.66 | strong multi-surface shell donor with dense but usable navigation |
| `Linear` | hybrid | 4.60 | strongest polished low-noise shell donor |
| `shadcn/ui` | ui | 4.46 | strongest portable UI-system donor for shell primitives |
| `Tailwind UI` | ui | 4.11 | strong application-shell UI donor |
| `Asana` | hybrid | 4.00 | balanced shell donor with approachable navigation |
| `Notion` | hybrid | 3.66 | strong shell feel donor with high UI value |
| `Canva` | ui | 3.54 | active local UI donor for creation-first shell hierarchy and recovery-state clarity |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Vercel` | hybrid | strongest shell donor for project framing, shell clarity, and platform density | light shell-state logic and context surfaces | best integrated shell + header + page frame donor | platform flavor may bleed into product shell | medium | public UI + docs review |
| 2 | `GitHub` | hybrid | strongest dense shell donor with many surfaces and consistent affordances | navigation visibility and action-entry expectations | shell density, tabs, side-nav, status placement | engineering context may overfit | medium | public UI review |
| 3 | `Linear` | hybrid | strongest polished low-noise shell donor | minimal shell logic | best low-noise nav rhythm and page framing | may be too minimal for ops-heavy density | medium | public UI review |
| 4 | `shadcn/ui` | ui | strongest portable shell primitive donor | minimal logic | reusable shell primitives and accessible component baseline | no native product behavior | shallow | component/site review |
| 5 | `Tailwind UI` | ui | strong polished shell reserve donor | minimal logic | polished application-shell patterns | lower governance value, generic feel risk | shallow | component/site review |

## Recommendation layer

- strongest hybrid shell donor:
  `Vercel`
- strongest low-noise shell donor:
  `Linear`
- strongest pure UI shell donor:
  `shadcn/ui`
- easiest first donor:
  `shadcn/ui`

## Selection gate note

If the first study should maximize:
- portable shell primitives: start with `shadcn/ui`
- strong product shell framing: start with `Vercel` or `Linear`
