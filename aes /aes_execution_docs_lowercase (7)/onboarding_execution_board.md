# onboarding execution board

Source of truth: `onboarding_sprint_3.md` and `onboarding_sprint_4.md`

---

## workstreams

Four parallel tracks run across both sprints. Not every track has work in every phase.

| workstream | owner focus |
|---|---|
| **backend** | server-side logic, data persistence, token resolution, metric events |
| **frontend** | form components, UI states, wizard wiring, SSO handoff |
| **QA** | structured test passes, edge cases, acceptance criteria |
| **metrics / reporting** | event wiring, metric validation, data accuracy checks |

---

## phase-by-phase sequencing

### sprint 3

---

#### phase 1 — build components in isolation

**backend**
- implement server-side validation rules for each field type (required, max file size, format checks)
- implement file upload handling: size enforcement, storage write

**frontend**
- build text input component with validation state
- build dropdown component with validation state
- build date picker component with validation state
- build file upload component with size-limit validation
- build loading state wrapper (reusable — wraps any step transition)
- build error display components: field-level validation message, screen-level error banner

These six frontend items and two backend items can all run in parallel within this phase. Nothing here depends on anything else in this phase.

---

#### phase 2 — wire fields into the wizard + auto-save

Depends on: phase 1 complete

**backend**
- implement auto-save: write current wizard state to server on each step advance
- confirm auto-save integrates correctly with the step persistence layer from Sprint 2

**frontend**
- replace wizard step placeholders with the real field components built in phase 1
- attach loading state wrappers to each step transition (submit, fetch)
- attach error display to each field and to the step-level submit action

This is the phase where the wizard goes from navigable-but-empty to navigable-and-fillable.

---

#### phase 3 — SSO / token resolution integration

Depends on: phase 2 complete (wizard must accept real data before SSO handoff lands correctly)

**backend**
- implement token resolution: when an SSO user arrives via invitation link, resolve their identity token against the identity provider
- confirm the resolved identity maps to the correct onboarding wizard instance
- handle failure case: expired or invalid token returns a clear error, not a blank screen

**frontend**
- implement the SSO handoff: after token resolution, land the user directly inside the wizard — no separate login step
- wire the token error state to the screen-level error banner built in phase 1

---

#### phase 4 — sprint 3 QA pass and fixes

Depends on: phases 1, 2, and 3 complete

**QA**
- fill the wizard end to end: text input, dropdown, date picker, file upload
- leave a required field blank and advance — confirm field-level error appears
- upload a file that exceeds the size limit — confirm error appears and upload is blocked
- close the tab mid-wizard (at step 3), reopen — confirm resume picks up correctly
- click an enterprise invitation link — confirm no separate login prompt, user lands in wizard
- simulate a slow network connection on step advance — confirm loading indicator appears, no duplicate submission
- fix any issues found before sprint 4 begins

---

### sprint 4

---

#### phase 5 — wire metric events

Depends on: sprint 3 fully closed (wizard must be complete before events can be wired accurately)

**metrics / reporting**
- wire wizard start event: fires when a user enters step 1 for the first time
- wire wizard completion event: fires when a user submits the final step successfully
- wire activation milestone event: fires when a user takes their first real product action after completing onboarding
- confirm all three events include correct user attribution and session context

**backend**
- review event emission points to confirm they fire at the right moments and not on retries or duplicate saves

---

#### phase 6 — metric validation + final QA pass

These two tracks run in parallel — they do not depend on each other.

**metrics / reporting**
- run test users through all completion paths and confirm wizard start and completion counts are accurate
- run test users through partial paths (step 2 drop-off, step 4 drop-off) and confirm these do not count as completions
- confirm milestone event fires correctly and is attributed to the right user
- validate edge cases: user skips a step, user resumes from a different device — confirm counts are not corrupted

**QA**
- full structured pass: every role type (admin, member, and any additional roles from Sprint 2 branching)
- every branch path through the wizard
- edge cases: incomplete wizard (user abandons), expired invitation link, SSO token error, file upload failure
- confirm milestone is recorded correctly when user pauses and resumes across two separate sessions
- confirm an admin user and a member user both complete onboarding end to end in the correct experience

---

#### phase 7 — acceptance criteria + ship readiness

Depends on: phase 6 complete (both metric validation and final QA must be done)

**QA**
- walk the acceptance criteria checklist item by item
- any item not met: fix and re-verify, or formally accept as a known limitation with a documented workaround

**metrics / reporting**
- confirm MET-057 (onboarding activation rate) is returning a real value, not null or zero
- confirm MET-061 (activation milestone completion rate) is returning a real value

**backend / frontend**
- final checks: performance, error logging, accessibility, any known issues documented
- ship readiness sign-off

---

## dependency list

