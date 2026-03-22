# onboarding — sprint 4

## Outcome
Prove onboarding works as a business system, not just a UI flow.

## Deliverables
- wizard start event
- wizard completion event
- activation milestone event
- validated `MET-057`
- validated `MET-061`
- final role/branch QA pass
- acceptance checklist closure
- ship readiness sign-off

## Workstreams
### Backend
- emit canonical onboarding lifecycle events
- prevent duplicate event emission on retries/resumes
- confirm milestone attribution stays tied to correct member/session

### Metrics / Reporting
- validate start/completion counts across normal and abandoned paths
- validate milestone counts across resumed and multi-device paths
- confirm metrics return real values and non-corrupt denominators

### QA
- execute all role paths end to end
- validate abandoned wizard behavior
- validate expired invite path
- validate SSO error path
- validate milestone completion after pause/resume

## Exit criteria
- `MET-057` returns a real, accurate value
- `MET-061` returns a real, accurate value
- admin and member role paths both pass
- branch-specific acceptance checks all pass
- no open blocker or major defect remains
- onboarding is accepted for release
