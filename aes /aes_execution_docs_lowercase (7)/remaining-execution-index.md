# remaining execution index

These files cover the remaining sprints and execution boards for approval_workflow, onboarding, and the notification system.
They sit on top of the existing AES core system docs and follow the same conventions as `execution-index.md`.

---

## recommended execution order

1. `approval_workflow_sprint_3.md`
2. `approval_workflow_sprint_4.md`
3. `onboarding_sprint_3.md`
4. `onboarding_sprint_4.md`
5. `notification_system_sprint_1.md`
6. `notification_system_sprint_2.md`
7. `notification_system_sprint_3.md`
8. `notification_system_sprint_4.md`

---

## file list

### sprint docs — approval_workflow
- `approval_workflow_sprint_3.md` — notifications, SLA timers, escalation, bulk approve, delegation with auto-return, chain visualization; integration + power features
- `approval_workflow_sprint_4.md` — bottleneck time metric, landing accuracy metric, dedup metric, field visibility validation, final QA, acceptance, ship readiness; approval_workflow closes here

### sprint docs — onboarding
- `onboarding_sprint_3.md` — form fields, loading and error states, SSO/token flow, auto-save drafts; the wizard becomes fully usable
- `onboarding_sprint_4.md` — activation rate metrics, milestone validation, final QA, acceptance, ship readiness; onboarding closes here

### sprint docs — notification_system
- `notification_system_sprint_1.md` — backend foundation: preference-aware dispatch, causal event linking, deduplication, retry, dead-letter queue, timing instrumentation
- `notification_system_sprint_2.md` — first visible UI: notification center, badge state, notification list, preference controls, basic accessibility
- `notification_system_sprint_3.md` — reliability and polish: timing refinement, retry visibility, dead-letter operations view, stronger preference UX, routing determinism
- `notification_system_sprint_4.md` — deduplication metric, final QA, acceptance criteria, ship readiness, post-ship gap documentation; notification system closes here

### execution boards
- `approval_workflow_execution_board.md` — 4 workstreams, 9 phases across sprints 1–4, dependency list, critical path, blocking/advisory separation, graph gap watch items
- `onboarding_execution_board.md` — 4 workstreams, 7 phases across sprints 3–4, dependency list, critical path, blocking/advisory separation, graph gap watch items
- `notification_system_execution_board.md` — 4 workstreams, 12 phases across sprints 1–4, dependency list, critical path, blocking/advisory separation, graph gap watch items

---

## important note

These execution files are based on the current live graph and packet state after canonical operations graph batches, AES bridge batches, and packet reruns. If the graph changes materially, regenerate the relevant packet first, then update the affected sprint file.
