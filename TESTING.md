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
- `tests/e2e/people.spec.ts`
  - admin can create a person
  - admin can edit a person
  - admin can remove a person
  - site selection and People page hydration are exercised in the browser

## Highest-value next tests

1. Expand browser coverage for:
   - full admin sign-up flow
   - real email/password sign-in submit flow
   - subadmin sign-in and scoped navigation
   - employee sign-in and scoped navigation
2. Add backend rule coverage for task transitions:
   - manager-created task -> `Open`
   - employee-raised task -> `Pending Approval`
   - assignee moves `Open -> In Progress -> Submitted`
   - manager moves `Submitted -> Verified` or `Rework`
3. Add auth-protected route tests around:
   - admin-only People actions
   - non-admin access denial
   - direct-mode vs managed-mode scope behavior

## Known gap

The core `Submitted` review-state naming is now aligned across the shell and the TLA machine.
The next meaningful gap is broader workflow coverage: rework/no-change/accountability still need deeper state and browser tests.

## Outstanding Tests Not Done Yet

1. Task browser flows
   - create task
   - employee-raised task approval
   - `Open -> In Progress -> Submitted`
   - `Submitted -> Verified`
   - `Submitted -> Rework`
2. Task backend rule tests
   - mutation-level authorization
   - direct-mode vs managed-mode manager authority
   - no-change counting as activity but not progress
   - stale-task threshold behavior from org settings
3. Broader TLA coverage
   - rework cycles
   - no-change transitions
   - accountability/stale invariants
4. Auth route coverage
   - protected route redirects for non-signed-in users
   - signed-in user landing behavior by role
5. Negative People tests
   - duplicate email behavior
   - invalid site/team assignment
   - removing a user with multiple memberships

## Outstanding Changes Not Done Yet

1. Clerk e2e auth harness cleanup
   - Playwright still uses a synthetic Clerk session path that triggers the `azp` warning
2. Real role-routing polish
   - the current browser harness is centered on the admin path
   - deeper subadmin/employee route and permission coverage still needs to be added
3. Broader workflow implementation verification
   - the task lifecycle is modeled and partially tested, but not fully exercised end to end in the browser
