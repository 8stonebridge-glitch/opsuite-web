# approval workflow execution board

Source of truth: `approval_workflow_sprint_1.md` (S1, prior), `approval_workflow_sprint_2.md` (S2, prior), `approval_workflow_sprint_3.md`, `approval_workflow_sprint_4.md`

Packet reference: `approval_workflow.md` — 8 rules, 8 failure modes, 2 business rules, 16 evaluations, 5 metrics, 2 flows, 3 UI patterns. Strongest feature packet. `WorkItemType: WIT-APPROVAL`.

---

## workstreams

| workstream | owner focus |
|---|---|
| **backend** | state machine, guards, mutations, audit log, SLA engine, escalation jobs, notification emission, delegation, bulk atomicity |
| **frontend** | queue screen, request detail, reject dialog, chain visualization, role-aware landing, field visibility, accessibility |
| **QA** | guard enforcement, audit immutability, bulk atomicity, SLA escalation, notification routing, role/field matrix, full acceptance |
| **metrics / reporting** | MET-054 bottleneck time, MET-058 dedup rate, MET-059 landing accuracy, MET-057/MET-061 activation milestones |

---

## phase-by-phase sequencing

### sprint 1 — foundation (prior, complete)

#### phase 1 — data model + state machine

**backend**
- approval data model: request, chain, state, assignments
- state machine: submitted → in_review → approved / rejected, with transition guards
- self-approval guard (`RULE-017`): block any approval where reviewer = requestor
- rejection comment guard (`RULE-029`): block any rejection without a reason attached
- immutable audit log writes (`RULE-004`): every state transition written to an append-only log

**QA**
- attempt self-approval — confirm blocked
- attempt rejection without comment — confirm blocked
- write an audit entry, attempt to modify it — confirm immutable
- walk the state machine through every valid and invalid transition

---

### sprint 2 — core UI (prior, complete)

#### phase 2 — queue + request detail + approve/reject flow

**frontend**
- approval queue screen: list of pending requests, filterable, sortable
- request detail screen: full request data, approval chain status, action buttons
- reject dialog with required comment field
- primary accessibility layer: keyboard navigation, screen reader support across queue and detail screens
- role-aware landing: reviewer lands on queue, requestor lands on submissions

**backend**
- role resolution: determine which screen to show based on the user's role and permissions
- field visibility rules: which fields are visible to which roles on the request detail screen

**QA**
- happy path E2E: submit a request → reviewer sees it in queue → reviewer approves → requestor sees approval
- reject path: reviewer rejects with comment → requestor sees rejection with reason
- role-aware landing: log in as reviewer, confirm queue; log in as requestor, confirm submissions
- accessibility: navigate queue and detail screens by keyboard

---

### sprint 3 — integration + power features

---

#### phase 3 — notification emission + SLA engine

Depends on: sprint 2 closed (core flow must work before integration wires around it)

**backend**
- wire notification emission from approval events: request submitted (notify reviewer), request rejected (notify requestor), request escalated (notify manager/backup)
- every notification passes through causal event linking and deduplication (`RULE-036`)
- build SLA timer: starts when a request is submitted, tracks time waiting for first action
- build escalation engine: when SLA threshold is exceeded, trigger escalation path (reassign and/or notify)

These two — notification wiring and SLA engine — are independent backend systems and can be built in parallel.

---

#### phase 4 — escalation jobs

Depends on: phase 3 SLA engine complete

**backend**
- build escalation background job: runs on a schedule, checks for overdue requests, triggers the escalation path from phase 3
- confirm the job does not re-escalate requests that have already been escalated
- confirm the job handles edge cases: request approved between check and escalation, request already delegated

---

#### phase 5 — bulk approve + delegation

Depends on: phase 3 complete (notifications must work — bulk approve and delegation both trigger notification events)

**backend**
- bulk approve: select multiple requests, approve all in one atomic operation; either all succeed or all fail
- delegation with auto-return: reviewer assigns their authority to a backup for a defined period; when the period ends, authority returns automatically
- confirm delegation does not create a separation-of-duties bypass (`FAIL-003`): the backup cannot approve their own requests using delegated authority

These two features are independent and can be built in parallel.

---

#### phase 6 — chain visualization + sprint 3 QA

Depends on: phases 3, 4, and 5 complete

**frontend**
- advanced approval chain visualization: show where a multi-step request sits in the chain, who has already approved, who is next, and any escalation or delegation markers

**QA**
- submit a request — confirm the assigned reviewer receives a notification
- reject a request — confirm the requestor receives a notification with the reason
- let a request sit past its SLA deadline — confirm escalation fires
- bulk approve five requests — confirm all five succeed atomically
- bulk approve ten requests where one would fail — confirm none succeed
- delegate authority for three days — confirm backup receives queue items; after three days, confirm authority returns
- trigger a duplicate approval event — confirm only one notification arrives
- view a multi-step chain — confirm visualization matches the real state

---

### sprint 4 — metrics and acceptance

---

