# notification system — sprint 3

## the five-line summary

1. Sprint 3 makes the notification system dependable — not just working, but working predictably and visibly.
2. Timing behavior is refined so notifications arrive when expected, not delayed or batched unpredictably.
3. Retry behavior is made visible: when a notification fails and retries, someone on the operations team can see it happening and intervene if needed.
4. The dead-letter queue is surfaced to operators so failed notifications are not invisible.
5. The preference experience is strengthened so users can understand and control exactly what they receive.

---

## why this sprint comes now

Sprint 2 gave users a working notification center. Sprint 3 focuses on the experience holding up under real conditions. A notification that sometimes arrives immediately and sometimes arrives twenty minutes later — with no explanation — is not a feature users trust. This sprint closes the gap between "technically works" and "feels reliable."

---

## sprint tasks, explained

**timing behavior refinement (`EVAL-030` — notification delivery timing)**
Sprint 1 added timing instrumentation. Sprint 3 uses that data to identify and fix timing problems: notifications that are queued too long, held by batching logic that is too aggressive, or delayed by preference-check overhead. The goal is consistent, predictable delivery — not just eventual delivery.

**retry behavior visibility**
When a notification fails and is retried, that state should be visible somewhere — even if only on an internal operations dashboard. Retries that are invisible lead to confusion: "Did that notification go? Did it fail? Is it stuck?" Surfacing retry state lets teams answer those questions without digging through raw logs.

**dead-letter queue visibility (`EVAL-010` — dead letter queue on failure)**
Sprint 1 built the dead-letter queue as a backend safety net. Sprint 3 surfaces it: an operations view that shows which notifications ended up in the dead-letter queue, why, and which ones have been replayed or discarded. This is an internal tool, not a user-facing feature, but it is essential for a team supporting a production system.

**stronger preference UX**
The preference controls built in Sprint 2 are functional. Sprint 3 improves them: clearer labels that explain what each notification type means in plain language, grouped controls where related notification types are shown together, and feedback when a preference change is saved. Users should leave the preferences screen confident they know what they turned on and off.

**routing determinism verification (`EVAL-045` — notification routing determinism)**
For the same event type, the same user should always receive the same routing outcome — not sometimes email, sometimes push, sometimes nothing. This task validates that the routing logic is deterministic and that preference changes take effect immediately (not eventually).

---

## build order

1. **first:** use the timing instrumentation data from Sprint 1 to identify slow paths and fix the worst offenders.
2. **parallel:** build the retry state visibility surface (internal operations view) alongside timing fixes — both are backend-adjacent work.
3. **next:** build the dead-letter queue operations view — list of failed notifications, failure reason, replay action.
4. **next:** redesign the preference controls: better labels, grouped layout, save confirmation feedback.
5. **last:** run routing determinism validation tests across all notification types and preference combinations.

---

## what you should expect to see working after sprint 3

- ✅ "Show me the operations view — can I see which notifications are currently in the retry queue and which ended up in the dead-letter queue?"
- ✅ "Replay a dead-letter notification — does it dispatch correctly this time?"
- ✅ "Trigger a notification and measure how long it takes to appear in the notification center — is it consistently fast?"
- ✅ "Open notification preferences — are the options clearly labeled with plain-language descriptions?"
- ✅ "Turn off a notification type, then trigger that event — confirm no notification is dispatched, with no delay."
- ✅ "Run the same event for two users with identical preference settings — confirm both receive the same routing outcome."

---

## what is still not included yet

- Final metrics wiring and measurement validation — Sprint 4.
- Formal QA pass and acceptance criteria sign-off — Sprint 4.
- Ship readiness — Sprint 4.
