# Donor Graph Mapping Spec

This document defines how donor artifacts should map into the AES graph.

It follows the donor model in:
- [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
- [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)

The goal is to make donor findings graph-usable without allowing raw donor observations to overwrite canonical truth.

## Core rule

The graph must distinguish:
- what was observed in a donor
- what was normalized into a candidate
- what was accepted for reuse
- what was validated in execution

Observed donor evidence is not the same thing as canonical operational truth.

## Graph layers

AES should represent donor material in four layers.

### 1. Donor evidence layer

This stores raw donor context and observations.

Purpose:
- provenance
- traceability
- evidence review

This layer should not drive builds directly.

### 2. Donor candidate layer

This stores normalized logic and UI candidates derived from observations.

Purpose:
- structured review
- mapping into AES concepts
- acceptance workflow

This layer can inform review, but should not drive builds unless accepted.

### 3. Accepted reusable layer

This stores donor-derived logic and UI patterns that have been approved for reuse.

Purpose:
- bridge generation
- validator generation
- reusable pattern lookup

This is the first donor-derived layer that may influence build contracts.

### 4. Verified lesson layer

This stores donor-derived knowledge that has been proven in implementation.

Purpose:
- graph writeback
- bridge template improvement
- validator library improvement

This is the highest-trust donor-derived layer.

## Node mapping

### donor_profile -> `DonorApp`

Represents the donor being studied.

Fields:
- `donor_id`
- `name`
- `donor_class`
- `platform`
- `feature_area`
- `study_goal`
- `relevance_reason`
- `scope_boundary`
- `version`
- `created_at`

Notes:
- one `DonorApp` can support many observations
- `donor_class` should be `logic`, `ui`, or `hybrid`

### donor_observation -> `DonorObservation`

Represents a raw observed finding.

Fields:
- `observation_id`
- `feature_area`
- `observation_type`
- `evidence_type`
- `raw_evidence_ref`
- `finding_summary`
- `finding_detail`
- `confidence`
- `created_at`

Optional:
- `address_or_symbol`
- `file_or_resource`
- `network_ref`
- `screenshot_ref`
- `ui_flow_ref`
- `ambiguities`

Notes:
- this is evidence, not truth

### normalized_logic_candidate -> `DonorLogicCandidate`

Represents donor-derived operational logic that is ready for review.

Fields:
- `candidate_id`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `confidence`
- `preconditions`
- `postconditions`
- `failure_path`
- `metric_implication`
- `created_at`

Notes:
- this is still not canonical truth

### normalized_ui_candidate -> `DonorUICandidate`

Represents donor-derived UI or interaction logic that is ready for review.

Fields:
- `candidate_id`
- `candidate_kind`
- `canonical_statement`
- `target_feature_area`
- `confidence`
- `screen_name`
- `layout_notes`
- `interaction_notes`
- `accessibility_notes`
- `responsive_notes`
- `created_at`

Notes:
- UI candidates must remain separate from backend truth

### acceptance_review -> `DonorAcceptanceReview`

Represents the decision to accept, constrain, defer, or reject a donor candidate.

Fields:
- `review_id`
- `review_scope`
- `decision`
- `review_reason`
- `reviewed_by`
- `created_at`

Optional:
- `required_follow_up`
- `human_override`

### bridge_contract_input -> `BridgeInput`

Represents donor-derived material approved to influence bridge generation.

Fields:
- `bridge_input_id`
- `feature_area`
- `contract_scope`
- `required_outcomes`
- `forbidden_shortcuts`
- `required_validators`
- `approved_filescope`
- `approved_write_paths`
- `approved_commands`
- `required_evidence`
- `created_at`

Notes:
- this can be joined with non-donor AES bridge inputs
- donor provenance must remain linked

### validator_requirement -> `ValidatorRequirement`

If your graph already has `Evaluation` or validator concepts, map into them instead of duplicating.

Fields:
- `validator_id`
- `validator_kind`
- `requirement_statement`
- `pass_condition`
- `blocking_level`
- `created_at`

Notes:
- donor-derived validator requirements should be tagged as donor-derived

### execution_evidence -> `ExecutionEvidence`

If your graph already has `Evidence`, `AuditLog`, or `SystemEvent`, reuse those surfaces.

Fields:
- `evidence_id`
- `feature_area`
- `evidence_kind`
- `evidence_ref`
- `evidence_summary`
- `builder_run_id`
- `validator_run_id`
- `produced_at`

### verified_lesson -> `VerifiedLesson`

Represents proven donor-derived knowledge allowed to enrich AES.

Fields:
- `lesson_id`
- `feature_area`
- `lesson_statement`
- `writeback_scope`
- `created_at`

Optional:
- `failure_if_ignored`
- `recommended_validator_pattern`

## Edge mapping

### Donor identity edges

- `DonorApp` -> `TARGETS_FEATURE_AREA` -> `FeatureType`
- `DonorApp` -> `STUDIES_FLOW` -> `Flow`
- `DonorApp` -> `STUDIES_WORK_ITEM_TYPE` -> `WorkItemType`

Use only the edges that fit the donor scope.

### Observation edges

- `DonorApp` -> `HAS_OBSERVATION` -> `DonorObservation`
- `DonorObservation` -> `OBSERVED_IN_CONTEXT_OF` -> `FeatureType`

If known, observations may also link to:
- `Flow`
- `State`
- `Rule`
- `UIPattern`

These observation-time links should be marked as non-canonical.

### Normalization edges

- `DonorObservation` -> `NORMALIZED_AS` -> `DonorLogicCandidate`
- `DonorObservation` -> `NORMALIZED_AS` -> `DonorUICandidate`

Candidates may also map tentatively to AES concepts:
- `DonorLogicCandidate` -> `CANDIDATE_FOR_STATE` -> `State`
- `DonorLogicCandidate` -> `CANDIDATE_FOR_RULE` -> `Rule`
- `DonorLogicCandidate` -> `CANDIDATE_FOR_FAILURE_MODE` -> `FailureMode`
- `DonorLogicCandidate` -> `CANDIDATE_FOR_EVALUATION` -> `Evaluation`
- `DonorLogicCandidate` -> `CANDIDATE_FOR_METRIC` -> `Metric`
- `DonorLogicCandidate` -> `CANDIDATE_FOR_NOTIFICATION_TRIGGER` -> `Notification`

- `DonorUICandidate` -> `CANDIDATE_FOR_UI_PATTERN` -> `UIPattern`
- `DonorUICandidate` -> `CANDIDATE_FOR_FLOW` -> `Flow`
- `DonorUICandidate` -> `CANDIDATE_FOR_VIEW_STATE` -> `State`

The key rule:
candidate edges are provisional, not canonical.

### Review edges

- `DonorLogicCandidate` -> `REVIEWED_BY` -> `DonorAcceptanceReview`
- `DonorUICandidate` -> `REVIEWED_BY` -> `DonorAcceptanceReview`

Review outcomes:
- accepted
- accepted with constraints
- needs more evidence
- rejected

### Promotion edges

Accepted logic candidates should promote through explicit edges such as:
- `DonorLogicCandidate` -> `PROMOTED_TO_RULE` -> `Rule`
- `DonorLogicCandidate` -> `PROMOTED_TO_STATE` -> `State`
- `DonorLogicCandidate` -> `PROMOTED_TO_FAILURE_MODE` -> `FailureMode`
- `DonorLogicCandidate` -> `PROMOTED_TO_EVALUATION` -> `Evaluation`
- `DonorLogicCandidate` -> `PROMOTED_TO_METRIC` -> `Metric`

Accepted UI candidates should promote through explicit edges such as:
- `DonorUICandidate` -> `PROMOTED_TO_UI_PATTERN` -> `UIPattern`
- `DonorUICandidate` -> `PROMOTED_TO_FLOW` -> `Flow`
- `DonorUICandidate` -> `PROMOTED_TO_DESIGN_CONSTRAINT` -> `UIPattern`

Only promotion edges should allow donor material to affect bridge generation.

### Bridge edges

- accepted donor-derived nodes -> `FEEDS_BRIDGE_INPUT` -> `BridgeInput`
- `BridgeInput` -> `REQUIRES_VALIDATOR` -> `ValidatorRequirement`
- `BridgeInput` -> `CONSTRAINS_FEATURE` -> `FeatureType`
- `BridgeInput` -> `CONSTRAINS_FLOW` -> `Flow`

### Execution and feedback edges

- `BridgeInput` -> `VALIDATED_BY` -> `ValidatorRequirement`
- `ValidatorRequirement` -> `PRODUCES_EVIDENCE` -> `ExecutionEvidence`
- `ExecutionEvidence` -> `PROVES` -> `VerifiedLesson`
- `VerifiedLesson` -> `UPDATES_BRIDGE_TEMPLATE` -> `FeatureSpec`
- `VerifiedLesson` -> `ENRICHES_RULE` -> `Rule`
- `VerifiedLesson` -> `ENRICHES_UI_PATTERN` -> `UIPattern`
- `VerifiedLesson` -> `ENRICHES_VALIDATOR_LIBRARY` -> `Evaluation`

## Canonical boundary rules

These rules are the safety boundary.

### Rule 1

`DonorObservation` nodes never drive bridge generation directly.

### Rule 2

`DonorLogicCandidate` and `DonorUICandidate` nodes never become canonical without explicit review.

### Rule 3

UI-derived nodes may influence:
- `UIPattern`
- `Flow`
- presentation constraints
- view-state visibility

UI-derived nodes may not define by themselves:
- backend permission truth
- audit truth
- data ownership truth
- workflow authority

### Rule 4

Only accepted or validated donor-derived nodes may feed `BridgeInput`.

### Rule 5

Only verified lessons may be written back as reusable guidance.

## Mapping into your current AES concepts

Based on your current architecture, donor mappings should prefer these existing concepts:

- operational logic:
  - `WorkItemType`
  - `State`
  - `Rule`
  - `FailureMode`
  - `Evaluation`
  - `Metric`
  - `Flow`
  - `Notification`
  - `Approval`
  - `AuditLog`

- UI and execution planning:
  - `UIPattern`
  - `FeatureType`
  - `FeatureSpec`
  - `FeatureConsultation`

Recommended fit:
- donor evidence stays in a donor namespace
- accepted donor logic promotes into operations concepts
- accepted donor UI promotes into UI pattern and flow concepts
- proven lessons enrich `FeatureSpec`, `Evaluation`, `Rule`, and `UIPattern`

## Minimal graph addition set

If you want the smallest viable graph extension, add only:
- `DonorApp`
- `DonorObservation`
- `DonorLogicCandidate`
- `DonorUICandidate`
- `DonorAcceptanceReview`
- `VerifiedLesson`

Then reuse existing nodes for:
- `Rule`
- `State`
- `Flow`
- `Evaluation`
- `Metric`
- `UIPattern`
- `FeatureSpec`

This keeps the model small while preserving provenance.

## Example mapping

### Logic donor example

Observation:
- donor app blocks submission until required permissions are granted

Graph mapping:
- `DonorObservation`
- `DonorLogicCandidate(candidate_kind=PermissionRule)`
- `DonorAcceptanceReview(decision=accept)`
- `PROMOTED_TO_RULE` -> `Rule`
- promoted `Rule` -> `FEEDS_BRIDGE_INPUT` -> `BridgeInput`
- `BridgeInput` -> `REQUIRES_VALIDATOR` -> `ValidatorRequirement`

### UI donor example

Observation:
- donor dashboard shows a clear empty state with a reset-filter action

Graph mapping:
- `DonorObservation`
- `DonorUICandidate(candidate_kind=ViewState)`
- `DonorAcceptanceReview(decision=accept)`
- `PROMOTED_TO_UI_PATTERN` -> `UIPattern`
- promoted `UIPattern` -> `FEEDS_BRIDGE_INPUT` -> `BridgeInput`
- `BridgeInput` -> `REQUIRES_VALIDATOR` -> `ValidatorRequirement`

## Final rule

If the graph cannot tell the difference between:
- observed donor evidence
- accepted reusable logic
- proven execution lessons

then the donor system is unsafe.