#### phase 7 — wire metric events + field visibility validation

Depends on: sprint 3 fully closed

**metrics / reporting**
- wire `MET-054` (approval bottleneck time): record queue entry timestamp and first action timestamp for each request; compute the delta
- wire `MET-059` (role-based landing accuracy rate): record each landing event with expected vs actual screen; compute accuracy
- wire `MET-058` (notification deduplication success rate) from the approval event side: count approval-triggered notification events and deduplicated suppressions

**QA (parallel)**
- field visibility matrix validation (`FAIL-036`): for each role, confirm which fields are visible and which are hidden on the request detail screen
- confirm no field visibility leak: a requestor must not see internal reviewer notes; a reviewer must not see fields restricted to managers

---

#### phase 8 — metric validation + final QA pass

Depends on: phase 7 complete

These two tracks run in parallel.

**metrics / reporting**
- run test users through all approval paths and confirm bottleneck time is computed correctly
- log in as each role type and confirm landing accuracy rate reflects the correct screen
- trigger duplicate approval events and confirm dedup rate is accurate
- confirm activation milestone events (`MET-057`, `MET-061`) fire correctly when a user completes their first approval action

**QA**
- full structured pass across the entire approval workflow:
  - self-approval prevention (`RULE-017`)
  - rejection requires comment (`RULE-029`)
  - audit log immutability (`RULE-004`)
  - notification delivery and deduplication (`RULE-036`)
  - bulk atomicity (all-or-nothing)
  - SLA escalation (timer fires, escalation triggers)
  - delegation transfer and auto-return
  - role-based landing (reviewer → queue, requestor → submissions)
  - field visibility by role (no leaks)
  - approval chain visualization accuracy
  - infinite rejection loop prevention (`FAIL-018`)
  - activation milestone from first approval action

---

#### phase 9 — acceptance + ship readiness

Depends on: phase 8 complete (both metric validation and final QA)

**QA**
- walk the acceptance criteria checklist item by item
- any item not met: fix and re-verify, or formally accept as a known limitation with documented workaround

**metrics / reporting**
- confirm MET-054, MET-058, MET-059 are all returning real, accurate values
- confirm MET-057 and MET-061 activation milestone events are recorded from approval actions

**all workstreams**
- document the known remaining gaps formally as post-ship items (see graph gaps below)
- final checks: performance under load, error logging, accessibility across all screens, monitoring for SLA escalation and notification delivery
- ship readiness sign-off

---

## dependency list

| dependency | type | detail |
|---|---|---|
| data model + state machine → all guards | hard | guards enforce rules on state transitions that must exist first |
| self-approval guard → queue screen | hard | the queue must not show approve actions that would violate `RULE-017` |
| rejection comment guard → reject dialog | hard | the dialog enforces `RULE-029` — guard must exist before UI |
| audit log → all state transitions | hard | every transition writes to the log; log must exist before transitions are enabled |
| core UI (S2) → notification wiring (S3) | hard | notifications fire on approval events — the events must exist first |
| core UI (S2) → SLA engine (S3) | hard | SLA timer starts on request submission — submission must work first |
| SLA engine → escalation background job | hard | the job triggers the escalation path the engine defines |
| notification wiring → bulk approve | hard | bulk approve triggers notifications; emission must be in place |
| notification wiring → delegation | hard | delegation triggers notifications; emission must be in place |
| bulk approve atomicity → QA | hard | QA must verify all-or-nothing behavior; cannot test partial |
| delegation → delegation auto-return | hard | auto-return is the second half of delegation — cannot exist without the first |
| sprint 3 closed → metric event wiring | hard | metrics must be wired against the final complete feature |
| metric events wired → metric validation | hard | cannot validate data that is not yet emitted |
| field visibility rules (S2) → field visibility matrix QA (S4) | hard | validation requires rules to already be in place |
| metric validation + final QA → acceptance criteria | hard | both must pass before the acceptance gate |
| acceptance criteria → ship readiness | hard | ship readiness is the output of acceptance |

---

## critical path

```
data model + state machine (phase 1)
  → queue + request detail + approve/reject + role landing (phase 2)
    → notification emission + SLA engine (phase 3)
      → escalation jobs (phase 4)
        → bulk approve + delegation (phase 5)
          → chain visualization + S3 QA (phase 6)
            → wire metric events + field visibility validation (phase 7)
              → metric validation (phase 8)
                → acceptance + ship readiness (phase 9)
```

Within each phase, the parallel tracks noted above exist. The final QA pass in phase 8 runs parallel to metric validation and is off the critical path as long as it finishes at the same time or before.

Field visibility matrix validation in phase 7 is also off the critical path — it runs parallel to metric wiring.

---

## blocking vs advisory separation

### blocking items

These must be done. Skipping any of these breaks a governance-backed rule, evaluation, failure mode, or metric.

