# Donor Program Index

This is the index for the AES donor-program documents in `codex`.

The donor program is the governed path for learning from existing apps without copying them.

## Document order

### Foundation

1. [donor_logic_ingestion_model.md](/Users/sunday/Desktop/web2/codex/donor/donor_logic_ingestion_model.md)
   Defines what donor logic is, what UI donor value is, and the core ingestion model.

2. [donor_artifact_schema.md](/Users/sunday/Desktop/web2/codex/donor/donor_artifact_schema.md)
   Defines the concrete donor artifacts and fields for logic and UI findings.

3. [donor_graph_mapping_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_graph_mapping_spec.md)
   Defines how donor artifacts map into the AES graph without polluting canonical truth.

4. [donor_review_workflow_spec.md](/Users/sunday/Desktop/web2/codex/donor/donor_review_workflow_spec.md)
   Defines the review membrane between donor findings and bridge inputs.

5. [ui_extraction_format.md](/Users/sunday/Desktop/web2/codex/donor/ui_extraction_format.md)
   Defines the exact screen-by-screen UI capture format for Playwright-based donor studies.

6. [derived_pattern_taxonomy.md](/Users/sunday/Desktop/web2/codex/donor/derived_pattern_taxonomy.md)
   Defines the reusable build grammar AES can derive from donor studies beyond raw logic and UI capture.

7. [derived_output_catalog.md](/Users/sunday/Desktop/web2/codex/donor/derived_output_catalog.md)
   Defines the concrete reusable deliverables AES should produce from donor-derived patterns.

8. [pattern_library_schema.md](/Users/sunday/Desktop/web2/codex/donor/pattern_library_schema.md)
   Defines how donor-backed patterns should be stored and reused in the AES pattern library.

9. [pattern_library_entries.md](/Users/sunday/Desktop/web2/codex/donor/pattern_library_entries.md)
   Contains the first concrete reusable pattern entries derived from captured donors.

10. [validator_bundles.md](/Users/sunday/Desktop/web2/codex/donor/validator_bundles.md)
   Defines the first reusable validator bundles built from donor-backed patterns.

11. [bridge_presets.md](/Users/sunday/Desktop/web2/codex/donor/bridge_presets.md)
   Defines the first reusable bridge presets for execution contracts.

12. [scenario_packs.md](/Users/sunday/Desktop/web2/codex/donor/scenario_packs.md)
   Defines the first reusable seeded runtime scenarios for donor-backed validation.

13. [graph_connection_spec.md](/Users/sunday/Desktop/web2/codex/donor/graph_connection_spec.md)
   Defines how donor-backed reusable assets should connect into the AES graph.

14. [execution_connection_spec.md](/Users/sunday/Desktop/web2/codex/donor/execution_connection_spec.md)
   Defines how feature execution should pull pattern entries, validator bundles, bridge presets, and scenario packs.

### Working templates

15. [donor_intake_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_intake_template.md)
   Starts a donor study in a controlled shape.

16. [donor_study_packet_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_study_packet_template.md)
   Carries one donor from intake to bridge-ready output and verified lessons.

### Pre-selection workflow

17. [donor_selection_workflow.md](/Users/sunday/Desktop/web2/codex/donor/donor_selection_workflow.md)
   Defines the ordered steps before choosing which apps to study.

18. [donor_selection_scorecard.md](/Users/sunday/Desktop/web2/codex/donor/donor_selection_scorecard.md)
   Defines how donor candidates are scored before selection.

19. [donor_shortlist_template.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_template.md)
   Defines the final selection-gate artifact for human choice.

### Selection implementation

10. [donor_target_registry.md](/Users/sunday/Desktop/web2/codex/donor/donor_target_registry.md)
    Defines the official 9-target donor universe and the selection priorities for each target.

11. [donor_discovery_universe.md](/Users/sunday/Desktop/web2/codex/donor/donor_discovery_universe.md)
    Defines first-pass discovery sources, local app relevance, and hard filters.

12. [donor_candidate_registry.md](/Users/sunday/Desktop/web2/codex/donor/donor_candidate_registry.md)
    Defines the shared base candidate facts and base scoring attributes.

13. [donor_shortlist_approval_workflow.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_approval_workflow.md)
    `approval_workflow` filtered pool and shortlist.

14. [donor_shortlist_reporting.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_reporting.md)
    `reporting` filtered pool and shortlist.

15. [donor_shortlist_onboarding.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_onboarding.md)
    `onboarding` filtered pool and shortlist.

