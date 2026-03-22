# onboarding — sprint 3

## Outcome
Transform the onboarding wizard from navigable structure into a complete, fillable, resumable, enterprise-safe flow.

## Deliverables
- production field components for all required step types
- field and screen-level validation UX
- file upload handling with size/type checks
- loading and submit protection on transitions
- auto-save on step advance and pause-safe resume
- SSO/token handoff directly into the correct wizard instance
- closed Sprint 3 QA defects

## Workstreams
### Backend
- implement field validation rules
- implement upload enforcement and storage write path
- persist step drafts on step advance
- resolve SSO invitation token to onboarding session
- return explicit failure states for expired or invalid token

### Frontend
- build text, dropdown, date, and file field components
- add reusable loading wrapper and duplicate-submit protection
- add field-level validation messages and screen-level error banner
- wire real fields into each wizard step
- land enterprise users directly inside the wizard after token resolution

### QA
- validate all field types
- validate required field blocking
- validate upload rejection for oversize file
- validate resume after tab close
- validate SSO invitation path and failure path
- validate slow-network step transition behavior

## Exit criteria
- all production field types are wired into the wizard
- every required field blocks advance correctly
- upload constraints are enforced and visible
- auto-save restores the latest valid draft
- SSO user lands in the correct wizard without separate login
- no P1 or P2 Sprint 3 defects remain open