| item | sprint | why it blocks |
|---|---|---|
| self-approval guard | S1 | `RULE-017` — without this, users can approve their own requests |
| rejection comment guard | S1 | `RULE-029` — without this, rejections have no reason attached |
| immutable audit log | S1 | `RULE-004` — without this, audit trail can be tampered with |
| approval queue screen | S2 | `UI-003` — without this, reviewers have no way to see pending requests |
| role-aware landing | S2 | `FAIL-035` — without this, users land on the wrong screen |
| field visibility rules | S2 | `FAIL-036` — without this, fields leak to the wrong roles |
| notification emission with causal event | S3 | `RULE-036` — without this, approval notifications are either missing or untraceable |
| SLA timer + escalation | S3 | `MET-054` — without this, bottleneck time is unmeasurable and overdue requests are invisible |
| bulk approve atomicity | S3 | partial success leaves the queue in an inconsistent state — data integrity risk |
| delegation auto-return | S3 | `FAIL-003` — without auto-return, delegated authority lingers and creates SoD bypass |
| approval bottleneck time metric (MET-054) | S4 | the primary operational metric for the approval workflow |
| role-based landing accuracy metric (MET-059) | S4 | without this, `FAIL-035` goes undetected in production |
| notification dedup metric (MET-058) | S4 | without this, `FAIL-006` (notification storm) goes undetected |
| field visibility matrix validation | S4 | `FAIL-036` — the matrix must be verified before ship |
| final QA + acceptance | S4 | formal gate before release |

### advisory items

These improve quality and should not be skipped lightly, but they do not break a governance node if slightly deferred within the sprint.

| item | sprint | why it is advisory |
|---|---|---|
| advanced chain visualization | S3 | improves transparency for multi-step chains but does not break any rule or guard if absent; chains still function correctly |
| escalation background job schedule tuning | S3 | the job must exist (blocking), but the exact check frequency is a tuning decision, not a governance requirement |
| activation milestone from approval actions | S4 | MET-057 and MET-061 are shared metrics with onboarding — the approval side is a secondary contributor, not the primary source |
| performance load testing | S4 | important for production readiness but not tied to a specific governance node |

---

## sprint 3 recommendation

**Start notification wiring and SLA engine in parallel.** They are independent backend systems that both depend on sprint 2 being closed. This is the widest parallel window in sprint 3.

**Do not start bulk approve or delegation until notification wiring is done.** Both features trigger notification events. If the emission pipeline is not in place, you either skip notification testing or test it later and risk discovering emission bugs during integration QA.

**Build escalation jobs immediately after the SLA engine.** The escalation job is a thin layer on top of the engine — it is fast to build once the engine exists, and delaying it delays the integration QA pass.

**Build bulk approve and delegation in parallel.** They are independent features with no shared state. Assign them to different developers.

**The chain visualization is the only frontend-heavy work in sprint 3.** It can be built last, after the backend integration is stable. Do not let it block integration QA — if the visualization is not ready, QA can still verify chain state through the request detail screen.

**End sprint 3 with a full integration QA pass.** This is the most complex QA pass in any sprint for any feature. It covers notifications, SLA, escalation, bulk atomicity, delegation, and chain visualization in combination. Do not rush it.

---

## sprint 4 recommendation

**Wire all three metric events first.** MET-054 (bottleneck time), MET-059 (landing accuracy), and MET-058 (dedup rate from approval events) must all be emitting real data before validation can begin. These are independent and can be wired in parallel.

**Run field visibility matrix validation in parallel with metric wiring.** It is a QA task with no dependency on the metrics. Starting it in phase 7 alongside the metric work saves time.

**Run metric validation and final QA in parallel in phase 8.** These are independent workstreams. The final QA pass is the most comprehensive test run for any feature in the project — it covers every rule, every failure mode, and every guard. Do not compress it.

**Walk acceptance criteria only after both phase 8 tracks are done.** The approval workflow has the highest governance coverage of any feature (8 rules, 8 failure modes, 16 evaluations). The acceptance gate must have full confidence from both QA and metrics.

**Sprint 4 is the closeout sprint. No new scope.** The approval workflow is the first feature in the execution order and the highest-risk feature in the packet. A clean closeout here sets the standard for the other three features.

---

## graph gaps — watch items

These are known gaps in the current graph state, documented in the approval_workflow packet. They do not block any of the four sprints, but they must not be forgotten.

| gap | what it means in practice |
|---|---|
| no FeatureConsultation node | the consultation layer that would normally gate feature scope decisions is absent for the approval workflow |
| `RULE-029` has no direct TESTS evaluation | the rejection-requires-reason rule is enforced by the guard, but there is no evaluation node in the graph that formally tests it — the QA task in sprint 4 covers this functionally |
| `FAIL-018` has no direct DETECTS evaluation | the infinite rejection loop failure mode is documented, but there is no evaluation node that detects it — the final QA pass tests for this pattern manually |

**Action:** After Sprint 4 ships, queue a graph maintenance batch to add a FeatureConsultation node, a TESTS evaluation for `RULE-029`, and a DETECTS evaluation for `FAIL-018`. These close the formal graph coverage gap without affecting what was shipped.
