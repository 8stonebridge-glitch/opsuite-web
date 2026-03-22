# Donor Logic Ingestion Model

This document defines how AES should use existing apps as logic donors.

The goal is not to copy apps.
The goal is to extract proven behavior from them and turn that behavior into governed build inputs.

It also defines how AES should use strong UI apps and UI boilerplates as presentation donors.

## Core rule

Borrow behavior.
Rebuild implementation.

In AES terms:
- the donor app is evidence
- the graph is canonical truth
- the bridge is the build contract
- the builder is the constrained executor
- validators decide whether the rebuilt behavior is real

This means donor logic is never accepted just because it was seen in another app.
It is observed first, normalized second, accepted third, and only then allowed to influence builds.

The same rule applies to UI inspiration:
it is observed first, normalized second, accepted third, and only then allowed to influence builds.

## Donor classes

AES should treat donors as separate classes.

### Logic donors

Logic donors teach:
- workflows
- state transitions
- permissions
- validations
- failure handling
- notifications
- routing behavior

These donors influence operational truth.

### UI donors

UI donors teach:
- layout structure
- visual hierarchy
- component composition
- interaction patterns
- onboarding feel
- dashboard organization
- empty, loading, and error state presentation
- motion and responsiveness

These donors influence presentation and interaction patterns.

They should not be allowed to define canonical backend truth by themselves.

## What counts as donor logic

The useful parts of a donor app are:
- workflows
- state transitions
- permission gates
- visibility rules
- error and retry behavior
- notification triggers
- destination selection logic
- validation rules
- success and failure states
- audit and confirmation patterns

These are the parts that survive framework changes and vendor changes.

## What counts as UI donor value

The useful parts of a UI donor are:
- screen composition
- navigation structure
- form layout patterns
- settings layout patterns
- dashboard and reporting presentation patterns
- empty, loading, success, and error state presentation
- component density and information grouping
- responsive behavior
- interaction pacing
- visual affordances that improve clarity

These are the parts that survive branding changes and can be rebuilt cleanly.

## What does not count as donor logic

The following should usually be rejected or treated as low-value noise:
- wrapper shells
- vendor-specific glue
- framework boilerplate
- minified implementation details with no behavioral meaning
- analytics clutter
- build artifacts
- UI cosmetics that do not affect execution behavior
- hacks that exist only because of one platform limitation

For UI donors, the following should usually be treated as low-value noise:
- copied branding
- style choices with no usability gain
- novelty without clarity
- theme details that do not improve flow comprehension
- visual complexity that cannot survive product scaling

## Donor selection rules

A donor app is worth studying if it has at least one of these qualities:
- it solves a workflow your product also needs
- it has strong operational discipline
- it handles permissions or failures well
- it demonstrates a mature state machine
- it has proven user-facing logic you want to match

A donor app is weak if:
- most of its logic is hidden behind third-party services you cannot observe
- its behavior is highly platform-specific and not portable
- it is mostly a wrapper with little reusable logic
- it is too ambiguous to reverse with confidence

## The ingestion pipeline

AES should process donor apps in this order.

### 1. Select the donor

Input:
- app name
- platform
- feature of interest
- reason for study

Output:
- donor profile

The donor profile records:
- what part of the app is being studied
- what feature area it maps to
- why it is relevant
- what we expect to learn

### 2. Observe the donor

This is the reverse-engineering or behavioral analysis stage.

Possible evidence sources:
- binary inspection
- Hopper analysis
- strings
- procedures
- decompilation
- UI flow observation
- network behavior
- config files
- manifests
- local storage behavior

Output:
- donor observations

Each observation should be stored as:
- observation id
- donor app
- feature area
- evidence type
- raw evidence reference
- plain-English finding
- confidence level

At this stage, the graph is not updated yet.

### 3. Normalize the logic

Raw findings must be converted into reusable operational units.

AES should normalize donor findings into these types:
- `State`
- `Transition`
- `Rule`
- `PermissionRule`
- `VisibilityRule`
- `FailureMode`
- `Evaluation`
- `ValidatorRequirement`
- `Metric`
- `NotificationTrigger`
- `UIState`
- `Actor`
- `Artifact`

