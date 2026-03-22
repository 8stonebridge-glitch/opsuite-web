# Donor Selection Workflow

This document defines the steps AES should complete before choosing which apps to study.

It stops at the selection gate.
That is the point where human input should decide which donor apps are actually studied first.

It builds on:
- [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
- [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)
- [donor_review_workflow_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_review_workflow_spec.md)
- [donor_intake_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_intake_template.md)
- [donor_study_packet_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_study_packet_template.md)

## Core rule

Do not start studying apps just because they seem interesting.

Before app study begins, AES should know:
- which feature area needs donor input
- what kind of donor is needed
- what kind of value is expected
- what kinds of apps are in and out of scope
- how candidate apps will be scored

## Workflow overview

The pre-selection workflow is:

1. select target feature area
2. define donor objective
3. define donor class
4. define discovery boundaries
5. collect candidate app pool
6. apply hard filters
7. score remaining candidates
8. create shortlist
9. pause at selection gate for human input

## Step 1. Select target feature area

Every donor search must begin from a real AES target.

Examples:
- `approval_workflow`
- `reporting`
- `onboarding`
- `notification_system`

Output:
- one primary feature area
- optional secondary feature area

If there is no feature target, donor search should not begin.

## Step 2. Define donor objective

State exactly what the donor should teach.

Examples:
- reusable approval state machine
- onboarding progression and resume logic
- dashboard empty-state and filter-reset pattern
- notification unread/read behavior and delivery expectations

Output:
- donor objective statement

The objective should describe reusable value, not implementation copying.

## Step 3. Define donor class

Classify what kind of donor is needed:
- `logic`
- `ui`
- `hybrid`

### Use `logic` when you need
- workflow discipline
- permission rules
- failure handling
- notification triggers
- state and transition behavior

### Use `ui` when you need
- dashboard layout
- interaction style
- onboarding feel
- settings structure
- empty/loading/error state presentation

### Use `hybrid` when you need both
- operational behavior
- visible state presentation

Output:
- donor class

## Step 4. Define discovery boundaries

Before collecting apps, define the search boundary.

Boundary decisions:
- platforms allowed
- app types allowed
- donor depth allowed
- evidence methods allowed in first pass
- disallowed donor types

Examples:
- include web and desktop only
- include strong B2B workflow apps
- exclude games and media apps
- first pass uses public UI and bundle inspection only
- do not include apps that are mostly wrappers with no observable logic

Output:
- discovery boundary

## Step 5. Collect candidate app pool

Now collect candidate donor apps.

This should produce a rough pool, not a final choice.

Each candidate should have:
- app name
- platform
- donor class
- likely feature fit
- reason it might be useful
- likely evidence accessibility

Output:
- candidate app pool

At this stage, candidates are still unscored.

## Step 6. Apply hard filters

Remove candidates that fail obvious constraints.

Hard filter reasons:
- no feature relevance
- mostly wrapper behavior
- evidence too inaccessible
- excessive platform lock-in
- poor portability
- low confidence that reusable logic exists
- too broad for current scope

Output:
- filtered candidate pool

This keeps scoring time focused on realistic donors.

## Step 7. Score remaining candidates

Use the donor scorecard to evaluate the remaining apps.

The score should consider:
- feature relevance
- evidence accessibility
- logic richness
- UI quality
- portability
- governance fit
- reuse value
- risk of copying noise instead of learning

Output:
- scored donor candidate list

## Step 8. Create shortlist

Create a shortlist from the scored candidates.

The shortlist should usually contain:
- 2 to 5 donor apps per feature area

Each shortlisted donor should include:
- name
- donor class
- why it made the shortlist
- risks
- expected reusable outcomes
- recommended study depth

Output:
- donor shortlist

## Step 9. Pause at selection gate

This is the handoff point for human input.

At this gate, AES should present:
- target feature area
- donor objective
- donor class
- scored shortlist
- recommendation
- tradeoffs

Human input should choose:
- which donors to study first
- whether to prioritize logic, UI, or hybrid value
- whether to broaden or narrow scope

No donor packet should begin before this gate is resolved.

## Required outputs before the selection gate

AES should be able to show:
- feature target
- donor objective
- donor class
- discovery boundaries
- filtered candidate list
- scored shortlist
- recommendation and tradeoffs

If any of those are missing, the process is not ready for app choice yet.

## Good selection gate questions

These are the kinds of questions human input should answer:
- Do we want the strongest logic donor or the easiest first donor?
- Do we want one hybrid donor or separate logic and UI donors?
- Is portability more important than product polish?
- Are we optimizing for state-machine quality, UI quality, or both?
- Do we want a narrow donor for one workflow or a broader donor for one feature area?

## Final rule

The selection gate is where judgment enters.

Everything before it should be structured enough that the judgment is informed, not improvised.
