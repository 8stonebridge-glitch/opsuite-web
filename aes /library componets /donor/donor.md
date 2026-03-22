# Donor Program

This file is the single-file consolidation of the AES donor program.

It keeps the donor system in one place while preserving the split source docs in `codex/`.

This file covers:
- donor foundation
- artifact schema
- graph mapping
- review workflow
- intake and packet templates
- selection workflow
- scorecard
- 9-target donor universe
- discovery boundaries
- base candidate registry
- per-target shortlists
- master donor landscape
- cross-target tradeoffs

This file stops at the selection gate.
It does not authorize donor packets, Hopper study, reverse engineering, or graph promotion.

## 1. Core model

### Core rule

Borrow behavior.
Rebuild implementation.

In AES terms:
- the donor app is evidence
- the graph is canonical truth
- the bridge is the build contract
- the builder is the constrained executor
- validators decide whether the rebuilt behavior is real

Donor findings never become truth just because they were seen in another product.
They must be:
1. observed
2. normalized
3. reviewed
4. accepted or constrained
5. promoted
6. validated in execution
7. written back only as verified lessons

### Donor classes

#### Logic donors
Use for:
- workflows
- state transitions
- permissions
- validation rules
- failure handling
- notification triggers
- routing behavior

#### UI donors
Use for:
- layout structure
- visual hierarchy
- component composition
- interaction patterns
- onboarding feel
- dashboard organization
- empty/loading/error state presentation
- motion and responsiveness

#### Hybrid donors
Use when both logic and UI value are materially useful.

### What counts as donor value

Good logic donor value:
- workflows
- state transitions
- permission gates
- visibility rules
- retry/error behavior
- notification triggers
- destination selection
- validation rules
- success/failure states
- audit/confirmation patterns

Good UI donor value:
- screen composition
- navigation structure
- form/layout patterns
- dashboard/reporting presentation
- empty/loading/success/error state presentation
- component density
- responsive behavior
- interaction pacing

### What to reject

Reject or down-rank:
- wrapper shells with little reusable behavior
- vendor-specific glue
- framework boilerplate
- minified implementation trivia
- analytics clutter
- branding-only polish
- hacks tied to one platform limitation
- aesthetics with no validator-friendly value

## 2. Artifact lifecycle

Every donor study moves through:
1. donor selected
2. donor observed
3. findings normalized
4. candidates reviewed
5. accepted items compiled into bridge inputs
6. build executed under contract
7. validators confirm or reject
8. only verified lessons go back into the graph

### Artifact set

- `donor_profile`
- `donor_observation`
- `normalized_logic_candidate`
- `normalized_ui_candidate`
- `acceptance_review`
- `bridge_contract_input`
- `validator_requirement`
- `execution_evidence`
- `verified_lesson`

### Common fields

- `id`
- `artifact_type`
- `created_at`
- `updated_at`
- `source_status`
- `confidence`
- `owner`
- `notes`

Enums:
- `source_status`: `observed`, `normalized`, `reviewed`, `accepted`, `rejected`, `validated`
- `confidence`: `low`, `medium`, `high`, `validated`
- `donor_class`: `logic`, `ui`, `hybrid`

### Concrete artifact schema

#### `donor_profile`
- `donor_name`
- `donor_class`
- `platform`
- `feature_area`
- `study_goal`
- `relevance_reason`
- `scope_boundary`

#### `donor_observation`
- `donor_profile_id`
- `feature_area`
- `observation_type`
- `evidence_type`
- `raw_evidence_ref`
- `finding_summary`
- `finding_detail`

#### `normalized_logic_candidate`
- `donor_profile_id`
- `derived_from_observation_ids`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `preconditions`
- `postconditions`
- `failure_path`
- `metric_implication`

Allowed kinds:
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
- `Actor`
- `Artifact`

