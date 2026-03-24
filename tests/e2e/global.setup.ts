import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const api = anyApi as any;
const OUTPUT_PATH = path.join(process.cwd(), 'test-results', 'e2e-owner.json');
const OWNER_PASSWORD = 'OpsuiteE2E!234';

export default async function globalSetup(_config: FullConfig) {
  loadEnvConfig(process.cwd());

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for Playwright global setup.');
  }

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerEmail = `opsuite-e2e-owner-${uniqueSuffix}@example.com`;
  const ownerName = 'OpSuite E2E Owner';

  const convex = new ConvexHttpClient(convexUrl);

  // With Convex Auth, user creation happens through the signUp flow.
  // For E2E tests, we store a signup draft so the test can sign up via the UI.
  await convex.mutation(api.organizations.storeSignupDraft, {
    email: ownerEmail,
    organizationName: `OpSuite E2E Org ${uniqueSuffix}`,
    mode: 'direct',
  });

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        email: ownerEmail,
        password: OWNER_PASSWORD,
        ownerName,
      },
      null,
      2,
    ),
    'utf8',
  );
}
