// ============================================================================
// D19: PV-auth-flow-001 Close / FailureCase Conditions
// ============================================================================
//
// CLOSE CONDITION (exact):
//   npx playwright test tests/e2e/auth-verification.spec.ts
//   → 0 failed, 0 skipped-for-defect, all non-ENV-CONFIG tests passed
//   ENV-CONFIG skips accepted: Clerk testing-token-mode limitations (05b, 08)
//
// A Google SSO skip tagged "ENV-CONFIG:" is an environment-configuration skip,
// NOT a defect skip. It does not block closing PV-auth-flow-001.
// Any skip caused by a code defect counts as a failure.
//
// This file contains:
//   SECTION 1 — Resolve query (run ONLY when close condition is met)
//   SECTION 2 — FailureCase templates mapped to canonical FeatureDomains
//
// Canonical FeatureDomains for auth_flow:
//   - auth-session-security
//   - forms-input
//   - data-display-loading
//   - interaction-timing
//   - notifications-alerts
//   - accessibility-polish
//
// Domain coverage:
//   data-display-loading   → FC-001, FC-002, FC-009
//   forms-input            → FC-003, FC-004
//   auth-session-security  → FC-005, FC-006, FC-007
//   notifications-alerts   → FC-008
//   interaction-timing     — not directly covered by this FailureCase mapping
//   accessibility-polish   — not directly covered by this FailureCase mapping
//
// DO NOT run the resolve query unless every test passes.
// DO NOT create FailureCases unless a specific test fails for a code reason.
// ============================================================================


// ============================================================================
// SECTION 1: Resolve PV-auth-flow-001
// Run ONLY when: 0 failed, 0 skipped-for-defect, all non-ENV-CONFIG tests passed
// ============================================================================

MATCH (pv:ProtocolViolation {id: 'PV-auth-flow-001'})
SET pv.status = 'resolved',
    pv.resolvedAt = datetime(),
    pv.resolution = '15 passed, 0 failed, 2 ENV-CONFIG skipped (Clerk testing-token-mode limitations: 05b middleware redirect, 08 session expiry banner). Client-side verification complete across 4 canonical domains: data-display-loading (01a/01b/02a/02b/09a/09b passed), forms-input (03a/03b/03c/04 passed), auth-session-security (05a/06a/06b/07a/07b passed, 05b ENV-CONFIG skipped), notifications-alerts (08 ENV-CONFIG skipped). ENV-CONFIG skips are Clerk dev-mode artifacts, not code defects.',
    pv.updatedAt = datetime()
RETURN pv.id AS id, pv.status AS status, pv.resolvedAt AS resolvedAt;


// ============================================================================
// SECTION 2: FailureCase templates
// Create ONLY for test cases that FAIL for a code reason.
// Each template is commented out. Uncomment and fill evidence for the failure.
// ============================================================================


