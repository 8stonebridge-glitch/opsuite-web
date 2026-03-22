# Donor Review Workflow Spec

This document defines how donor findings move from observation to accepted bridge input.

It builds on:
- [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
- [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)
- [donor_graph_mapping_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_graph_mapping_spec.md)

The goal is simple:
donor findings should not reach the build contract unless they have been reviewed, scoped, and approved under explicit rules.

## Core rule

No donor observation may influence implementation directly.

The only allowed path is:

1. donor observed
2. donor normalized
3. donor reviewed
4. donor accepted or constrained
5. accepted material promoted
6. promoted material feeds the bridge
7. validators confirm the rebuild
8. only proven lessons write back

## Review objectives

The donor review step must answer five questions:

1. Is the finding real?
2. Is the finding reusable?
3. Is the finding operational, presentational, or both?
4. Is the finding safe to promote into AES?
5. What constraints and validators must travel with it?

If any of these questions cannot be answered, the finding should not reach the bridge.

## Review roles

AES should treat donor review as a multi-role gate, even if one person or one system performs more than one role.

### 1. Extractor

Responsible for:
- creating donor observations
- linking evidence
- writing normalized candidates

The extractor may propose, but may not promote into the bridge directly.

### 2. Domain reviewer

Responsible for:
- deciding whether the finding fits the product domain
- deciding whether it matches existing canonical concepts
- rejecting donor logic that conflicts with established truth

Typical focus:
- state model fit
- workflow fit
- permission model fit
- business relevance

### 3. Design reviewer

Responsible for UI donor decisions.

Typical focus:
- clarity
- interaction usefulness
- accessibility implications
- consistency with product direction

Design review may approve a pattern for presentation reuse without approving any operational implication.

### 4. Governance reviewer

Responsible for:
- deciding whether donor material is safe to influence the bridge
- adding constraints
- deciding what validators are required

Typical focus:
- risk level
- evidence quality
- policy implications
- anti-copying and anti-drift controls

### 5. Validator owner

Responsible for:
- defining the proof needed after implementation
- making sure acceptance can be independently tested

This role decides what completion evidence must exist before the donor-derived logic is considered proven.

## Review scopes

Each donor candidate should be reviewed under one of these scopes:
- `logic`
- `ui`
- `hybrid`

### `logic`

Use when the finding affects:
- state
- transitions
- permissions
- failures
- notifications
- evaluations
- metrics

### `ui`

Use when the finding affects:
- layout
- navigation
- view states
- interactions
- design constraints

### `hybrid`

Use when the finding includes both:
- real product behavior
- meaningful UI state or interaction structure

Example:
- a permission request flow that changes both allowed actions and visible UI states

## Review inputs

A candidate should not enter review unless it has:
- a linked `donor_profile`
- at least one `donor_observation`
- raw evidence references
- a normalized candidate statement
- a confidence score

If those are missing, the candidate is incomplete and should be returned for normalization.

## Review decisions

The review gate should allow only four outcomes:

### `accept`

Use when:
- evidence is strong
- the candidate is reusable
- the candidate fits AES concepts cleanly
- required validators are clear

Effect:
- candidate may be promoted
- candidate may feed bridge inputs

### `accept_with_constraints`

Use when:
- the finding is useful
- but it is not safe to reuse without restrictions

Typical constraints:
- UI-only reuse
- feature-specific reuse only
- requires human approval before bridge inclusion
- requires extra validation
- cannot modify canonical rule set directly

Effect:
- candidate may be promoted in restricted form
- bridge input must carry the constraint

### `needs_more_evidence`

Use when:
- the finding seems plausible
- but the evidence is incomplete or ambiguous

Effect:
- candidate remains provisional
- no bridge promotion
- follow-up evidence required

### `reject`

Use when:
- evidence is weak
- the finding is noise
- the finding conflicts with canonical truth
- the finding is too platform-specific
- the finding encourages copying instead of learning

Effect:
- candidate cannot be promoted
- may remain in evidence layer for history, but not for reuse

## Evidence sufficiency rules

### Logic donor sufficiency

Logic candidates should usually require one of:
- direct procedural evidence
- repeated UI behavior observation
- corroborating strings plus flow evidence
- network or config evidence plus runtime behavior

Logic candidates should be treated as weak if they come only from:
- naming guesses
- vague decompilation clues
- one isolated string
- one unexplained UI impression

### UI donor sufficiency

UI candidates should usually require:
- visible screen evidence
- interaction evidence
- view-state clarity
- enough detail to describe the pattern without copying it

UI candidates should be treated as weak if they come only from:
- aesthetic preference
- a single screenshot with no interaction context
- branding cues
- novelty without usability value

## Conflict rules

If a donor finding conflicts with existing canonical truth:
- canonical truth wins by default
- donor finding is either rejected or kept as a non-promoted candidate

If two donors disagree:
- do not merge them automatically
- preserve both in the donor layer
- require explicit review for promotion

If a UI donor pattern conflicts with an accepted operational rule:
- operational rule wins
- UI pattern must adapt or be rejected

## Promotion rules

A candidate may be promoted only if:
- review decision is `accept` or `accept_with_constraints`
- required validators are attached
- target AES concepts are identified
- promotion path is explicit

Promotion must always preserve provenance.

That means every promoted rule, state, UI pattern, or flow should still be traceable back to:
- donor
- observation
- review decision
- constraint set

## Bridge inclusion rules

Even after promotion, not every promoted candidate must feed the bridge.

A promoted donor candidate should feed the bridge only if:
- it matters for the current feature scope
- it changes required behavior or required presentation
- it has enforceable completion criteria

Do not include promoted donor material in the bridge if:
- it is nice-to-have only
- it has no validator path
- it does not affect build outcomes
- it would bloat the build contract without improving correctness

## Validator attachment rules

Every accepted donor candidate should declare one or more validator requirements before bridge use.

### Logic donor validators

Typical validator types:
- unit test
- integration test
- e2e test
- policy check
- schema check
- review check

Examples:
- permission must block action before approval
- failure state must appear when preconditions are unmet
- audit evidence must exist after a governed transition

### UI donor validators

Typical validator types:
- UI review
- accessibility check
- responsive check
- e2e visual-flow check

Examples:
- empty state must be visible and actionable
- required actions must not be hidden in narrow view
- loading and error states must be distinguishable

## Risk levels

AES should tag donor candidates by reuse risk.

### `low risk`

Examples:
- empty-state layout pattern
- filter reset interaction
- success confirmation pattern

### `medium risk`

Examples:
- onboarding flow sequence
- notification read-state behavior
- destination selection flow

### `high risk`

Examples:
- permission rules
- approval gating
- audit requirements
- state-transition authority
- backend write restrictions

High-risk donor findings should require stronger evidence and stricter validators before promotion.

## Review outputs

Each completed review should produce:
- decision
- reason
- scope
- constraints if any
- validator requirements
- target AES mapping
- promotion status

That output should be enough for the bridge compiler to know:
- what is allowed
- what is required
- what is forbidden
- what must be proven

## Minimal review checklist

Before any donor candidate reaches the bridge, AES should be able to answer:

1. What evidence supports this?
2. Is it logic, UI, or hybrid?
3. What canonical concept does it map to?
4. Is it accepted, constrained, deferred, or rejected?
5. What validator proves it later?
6. What risk does it introduce?
7. What should be forbidden to avoid drift or copying?

If any answer is missing, the candidate is not bridge-ready.

## Fast-path review

AES may allow a fast path for low-risk donor patterns, but only when:
- evidence is clear
- scope is narrow
- validators are simple
- no canonical rule conflict exists

Examples:
- empty state pattern
- success message pattern
- non-critical layout grouping pattern

Fast path should never be used for:
- permission rules
- approval rules
- audit behavior
- data ownership behavior
- backend state authority

## Escalation cases

Review must escalate when:
- donor logic changes state authority
- donor logic affects data writes
- donor logic affects governance or audit
- donor logic has legal, compliance, or safety impact
- donor UI pattern hides or reframes critical operational state

Escalation means:
- stricter review
- stricter validators
- likely human approval before bridge inclusion

## Final rule

Review is the membrane between donor evidence and executable governance.

If donor findings can bypass review, the donor system stops being governed.