#### `normalized_ui_candidate`
- `donor_profile_id`
- `derived_from_observation_ids`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `screen_name`
- `layout_notes`
- `interaction_notes`
- `accessibility_notes`
- `responsive_notes`

Allowed kinds:
- `UIPattern`
- `LayoutPattern`
- `InteractionPattern`
- `ViewState`
- `DesignConstraint`
- `NavigationPattern`
- `PresentationRule`

#### `acceptance_review`
- `donor_profile_id`
- `target_artifact_id`
- `review_scope`
- `decision`
- `review_reason`
- `reviewed_by`

#### `bridge_contract_input`
- `feature_area`
- `accepted_artifact_ids`
- `contract_scope`
- `required_outcomes`
- `forbidden_shortcuts`
- `required_validators`

#### `validator_requirement`
- `feature_area`
- `validator_kind`
- `requirement_statement`
- `pass_condition`
- `blocking_level`

#### `execution_evidence`
- `feature_area`
- `evidence_kind`
- `evidence_ref`
- `evidence_summary`
- `builder_run_id`
- `validator_run_id`

#### `verified_lesson`
- `feature_area`
- `lesson_statement`
- `verified_by_evidence_ids`
- `source_artifact_ids`
- `writeback_scope`

## 3. Graph mapping

### Graph layers

1. Donor evidence layer
2. Donor candidate layer
3. Accepted reusable layer
4. Verified lesson layer

### Node mapping

- `donor_profile` -> `DonorApp`
- `donor_observation` -> `DonorObservation`
- `normalized_logic_candidate` -> `DonorLogicCandidate`
- `normalized_ui_candidate` -> `DonorUICandidate`
- `acceptance_review` -> `DonorAcceptanceReview`
- `bridge_contract_input` -> `BridgeInput`
- `validator_requirement` -> `ValidatorRequirement`
- `execution_evidence` -> `ExecutionEvidence`
- `verified_lesson` -> `VerifiedLesson`

### Key edges

- `DonorApp` -> `HAS_OBSERVATION` -> `DonorObservation`
- `DonorObservation` -> `NORMALIZED_AS` -> `DonorLogicCandidate`
- `DonorObservation` -> `NORMALIZED_AS` -> `DonorUICandidate`
- candidate -> `REVIEWED_BY` -> `DonorAcceptanceReview`
- accepted logic candidate -> `PROMOTED_TO_RULE` / `PROMOTED_TO_STATE` / `PROMOTED_TO_FAILURE_MODE`
- accepted UI candidate -> `PROMOTED_TO_UI_PATTERN` / `PROMOTED_TO_FLOW`
- accepted donor-derived nodes -> `FEEDS_BRIDGE_INPUT` -> `BridgeInput`
- `BridgeInput` -> `REQUIRES_VALIDATOR` -> `ValidatorRequirement`
- `ValidatorRequirement` -> `PRODUCES_EVIDENCE` -> `ExecutionEvidence`
- `ExecutionEvidence` -> `PROVES` -> `VerifiedLesson`

### Canonical boundary rules

- `DonorObservation` never drives bridge generation directly
- donor candidates are provisional until review
- UI-derived material may influence `UIPattern`, `Flow`, and presentation constraints only
- UI-derived material may not define backend truth by itself
- only accepted or validated donor-derived nodes may feed `BridgeInput`
- only verified lessons may be written back as reusable guidance

## 4. Review workflow

### Review roles

- `Extractor`
  Creates observations and normalized candidates
- `Domain reviewer`
  Confirms product fit and canonical concept mapping
- `Design reviewer`
  Reviews UI donor value
- `Governance reviewer`
  Decides constraints and bridge safety
- `Validator owner`
  Defines what later proves the donor-derived behavior

### Review scopes

- `logic`
- `ui`
- `hybrid`

### Review decisions

- `accept`
- `accept_with_constraints`
- `needs_more_evidence`
- `reject`

### Evidence sufficiency

