# notification system — sprint 3

## Outcome
Harden the system for operational trust and supportability.

## Deliverables
- timing path refinements
- retry queue visibility for operators
- dead-letter queue operations view
- replay action for dead letters
- improved preference UX and grouping
- routing determinism validation

## Exit criteria
- worst timing offenders are removed or explained
- operators can inspect retry state
- operators can inspect and replay dead-lettered notifications
- preference UX is understandable in plain language
- same event plus same preferences yields same routing result
