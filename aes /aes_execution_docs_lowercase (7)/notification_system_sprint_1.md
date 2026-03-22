# notification system — sprint 1

## the five-line summary

1. Sprint 1 is entirely backend — users will not see anything new yet.
2. The system learns to send notifications only when a user's preferences allow it, and only when there is a real reason (a causal event) behind the notification.
3. Deduplication logic is built so users never receive the same notification twice for the same event.
4. If a notification fails to deliver, a retry system tries again — and if it keeps failing, the notification goes to a dead-letter queue for investigation.
5. Timing instrumentation records when each notification was triggered, dispatched, and delivered, so you can measure reliability from day one.

---

## why this sprint comes now

Before any notification UI can exist, the engine behind it must be sound. A notification center that shows duplicate alerts, ignores user preferences, or silently drops messages is worse than no notification center at all — it erodes trust immediately. Sprint 1 builds the foundation so that every notification the system sends is intentional, traceable, and recoverable if something goes wrong.

---

## sprint tasks, explained

**preference-aware notification dispatch (`RULE-008` — notification preference check)**
Before sending any notification, the system checks whether that user has turned that notification type on or off. This is the first gate every outgoing notification must pass. Without it, users who have opted out of certain alerts still receive them — a fast path to users disabling notifications entirely or filing complaints.

**causal event linking (`RULE-036` — notification must have causal event and deduplication)**
Every notification must be tied to a specific event that caused it — for example, "your approval request was rejected" is caused by a rejection action. This link is stored with the notification record. Without it, you end up with ghost notifications (`FAIL-032`) — messages that appear with no traceable origin, which makes debugging and auditing nearly impossible.

**deduplication and suppression logic (`MET-058` — notification deduplication success rate)**
If the same event fires twice (due to a retry or a system hiccup), the user should only receive one notification. Deduplication logic detects when a notification for the same event has already been sent and suppresses the duplicate. Without this, users experience notification storms (`FAIL-006`) — repeated identical alerts that feel like spam.

**retry and dead-letter handling (`EVAL-010` — dead letter queue on failure)**
Networks fail. External push services go down. When a notification cannot be delivered, the system should retry a defined number of times before giving up. Notifications that exhaust retries move to a dead-letter queue — a holding area where engineers can inspect what went wrong and manually replay if needed. Without this, failed notifications silently disappear (`FAIL-007` — silent notification drop).

**delivery timing instrumentation (`EVAL-030` — notification delivery timing)**
The system records timestamps at each stage: when the event triggered the notification, when it was dispatched, and when delivery was confirmed. This instrumentation feeds the timing metrics that tell you whether notifications are arriving fast enough, and gives you the data to diagnose slow or stuck notifications later.

---

## build order

1. **first:** build the preference check gate — no notification should leave the system without passing this.
2. **next:** implement causal event linking — every outgoing notification gets a record of what caused it.
3. **parallel:** build deduplication logic alongside causal event linking, since both are required by the same rule (`RULE-036`).
4. **next:** add retry logic with configurable attempt limits, then wire up the dead-letter queue for exhausted retries.
5. **last:** add timing instrumentation at each dispatch stage. run integration tests covering preference blocking, duplicate suppression, retry behavior, and dead-letter routing.

---

## what you should expect to see working after sprint 1

- ✅ "Send a notification to a user who has that notification type turned off — confirm it is blocked and never dispatched."
- ✅ "Trigger the same event twice rapidly — confirm the user only receives one notification, not two."
- ✅ "Simulate a delivery failure — confirm the system retries and, after exhausting retries, moves the notification to the dead-letter queue."
- ✅ "Show me the timing record for a dispatched notification — when was it triggered, when was it sent, when was delivery confirmed?"
- ✅ "Show me a notification record — does it have a causal event attached?"

---

## what is still not included yet

- The visible notification center UI — that is Sprint 2.
- Badge state on the app header — Sprint 2.
- Preference controls visible to users — Sprint 2.
- Reliability polish, retry visibility, and stronger preference UX — Sprint 3.
- Final metrics, QA, and ship readiness — Sprint 4.
