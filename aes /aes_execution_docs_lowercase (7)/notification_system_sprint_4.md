# notification system — sprint 4

## the five-line summary

1. Sprint 4 is the closeout sprint for the notification system.
2. The deduplication success rate metric is wired up and validated so you can measure the system's reliability in production.
3. The full feature goes through final QA: every notification type, every preference combination, every failure path.
4. Acceptance criteria are walked through and signed off.
5. After Sprint 4, the notification system is complete as scoped and ready to ship.

---

## why this sprint comes now

Sprints 1 through 3 built and hardened the feature. Sprint 4 proves it is ready. You need to confirm the metrics are capturing real data, the QA has covered the full surface area, and the known remaining gaps are either resolved or documented as accepted limitations — not hidden surprises waiting for production.

---

## sprint tasks, explained

**deduplication success rate metric (`MET-058` — notification deduplication success rate)**
This metric answers: "Out of all the notification events that fired, what percentage were correctly deduplicated when the same event triggered twice?" It requires the system to count total notification events and compare them to actual notifications sent. A deduplication rate below the target threshold is a signal to investigate before shipping.

**validating metric data accuracy**
Having a metric number is not enough — you need to trust it. This task covers verifying that the events feeding the metric are being recorded in all the right scenarios: normal dispatch, suppressed duplicates, retried notifications, and dead-lettered failures. Edge cases that slip through uninstrumented will produce misleading metric data.

**final QA pass**
A structured test run across the full notification system: every notification type that the system supports, every preference setting (opt-in, opt-out, partial), the retry path, the dead-letter path, the badge and unread count, the preference controls, and the operations views. This is the last safety net before acceptance.

**acceptance criteria verification**
The team walks the agreed acceptance criteria and confirms each item is met. Any item that is not met either gets fixed or is formally accepted as a known limitation with a documented workaround.

**cleanup items that do not block shipping**
The packet identifies known remaining gaps: no BusinessRule bridge, no FeatureConsultation node, no notification flow in the ops graph, and `RULE-022` (Notification Decouple) not yet bridged. These are structural graph improvements, not functional gaps. They do not block the feature from shipping — they are documented for a future bridge batch.

**ship readiness sign-off**
Performance, error logging, accessibility, and monitoring are confirmed in place. The team agrees the feature is ready for production.

---

## build order

1. **first:** wire the deduplication metric events and confirm they are recording correctly in all dispatch scenarios.
2. **parallel:** run the final QA pass while metric validation is in progress — these are independent workstreams.
3. **next:** walk the acceptance criteria checklist and close out any remaining items.
4. **next:** document the known remaining gaps (BusinessRule bridge, FeatureConsultation node, RULE-022) formally as post-ship items.
5. **last:** ship readiness sign-off.

---

## what you should expect to see working after sprint 4

- ✅ "Show me the notification deduplication success rate for this week — what percentage of duplicate events were correctly suppressed?"
- ✅ "Send me the same event twice — confirm I only received one notification and the dedup metric recorded the suppression."
- ✅ "Run through every notification type with preferences fully on — confirm all are dispatched and received."
- ✅ "Run through every notification type with preferences fully off — confirm none are dispatched."
- ✅ "Show me the dead-letter queue operations view — is it working correctly and showing the right data?"
- ✅ "What are the known gaps that are not shipping yet? Are they documented?"

---

## what is still not included yet

This is the final sprint for the notification system. The feature is complete as scoped after Sprint 4.

The following items remain as future graph-level improvements — they do not affect what ships:

- BusinessRule bridge for the notification system
- FeatureConsultation node
- A dedicated notification flow in the ops graph
- Bridging `RULE-022` (Notification Decouple)

These are documented, accepted, and queued for a future bridge batch — not blockers for this release.
