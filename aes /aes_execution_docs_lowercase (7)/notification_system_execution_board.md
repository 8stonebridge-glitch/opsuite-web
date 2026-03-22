# notification system execution board

Source of truth: `notification_system_sprint_1.md`, `notification_system_sprint_2.md`, `notification_system_sprint_3.md`, `notification_system_sprint_4.md`

---

## workstreams

Four parallel tracks run across all four sprints. Sprint 1 is backend-only. Sprint 2 is frontend-heavy. Sprints 3 and 4 spread across all tracks.

| workstream | owner focus |
|---|---|
| **backend** | dispatch engine, preference gate, deduplication, retry/dead-letter, causal linking, timing instrumentation |
| **frontend** | notification center, badge, preference controls, list rendering, accessibility, preference UX refinement |
| **QA** | preference enforcement, deduplication behavior, dead-letter handling, routing determinism, full feature acceptance |
| **metrics / reporting** | MET-058 deduplication success rate, metric event wiring, metric data validation |

---

## phase-by-phase sequencing

### sprint 1 — backend foundation

No frontend or user-visible work in this sprint.

---

#### phase 1 — preference gate + causal event linking

**backend**
- build the preference check gate: before any notification is dispatched, look up the user's preference for that notification type; block dispatch if opted out (`RULE-008`)
- implement causal event linking: every outgoing notification stores a reference to the event that caused it (`RULE-036`)

**parallel within this phase:** deduplication logic can begin alongside causal event linking — both are required by the same rule (`RULE-036`)

- build deduplication: when a notification for the same causal event already exists, suppress the duplicate; track suppression count for `MET-058`

---

#### phase 2 — retry + dead-letter queue

Depends on: phase 1 complete (dispatch pipeline must exist before failure handling wraps around it)

**backend**
- implement retry logic: configurable attempt limit per notification type; failed delivery triggers re-enqueue
- implement dead-letter queue: notifications that exhaust all retries move to the dead-letter queue with failure reason attached (`EVAL-010`)
- confirm silent notification drop (`FAIL-007`) is impossible — every failed notification is either retried or dead-lettered, never lost

---

#### phase 3 — timing instrumentation + sprint 1 QA

Depends on: phase 2 complete (timing must instrument the full pipeline including retries)

**backend**
- add timestamps at each dispatch stage: event triggered, notification dispatched, delivery confirmed (`EVAL-030`)
- confirm timing records are written for all paths: successful delivery, retried delivery, dead-lettered failure

**QA**
- send a notification to a user with that type turned off — confirm it is blocked and never dispatched
- trigger the same event twice rapidly — confirm only one notification is sent
- simulate a delivery failure — confirm retry fires, and after exhausting retries, the notification reaches the dead-letter queue
- inspect a notification record — confirm causal event is attached
- inspect a timing record — confirm triggered/dispatched/delivered timestamps are present

---

### sprint 2 — first visible UI

---

#### phase 4 — notification list + badge component

Depends on: sprint 1 fully closed (the UI must connect to a working dispatch engine)

**frontend**
- build the notification list component: loading state, empty state, populated state, read/unread visual distinction, pagination or scroll for long lists
- build the badge component: unread count indicator on the notification bell icon; wired to the unread count from the backend

These two are independent and can be built in parallel.

**backend**
- expose an unread count endpoint for the badge
- expose a notification list endpoint with read/unread state and pagination support

---

#### phase 5 — app shell integration + preference controls

Depends on: phase 4 complete (list and badge must exist before integration)

**frontend**
- integrate the notification list and badge into the app shell: bell icon, panel open/close behavior, mark-as-read on open
- build the preference controls screen: list of notification types with on/off toggles; connected to the preference check layer from Sprint 1
- confirm badge clears when user reads notifications — stale badges are `FAIL-032` (ghost notification)

**backend**
- expose a preference read/write endpoint: returns current preferences, accepts updates, confirms save

---

#### phase 6 — accessibility + sprint 2 QA

Depends on: phase 5 complete

**frontend**
- accessibility pass: notification center reachable and operable by keyboard alone; notification items announced correctly to screen readers; preference controls accessible

**QA**
- open the notification center — confirm recent notifications are listed
- trigger an approval rejection — confirm a notification appears in the center
- check badge count — confirm it matches actual unread count
- read notifications — confirm badge clears
- open preferences — turn off approval notifications, leave onboarding on; trigger both types — confirm only the onboarding notification arrives
- navigate the full notification center by keyboard only — confirm it works

