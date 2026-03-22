# AES Claude Code Runtime

This file explains how AES should use Claude Code in practice while preserving role separation.

## 1. Session Roles

### Orchestrator session

- broad graph access
- artifact registry access
- validator and research API access
- no direct builder authority beyond session spawn and state control

### Builder session

- receives one bridge
- scoped repo reads/writes only
- no broad graph exploration
- no external research access
- no completion authority

### Validator sessions/tools

- independent of builder context
- read code, artifacts, and test outputs
- may fail the build

## 2. Claude Code Adapters Needed

- `neo4j_adapter`
- `artifact_store_adapter`
- `bridge_validator_adapter`
- `builder_session_adapter`
- `validator_adapter`
- `scope_guard_wrapper`
- `freshness_checker`
- `writeback_adapter`

## 3. Practical Rule

The builder may be a Claude session, but in AES it behaves as a constrained worker session, not a free-roaming planner.