Logic candidates should usually require:
- direct procedural evidence
- repeated UI behavior observation
- corroborating strings plus flow evidence
- network/config evidence plus runtime behavior

UI candidates should usually require:
- visible screen evidence
- interaction evidence
- enough detail to describe the pattern without copying it

### Promotion rules

Candidates may be promoted only if:
- review decision is `accept` or `accept_with_constraints`
- validators are attached
- target AES concepts are identified
- provenance is preserved

## 5. Working templates

### Donor intake template

Use before any study begins.

```md
# Donor Intake
- donor_name:
- donor_class: logic | ui | hybrid
- platform:
- version:
- source_location:
- analyst:
- intake_date:
- target_feature_area:
- target_work_item_type:
- target_flow:
- target_ui_surface:
- target_operational_concepts:
- target_ui_concepts:
- study_goal:
- relevance_reason:
- expected_reusable_value:
- out_of_scope:
- exact_surface_in_scope:
- exact_surface_out_of_scope:
- depth_limit:
- evidence_methods:
- expected_evidence_artifacts:
- expected_limitations:
- review_scope:
- expected_risk_level:
- likely_required_reviewers:
- likely_required_validators:
```

### Donor study packet template

Use only after a donor is chosen.

```md
# Donor Study Packet
- packet_id:
- donor_name:
- donor_class:
- feature_area:
- packet_status:

## Intake Summary
- study_goal:
- relevance_reason:
- expected_reusable_value:

## Donor Observations
- observation_id:
- evidence_type:
- raw_evidence_ref:
- finding_summary:

## Normalized Logic Candidates
- candidate_id:
- candidate_kind:
- canonical_statement:

## Normalized UI Candidates
- candidate_id:
- candidate_kind:
- canonical_statement:

## Review Decisions
- review_id:
- target_artifact_id:
- decision:
- review_reason:

## Bridge-Ready Outputs
- bridge_input_id:
- required_outcomes:
- forbidden_shortcuts:
- required_validators:

## Validator Requirements
- validator_id:
- requirement_statement:
- pass_condition:

## Execution Evidence
- evidence_id:
- evidence_ref:
- evidence_summary:

## Verified Lessons
- lesson_id:
- lesson_statement:
- writeback_scope:
```

## 6. Selection workflow

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

### Scorecard

Each candidate is scored `1-5` across:
- feature relevance
- reusable logic depth
- reusable UI value
- evidence accessibility
- portability
- governance fit
- low-noise score
- scope control
- validator friendliness

Weighting:
- logic targets weight logic depth higher
- UI targets weight UI value higher
- hybrid targets weight both

## 7. Official 9-target donor universe

1. `approval_workflow`
2. `reporting`
3. `onboarding`
4. `notification_system`
5. `app_shell`
6. `shared_frontend_system`
7. `backend_platform`
8. `qa_release_hardening`
9. `launch_ops_layer`

### Target registry

| Target | Primary donor mode | Secondary donor mode | Default risk | Selection priority |
|---|---|---|---|---|
| `approval_workflow` | logic | hybrid | high | state authority, approval gates, audit discipline |
| `reporting` | hybrid | ui | medium | dashboard clarity, freshness, drill-down usability |
| `onboarding` | hybrid | ui | medium | activation flow, resume logic, guided progression |
| `notification_system` | logic | hybrid | high | inbox behavior, causality, read-state and preference discipline |
| `app_shell` | ui | hybrid | medium | navigation, density, information hierarchy, shell clarity |
| `shared_frontend_system` | ui | hybrid | low | reusable patterns, consistency, dashboard building blocks |
| `backend_platform` | logic | hybrid | high | platform reliability, auth/data/deploy boundaries, operator clarity |
| `qa_release_hardening` | logic | hybrid | high | release gates, observability, rollback and defect containment |
| `launch_ops_layer` | logic | hybrid | high | controlled rollout, telemetry, flags, incident-aware launch discipline |

