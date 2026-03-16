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

---

## BUG-002: All Users See "Sunday Okeke" as Admin Name

**Date:** 2026-03-16
**Severity:** High
**Status:** Resolved

### Symptom
Every user who signs up or signs in sees "Sunday Okeke" as the admin name in the overview greeting, profile card, and sidebar — regardless of who they actually are.

### Root Cause
The demo/seed data in `AppContext.tsx` has a hardcoded constant:

```typescript
const DEMO_ADMIN = 'Sunday Okeke';
```

This value is stored in `state.onboarding.adminName` and used by `useCurrentName()` in `selectors.ts`:

```typescript
export function useCurrentName(): string {
  const { state } = useApp();
  if (state.role === 'admin') return state.onboarding.adminName || 'Admin';
  // ...
}
```

All pages and components that call `useCurrentName()` display the hardcoded seed name instead of the actual signed-in Clerk user's name.

### Fix
Updated pages to prefer the Clerk session user's name over the seed data name:

**File: `src/app/admin/overview/page.tsx`**
```tsx
// Before
const name = useCurrentName(); // Always returns "Sunday Okeke"

// After
const { user: sessionUser } = useSession();
const demoName = useCurrentName();
const name = sessionUser?.name || demoName; // Uses Clerk user name
```

**File: `src/app/admin/more/page.tsx`** (already fixed)
```tsx
const { user } = useSession();
const displayName = user?.name || state.onboarding.adminName || 'Admin';
```

**File: `src/app/admin/layout.tsx`** (sidebar user info)
```tsx
// Uses session user directly
{user && (
  <p>{user.name}</p>
  <p>{user.email}</p>
)}
```

### Lessons Learned
- Seed/demo data should never be treated as the source of truth for user identity once real auth is in place.
- When migrating from demo mode to real auth, audit everywhere `useCurrentName()` and `state.onboarding.adminName` are used.
- The session provider (`useSession()`) should be the single source of truth for the signed-in user's identity.

---

## BUG-003: Custom Sign-In Redirects to Clerk's Hosted Form

**Date:** 2026-03-16
**Severity:** Critical
**Status:** Resolved

### Symptom
After replacing the default `<SignIn />` component with a fully custom sign-in form (using `useSignIn` hooks), unauthenticated users visiting any protected route were redirected to Clerk's hosted sign-in page (`accounts.dev`) instead of the custom `/sign-in` page.

### Root Cause
The `<ClerkProvider>` was missing the `signInUrl` and `signUpUrl` props. Without these, Clerk's middleware (`auth.protect()`) doesn't know about the custom sign-in page and falls back to redirecting users to Clerk's hosted authentication UI.

When using Clerk's pre-built `<SignIn />` component, this worked by coincidence because the component itself handled the redirect. With a custom form using `useSignIn`/`useSignUp` hooks, the provider must be explicitly told where the custom pages live.

### Fix

**File: `src/app/layout.tsx`**
```tsx
// Before
<ClerkProvider
  afterSignOutUrl="/sign-in"
  signInFallbackRedirectUrl="/admin/overview"
>

// After
<ClerkProvider
  signInUrl="/sign-in"
  signUpUrl="/sign-up"
  signInFallbackRedirectUrl="/admin/overview"
  signUpFallbackRedirectUrl="/admin/overview"
  afterSignOutUrl="/sign-in"
>
```

### Correct Auth Flow After Fix
1. Unauthenticated user visits any protected route → middleware calls `auth.protect()` → redirects to `/sign-in` (custom page)
2. User signs in via custom form → `signIn.create()` + `signIn.password()` + `signIn.finalize()` → `router.push('/admin/overview')`
3. Google OAuth flow → `signIn.sso()` → `/sign-in/sso-callback` → `/admin/overview`

### Lessons Learned
- When replacing Clerk's pre-built `<SignIn />`/`<SignUp />` components with custom forms, you **must** set `signInUrl` and `signUpUrl` on `<ClerkProvider>`.
- The env vars `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` alone are not sufficient — the `<ClerkProvider>` props are what Clerk's client-side routing uses.
- Always test the full flow from an unauthenticated state (incognito window) after switching to custom auth forms.

### Related Commits
- `132f1f8` — fix: add signInUrl/signUpUrl to ClerkProvider to prevent redirect to hosted form

---

## BUG-004: Custom Sign-In and Sign-Up Bounce Back to Sign-In After Success

**Date:** 2026-03-16
**Severity:** Critical
**Status:** Resolved

### Symptom
After entering valid credentials in the custom sign-in form, the app would appear to succeed and then land back on the Clerk sign-in form instead of staying in the app. The same risk existed on the custom sign-up flow after email verification completed.

### Root Cause
The custom auth pages were finalizing the Clerk session and then immediately pushing to a middleware-protected route:

```tsx
await signIn.finalize();
router.push('/admin/overview');
```

and:

```tsx
await signUp.finalize();
router.push('/admin/overview');
```

This created a race condition:

1. The client finished `finalize()`
2. The browser immediately navigated to `/admin/overview`
3. Clerk middleware on the server checked auth for that request
4. In some cases the session cookie was not yet fully visible to the server
5. Middleware treated the request as unauthenticated and redirected back to `/sign-in`

So the issue was not bad credentials or bad Clerk keys. It was a timing bug between custom auth completion and the first request to a protected route.

### Fix
We changed both custom auth pages to let Clerk control the final session activation and navigation step through `finalize({ navigate })` instead of manually calling `router.push()` right after finalization.

**File: `src/app/sign-in/[[...sign-in]]/page.tsx`**
```tsx
// Before
await signIn.finalize();
router.push('/admin/overview');

// After
await signIn.finalize({
  navigate: async ({ decorateUrl }) => {
    const targetUrl = decorateUrl(POST_SIGN_IN_URL);
    if (/^https?:\/\//.test(targetUrl)) {
      window.location.assign(targetUrl);
      return;
    }
    router.replace(targetUrl);
  },
});
```

**File: `src/app/sign-up/[[...sign-up]]/page.tsx`**
```tsx
// Before
await signUp.finalize();
router.push('/admin/overview');

// After
await signUp.finalize({
  navigate: async ({ decorateUrl }) => {
    const targetUrl = decorateUrl(POST_SIGN_UP_URL);
    if (/^https?:\/\//.test(targetUrl)) {
      window.location.assign(targetUrl);
      return;
    }
    router.replace(targetUrl);
  },
});
```

We also aligned Google SSO in both files to use the same post-auth redirect target instead of hardcoding `/admin/overview` separately.

### Why This Fix Works
- Clerk now owns the final active-session handoff and redirect timing
- `decorateUrl()` applies Clerk's session-safe redirect behavior
- we no longer force a client-side navigation into middleware before the authenticated session is ready on the server

### Correct Auth Flow After Fix
1. User completes sign-in or sign-up in the custom form
2. Clerk finalizes the session
3. Clerk performs the redirect through the `navigate` callback
4. The next request to `/admin/overview` arrives with a valid authenticated session
5. Middleware allows the request through instead of redirecting back to sign-in

### Lessons Learned
- With custom Clerk flows, `finalize()` plus an immediate `router.push()` can still be too early for the first protected navigation
- The auth problem was not in the UI itself but in the transition from client auth completion to server middleware protection
- When a custom auth flow must enter a protected route immediately, let Clerk drive the final redirect step
- Sign-in and sign-up should be fixed together if they share the same session activation pattern

### Related Files
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/middleware.ts`
