# onboarding — sprint 4

## the five-line summary

1. Sprint 4 is the closeout sprint for onboarding.
2. The activation metrics that tell you how many users actually finish onboarding are wired up and verified.
3. Milestone completion tracking — the system confirming that a user has passed their first key action — is validated end to end.
4. The full onboarding feature goes through final QA and acceptance testing.
5. After Sprint 4, onboarding is complete as scoped and ready to ship.

---

## why this sprint comes now

Sprints 1 through 3 built everything a user touches: the wizard structure, branching, form fields, error handling, and auto-save. Sprint 4 shifts focus from building to proving. You need to know whether the onboarding flow is actually working at a business level — not just "the UI loads" but "users are completing the wizard and hitting their first activation milestone." The metrics in this sprint answer that question.

---

## sprint tasks, explained

**activation rate metrics (`MET-057` — onboarding activation rate)**
This metric answers: "What percentage of users who start onboarding actually finish it?" It requires the system to count wizard completions and compare them to wizard starts. Without this, you cannot tell whether onboarding is working or silently losing users partway through.

**milestone completion rate (`MET-061` — activation milestone completion rate)**
Finishing the wizard is step one. The deeper question is: did the user then take their first real action inside the product (the "activation milestone")? This metric tracks whether users cross that line after onboarding. It is the business-level proof that onboarding is doing its job — not just getting users through a checklist, but getting them to value.

**validating milestone measurement**
It is not enough to have the metric — you need to confirm the data feeding it is accurate. This task covers checking that milestone events are being recorded correctly, that the milestone is being attributed to the right user, and that edge cases (user skips a step, user resumes from a different device) do not corrupt the count.

**final QA**
A structured pass through the entire onboarding feature: every role type, every branch, every edge case — incomplete wizard, expired invitation, SSO error, file upload failure. This catches anything Sprint 3 left rough.

**acceptance criteria verification**
The team walks through the agreed acceptance criteria — the checklist of things that must be true before shipping — and confirms each one is met. This is the formal gate before release.

**ship readiness**
Final checks: performance, accessibility, error logging, and any known issues documented. After this, onboarding is marked as ready.

---

## build order

1. **first:** wire metric events — ensure wizard completion and milestone completion events are being emitted and stored correctly.
2. **next:** validate the metric data: run test users through all paths and confirm the counts are accurate.
3. **parallel:** run the final QA pass across all roles and edge cases.
4. **next:** walk the acceptance criteria checklist and close out any remaining items.
5. **last:** ship readiness sign-off and any final minor fixes.

---

## what you should expect to see working after sprint 4

- ✅ "Show me the onboarding activation rate for this week — what percentage of users who started the wizard finished it?"
- ✅ "Show me the activation milestone completion rate — how many users took their first real product action after onboarding?"
- ✅ "What happens if a user gets halfway through onboarding and their invitation link expires?"
- ✅ "Run an admin user and a member user both through onboarding end to end — do both land in the right experience?"
- ✅ "Show me that the milestone is recorded correctly even if the user paused and resumed across two sessions."

---

## what is still not included yet

This is the final sprint for onboarding. The feature is complete as scoped after Sprint 4. Any future additions — broader governance bridges (`RULE-039`, `RULE-041`, `RULE-044`), a FeatureConsultation node, or deeper business rule coverage — are flagged in the packet as future improvements, not blocking this release.
