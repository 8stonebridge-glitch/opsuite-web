/**
 * FEAT-AUTH-01: Production env safety — validateAuthEnv tests
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateAuthEnv } from './validateAuthEnv';

describe('validateAuthEnv', () => {
  const originalEnv = process.env;
  let tempDir = '';
  let keylessFile = '';

  beforeEach(() => {
    // Clone env so we can modify freely
    process.env = { ...originalEnv };
    tempDir = mkdtempSync(join(tmpdir(), 'opsuite-keyless-'));
    keylessFile = join(tempDir, 'keyless.json');
    process.env.CLERK_KEYLESS_PATH = keylessFile;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it('returns valid when all required vars are present', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing vars', () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    delete process.env.CLERK_SECRET_KEY;

    const result = validateAuthEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(result.missing).toContain('CLERK_SECRET_KEY');
  });

  it('warns on whitespace in key values', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc\n';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('whitespace'))).toBe(true);
  });

  it('warns on invalid Clerk key format', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'invalid_key';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.CLERK_SECRET_KEY = 'sk_test_abc';

    const result = validateAuthEnv();
    expect(result.warnings.some((w) => w.includes('pk_'))).toBe(true);
  });

  it('accepts local Clerk keyless config in development', () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://foo.convex.cloud';
    process.env.NODE_ENV = 'development';
    process.env.CLERK_KEYLESS_PATH = keylessFile;

    writeFileSync(
      keylessFile,
      JSON.stringify({
        publishableKey: 'pk_test_from_keyless',
        secretKey: 'sk_test_from_keyless',
      }),
    );

    const result = validateAuthEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
