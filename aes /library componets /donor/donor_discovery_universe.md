# Donor Discovery Universe

This file defines the first-pass donor discovery universe for the 9-target AES donor program.

It covers:
- where candidate donors may come from
- what evidence methods are allowed in the first pass
- which local apps are relevant
- which candidates should be filtered before scoring

This is still pre-selection work.
It does not authorize Hopper, packet creation, or donor reverse engineering yet.

## First-pass donor sources

Use these discovery sources across the 9-target program:

- strong B2B SaaS products
- workflow-heavy collaboration and operations products
- high-quality desktop/web hybrids
- modern developer platforms
- release, observability, and launch-control products
- strong dashboard and admin UIs
- reputable UI kits and admin templates
- locally installed apps already available on this machine

## Allowed first-pass evidence methods

The first pass may use:
- product website and docs review
- public UI inspection
- installed-app inventory
- high-level bundle or surface inspection
- known product behavior already observed locally

The first pass may not use:
- Hopper analysis
- binary reverse engineering
- deep network capture
- donor packets
- graph promotion

## Local installed apps worth considering

These locally available apps are relevant as first-pass donor candidates or reserves:

| App | Likely role | Selection status |
|---|---|---|
| `Canva.app` | UI donor reserve for onboarding and app shell polish | retained as UI-only reserve |
| `Microsoft Outlook.app` | notification center / inbox donor reserve | retained for notification-system scoring |
| `Spark Desktop.app` | notification / inbox UI reserve | reserve only, not in first-pass scored set |
| `Notion Web Clipper.app` | inspectable local app with known wrapper-heavy architecture | filtered out for logic-first use |
| `Google Docs.app` / `Google Sheets.app` / `Google Slides.app` | productivity UI references | filtered out for current donor targets |
| `Microsoft Word.app` / `Microsoft Excel.app` / `Microsoft PowerPoint.app` | document-authoring UI references | filtered out for current donor targets |

## Why `Notion Web Clipper.app` is filtered in the first pass

Previous local analysis already showed:
- it is a thin native host around a Safari Web Extension
- its host app is mostly wrapper behavior
- most reusable value is in extension flow, not a rich native operational core

That makes it weak for first-pass logic-donor selection.

It can remain a later reserve donor for:
- permission gating references
- clip/save flow patterns
- wrapper-vs-core evaluation examples

It should not take a first-pass shortlist slot.

## First-pass UI-kit donor sources

Use these as legitimate UI-donor sources for `ui` and `hybrid` targets:
- `shadcn/ui`
- `Tailwind UI`
- `Tremor`
- `Refine`

These count as donor inputs because the program now explicitly allows UI donors, not just logic donors.

## Hard filters before scoring

Apply these filters to every candidate before it reaches a scored pool:

### Filter 1: weak feature relevance

Remove candidates that have only vague adjacency to the target.

### Filter 2: wrapper-heavy behavior

Remove candidates where most visible structure is shell or glue and there is too little reusable logic.

### Filter 3: inaccessible evidence

Remove candidates where the first-pass evidence surface is too opaque to justify early study.

### Filter 4: extreme platform lock-in

Remove candidates whose value depends mostly on one vendor/platform artifact that cannot be generalized.

### Filter 5: high branding/noise ratio

Remove candidates where most visible value is aesthetics, vendor identity, or polished chrome rather than reusable behavior.

### Filter 6: low validator potential

Remove candidates where the donor value cannot plausibly turn into validator-backed requirements later.

## First-pass discovery boundaries by source type

### SaaS and workflow products

Use for:
- `approval_workflow`
- `reporting`
- `onboarding`
- `notification_system`
- `app_shell`

### Developer platforms and infrastructure products

Use for:
- `backend_platform`
- `qa_release_hardening`
- `launch_ops_layer`
- parts of `reporting`

### UI kits and templates

Use for:
- `shared_frontend_system`
- `app_shell`
- UI-heavy parts of `reporting`
- UI-heavy parts of `onboarding`

### Local installed apps

Use for:
- quick evidence accessibility wins
- low-cost UI donor validation
- reserve donor candidates that can be inspected later if shortlisted

## Selection-stage output requirements

The discovery universe is complete only when it supports:
- one filtered candidate pool per target
- one scored shortlist per target
- one master donor landscape
- one cross-target tradeoff summary

## Final rule

Discovery breadth is allowed in the first pass.
Deep donor study is not.

The job here is to create a governed decision surface, not to start analysis early.