## 8. Discovery universe

### First-pass donor sources

- strong B2B SaaS products
- workflow-heavy collaboration and operations products
- high-quality desktop/web hybrids
- modern developer platforms
- release, observability, and launch-control products
- strong dashboard and admin UIs
- reputable UI kits and admin templates
- locally installed apps already available on this machine

### Allowed first-pass evidence methods

- product website and docs review
- public UI inspection
- installed-app inventory
- high-level bundle or surface inspection
- known product behavior already observed locally

### Not allowed in first pass

- Hopper analysis
- binary reverse engineering
- deep network capture
- donor packets
- graph promotion

### Local installed apps considered

| App | Likely role | Status |
|---|---|---|
| `Canva.app` | onboarding/app shell UI reserve | retained |
| `Microsoft Outlook.app` | notification inbox reserve | retained |
| `Spark Desktop.app` | notification UI reserve | reserve only |
| `Notion Web Clipper.app` | wrapper-heavy local app | filtered from first-pass logic use |

### Hard filters

- weak feature relevance
- wrapper-heavy behavior
- inaccessible evidence
- extreme platform lock-in
- high branding/noise ratio
- low validator potential

## 9. Base candidate registry

### Base scoring columns

- `L` = reusable logic depth
- `UI` = reusable UI value
- `E` = evidence accessibility
- `P` = portability
- `G` = governance fit
- `Clean` = low-noise score
- `Scope` = scope control
- `Val` = validator friendliness

### Base registry

| Candidate | Class | Platform/source | L | UI | E | P | G | Clean | Scope | Val | Likely targets | Notes |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| `Jira Service Management` | hybrid | web SaaS | 5 | 3 | 3 | 4 | 5 | 3 | 3 | 5 | AW, QA | strong governed workflow donor |
| `ServiceNow` | hybrid | web SaaS | 5 | 3 | 3 | 3 | 5 | 2 | 2 | 4 | AW, QA | high-governance, high-complexity donor |
| `Brex` | hybrid | web SaaS | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 5 | AW | strong spend-approval donor |
| `Ramp` | hybrid | web SaaS | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 5 | AW | strong approval-policy donor |
| `GitHub` | hybrid | web | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | AW, NOTIF, SHELL, BACK, QA, LAUNCH | strongest governance-friendly cross-target donor |
| `GitLab` | hybrid | web SaaS | 5 | 4 | 4 | 5 | 5 | 3 | 4 | 5 | AW, BACK, QA | release and approval discipline donor |
| `Linear` | hybrid | web SaaS | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | REP, ONB, NOTIF, SHELL, FRONT | strongest low-noise hybrid donor |
| `Asana` | hybrid | web SaaS | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | AW, ONB, NOTIF, SHELL | balanced workflow donor |
| `Slack` | hybrid | web/desktop | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | ONB, NOTIF, LAUNCH | strong inbox and activation donor |
| `Notion` | hybrid | web | 3 | 5 | 4 | 4 | 3 | 3 | 3 | 3 | ONB, NOTIF, SHELL | UI value high, governance fit lower |
| `Vercel` | hybrid | web SaaS | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | REP, SHELL, FRONT, BACK, QA, LAUNCH | strongest hybrid platform donor |
| `LaunchDarkly` | hybrid | web SaaS | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | QA, LAUNCH | strongest launch-control donor |
| `PostHog` | hybrid | web SaaS | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | REP, NOTIF, QA, LAUNCH | analytics + launch feedback donor |
| `Sentry` | hybrid | web SaaS | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | BACK, QA, LAUNCH | issue and release observability donor |
| `Datadog` | hybrid | web SaaS | 4 | 4 | 4 | 4 | 5 | 3 | 3 | 5 | REP, BACK, QA, LAUNCH | ops reporting donor |
| `Metabase` | hybrid | web SaaS | 3 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | REP, FRONT | strongest portable reporting donor |
| `Grafana` | hybrid | web SaaS | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 4 | REP, LAUNCH | observability dashboard donor |
| `Convex` | logic | web platform | 5 | 3 | 5 | 4 | 5 | 5 | 4 | 5 | BACK | strongest backend-core logic donor |
| `Supabase` | hybrid | web platform | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | BACK | broad backend platform donor |
| `Clerk` | hybrid | web platform | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | ONB, FRONT, BACK | strongest auth/setup donor |
| `shadcn/ui` | ui | UI kit | 2 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | SHELL, FRONT | strongest portable UI-system donor |
| `Tailwind UI` | ui | UI kit | 2 | 5 | 4 | 5 | 3 | 5 | 5 | 3 | SHELL, FRONT | polished application UI donor |
| `Tremor` | ui | UI kit | 2 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | REP, FRONT | strongest dashboard UI-kit donor |
| `Refine` | hybrid | admin toolkit | 3 | 4 | 5 | 5 | 4 | 4 | 4 | 4 | FRONT | admin-system donor |
| `Outlook` | hybrid | local desktop app | 3 | 4 | 5 | 3 | 4 | 3 | 4 | 3 | NOTIF | local inbox donor reserve |
| `Canva` | ui | local desktop app | 2 | 5 | 4 | 4 | 3 | 4 | 4 | 2 | ONB, SHELL | local UI-polish reserve |

