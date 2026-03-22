# approval workflow — sprint 4

## the five-line summary

1. Sprint 4 is the closeout sprint for the approval workflow.
2. The metrics that measure whether approvals are flowing or getting stuck are wired up and validated.
3. Role-based landing accuracy — whether each user sees the right screen when they arrive — is measured and confirmed.
4. The full feature goes through final QA and acceptance testing across all roles, all paths, and all edge cases.
5. After Sprint 4, the approval workflow is complete as scoped and ready to ship.

---

## why this sprint comes now

Sprints 1 through 3 built everything: the state machine, the guards, the queue, the approve/reject flow, notifications, SLA escalation, bulk approve, delegation, and chain visualization. Sprint 4 shifts from building to proving. You need to know that the workflow is correct at a business level — approvals are not bottlenecked, the right people land on the right screens, and notifications are not being duplicated. The metrics in this sprint answer those questions.

---

## sprint tasks, explained

**approval bottleneck time (`MET-054`)**
This metric measures how long approval requests sit waiting for action. It answers: "Where are requests getting stuck, and for how long?" It requires the system to record when a request enters the queue and when it receives its first action (approve, reject, or escalate). Without this, you cannot tell whether the workflow is fast or silently stalling.

**role-based landing accuracy rate (`MET-059`)**
When a user opens the approval workflow, they should land on the screen that matches their role — a reviewer sees the queue, a requestor sees their submitted requests, a manager sees the bottleneck overview. This metric measures how often the landing is correct. Without it, role-blind landing (`FAIL-035`) goes undetected — users see the wrong screen and assume the system is broken.

**notification deduplication success rate (`MET-058`)**
Sprint 3 wired notification emission from approval events through the deduplication layer. Sprint 4 measures the result: what percentage of duplicate events were correctly suppressed? This metric is shared with the notification system but must be validated from the approval workflow's side — because approval events are the highest-volume notification source.

**field visibility matrix validation (`FAIL-036` — field visibility leak)**
Different roles should see different fields on the request detail screen. A reviewer may see internal notes that a requestor should not. This task validates the full matrix: for each role, confirm which fields are visible and which are hidden. A field visibility leak exposes data to the wrong audience.

**activation milestone completion (`EVAL-048`, `EVAL-054`)**
The approval workflow connects to the broader activation flow: a user's first successful approval action (submitting or reviewing a request) counts as an activation milestone. This task confirms that the milestone event fires correctly and is attributed to the right user, feeding `MET-057` and `MET-061`.

**final QA**
A structured pass through the entire approval workflow: every role type, every state transition, every guard, every edge case. This includes:
- self-approval prevention (`RULE-017`)
- rejection requires comment (`RULE-029`)
- audit log immutability (`RULE-004`)
- bulk atomicity
- SLA escalation
- delegation transfer and auto-return
- notification delivery and deduplication
- role-based landing
- field visibility by role
- approval chain visualization accuracy
- infinite rejection loop prevention (`FAIL-018`)

**acceptance criteria verification**
The team walks the agreed acceptance criteria and confirms each one is met. Any item not met is either fixed or formally accepted as a known limitation.

**ship readiness**
Final checks: performance under load, error logging, accessibility across all screens, monitoring in place for SLA escalation and notification delivery. After this, the approval workflow is marked as ready.

---

## build order

1. **first:** wire metric events — approval bottleneck time (queue entry + first action timestamps), role-based landing events, notification dedup counts from approval events.
2. **parallel:** validate the field visibility matrix across all roles while metric events are being wired — these are independent workstreams.
3. **next:** validate metric data accuracy: run test users through all approval paths and confirm bottleneck time, landing accuracy, and dedup counts are correct.
4. **parallel:** run the final QA pass across all roles and edge cases alongside metric validation — these are independent.
5. **next:** confirm activation milestone events fire correctly from approval actions.
6. **next:** walk the acceptance criteria checklist and close out remaining items.
7. **last:** ship readiness sign-off and any final minor fixes.

---

## what you should expect to see working after sprint 4

- ✅ "Show me the approval bottleneck time for this week — which requests waited the longest?"
- ✅ "Log in as a reviewer — do I land on the queue? Log in as a requestor — do I land on my submissions? Show me the landing accuracy rate."
- ✅ "Show me the notification deduplication rate for approval events — what percentage of duplicates were suppressed?"
- ✅ "Log in as a requestor — can I see internal reviewer notes? I should not be able to."
- ✅ "Submit my first approval request as a new user — does the system record this as an activation milestone?"
- ✅ "Try to approve your own request — confirm the system blocks it."
- ✅ "Reject a request without a comment — confirm the system requires one."
- ✅ "Show me the audit log for a request — confirm it is immutable and complete."
- ✅ "Run a bulk approve of ten items where item 6 would fail — confirm none of the ten are approved."

---

## what is still not included yet

This is the final sprint for the approval workflow. The feature is complete as scoped after Sprint 4.

The following items remain as future graph-level improvements — they do not affect what ships:

- FeatureConsultation node for approval_workflow
- Direct TESTS evaluation for `RULE-029` (rejection requires reason)
- Direct DETECTS evaluation for `FAIL-018` (infinite rejection loop)

These are documented, accepted, and queued for a future graph maintenance batch — not blockers for this release.
