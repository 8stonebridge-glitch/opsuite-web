# Post-Agent Verification Checklist

The orchestrator (Claude) must run these checks after EVERY agent completes.
Do not trust agent self-reported results. Verify independently.

## Mandatory checks (every agent)

1. **TypeScript compilation**
   ```
   npx tsc --noEmit 2>&1 | grep "^src/\|^convex/"
   ```
   Expected: no output (zero errors)

2. **ESLint on changed files**
   ```
   npx eslint [list changed files] --max-warnings=0
   ```
   Expected: zero errors, zero warnings

3. **Next.js special file exports**
   If any layout.tsx, page.tsx, loading.tsx, error.tsx was changed:
   ```
   grep "^export" [file]
   ```
   Expected: only "export default function..." — no named exports

## Before pushing (run once after all agents complete)

4. **Full production build**
   ```
   npx next build
   ```
   This catches what tsc and eslint miss:
   - Invalid layout/page exports
   - Missing env vars during prerender
   - CSS/PostCSS failures
   - Module resolution errors

5. **ESLint full project**
   ```
   npx eslint src/ convex/ --max-warnings=10
   ```

## Before deploying Convex

6. **Convex type check**
   ```
   npx convex deploy --dry-run
   ```
   Or deploy to dev first, then promote to prod.

## Recording results

After verification, report:
- Which checks passed
- Which checks failed
- Which files had issues
- What was fixed

If any check fails, do NOT push. Fix first, re-verify, then push.

## FailureCase recording

If a check catches something the agent missed:
- Record a FailureCase node in Neo4j
- Include: what the agent got wrong, why verification caught it, fixPattern
- This teaches the system for next time
