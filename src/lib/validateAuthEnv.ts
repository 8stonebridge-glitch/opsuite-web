/**
 * Production env safety for Convex auth configuration.
 *
 * Validates that the required NEXT_PUBLIC_CONVEX_URL is present at startup.
 * With Convex Auth, no Clerk keys are needed.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_CLIENT_VARS = [
  'NEXT_PUBLIC_CONVEX_URL',
] as const;

export function validateAuthEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_CLIENT_VARS) {
    const val = process.env[key];
    if (!val || val.trim() === '') {
      missing.push(key);
    } else if (val !== val.trim()) {
      warnings.push(`${key} has leading/trailing whitespace — may cause auth failures`);
    }
  }

  if (typeof window === 'undefined') {
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
