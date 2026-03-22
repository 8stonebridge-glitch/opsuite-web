# reporting

## Status
- Packet status: `INCOMPLETE_ADVISORY`
- AES planning readiness: **CONDITIONAL YES**
- Risk level: **LOW**

## Core capability
Report generation, exports, scheduled reports, comparison views, and freshness-aware dashboards.

## Current governance coverage
Reporting is now usable because it can reach:
- `RULE-046` Manager Reporting Must Surface Team Bottlenecks
- `RULE-047` Reporting Views Must Distinguish Stale From Live Data
- `FAIL-040` Manager Blind Spot
- `FAIL-041` Reporting Freshness Ambiguity
- `EVAL-055` Manager Reporting Bottleneck Visibility
- `EVAL-056` Reporting Freshness Clarity
- `MET-064` Manager Bottleneck Visibility Coverage
- `MET-065` Reporting Freshness Transparency Rate

## Core build focus
1. manager reporting views
2. freshness labeling and stale/live distinction
3. export/report generation surfaces
4. bottleneck and workload summaries
5. comparison and summary dashboards

## Backend priorities
- report query layer
- freshness metadata generation
- export generation jobs
- manager-oriented aggregation endpoints
- scheduled report delivery hooks where packet supports them

## Frontend priorities
- reporting surfaces with freshness labels
- manager bottleneck views
- comparison views
- export actions
- dashboard empty/loading/error states

## QA priorities
- freshness clarity checks
- manager bottleneck visibility checks
- export validity checks
- stale/live distinction tests

## Metrics priorities
- `MET-064`
- `MET-065`

## Known remaining gaps
- still lighter than approval_workflow
- use packet as source of truth and do not invent extra governance
- if exports or schedules need more strict rules later, add a small bridge/fix batch

## Execution verdict
Good second feature to execute after approval_workflow because coverage is balanced and low-risk.