## 10. Per-target shortlists

### approval_workflow

Filtered pool:
- `GitHub` 4.60
- `Ramp` 4.51
- `Brex` 4.51
- `GitLab` 4.37
- `Jira Service Management` 4.14
- `Asana` 3.86

Shortlist:
1. `GitHub` — strongest validator-friendly review and approval donor
2. `Ramp` — strongest direct approval-policy donor
3. `Brex` — strong sign-off and reviewer-accountability donor
4. `GitLab` — strong multi-stage review donor
5. `Jira Service Management` — enterprise queue and escalation reserve donor

Recommendation:
- strongest portable workflow donor: `GitHub`
- strongest direct business approval donor: `Ramp`

### reporting

Filtered pool:
- `Vercel` 4.76
- `Metabase` 4.53
- `Linear` 4.42
- `Grafana` 4.34
- `Tremor` 4.26
- `Datadog` 4.16
- `PostHog` 4.11

Shortlist:
1. `Vercel` — strongest hybrid reporting donor
2. `Metabase` — strongest portable reporting donor
3. `Linear` — compact low-noise reporting donor
4. `Grafana` — dense ops-reporting donor
5. `Tremor` — strongest pure dashboard UI donor

Recommendation:
- easiest first donor: `Metabase`
- strongest ops-heavy donor: `Grafana`

### onboarding

Filtered pool:
- `Clerk` 4.66
- `Linear` 4.42
- `Slack` 4.32
- `Asana` 4.00
- `Notion` 3.61
- `Canva` 3.55

Shortlist:
1. `Clerk` — strongest auth/setup donor
2. `Linear` — strongest onboarding-feel donor
3. `Slack` — strongest team-activation donor
4. `Asana` — balanced guided-flow donor
5. `Notion` — UI-heavy reserve donor

Recommendation:
- enterprise-safe onboarding logic: `Clerk`
- easiest first donor: `Linear`

### notification_system

Filtered pool:
- `GitHub` 4.74
- `Linear` 4.51
- `Slack` 4.34
- `Asana` 4.00
- `PostHog` 3.97
- `Outlook` 3.63

Shortlist:
1. `GitHub` — strongest governed inbox donor
2. `Linear` — strongest polished work-inbox donor
3. `Slack` — strongest routing/urgency donor
4. `Asana` — balanced task-linked notification donor
5. `Outlook` — local desktop inbox reserve donor

Recommendation:
- strongest logic donor: `GitHub`
- strongest design donor: `Linear`

