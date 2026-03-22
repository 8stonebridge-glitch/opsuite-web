# Donor Shortlist Template

Use this template to present candidate apps at the selection gate.

This template is the final pre-study output.
It should be produced after:
- discovery boundaries are set
- hard filters are applied
- candidates are scored

Human input should happen after this file is prepared.

It aligns with:
- [donor_selection_workflow.md](/Users/sunday/Desktop/web2/codex/donor/donor_selection_workflow.md)
- [donor_selection_scorecard.md](/Users/sunday/Desktop/web2/codex/donor/donor_selection_scorecard.md)

## Template

```md
# Donor Shortlist

## Selection Context
- target_feature_area:
- donor_objective:
- donor_class: logic | ui | hybrid
- discovery_boundary:
- selection_date:
- prepared_by:

## Selection Priorities
- primary_priority:
- secondary_priority:
- portability_priority:
- governance_priority:
- preferred_study_depth:

## Filtered Candidate Pool

### Candidate 1
- app_name:
- platform:
- donor_class:
- likely_value:
- likely_risk:
- evidence_accessibility:
- score_summary:
- shortlisted: yes | no

### Candidate 2
- app_name:
- platform:
- donor_class:
- likely_value:
- likely_risk:
- evidence_accessibility:
- score_summary:
- shortlisted: yes | no

### Candidate N
- app_name:
- platform:
- donor_class:
- likely_value:
- likely_risk:
- evidence_accessibility:
- score_summary:
- shortlisted: yes | no

## Shortlisted Donors

### Shortlist 1
- app_name:
- donor_class:
- rank:
- why_shortlisted:
- expected_logic_value:
- expected_ui_value:
- portability_risk:
- noise_risk:
- recommended_study_scope:
- recommended_first_pass_methods:
- recommendation_strength: weak | medium | strong

### Shortlist 2
- app_name:
- donor_class:
- rank:
- why_shortlisted:
- expected_logic_value:
- expected_ui_value:
- portability_risk:
- noise_risk:
- recommended_study_scope:
- recommended_first_pass_methods:
- recommendation_strength: weak | medium | strong

### Shortlist N
- app_name:
- donor_class:
- rank:
- why_shortlisted:
- expected_logic_value:
- expected_ui_value:
- portability_risk:
- noise_risk:
- recommended_study_scope:
- recommended_first_pass_methods:
- recommendation_strength: weak | medium | strong

## Tradeoffs
- strongest_logic_donor:
- strongest_ui_donor:
- easiest_first_donor:
- highest_portability_donor:
- highest_governance_fit_donor:
- biggest_risk_if_selected:

## Recommendation
- recommended_first_study:
- recommended_second_study:
- whether_to_split_logic_and_ui_donors:
- why:

## Questions For Human Input
- do we want the strongest logic donor or the easiest first donor?
- do we want one hybrid donor or separate logic and UI donors?
- should portability outrank polish for this feature?
- should we narrow the scope before study begins?
- which shortlisted app should be studied first?
```

## Guidance

### Keep the shortlist small

Best range:
- `2` to `5` apps

More than that usually means the filtering or scoring stage was too weak.

### Make the tradeoffs explicit

Do not present all shortlisted apps as equally good.

Always name:
- the strongest logic donor
- the strongest UI donor
- the easiest first donor
- the riskiest donor

That makes the selection gate useful instead of vague.

### Stop here

Do not begin donor study packets until human input selects the donor order.

That pause is intentional.

## Final rule

The shortlist exists to force a real choice.
If it does not create a clear decision point, it is not finished yet.
