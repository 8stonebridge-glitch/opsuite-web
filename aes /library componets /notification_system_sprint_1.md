# notification system — sprint 1

## Outcome
Build the backend notification engine so every notification is preference-aware, causal, deduplicated, and failure-safe.

## Deliverables
- preference gate before dispatch
- causal event linkage on every notification
- deduplication and suppression path
- retry policy
- dead-letter queue
- timing instrumentation across dispatch stages

## Exit criteria
- opted-out users do not receive blocked notification types
- duplicate trigger only yields one send
- failed notifications either retry or dead-letter
- no silent drop path exists
- every notification record contains causal event reference
- timing data exists for success and failure paths