### app_shell

Filtered pool:
- `Vercel` 4.89
- `GitHub` 4.66
- `Linear` 4.60
- `shadcn/ui` 4.46
- `Tailwind UI` 4.11
- `Asana` 4.00

Shortlist:
1. `Vercel` — strongest shell framing donor
2. `GitHub` — strongest dense shell donor
3. `Linear` — strongest low-noise shell donor
4. `shadcn/ui` — strongest portable shell primitive donor
5. `Tailwind UI` — polished shell reserve donor

Recommendation:
- portable shell primitives: `shadcn/ui`
- strongest product shell: `Vercel`

### shared_frontend_system

Filtered pool:
- `Vercel` 4.74
- `shadcn/ui` 4.60
- `Tremor` 4.60
- `Metabase` 4.51
- `Linear` 4.46
- `Clerk` 4.43
- `Refine` 4.31

Shortlist:
1. `shadcn/ui` — strongest portable UI-system donor
2. `Tremor` — strongest dashboard UI-system donor
3. `Vercel` — strongest hybrid system donor
4. `Metabase` — strongest reporting-oriented system donor
5. `Refine` — strongest admin-system donor

Recommendation:
- easiest first donor: `shadcn/ui`
- strongest dashboard-system donor: `Tremor`

### backend_platform

Filtered pool:
- `Vercel` 4.89
- `Clerk` 4.71
- `Convex` 4.69
- `GitHub` 4.60
- `GitLab` 4.37
- `Supabase` 4.26

Shortlist:
1. `Vercel` — strongest hybrid platform donor
2. `Clerk` — strongest auth/platform donor
3. `Convex` — strongest backend-core logic donor
4. `GitHub` — strong developer platform donor
5. `Supabase` — backend platform reserve donor

Recommendation:
- backend-core clarity: `Convex`
- auth/setup clarity: `Clerk`
- operator-facing platform UX: `Vercel`

### qa_release_hardening

Filtered pool:
- `Vercel` 4.89
- `GitHub` 4.74
- `LaunchDarkly` 4.63
- `GitLab` 4.51
- `Sentry` 4.49
- `Datadog` 4.17

Shortlist:
1. `Vercel` — strongest preview-driven release confidence donor
2. `GitHub` — strongest workflow-gate donor
3. `LaunchDarkly` — strongest runtime release-control donor
4. `Sentry` — strongest issue/release observability donor
5. `GitLab` — strong release-pipeline reserve donor

Recommendation:
- deploy confidence: `Vercel`
- controlled launch gates: `LaunchDarkly`

### launch_ops_layer

Filtered pool:
- `Vercel` 4.89
- `LaunchDarkly` 4.63
- `GitHub` 4.60
- `Sentry` 4.49
- `PostHog` 4.26
- `Grafana` 4.23

Shortlist:
1. `Vercel` — strongest deployment-linked launch donor
2. `LaunchDarkly` — strongest pure launch-control donor
3. `Sentry` — strongest issue-aware launch donor
4. `PostHog` — strongest telemetry-feedback donor
5. `GitHub` — workflow-linked launch reserve donor

Recommendation:
- rollout control: `LaunchDarkly`
- deployment-linked launch ops: `Vercel`

## 11. Master donor landscape

### Highest-coverage donors

- `Vercel`
- `GitHub`
- `Linear`
- `Clerk`
- `LaunchDarkly`
- `Metabase`
- `shadcn/ui`

### Strongest donors by class

Logic-heavy:
- `Convex`
- `LaunchDarkly`
- `GitHub`
- `Ramp`
- `Brex`

UI-heavy:
- `shadcn/ui`
- `Tremor`
- `Tailwind UI`
- `Canva`

Hybrid:
- `Vercel`
- `GitHub`
- `Linear`
- `Clerk`
- `Metabase`

### Easiest first donors

