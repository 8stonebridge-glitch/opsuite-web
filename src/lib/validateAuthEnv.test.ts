/**
 * FEAT-AUTH-01: Production env safety — validateAuthEnv tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateAuthEnv } from './validateAuthEnv';

describe('validateAuthEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone env so we can modify freely
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid when all required vars are present', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc';
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing vars', () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(result.missing).toContain('NEXT_PUBLIC_CLERK_SIGN_IN_URL');
  });

  it('warns on whitespace in key values', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc\n';
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('whitespace'))).toBe(true);
  });

  it('warns on invalid Clerk key format', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'invalid_key';
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.warnings.some((w) => w.includes('pk_'))).toBe(true);
  });
});
