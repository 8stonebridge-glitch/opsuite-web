# Pattern Library Schema

This schema defines how donor-derived patterns should be stored in the AES pattern library.

The library is the reusable layer above one-off donor studies.

## Core principle

Every library entry must be:
- donor-backed
- evidence-backed
- validator-backed
- bridge-usable

## Entry schema

Required fields:
- `id`
- `pattern_name`
- `pattern_family`
- `pattern_type`
- `summary`
- `source_donors`
- `source_artifact_ids`
- `evidence_refs`
- `accepted_components`
- `validator_bundle_ids`
- `bridge_preset_ids`
- `confidence`
- `reuse_scope`
- `status`
- `created_at`
- `updated_at`

Optional fields:
- `target_features`
- `anti_patterns`
- `known_limits`
- `preferred_combinations`
- `supersedes`
- `notes`

## Enums

### pattern_family
- `workflow`
- `notification`
- `billing`
- `collaboration`
- `onboarding`
- `operator_console`
- `app_shell`
- `frontend_system`
- `release_ops`

### pattern_type
- `core_model`
- `ui_model`
- `ops_model`
- `validator_bundle`
- `bridge_preset`
- `scenario_pack`
- `metric_pack`
- `audit_pack`
- `release_bundle`

### confidence
- `medium`
- `high`
- `validated`

### status
- `draft`
- `accepted`
- `validated`
- `deprecated`

## Accepted components

`accepted_components` should list the exact normalized artifacts used to build the entry.

Examples:
- `linear-logic-005`
- `linear-ui-006`
- `github-logic-001`
- `stripe-ui-003`

## Reuse scope

`reuse_scope` should be specific.

Examples:
- `notification inboxes with triage`
- `issue-centric work detail views`
- `payment recovery operator consoles`
- `workspace onboarding with membership context`

## Anti-patterns

Each entry should record what it does not justify.

Examples:
- `does not justify donor-specific wording`
- `does not justify hidden permissions`
- `does not justify copying visual branding`

## Preferred combinations

Patterns are stronger when paired.

Examples:
- `github_notification_triage` + `slack_collaboration_shell`
- `linear_work_item_detail` + `github_review_gate`
- `stripe_recovery_console` + `stripe_mode_clarity`

## Example entry

```json
{
  "id": "pattern-linear-work-item-detail",
  "pattern_name": "Linear Work Item Detail",
  "pattern_family": "workflow",
  "pattern_type": "ui_model",
  "summary": "Keeps state, metadata, collaboration, and next actions attached to the same work object.",
  "source_donors": ["Linear"],
  "source_artifact_ids": ["linear-ui-005", "linear-logic-004", "linear-logic-005"],
  "evidence_refs": [
    "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-detail.yml",
    "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-in-progress.yml"
  ],
  "accepted_components": ["linear-ui-005", "linear-logic-004", "linear-logic-005"],
  "validator_bundle_ids": ["workflow-detail-bundle"],
  "bridge_preset_ids": ["work-item-detail-preset"],
  "confidence": "validated",
  "reuse_scope": "issue-style work detail views",
  "status": "accepted",
  "created_at": "2026-03-21",
  "updated_at": "2026-03-21",
  "anti_patterns": [
    "do not split state and activity across unrelated screens"
  ],
  "preferred_combinations": [
    "github-notification-triage"
  ]
}
```

## Packaging rules

Each library entry should include:
- one sentence summary
- exact evidence refs
- exact donor-derived components
- validator references
- bridge preset references
- reuse scope

Do not publish entries that lack:
- evidence refs
- accepted components
- validator references

## Promotion rules

An entry can become `accepted` when:
- all source artifacts are accepted
- at least one validator bundle exists
- reuse scope is specific

An entry can become `validated` when:
- it has been used in a rebuild
- validators passed in that rebuild
- the lesson writeback confirms the pattern held

## Library organization

Recommended grouping:
- by `pattern_family`
- then by `pattern_type`
- then by donor lineage

Recommended naming:
- `<donor>-<pattern-purpose>`

Examples:
- `linear-work-item-detail`
- `github-notification-triage`
- `stripe-recovery-console`
- `slack-collaboration-shell`
- `clerk-org-activation`

## Final rule

The pattern library should be the reusable memory of AES app building.

It stores proven patterns, not inspiration scraps.