- `shadcn/ui`
- `Metabase`
- `GitHub`
- `Linear`
- `Clerk`

### Highest portability donors

- `GitHub`
- `Vercel`
- `shadcn/ui`
- `Metabase`
- `Tremor`
- `Clerk`

### Highest governance-fit donors

- `GitHub`
- `LaunchDarkly`
- `Vercel`
- `Clerk`
- `Convex`
- `Jira Service Management`

### Highest noise-risk donors

- `ServiceNow`
- `Notion`
- `Canva`
- `Outlook`
- `Notion Web Clipper.app`

### Best donor by intent

| If the goal is... | Start from... |
|---|---|
| strongest single cross-target hybrid donor | `Vercel` |
| strongest workflow/governance donor | `GitHub` |
| strongest approval-specific donor | `Ramp` |
| strongest reporting-first donor | `Metabase` |
| strongest onboarding/auth donor | `Clerk` |
| strongest notification inbox donor | `GitHub` or `Linear` |
| strongest shared UI system donor | `shadcn/ui` |
| strongest launch-control donor | `LaunchDarkly` |

## 12. Cross-target tradeoffs

### `Vercel` vs `GitHub`

- `Vercel`
  - strongest platform-shell-reporting-release hybrid donor
  - best if you want one donor with broad product-and-platform coverage
- `GitHub`
  - strongest governance-friendly workflow donor
  - best if you want state, review, notification, and release discipline

### `Ramp` / `Brex` vs `GitHub`

- `Ramp` / `Brex`
  - better for direct business approval logic
- `GitHub`
  - better for reusable review-state logic and validator pathways

### `Metabase` vs `Vercel` vs `Grafana`

- `Metabase`
  - best portable reporting donor
- `Vercel`
  - best polished hybrid reporting donor
- `Grafana`
  - best ops-heavy dashboard donor

### `Clerk` vs `Linear` vs `Slack`

- `Clerk`
  - best for auth handoff and enterprise-safe onboarding
- `Linear`
  - best for onboarding feel and low-noise setup flow
- `Slack`
  - best for team activation and collaborative onboarding

### `GitHub` vs `Linear` vs `Slack`

- `GitHub`
  - strongest notification logic donor
- `Linear`
  - strongest notification UI donor
- `Slack`
  - strongest routing/urgency donor

### `shadcn/ui` vs `Tremor` vs `Vercel`

- `shadcn/ui`
  - strongest portable shared UI system donor
- `Tremor`
  - strongest reporting/dashboard UI-kit donor
- `Vercel`
  - strongest hybrid shell/system donor

### `Convex` vs `Clerk` vs `Vercel`

- `Convex`
  - strongest backend-core logic donor
- `Clerk`
  - strongest auth/platform donor
- `Vercel`
  - strongest deploy/operator-facing platform donor

### `LaunchDarkly` vs `Vercel` vs `Sentry`

- `LaunchDarkly`
  - strongest rollout-control donor
- `Vercel`
  - strongest deployment-linked launch donor
- `Sentry`
  - strongest issue-aware launch donor

### Most useful donor combinations

- approval + notifications:
  `GitHub` + `Ramp`
- reporting + shared frontend:
  `Metabase` + `Tremor`
- onboarding + backend platform:
  `Clerk` + `Linear`
- shell + shared frontend:
  `Vercel` + `shadcn/ui`
- release hardening + launch ops:
  `Vercel` + `LaunchDarkly` + `Sentry`

## 13. Selection gate

This file reaches, but does not cross, the selection gate.

Ready:
- official 9-target donor universe
- discovery boundaries
- candidate registry
- per-target shortlists
- master donor landscape
- cross-target tradeoffs

Not started:
- donor intake
- donor packets
- Hopper study
- reverse engineering
- graph promotion
- bridge generation from donor findings

## Final rule

Human input chooses donor order from here.

This file is a governed decision surface, not a donor study.
