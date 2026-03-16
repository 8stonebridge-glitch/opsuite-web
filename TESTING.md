# Testing Layers

We are using three layers for different kinds of risk:

| Layer | Tool | What it should catch |
| --- | --- | --- |
| State logic | `Vitest` today, expanding toward TLA-style workflow checks | invalid task/status/role rules, stale-task edge cases, scope leaks |
| API/handler | `Vitest` route tests | wrong endpoint wiring, bad payload mapping, service error handling |
| UI | `Playwright` | button clicks, form flows, sign-in/create-person/reassign flows in the browser |

## First coverage added

- `src/utils/task-helpers.test.ts`
  - role-based task scoping
  - no-change streak detection
  - stalled-task logic
  - delegation guard rules
- `src/app/api/admin/people/route.test.ts`
  - create-person route wiring
  - admin error response handling
- `src/app/api/admin/people/[userId]/route.test.ts`
  - edit-person route wiring
  - delete-person route wiring
  - admin error response handling
- `src/machines/opsuiteTaskLifecycle.machine.ts`
  - first TLA PreCheck machine for the target task lifecycle
  - current estimate: `48` states, `9` branches, within budget
  - proof check passes with matching runtime/model state and edge counts
- `tests/e2e/auth.spec.ts`
  - custom sign-in page smoke coverage
  - custom sign-up page smoke coverage

## Highest-value next tests

1. Expand browser coverage for:
   - submit sign in
   - create person
   - edit person
   - remove person
2. Add backend rule coverage for task transitions:
   - manager-created task -> `Open`
   - employee-raised task -> `Pending Approval`
   - assignee moves `Open -> In Progress -> Submitted`
   - manager moves `Submitted -> Verified` or `Rework`
3. Add auth-protected route tests around admin-only People actions.

## Known gap

The core `Submitted` review-state naming is now aligned across the shell and the TLA machine.
The next meaningful gap is broader workflow coverage: rework/no-change/accountability still need deeper state and browser tests.
