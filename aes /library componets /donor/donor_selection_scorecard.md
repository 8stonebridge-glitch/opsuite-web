# Donor Selection Scorecard

Use this scorecard to rank donor app candidates before choosing which apps to study.

This scorecard is for the selection stage only.
It should be used after discovery boundaries are set and hard filters have removed obviously weak donors.

## Scoring rule

Each candidate is scored from `1` to `5` on each criterion.

Scale:
- `1` = weak
- `2` = limited
- `3` = acceptable
- `4` = strong
- `5` = excellent

Use weighted scoring so the result reflects what AES actually needs, not what merely looks impressive.

## Core criteria

### 1. Feature relevance

Question:
- how directly does this donor map to the target feature area?

Weight:
- `5`

High score means:
- direct fit to the feature being built

Low score means:
- only vague or adjacent relevance

### 2. Reusable logic depth

Question:
- how much operational logic is likely reusable?

Weight:
- `5` for logic or hybrid donor searches
- `2` for UI-only donor searches

High score means:
- clear workflows, permissions, failures, transitions, or notifications

Low score means:
- mostly shell, wrapper, or superficial behavior

### 3. Reusable UI value

Question:
- how much presentation or interaction value is likely reusable?

Weight:
- `5` for UI or hybrid donor searches
- `2` for logic-only donor searches

High score means:
- strong layout, state presentation, navigation, and interaction patterns

Low score means:
- weak or generic UI value

### 4. Evidence accessibility

Question:
- how realistically can we study this donor?

Weight:
- `4`

High score means:
- strong observable surfaces
- inspectable binaries or bundles
- clear UI behavior

Low score means:
- most value is hidden or too hard to inspect

### 5. Portability

Question:
- how reusable is this donor outside its original platform?

Weight:
- `4`

High score means:
- behavior can be abstracted cleanly into AES concepts

Low score means:
- value depends heavily on one vendor or platform constraint

### 6. Governance fit

Question:
- does the donor show disciplined behavior that fits AES governance?

Weight:
- `4`

High score means:
- explicit states
- explicit gating
- visible failure handling
- clear user feedback

Low score means:
- sloppy flow
- hidden state
- magical behavior with weak observability

### 7. Noise risk

Question:
- how likely is this donor to waste effort with wrapper code, branding noise, or irrelevant complexity?

Weight:
- `4`

Scoring note:
- score this as a positive cleanliness score
- `5` means low noise risk
- `1` means high noise risk

### 8. Study scope control

Question:
- can this donor be studied narrowly without sprawling?

Weight:
- `3`

High score means:
- one feature surface can be isolated cleanly

Low score means:
- the app is too broad or entangled for a focused study

### 9. Validator friendliness

Question:
- can the donor’s value be turned into clear validator requirements later?

Weight:
- `4`

High score means:
- behavior can become concrete pass/fail checks

Low score means:
- value is too subjective or too aesthetic to validate well

## Optional bonus criteria

Use these only if relevant.

### 10. Maturity signal

Question:
- does this donor look like a mature, battle-tested product?

Weight:
- `2`

### 11. Complementarity

Question:
- does this donor add something not already covered by another shortlisted donor?

Weight:
- `3`

## Suggested interpretation bands

- `4.2 - 5.0`
  Excellent donor candidate

- `3.5 - 4.1`
  Strong donor candidate

- `2.8 - 3.4`
  Usable but second-tier donor

- `below 2.8`
  Weak donor candidate

## Recommended use by donor class

### Logic donor search

Prioritize:
- feature relevance
- reusable logic depth
- evidence accessibility
- governance fit
- validator friendliness

### UI donor search

Prioritize:
- feature relevance
- reusable UI value
- portability
- study scope control
- validator friendliness

### Hybrid donor search

Prioritize:
- feature relevance
- reusable logic depth
- reusable UI value
- evidence accessibility
- governance fit

## Simple score table

```md
| Candidate | Feature Relevance x5 | Logic Depth x5/x2 | UI Value x5/x2 | Evidence x4 | Portability x4 | Governance Fit x4 | Low Noise x4 | Scope Control x3 | Validator Friendly x4 | Total | Weighted Average |
|-----------|----------------------|-------------------|----------------|-------------|----------------|-------------------|--------------|------------------|-----------------------|-------|------------------|
| App A     |                      |                   |                |             |                |                   |              |                  |                       |       |                  |
| App B     |                      |                   |                |             |                |                   |              |                  |                       |       |                  |
```

## Final rule

The scorecard should guide selection.
It should not replace judgment.

If a donor scores well but teaches the wrong thing, it should still be rejected.
