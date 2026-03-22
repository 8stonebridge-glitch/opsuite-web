# notification system execution board

Source of truth:
- `notification_system_sprint_1.md`
- `notification_system_sprint_2.md`
- `notification_system_sprint_3.md`
- `notification_system_sprint_4.md`

## Parallel tracks
| track | focus |
|---|---|
| backend | dispatch, dedup, retry, dead-letter, timing |
| frontend | inbox, badge, preferences, operations views |
| QA | scenario coverage and acceptance |
| metrics | dedup rate wiring and validation |

## Sequence
### Sprint 1
- build the backend engine
- close backend QA before any UI depends on it

### Sprint 2
- build inbox and badge in parallel
- integrate them into app shell
- add preference controls
- close accessibility and UI QA

### Sprint 3
- refine timing using instrumentation
- expose retry state
- expose dead-letter state and replay
- improve preference UX
- validate routing determinism

### Sprint 4
- wire `MET-058`
- run metrics validation and full QA in parallel
- close acceptance
- ship

## Critical path
preference gate
-> causal linking
-> deduplication
-> retry/dead-letter
-> timing instrumentation
-> inbox/badge integration
-> preference controls
-> operator views
-> metric wiring
-> metric validation
-> acceptance
-> ship

## Blocking items
- preference enforcement
- dedup correctness
- retry/dead-letter safety
- unread badge correctness
- `MET-058` validation
- full QA pass

## Post-ship graph follow-up
- bridge `RULE-022`
- add notification-specific flow
- add FeatureConsultation node
- add BusinessRule bridge coverage