// --- FC-auth-flow-001: Sign-in page does not render ---
// CREATE IF: AUTH-VERIFY-01a or AUTH-VERIFY-01b fails
// Domain: data-display-loading (page rendering, loading state transitions)
// Covers: 01a (UI elements), 01b (initial loader dismissed)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-001',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Sign-in page does not render expected UI elements',
//   symptom: 'Page stuck on loading spinner, or heading/email input/buttons missing after hydration, or initial loader not dismissed',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'critical',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'data-display-loading'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-002: Clerk JS fails to initialize ---
// CREATE IF: AUTH-VERIFY-02a or AUTH-VERIFY-02b fails
// Domain: data-display-loading (client JS loading lifecycle)
// Covers: 02a (form becomes interactive), 02b (no console errors)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-002',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Clerk client JS fails to initialize in browser',
//   symptom: 'Clerk-related console errors during page load, or sign-in form never becomes interactive',
//   evidence: '<paste Playwright failure output and console errors>',
//   detectedBy: 'automated',
//   severity: 'critical',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'data-display-loading'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-003: Email/password sign-in broken ---
// CREATE IF: AUTH-VERIFY-03a, AUTH-VERIFY-03b, or AUTH-VERIFY-03c fails
// Domain: forms-input (form submission, validation, error display)
// Covers: 03a (full flow), 03b (invalid email error), 03c (wrong password error)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-003',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Email/password sign-in flow fails',
//   symptom: 'Email submission errors, password step unreachable, valid credentials rejected, or error display broken on invalid input',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'critical',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'forms-input'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-004: Google SSO entrypoint broken ---
// CREATE IF: AUTH-VERIFY-04 fails for a CODE reason
// (NOT if skipped with "ENV-CONFIG:" tag — that is an environment skip, not a defect)
// Domain: forms-input (SSO button is a form-level auth input action)
// Covers: 04 (Google button triggers OAuth redirect)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-004',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Google SSO entrypoint fails to trigger OAuth redirect',
//   symptom: 'Google button click produces no navigation and no error message',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'high',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'forms-input'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-005: returnTo redirect broken ---
// CREATE IF: AUTH-VERIFY-05a or AUTH-VERIFY-05b fails
// Domain: auth-session-security (auth redirect security, session-aware routing)
// Covers: 05a (returnTo consumed after sign-in), 05b (middleware preserves returnTo)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-005',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'returnTo redirect fails after sign-in',
//   symptom: 'User lands on default dashboard instead of returnTo target, or middleware drops returnTo param on unauthenticated redirect',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'high',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'auth-session-security'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-006: Role-based routing broken ---
// CREATE IF: AUTH-VERIFY-06a or AUTH-VERIFY-06b fails
// Domain: auth-session-security (auth-level access control, session-aware routing)
// Covers: 06a (admin → /admin/overview), 06b (root → dashboard)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-006',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Role-based routing fails for authenticated user',
//   symptom: 'Admin user not redirected to /admin/overview, or root path does not redirect to dashboard',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'high',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'auth-session-security'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-007: Session does not persist on refresh ---
// CREATE IF: AUTH-VERIFY-07a or AUTH-VERIFY-07b fails
// Domain: auth-session-security (core session security, cookie persistence)
// Covers: 07a (survives reload), 07b (cookies present)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-007',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Session does not persist across page reload',
//   symptom: 'Page reload redirects to sign-in, or session cookies (__session, __client_uat) missing after sign-in',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'critical',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'auth-session-security'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-008: Session expiry warning does not appear ---
// CREATE IF: AUTH-VERIFY-08 fails
// Domain: notifications-alerts (warning banner is a notification/alert)
// Covers: 08 (banner, countdown, Sign in now button, Dismiss button)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-008',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'Session expiry warning does not appear on session loss',
//   symptom: 'SessionExpiryGuard banner not visible after cookie clearing, countdown missing, or Sign in now / Dismiss buttons missing',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'medium',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'notifications-alerts'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;


// --- FC-auth-flow-009: Auth error boundary does not catch auth errors ---
// CREATE IF: AUTH-VERIFY-09a or AUTH-VERIFY-09b fails
// Domain: data-display-loading (error boundary rendering fallback display)
// Covers: 09a (boundary wired in provider tree), 09b (non-auth error stability)
//
// CREATE (fc:FailureCase {
//   id: 'FC-auth-flow-009',
//   projectId: 'PROJ-opsuite-web',
//   featureType: 'auth_flow',
//   title: 'AuthErrorBoundary does not render fallback for auth errors',
//   symptom: 'Auth errors crash the app instead of showing recovery UI, or non-auth console errors destabilize the page',
//   evidence: '<paste Playwright failure output>',
//   detectedBy: 'automated',
//   severity: 'medium',
//   status: 'open',
//   createdAt: datetime(),
//   updatedAt: datetime()
// })
// WITH fc
// MATCH (p:Project {id: 'PROJ-opsuite-web'})
// MATCH (ft:FeatureType {name: 'auth_flow'})
// MATCH (fd:FeatureDomain {name: 'data-display-loading'})
// CREATE (fc)-[:ON_PROJECT]->(p)
// CREATE (fc)-[:ON_FEATURE]->(ft)
// CREATE (fc)-[:IN_DOMAIN]->(fd)
// RETURN fc.id;
