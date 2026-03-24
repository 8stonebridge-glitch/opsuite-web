import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FEAT-AUTH-01: Production env safety for Clerk/Convex auth configuration.
 *
 * Validates that all required auth environment variables are present and
 * well-formed at app startup. Fails fast with clear error messages instead
 * of producing cryptic runtime errors deep in the auth flow.
 *
 * Call this in the root layout or a server component that runs early.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_CLIENT_VARS = [
  'NEXT_PUBLIC_CONVEX_URL',
] as const;

const REQUIRED_SERVER_VARS = [
] as const;

type KeylessConfig = {
  publishableKey?: string;
  secretKey?: string;
};

function readLocalClerkKeylessConfig(): KeylessConfig | null {
  const keylessPath =
    process.env.CLERK_KEYLESS_PATH || join(process.cwd(), '.clerk', '.tmp', 'keyless.json');

  if (!existsSync(keylessPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(keylessPath, 'utf8')) as KeylessConfig;
    return parsed;
  } catch {
    return null;
  }
}

export function validateAuthEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const keylessConfig =
    process.env.NODE_ENV === 'production' ? null : readLocalClerkKeylessConfig();
  const effectivePublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || keylessConfig?.publishableKey?.trim() || '';
  const effectiveSecretKey =
    process.env.CLERK_SECRET_KEY?.trim() || keylessConfig?.secretKey?.trim() || '';

  // Client vars (available via NEXT_PUBLIC_)
  for (const key of REQUIRED_CLIENT_VARS) {
    const val = process.env[key];
    if (!val || val.trim() === '') {
      missing.push(key);
    } else if (val !== val.trim()) {
      // Detect trailing whitespace / newline corruption (has happened before)
      warnings.push(`${key} has leading/trailing whitespace — may cause auth failures`);
    }
  }

  // Server vars (only available server-side)
  if (typeof window === 'undefined') {
    for (const key of REQUIRED_SERVER_VARS) {
      const val = process.env[key];
      if (!val || val.trim() === '') {
        missing.push(key);
      } else if (val !== val.trim()) {
        warnings.push(`${key} has leading/trailing whitespace`);
      }
    }

    if (!effectivePublishableKey) {
      missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    } else if (
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim()
    ) {
      warnings.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY has leading/trailing whitespace — may cause auth failures');
    }

    if (!effectiveSecretKey) {
      missing.push('CLERK_SECRET_KEY');
    } else if (
      process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_SECRET_KEY !== process.env.CLERK_SECRET_KEY.trim()
    ) {
      warnings.push('CLERK_SECRET_KEY has leading/trailing whitespace');
    }

    // Validate Clerk key format
    const pubKey = effectivePublishableKey;
    if (pubKey && !pubKey.startsWith('pk_')) {
      warnings.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with pk_test_ or pk_live_');
    }

    const secKey = effectiveSecretKey;
    if (secKey && !secKey.startsWith('sk_')) {
      warnings.push('CLERK_SECRET_KEY should start with sk_test_ or sk_live_');
    }

    // Validate Convex URL format
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';
    if (convexUrl && !convexUrl.includes('.convex.cloud')) {
      warnings.push('NEXT_PUBLIC_CONVEX_URL does not look like a Convex cloud URL');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Throws if required auth env vars are missing. Call server-side only.
 */
export function assertAuthEnv(): void {
  // Skip during build (next build) — env vars aren't available in CI
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const result = validateAuthEnv();

  for (const warning of result.warnings) {
    console.warn(`[auth-env] ${warning}`);
  }

  if (!result.valid) {
    throw new Error(
      `[auth-env] Missing required environment variables: ${result.missing.join(', ')}. ` +
      `Auth will not work without these. Check .env.local.`
    );
  }
}