| dependency | type | detail |
|---|---|---|
| form field components → wizard wiring | hard | fields must exist before they can replace wizard placeholders |
| loading + error components → wizard wiring | hard | wrappers must exist to attach to step transitions |
| phase 2 (wired wizard) → SSO integration | hard | SSO handoff must land in a wizard that accepts real data |
| sprint 3 fully closed → metric event wiring | hard | events must be wired against the final wizard, not a placeholder |
| metric events wired → metric validation | hard | cannot validate data that is not yet emitted |
| sprint 3 QA pass → sprint 4 final QA | hard | final QA tests the full feature — sprint 3 rough edges must be fixed first |
| metric validation + final QA → acceptance criteria | hard | both must be done before the acceptance gate |
| acceptance criteria → ship readiness | hard | ship readiness is the output of acceptance, not a parallel track |
| auto-save → resume correctness | hard | sprint 2 resume logic depends on sprint 3 auto-save having something to restore |
| backend token resolution → frontend SSO handoff | hard | frontend cannot land the user in the wizard until the token is resolved server-side |

---

## critical path

This is the sequence where a delay in any step delays the ship date.

```
form field components (phase 1)
  → wire fields into wizard + auto-save (phase 2)
    → SSO / token resolution (phase 3)
      → sprint 3 QA pass + fixes (phase 4)
        → wire metric events (phase 5)
          → metric validation (phase 6)
            → acceptance criteria (phase 7)
              → ship readiness sign-off
```

Loading state components and error display components are off the critical path — they can be built in phase 1 in parallel with the field components and have no downstream delay risk as long as they are ready before phase 2 wiring begins.

The final QA pass (phase 6) is also off the critical path as long as it finishes before or at the same time as metric validation, since both feed phase 7 together.

---

## blocking vs advisory separation

### blocking items
These must be done. Skipping or deferring any of these stops the feature from being correct or shippable.

| item | why it blocks |
|---|---|
| form field components | wizard has nowhere to collect user input without them |
| auto-save | sprint 2 resume is broken without data to restore |
| SSO / token resolution | enterprise users cannot enter the wizard at all — `FLOW-002` Invitation and Member Onboarding is broken |
| metric event wiring (MET-057, MET-061) | cannot measure whether onboarding is working — `RULE-045` First Session Must Drive Activation Milestone requires this |
| metric data validation | a wired metric with corrupt data is worse than no metric — it gives false confidence |
| final QA pass | required to reach acceptance criteria gate |
| acceptance criteria sign-off | formal gate before ship readiness |

### advisory items
These matter and should not be skipped lightly, but they do not stop the pipeline if slightly deferred within the sprint.

| item | why it is advisory |
|---|---|
| loading state wrappers | no governance node is hard-blocked on this; skipping degrades UX (duplicate submissions) but does not break the wizard's functional path |
| screen-level error banners | field-level validation is the functional requirement; screen-level banners are a UX improvement layer on top |
| SSO token error state UI | the failure case for SSO (expired/invalid token) must be handled server-side (blocking); the UI presentation of that error is advisory |

---

## sprint 3 recommendation

**Start with phase 1 in full parallel.** Assign backend and frontend to build their phase 1 items simultaneously — there are no intra-phase dependencies. This is the widest parallel window in both sprints and should be used fully.

**Do not start SSO integration (phase 3) until phase 2 is wired.** The SSO handoff lands users inside the wizard. If the wizard is not yet accepting real field data, SSO testing will be testing against a placeholder and edge cases will be missed.

**QA joins at phase 4 only.** There is nothing for QA to test until all three build phases are complete. Pulling QA in earlier will produce invalid results against an unfinished build.

**End sprint 3 with the QA pass fully closed before handing off to sprint 4.** Sprint 4's metric events must be wired against the final wizard. Any field behavior changes after metric wiring will break event attribution.

---

## sprint 4 recommendation

**Wire metric events first, before anything else.** The metric events (wizard start, wizard completion, milestone completion) sit at the top of sprint 4's critical path. Metric validation and final QA cannot begin until these are in place.

**Run metric validation and final QA in parallel.** These two tracks are fully independent in sprint 4. Running them sequentially adds unnecessary time at the end of the feature. Assign one team to metrics and one to QA and let both run simultaneously from the start of phase 6.

**Do not begin acceptance criteria until both phase 6 tracks are done.** The acceptance gate requires confidence in both functional correctness (QA) and measurement accuracy (metrics). Opening the gate with only one of the two is a risk that will likely surface issues during the gate rather than before it.

**Sprint 4 is the closeout sprint. No scope should be added here.** Any identified gap that is not in the two sprint docs belongs in a post-ship batch, not in sprint 4.

---

## graph gaps — watch items

These are known gaps in the current graph state, documented in the onboarding packet. They do not block sprint 3 or sprint 4 execution, but they should not be forgotten.

| gap | what it means in practice |
|---|---|
| no BusinessRule bridge for onboarding | the graph cannot enforce onboarding-specific business rules formally yet; governance is thinner than approval_workflow |
| no FeatureConsultation node | the consultation layer that would normally gate feature scope decisions is absent for onboarding |
| `RULE-039`, `RULE-041`, `RULE-044` not yet bridged | these broader onboarding rules exist in the ops graph but are not connected to the feature packet; they cannot drive evaluations or metrics until bridged |
| governance is thinner than approval_workflow | onboarding has fewer rules, failure modes, and evaluations backing it; decisions that feel "covered" may not have a formal graph node behind them |

**Action:** After sprint 4 ships, queue a bridge batch to bring `RULE-039`, `RULE-041`, and `RULE-044` into the onboarding packet. Do not let this slip beyond the next planning cycle or the governance gap will widen as the feature grows.
