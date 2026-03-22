# Donor Shortlist — onboarding

## Target context

- target: `onboarding`
- donor mode: `hybrid` first, `ui` second
- scoring emphasis:
  activation flow, resume logic, guidance clarity, auth handoff portability

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `Clerk` | hybrid | 4.66 | strongest auth and organization-aware setup donor |
| `Linear` | hybrid | 4.42 | strongest polished hybrid donor for guided first-run experience |
| `Slack` | hybrid | 4.32 | strongest team-activation and workspace onboarding donor |
| `Asana` | hybrid | 4.00 | balanced guided workflow donor with clear progression patterns |
| `Notion` | hybrid | 3.61 | strong UI donor for setup polish and guided empty-state transitions |
| `Canva` | ui | 3.55 | active local UI donor for polished onboarding feel and shell-entry continuity |

Filtered before scoring:
- `Vercel` — removed from the filtered pool because direct onboarding relevance was too weak relative to stronger candidates

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `Clerk` | hybrid | strongest donor for auth handoff, org-aware setup, and identity-linked onboarding | invite/auth/setup flow boundaries, safe identity transitions | clean setup surfaces and progressive disclosure | auth-platform bias | medium | docs + product review |
| 2 | `Linear` | hybrid | strongest polished donor for guided progression and low-noise onboarding feel | activation sequencing and focused setup flow | strong guided shell, progress, and pacing | may underrepresent enterprise auth complexity | medium | public UI review |
| 3 | `Slack` | hybrid | strongest donor for team onboarding and workspace activation | invite, team setup, early role/context cues | strong first-run guidance and workspace affordances | collaboration-specific assumptions | medium | public UI + help docs review |
| 4 | `Asana` | hybrid | balanced donor for structured onboarding and guided next steps | step sequencing and lightweight setup states | approachable guided interface patterns | less auth-heavy than needed | shallow-medium | public UI review |
| 5 | `Notion` | hybrid | strong UI-heavy reserve donor for polish and setup momentum | lighter logic value | setup polish, empty states, guidance tone | lower governance fit and weaker validator path | shallow | UI-first review |

## Recommendation layer

- strongest auth-and-activation donor:
  `Clerk`
- strongest onboarding-feel donor:
  `Linear`
- strongest team-setup donor:
  `Slack`
- easiest first donor:
  `Linear`

## Selection gate note

If the first study should maximize:
- enterprise-safe onboarding logic: start with `Clerk`
- guided product feel and pacing: start with `Linear`