16. [donor_shortlist_notification_system.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_notification_system.md)
    `notification_system` filtered pool and shortlist.

17. [donor_shortlist_app_shell.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_app_shell.md)
    `app_shell` filtered pool and shortlist.

18. [donor_shortlist_shared_frontend_system.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_shared_frontend_system.md)
    `shared_frontend_system` filtered pool and shortlist.

19. [donor_shortlist_backend_platform.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_backend_platform.md)
    `backend_platform` filtered pool and shortlist.

20. [donor_shortlist_qa_release_hardening.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_qa_release_hardening.md)
    `qa_release_hardening` filtered pool and shortlist.

21. [donor_shortlist_launch_ops_layer.md](/Users/sunday/Desktop/web2/codex/donor/donor_shortlist_launch_ops_layer.md)
    `launch_ops_layer` filtered pool and shortlist.

22. [donor_master_landscape.md](/Users/sunday/Desktop/web2/codex/donor/donor_master_landscape.md)
    Combined global view of the full donor universe.

23. [donor_cross_target_tradeoffs.md](/Users/sunday/Desktop/web2/codex/donor/donor_cross_target_tradeoffs.md)
    Explicit selection tradeoffs across targets and donor classes.

24. [donor_target_stack_map.md](/Users/sunday/Desktop/web2/codex/donor/donor_target_stack_map.md)
    Defines the donor-type mix needed to ground each target with UI, logic, runtime, and ops truth.

25. [linear_e2e_study_plan.md](/Users/sunday/Desktop/web2/codex/donor/linear_e2e_study_plan.md)
    Defines the full evidence program needed to treat Linear as an end-to-end donor rather than only a public-surface donor.

26. [github_e2e_study_plan.md](/Users/sunday/Desktop/web2/codex/donor/github_e2e_study_plan.md)
    Defines the full evidence program needed to treat GitHub as an end-to-end donor rather than only a public hybrid donor.

27. [clerk_e2e_study_plan.md](/Users/sunday/Desktop/web2/codex/donor/clerk_e2e_study_plan.md)
    Defines the full evidence program needed to treat Clerk as an end-to-end donor rather than only a strong public auth and organizations donor.

28. [jira_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/jira_donor_intake.md)
    Starts the first governed donor study for workflow, approvals, and transition-heavy extraction.

29. [jira_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/jira_donor_study_packet.md)
    Carries Jira from intake into observed workflow, approval, and notification evidence.

30. [stripe_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/stripe_donor_intake.md)
    Starts the governed Stripe donor study for payments, billing verification, recovery, and developer observability.

31. [stripe_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/stripe_donor_study_packet.md)
    Carries Stripe from authenticated runtime capture into accepted payment, billing, and observability patterns.

32. [slack_donor_intake.md](/Users/sunday/Desktop/web2/codex/donor/slack_donor_intake.md)
    Starts the governed Slack donor study for collaboration, activity triage, and channel or DM shell behavior.

33. [slack_donor_study_packet.md](/Users/sunday/Desktop/web2/codex/donor/slack_donor_study_packet.md)
    Carries Slack from authenticated runtime capture into accepted collaboration and notification patterns.

34. [spotify_donor_intake.md](/Users/sunday/Desktop/aes research/library componets /donor/spotify_donor_intake.md)
    Starts the governed Spotify donor study for persistent shell, search-driven discovery, collection detail, and capability-gated playback behavior.

35. [spotify_donor_study_packet.md](/Users/sunday/Desktop/aes research/library componets /donor/spotify_donor_study_packet.md)
    Carries Spotify from Playwright runtime capture into accepted shell, discovery, and degraded-state patterns.

36. [donor.md](/Users/sunday/Desktop/web2/codex/donor/donor.md)
    Single-file consolidation of the full donor program and current selection layer.

## Current stopping point

The donor program is now built up to the selection gate.

That means AES can now:
- define donor objectives
- define donor class
- set discovery boundaries
- score candidates
- build a shortlist
- compare all 9 targets together
- pause for human input before app study begins

What it does not do yet:
- choose donor apps automatically
- begin donor analysis automatically
- start Hopper-based binary study automatically

That pause is intentional.

## Next stage after human input

Once donor apps are chosen, the next stage is:

1. create donor intake
2. create donor study packet
3. gather evidence
4. normalize findings
5. review candidates
6. promote accepted material
7. feed bridge inputs
8. validate and write back verified lessons

## Final rule

The donor program should stay governed at every stage:
- intake before study
- review before promotion
- validators before writeback
