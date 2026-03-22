# Donor Shortlist — approval_workflow

## Target context

- target: `approval_workflow`
- donor mode: `logic` first, `hybrid` second
- scoring emphasis:
  feature relevance, logic depth, governance fit, validator friendliness

## Filtered candidate pool

| Candidate | Class | Weighted score | Why kept |
|---|---|---:|---|
| `GitHub` | hybrid | 4.60 | strongest validator-friendly review and approval donor with broad portability |
| `Ramp` | hybrid | 4.51 | strongest spend-approval donor with direct policy and reviewer patterns |
| `Brex` | hybrid | 4.51 | strong approval and sign-off donor with clear requester/reviewer separation |
| `GitLab` | hybrid | 4.37 | strong engineering approval + release gate donor |
| `Jira Service Management` | hybrid | 4.14 | enterprise workflow donor with queue and escalation value |
| `Asana` | hybrid | 3.86 | balanced workflow donor with lighter governance patterns |

Filtered before scoring:
- `ServiceNow` — kept as a reserve donor, but dropped from the first filtered pool because the first-pass noise and scope-control penalty is too high

## Shortlisted donors

| Rank | Candidate | Class | Why shortlisted | Expected logic value | Expected UI value | Major risks | Study depth | First-pass methods |
|---|---|---|---|---|---|---|---|---|
| 1 | `GitHub` | hybrid | best balance of governed review, visible state, comments, and notification-linked action | review state machine, approval/rejection flow, audit-like traceability | request detail and timeline framing | engineering-specific terminology | medium | public UI + docs review |
| 2 | `Ramp` | hybrid | strongest direct approval donor for policy, sign-off, and business approval discipline | requestor/reviewer rules, approval gating, finance-grade guardrails | modern request and approval UI | finance-specific surface area | medium | public product/docs review |
| 3 | `Brex` | hybrid | strong direct approval donor with similar spend-policy clarity | policy gating, approval routing, reviewer accountability | approval action framing and status clarity | spend-centric assumptions | medium | public product/docs review |
| 4 | `GitLab` | hybrid | strong gated approval donor for multi-stage review and release-aware approvals | multi-stage approval logic, pipeline gate crossover | dense reviewer UI and status clarity | DevOps terminology bleed | medium | public UI + docs review |
| 5 | `Jira Service Management` | hybrid | strong enterprise queue and escalation reserve donor | queue states, escalations, enterprise workflow rigor | enterprise queue/inbox layout | heavy enterprise complexity | shallow-medium | docs-first review |

## Recommendation layer

- strongest direct approval donor:
  `Ramp`
- strongest validator-friendly donor:
  `GitHub`
- strongest enterprise workflow reserve:
  `Jira Service Management`
- easiest first donor:
  `GitHub`

## Selection gate note

If the first study should maximize:
- portable review logic: start with `GitHub`
- direct business approval behavior: start with `Ramp` or `Brex`