---

### sprint 3 — reliability and polish

---

#### phase 7 — timing refinement + retry visibility

Depends on: sprint 2 fully closed

**backend**
- use timing instrumentation data from Sprint 1 to identify slow dispatch paths: notifications queued too long, batching too aggressive, preference-check overhead
- fix the worst timing offenders to make delivery consistently fast

**backend + frontend (parallel)**
- build the retry state visibility surface: internal operations view showing which notifications are currently in retry, how many attempts, current status
- this is an internal tool — not user-facing

---

#### phase 8 — dead-letter operations view

Depends on: phase 7 retry visibility complete (the operations view pattern is established there)

**backend + frontend**
- build the dead-letter queue operations view: list of failed notifications, failure reason per item, timestamps, replay action
- replay a dead-lettered notification: re-enqueue it through the normal dispatch pipeline

---

#### phase 9 — preference UX redesign + routing determinism

Depends on: phase 8 complete (operations views should be done before shifting focus to user-facing UX)

**frontend**
- redesign preference controls: clearer plain-language labels explaining what each notification type means, grouped layout for related types, save confirmation feedback

**QA**
- routing determinism validation (`EVAL-045`): for the same event type, confirm two users with identical preferences receive the same routing outcome
- turn off a notification type, trigger the event — confirm dispatch is blocked immediately, not eventually
- replay a dead-letter notification — confirm it dispatches correctly
- trigger a notification — confirm delivery timing is consistently fast
- check preference controls — confirm labels are clear and grouped, save confirmation appears

---

### sprint 4 — metrics, QA, and ship

---

#### phase 10 — wire deduplication metric

Depends on: sprint 3 fully closed

**metrics / reporting**
- wire `MET-058` (notification deduplication success rate): count total notification events, count deduplicated suppressions, compute the rate
- confirm metric events record in all dispatch scenarios: normal dispatch, suppressed duplicate, retried notification, dead-lettered failure

**backend**
- review event emission points — confirm the metric is fed by accurate data, not approximations or double-counts

---

#### phase 11 — metric validation + final QA pass

Depends on: phase 10 complete (metric must be wired before it can be validated)

These two tracks run in parallel — they do not depend on each other.

**metrics / reporting**
- trigger the same event twice — confirm dedup metric records the suppression
- trigger normal dispatches — confirm they are counted correctly and do not inflate the dedup number
- check edge cases: retried-then-delivered, retried-then-dead-lettered — confirm the metric handles each correctly

**QA**
- full structured pass across the entire notification system:
  - every notification type with preferences fully on — confirm all dispatched and received
  - every notification type with preferences fully off — confirm none dispatched
  - the retry path end to end
  - the dead-letter path end to end
  - badge and unread count accuracy
  - preference controls (toggle, save, immediate effect)
  - operations views (retry queue, dead-letter queue, replay)
- this is the last safety net before acceptance

---

#### phase 12 — acceptance + ship readiness

Depends on: phase 11 complete (both metric validation and final QA must be done)

**QA**
- walk the acceptance criteria checklist item by item
- any item not met: fix and re-verify, or formally accept as a known limitation with a documented workaround

**metrics / reporting**
- confirm `MET-058` returns a real, accurate value — not null, not zero, not inflated

**all workstreams**
- document the known remaining gaps formally as post-ship items (see graph gaps below)
- final checks: performance, error logging, accessibility, monitoring
- ship readiness sign-off

---

## dependency list

| dependency | type | detail |
|---|---|---|
| preference gate → all dispatch | hard | no notification leaves the system without passing the preference check first |
| causal event linking → deduplication | hard | dedup works by comparing causal event IDs — linking must exist first |
| dispatch pipeline → retry/dead-letter | hard | failure handling wraps around an existing dispatch path |
| retry/dead-letter → timing instrumentation | hard | timing must cover the full pipeline including failure paths |
| sprint 1 closed → sprint 2 UI | hard | the UI connects to the dispatch engine — the engine must be complete and tested |
| notification list + badge → app shell integration | hard | components must exist before they can be placed in the shell |
| preference check layer (S1) → preference controls (S2) | hard | the UI writes to and reads from the backend preference gate |
| sprint 2 closed → sprint 3 polish | hard | reliability refinement assumes a working feature to refine |
| timing instrumentation (S1) → timing refinement (S3) | hard | refinement uses the data that instrumentation collects |
| retry logic (S1) → retry visibility (S3) | hard | the operations view surfaces retry state that must already exist |
| dead-letter queue (S1) → dead-letter visibility (S3) | hard | the operations view surfaces dead-letter records that must already exist |
| sprint 3 closed → metric wiring (S4) | hard | all dispatch paths must be stable before the metric is wired |
| metric wired → metric validation | hard | cannot validate data that is not yet emitted |
| metric validation + final QA → acceptance criteria | hard | both must pass before the acceptance gate |
| acceptance criteria → ship readiness | hard | ship readiness is the output of acceptance |

