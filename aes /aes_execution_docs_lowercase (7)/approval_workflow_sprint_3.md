# approval workflow — sprint 3

## the five-line summary

1. Sprint 3 connects the approval workflow to the systems around it — notifications, SLA timers, and escalation.
2. When an approval request is submitted, rejected, or stuck past its deadline, the right people are notified automatically.
3. SLA timers start counting from the moment a request is submitted and escalate when the deadline passes without action.
4. Power features land: bulk approve, delegation with auto-return, and advanced approval chain visualization.
5. By the end of this sprint, the approval workflow is no longer a standalone screen — it is wired into the operational fabric of the app.

---

## why this sprint comes now

Sprints 1 and 2 built the data model, the state machine, the blocking backend guards, the queue screen, the request detail screen, and the approve/reject flow with accessibility. Those sprints gave you a working approval workflow — but it exists in isolation. No one is notified when something needs their attention. Nothing happens when a request sits too long. And high-volume approvers still process items one at a time. Sprint 3 solves all three problems.

---

## sprint tasks, explained

**notification integration (`RULE-036` — notification must have causal event and deduplication)**
When an approval-relevant event happens — a new request assigned to a reviewer, a rejection, an escalation — the system emits a notification. Every notification is tied to the causal event that created it and passes through the deduplication logic built in the notification system. Without this, reviewers miss requests and requestors do not know their item was rejected. Ghost notifications (`FAIL-032`) are prevented by the causal event link.

**SLA timer and escalation engine**
Each approval request gets a timer that starts when it is submitted. The timer tracks how long the request has been waiting for action. When the timer passes a configured threshold, the system escalates — either reassigning the request to a backup reviewer, notifying a manager, or both. Without this, requests silently age in the queue with no visibility into bottleneck time (`MET-054`).

**escalation jobs**
The escalation engine needs a background job that periodically checks for overdue requests and triggers the escalation path. This is not a user-initiated action — it runs on a schedule. Without it, the SLA timer is just a number with no consequence.

**bulk approve**
High-volume approvers — managers who receive dozens of routine requests — need to select multiple items and approve them in one action. The bulk action must be atomic: either all selected items are approved or none are (no partial success that leaves some items in an unknown state). Without atomicity, a partial bulk failure leaves the queue in a confusing state.

**delegation with auto-return**
A reviewer going on leave can delegate their approval authority to a backup. When the delegation period ends, authority automatically returns to the original reviewer. Without auto-return, delegated authority lingers indefinitely and creates a separation-of-duties risk (`FAIL-003` — SoD bypass privilege escalation).

**advanced approval chain visualization**
For requests that require multiple sequential approvals (a chain), the UI should show where the request currently sits in the chain, who has already approved, and who is next. Without this, requestors and reviewers cannot tell where a multi-step request is stuck.

**integration QA**
A structured test pass covering the connections built in this sprint: notifications arrive when expected, SLA timers escalate correctly, bulk approve is atomic, delegation transfers and returns authority, and the chain visualization reflects the real state.

---

## build order

1. **first:** wire notification emission from approval events (submit, reject, escalate) through the causal event and deduplication layer.
2. **parallel:** build the SLA timer and escalation engine alongside notification wiring — they are independent backend systems.
3. **next:** build the escalation background job and connect it to the SLA timer.
4. **next:** build bulk approve with atomicity guarantees.
5. **parallel:** build delegation with auto-return alongside bulk approve — they are independent features.
6. **next:** build the approval chain visualization UI.
7. **last:** integration QA pass covering notifications, SLA escalation, bulk atomicity, delegation transfer/return, and chain visualization accuracy.

---

## what you should expect to see working after sprint 3

- ✅ "Submit an approval request — does the assigned reviewer get a notification?"
- ✅ "Reject a request — does the requestor get a notification with the rejection reason?"
- ✅ "Let a request sit past its SLA deadline — does the system escalate it?"
- ✅ "Select five routine requests and bulk approve — do all five succeed or all five fail together?"
- ✅ "Delegate your approval authority to a backup for three days — does the backup receive your queue items? After three days, does authority return to you automatically?"
- ✅ "Show me a multi-step approval chain — can I see who has approved, where it is now, and who is next?"
- ✅ "Trigger a duplicate approval event rapidly — does the reviewer get one notification or two?"

---

## what is still not included yet

- Approval bottleneck time metric (`MET-054`) — that is Sprint 4.
- Role-based landing accuracy metric (`MET-059`) — Sprint 4.
- Notification deduplication success rate metric (`MET-058`) — Sprint 4 (wired here, measured there).
- Final QA, acceptance criteria, and ship readiness — Sprint 4.
