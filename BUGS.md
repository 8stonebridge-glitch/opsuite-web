# Bug Log

---

## BUG-001: Clerk Auth Flow — Sign-In/Sign-Out Redirect Loop

**Date:** 2026-03-16
**Severity:** Critical
**Status:** Resolved

### Symptom
After signing in with Clerk, users were not redirected to the dashboard. After signing out, users were taken back to the admin page instead of the sign-in page — the sign-out appeared to do nothing.

### Root Cause
Three separate issues compounded into one broken auth flow:

1. **Middleware file named `proxy.ts` instead of `middleware.ts`**
   - Next.js 16 supports both `proxy.ts` (new convention) and `middleware.ts` (deprecated but functional). The file was initially named `proxy.ts` but wasn't executing. Renaming to `middleware.ts` fixed middleware execution.

2. **Missing Clerk redirect configuration**
   - The `<SignIn />` and `<SignUp />` components had no `forceRedirectUrl` prop, so Clerk didn't know where to send users after authentication.
   - The `<ClerkProvider>` had no `afterSignOutUrl` or `signInFallbackRedirectUrl`, so sign-out didn't redirect to `/sign-in`.

3. **Sign-out used `router.replace('/')` instead of Clerk's `signOut()`**
   - The original sign-out button just navigated away without clearing the Clerk session. The middleware then saw the user as still authenticated and let them through.

### Fix

**File: `src/app/sign-in/[[...sign-in]]/page.tsx`**
```tsx
// Before
<SignIn />

// After
<SignIn forceRedirectUrl="/admin/overview" />
```

**File: `src/app/sign-up/[[...sign-up]]/page.tsx`**
```tsx
// Before
<SignUp />

// After
<SignUp forceRedirectUrl="/admin/overview" />
```

**File: `src/app/layout.tsx`**
```tsx
// Before
<ClerkProvider>

// After
<ClerkProvider
  afterSignOutUrl="/sign-in"
  signInFallbackRedirectUrl="/admin/overview"
>
```

**File: `src/app/admin/more/page.tsx` (sign-out button)**
```tsx
// Before
onClick={() => router.replace('/')}

// After
onClick={async () => {
  if (window.confirm('Are you sure you want to sign out?')) {
    await signOut();
    window.location.href = '/sign-in';
  }
}}
```

**File: `src/middleware.ts` (renamed from `src/proxy.ts`)**
- Renamed file so Next.js would recognize and execute the Clerk middleware.

**Environment variables added (local + Vercel):**
```
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin/overview
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin/overview
```

### Correct Auth Flow After Fix
1. Unauthenticated user visits any route → middleware calls `auth.protect()` → redirects to `/sign-in`
2. User signs in via Clerk → `forceRedirectUrl` sends them to `/admin/overview`
3. User clicks Sign Out → `signOut()` clears Clerk session → `window.location.href` navigates to `/sign-in`
4. `afterSignOutUrl="/sign-in"` on `ClerkProvider` acts as a safety net for any other sign-out triggers

### Lessons Learned
- Always check the **file naming convention** for your framework version. Next.js 16 prefers `proxy.ts` over `middleware.ts`.
- Clerk requires **explicit redirect URLs** — don't assume it will figure out where to go after sign-in/sign-out.
- Sign-out must call Clerk's `signOut()` to clear the session cookie, not just navigate away.
- When debugging auth issues, check: (1) is middleware running? (2) are env vars present? (3) are redirect URLs configured?

### Related Commits
- `ba14f0d` — fix: rename proxy.ts to middleware.ts and simplify root redirect
- `dc6226f` — fix: sign out uses Clerk signOut instead of navigating to /
- `8f68af0` — fix: configure Clerk redirect URLs for sign-in/sign-out flow
