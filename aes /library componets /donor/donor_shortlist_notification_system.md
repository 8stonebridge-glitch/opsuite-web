# Donor Shortlist — notification_system

## Target context

- target: `notification_system`
- donor mode: `logic` first, `hybrid` second
- scoring emphasis:
  inbox discipline, read-state logic, preference control, causality, noise management

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `GitHub` | hybrid | 4.74 | strongest notification inbox donor with triage and action-linked notifications |
| `Linear` | hybrid | 4.51 | strongest polished work-inbox donor with low-noise triage |
| `Slack` | hybrid | 4.34 | strong routing and unread-state donor with excellent delivery expectations |
| `Asana` | hybrid | 4.00 | balanced work notification donor with task-linked activity |
| `PostHog` | hybrid | 3.97 | useful reserve for product telemetry and event-linked notifications |
| `Outlook` | hybrid | 3.63 | local inbox donor reserve for desktop notification affordances |
| `Notion` | hybrid | 3.34 | lighter reserve donor for embedded notification UI |

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `GitHub` | hybrid | strongest donor for actionable inbox triage and stateful notification handling | read/unread rules, inbox triage, context-linked actions | clear notification list and state badges | engineering-specific terminology | medium | public UI + docs review |
| 2 | `Linear` | hybrid | strongest polished work-inbox donor with low-noise behavior | work-inbox routing and triage expectations | clean inbox density and interaction flow | may underweight multi-channel delivery | medium | public UI review |
| 3 | `Slack` | hybrid | strongest donor for routing expectations and notification urgency behavior | delivery expectations, unread awareness, preference importance | strong notification entry points and badges | channel-first mental model may overfit | medium | public UI + help docs review |
| 4 | `Asana` | hybrid | balanced donor for task-linked notifications and inbox actions | task/activity-linked notification behavior | approachable inbox layout | lighter governance value than top donors | shallow-medium | public UI review |
| 5 | `Outlook` | hybrid | strong local reserve for desktop inbox affordances | email-style read-state and grouping references | desktop inbox interaction patterns | email paradigm can overfit | shallow | local UI observation only |

## Recommendation layer

- strongest notification logic donor:
  `GitHub`
- strongest polished inbox donor:
  `Linear`
- strongest routing and urgency donor:
  `Slack`
- easiest first donor:
  `GitHub`

## Selection gate note

If the first study should maximize:
- governed inbox behavior: start with `GitHub`
- polished work-inbox feel: start with `Linear`