AES should normalize UI donor findings into these types:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`
- `NavigationPattern`
- `PresentationRule`

Example:
- raw donor finding:
  "The app blocks save until cookie permission is granted."
- normalized logic:
  - `PermissionRule`: save requires cookie permission
  - `UIState`: permission required
  - `Transition`: permission granted -> save enabled
  - `FailureMode`: save attempted without permission

Output:
- normalized donor logic candidates

For UI donors, the output is:
- normalized UI donor candidates

## Acceptance model

Not every donor finding becomes graph truth.

AES should separate these layers:

### Donor observation
- something seen in the donor
- may be true, partial, or misleading

### Donor candidate
- observation translated into AES logic units
- still not canonical

### Accepted graph logic
- reviewed and approved as reusable truth
- allowed to influence bridge contracts

This keeps the donor from polluting the graph with speculation.

It also keeps visual inspiration from polluting operational truth.

## Provenance and confidence

Every donor-derived unit should carry:
- donor source
- extraction date
- evidence reference
- confidence score
- acceptance status
- reviewer or validator attribution

Suggested confidence levels:
- `low`: weak inference, single clue, not safe to build from
- `medium`: supported by multiple clues, useful for planning
- `high`: directly observed behavior with clear evidence
- `validated`: behavior independently reproduced or rebuilt successfully

Only `high` and `validated` units should be allowed to affect build contracts without human review.

## Graph ingestion rules

When donor logic enters the graph, it should not overwrite canonical app truth directly.

Instead AES should ingest it as:
- donor-derived candidate logic
- linked to the target feature area
- linked to source evidence
- marked with acceptance state

For UI donors, AES should ingest accepted findings as:
- donor-derived UI candidates
- linked to `Flow`, `UIPattern`, `UIState`, or related presentation concepts
- clearly separated from operational rules unless a behavioral dependency is proven

Recommended graph behavior:
- store donor logic in a donor namespace or donor-derived layer
- link it to target operational concepts
- promote only approved items into canonical reusable logic

This lets the graph answer two different questions:
- what has been observed in donor apps
- what has been accepted as governed truth

It should also answer:
- what UI and interaction patterns have been observed
- what presentation patterns have been accepted for reuse

## Bridge contract generation

Once donor logic has been accepted, the bridge can compile it into a build contract.

The bridge should translate accepted donor logic into:
- allowed feature scope
- required states and transitions
- required permissions
- required validators
- required evidence
- required failure handling
- forbidden shortcuts

For UI donors, the bridge should translate accepted findings into:
- required screens or views
- required UI states
- required interaction patterns
- required layout constraints
- required accessibility or clarity constraints
- forbidden shortcuts such as hiding critical state or collapsing key actions

This is where donor insight becomes executable governance.

Example:
- donor logic says save must be blocked until permission is granted
- graph accepts that as a reusable rule
- bridge contract then requires:
  - blocked save state
  - permission request flow
  - validator proving save cannot happen before permission

## Builder behavior

The builder should never see the raw donor app as its main instruction source.

The builder should receive only:
- the bridge contract
- approved file read scope
- approved write paths
- approved commands
- required validators
- completion conditions

This prevents donor analysis from turning into uncontrolled copying.

The same rule applies to UI donors:
the builder should receive accepted patterns and constraints, not raw source code or direct visual copies.

## Validator role

Validators should confirm that:
- the rebuilt behavior matches the accepted donor logic
- required constraints were obeyed
- forbidden shortcuts were not used
- failure handling is real
- completion evidence is genuine

Validators should not approve based only on:
- code similarity
- prompt claims
- superficial UI similarity

The goal is behavioral proof, not imitation.

For UI donors, validators should confirm:
- the rebuilt interface preserves the accepted interaction and clarity pattern
- important states are visible
- accessibility and responsiveness requirements are met
- the design is faithful to the accepted pattern without being a direct copy

## Feedback loop

After validation, AES should write back only proven lessons.

Valid feedback examples:
- a donor-derived rule rebuilt successfully in a new feature
- a donor-derived failure mode was confirmed during testing
- a donor-derived validator requirement caught a real defect

Invalid feedback examples:
- guessed behavior
- inferred implementation details with no proof
- copied logic with no validation evidence

This ensures the graph learns from verified execution, not from reverse-engineering notes alone.

## Binary analysis role

Binary analysis belongs in the observation stage.

Its job is to answer:
- what behavior exists
- what states and transitions can be inferred
- what permissions or gates exist
- what failure handling is visible
- what parts of the donor are real operational logic

Its job is not to define canonical truth by itself.

That means Hopper is a donor evidence tool, not the source of truth.

UI donor analysis can use:
- screenshots
- live product inspection
- layout decomposition
- interaction mapping
- component inventory

Those are presentation evidence tools, not truth sources.

## Minimal AES donor artifact set

For each donor app, AES should eventually produce:
- `donor_profile`
- `donor_observations`
- `normalized_logic_candidates`
- `normalized_ui_candidates`
- `acceptance_review`
- `bridge_contract_inputs`
- `validator_requirements`
- `execution_evidence`
- `verified_lessons`

## Good first donor outcomes

A donor study is successful if it produces one or more of:
- a reusable state machine
- a reusable permission model
- a reusable failure-handling pattern
- a reusable destination or routing model
- a reusable validation rule
- a reusable notification trigger model
- a reusable screen or layout pattern
- a reusable interaction pattern
- a reusable state presentation pattern

It is not successful just because a binary was explored deeply.

## Practical rule for donor apps

If a donor app gives you a better behavior model, keep it.
If it gives you only code shape, discard it.

That is the difference between copying software and learning from software.

If a donor UI gives you a better interaction or clarity model, keep it.
If it gives you only aesthetics with no reusable value, discard it.
