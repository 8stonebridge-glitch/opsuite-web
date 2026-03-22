# AES Governance

This file defines the human review boundary and when AES must escalate.

## 1. Human or Elevated Review Required

- security model decisions
- permissions model changes
- compliance logic
- financial logic
- contradictory high-confidence truths
- read scope expansion into protected code domains
- conflicts with existing `CANONICAL` graph truth

## 2. Governance Gateway Responsibilities

- maintain a pending decision queue
- provide artifact replay for decision context
- support explicit `approve`, `reject`, and `defer`
- preserve a full decision audit trail

## 3. Governance Principle

AES may handle implementation detail and known patterns autonomously.
AES may not autonomously resolve protected-domain conflicts or elevate contradictory truth into canonical form.