---

## critical path

```
preference gate (phase 1)
  → causal event linking + deduplication (phase 1)
    → retry + dead-letter queue (phase 2)
      → timing instrumentation + S1 QA (phase 3)
        → notification list + badge components (phase 4)
          → app shell integration + preference controls (phase 5)
            → accessibility + S2 QA (phase 6)
              → timing refinement + retry visibility (phase 7)
                → dead-letter operations view (phase 8)
                  → preference UX redesign + routing determinism (phase 9)
                    → wire deduplication metric (phase 10)
                      → metric validation (phase 11)
                        → acceptance + ship readiness (phase 12)
```

The critical path runs straight through all twelve phases. Within each phase, parallelism exists (listed above), but the phase boundaries are sequential.

The final QA pass in phase 11 runs parallel to metric validation and is off the critical path as long as it finishes before or at the same time.

---

## blocking vs advisory separation

### blocking items

These must be done. Skipping any of these breaks a governance-backed rule, evaluation, or metric.

| item | sprint | why it blocks |
|---|---|---|
| preference gate | S1 | `RULE-008` — dispatching without preference check violates the rule directly |
| causal event linking | S1 | `RULE-036` — notifications without a causal event become ghost notifications (`FAIL-032`) |
| deduplication logic | S1 | `RULE-036` + `MET-058` — without dedup, notification storms (`FAIL-006`) are possible |
| retry + dead-letter queue | S1 | `EVAL-010` — without this, failed notifications are silently dropped (`FAIL-007`) |
| timing instrumentation | S1 | `EVAL-030` — without timestamps, delivery timing cannot be measured or refined |
| notification center | S2 | `UI-003` — without this, users have no place to see notifications at all |
| badge state management | S2 | `FAIL-032` — stale or missing badges produce ghost notification confusion |
| preference controls | S2 | users have no way to opt out without this — preference gate is one-sided |
| routing determinism verification | S3 | `EVAL-045` — without this, routing may be non-deterministic and go undetected |
| deduplication metric wiring | S4 | `MET-058` — the only metric in the packet; must be validated before ship |
| final QA + acceptance | S4 | formal gate before release — cannot ship without it |

### advisory items

These improve quality and should not be skipped lightly, but they do not break a governance node if slightly deferred within the sprint.

| item | sprint | why it is advisory |
|---|---|---|
| basic accessibility | S2 | no governance node is hard-blocked on accessibility; but building it from the start is far easier than retrofitting |
| notification list empty/loading states | S2 | functional correctness does not depend on these — they prevent blank screens and improve UX |
| retry visibility (operations view) | S3 | retry logic itself is blocking; the visibility surface is an operational improvement, not a governance requirement |
| dead-letter operations view | S3 | dead-letter queue itself is blocking; the view is an operational tool, not a governance-backed evaluation |
| preference UX redesign (grouped labels) | S3 | preference controls already work from S2; the redesign improves clarity, not correctness |
| cleanup/gap documentation | S4 | gaps are already known and listed in the packet — formalizing them is important but not a hard gate |

---

## sprint 1 recommendation

**This is a pure backend sprint.** Frontend has nothing to do here. QA joins only at phase 3 for integration testing.

**Start with the preference gate.** It is the first gate in the dispatch pipeline and everything flows through it. Do not start causal event linking until the preference gate is testable — you want to confirm notifications are being blocked before you start tracing why they were sent.

**Build dedup in parallel with causal event linking.** They share a rule (`RULE-036`) and the dedup logic depends on causal event IDs, but the implementation work overlaps enough that both can progress simultaneously once the causal event schema is defined.

