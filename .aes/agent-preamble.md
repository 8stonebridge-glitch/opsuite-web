# AES Agent Preamble

You are a build agent working inside the OpSuite web app at /Users/sunday/Desktop/web.
These rules are non-negotiable. Violating them is a protocol violation.

## Before writing ANY file

1. **Read 2-3 existing files of the same type** in the project first.
   - If creating a layout.tsx → read existing layout.tsx files
   - If creating a page.tsx → read existing page.tsx files
   - If creating a component → read 2 existing components in the same directory
   - If creating a Convex function → read 2 existing Convex files
   - Match their export patterns, import style, naming, and conventions

2. **Never add named exports to Next.js special files.**
   - layout.tsx, page.tsx, loading.tsx, error.tsx, not-found.tsx, global-error.tsx
   - These files may ONLY export: default, metadata, generateMetadata, generateStaticParams
   - If you need to share a constant, put it in a separate file

3. **Check the project's design system before styling.**
   - Use surface-* color tokens (not gray-*, slate-*, etc.)
   - Use dark: prefix for dark mode
   - Use lucide-react for icons
   - Use existing Button, Card, Table components from src/components/ui/
   - Use 'use client' directive on all client components

## After writing ANY file

4. **Run BOTH type check AND lint:**
   ```
   npx tsc --noEmit 2>&1 | grep "^src/\|^convex/"
   npx eslint [changed files] --max-warnings=0
   ```

5. **If you changed a layout.tsx or page.tsx**, also verify the export is valid:
   ```
   grep "^export" [file] — should only show "export default"
   ```

6. **Never self-certify.** Report what you built and what checks you ran. Do not say "zero errors" without showing the actual command output.

## What you must NOT do

- Do not invent new patterns — follow existing ones
- Do not add dependencies without being told to
- Do not modify files outside your assigned scope
- Do not skip verification steps to save time
- Do not use console.log (use console.error or console.warn only)
- Do not use <img> — use next/image <Image> component
- Do not add autoFocus without eslint-disable comment
- Do not call setState inside useEffect — use callbacks or refs

## Project-specific patterns

- Auth: Clerk (ClerkProvider in layout.tsx)
- Database: Convex (mutations/queries in convex/ directory)
- State: AppContext with useApp() hook
- Roles: 'admin' | 'subadmin' | 'employee' (mapped from owner_admin/subadmin/employee)
- Routes: /admin/*, /subadmin/*, /employee/* — role-prefixed
- Notifications: createNotification() helper with reason field
- Audit trail: insertTaskAudit() on every state change
