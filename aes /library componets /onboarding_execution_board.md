# onboarding execution board

Source of truth:
- `onboarding_sprint_3.md`
- `onboarding_sprint_4.md`

## Parallel tracks
| track | focus |
|---|---|
| backend | validation, persistence, SSO, event emission |
| frontend | wizard controls, UX states, wiring |
| QA | scenario validation, regression control |
| metrics | activation instrumentation and validation |

## Sequence
### Phase 1
- build all real field components
- build validation and loading/error primitives
- implement backend validation and upload constraints

### Phase 2
- wire all components into wizard steps
- enable auto-save on advance
- validate resume from saved draft

### Phase 3
- complete SSO/token resolution path
- land user inside the correct wizard
- expose explicit token failure UI

### Phase 4
- run Sprint 3 QA and close defects

### Phase 5
- wire start/completion/milestone events

### Phase 6
- run metric validation and final QA in parallel

### Phase 7
- acceptance review
- ship readiness sign-off

## Critical path
field components
-> wizard wiring
-> SSO landing
-> Sprint 3 QA closure
-> event wiring
-> metric validation
-> acceptance
-> ship

## Blocking items
- auto-save/resume correctness
- SSO landing correctness
- activation event integrity
- metrics validation
- final QA closure

## Post-ship graph follow-up
- bridge `RULE-039`
- bridge `RULE-041`
- bridge `RULE-044`
- add FeatureConsultation node