**Do not skip the timing instrumentation.** It is tempting to defer instrumentation as "just logging" — but Sprint 3 depends entirely on having this data to identify slow paths. If timing is missing at the end of Sprint 1, Sprint 3 will start blind.

**End Sprint 1 with a clean QA pass covering all five backend behaviors.** Sprint 2 wires a UI to this engine. Any bug in dispatch, dedup, retry, dead-letter, or timing that slips through here will surface as confusing UI behavior later — much harder to debug.

---

## sprint 2 recommendation

**Build the list component and badge component in parallel in phase 4.** They are independent and connect to different backend endpoints. This is the widest parallel window in Sprint 2.

**Do not build preference controls before the list and badge are integrated into the app shell.** The preference controls read from and write to the same backend that powers the notification center. Testing preference changes requires seeing the effect in the notification center — so the center must be in the shell first.

**Build accessibility from the start, not as a retrofit pass at the very end.** The sprint doc calls this out explicitly. The accessibility pass in phase 6 is a verification step, not a build step — each component should be keyboard-operable and screen-reader-compatible as it is built.

**End Sprint 2 with a real end-to-end walkthrough.** Trigger a notification via a real event (approval rejection), watch it appear in the center, see the badge update, mark it read, verify the badge clears. This is the first time the notification system is visible. If it does not feel right here, users will not trust it.

---

## sprint 3 recommendation

**Start with timing refinement.** Sprint 1 gave you the data. Sprint 3 uses it. Identify the slowest dispatch paths first — these are the highest-impact fixes and they inform whether retry timing also needs adjustment.

**Build the retry and dead-letter operations views as internal tools, not user-facing features.** Keep them simple: list, status, failure reason, replay button. Do not over-invest in polish here — these are for the team supporting the system in production.

**The preference UX redesign is the highest-risk advisory item.** Redesigning a settings screen that already works is a judgment call. Do it if the current labels are genuinely confusing — skip the grouped layout if it adds complexity without measurable clarity. The sprint doc calls for clearer labels, grouped controls, and save feedback. Prioritize labels and save feedback; grouping is optional if time is tight.

**End Sprint 3 with routing determinism verification.** This is the last validation before the closeout sprint. If routing is non-deterministic, it must be fixed now — not during Sprint 4's QA pass.

---

## sprint 4 recommendation

**Wire the dedup metric first.** `MET-058` is the only metric in the notification system packet. It sits at the top of Sprint 4's critical path. Metric validation and final QA cannot begin until the metric is emitting real data.

**Run metric validation and final QA in parallel.** They are independent workstreams. Assign them to different people or sub-teams. Running them sequentially wastes the last sprint's time.

**Walk acceptance criteria only after both phase 11 tracks are done.** Opening the acceptance gate early — before metric validation or QA finishes — will surface issues during the gate itself rather than before it.

**Document the graph gaps formally as part of the ship process, not as an afterthought.** The known gaps (BusinessRule bridge, FeatureConsultation node, notification flow, `RULE-022`) are expected and accepted. Documenting them now prevents someone from rediscovering them later and treating them as a surprise.

**Sprint 4 is the closeout sprint. No new scope.** If anything surfaces during QA that is not already in the sprint docs, it is either a bug (fix it) or a future enhancement (document it, do not add it).

---

## graph gaps — watch items

These are known gaps in the current graph state, documented in the notification system packet. They do not block any of the four sprints, but they must not be forgotten.

| gap | what it means in practice |
|---|---|
| no BusinessRule bridge | the graph cannot enforce notification-specific business rules formally; governance relies on RULE/EVAL/FAIL nodes only |
| no FeatureConsultation node | the consultation layer that would normally gate feature scope decisions is absent for the notification system |
| no notification-specific `Flow` in the ops graph | the ops graph has no dedicated flow node for notifications; the feature operates without a formal flow path |
| no `WorkItemType` bridge | expected — notifications are not work items; this absence is structural, not a gap to fix |
| `RULE-022` Notification Decouple not bridged | this rule exists in the ops graph but is not connected to the notification system packet; it cannot drive evaluations or metrics until bridged |

**Action:** After Sprint 4 ships, queue a bridge batch to connect `RULE-022` and add a FeatureConsultation node and a BusinessRule bridge. The notification flow in the ops graph can be added in the same batch or deferred to the next graph maintenance cycle.
