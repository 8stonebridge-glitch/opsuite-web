import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { createClerkClient } from '@clerk/backend';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const api = anyApi as any;
const OUTPUT_PATH = path.join(process.cwd(), 'test-results', 'e2e-owner.json');
const OWNER_PASSWORD = 'OpsuiteE2E!234';

async function ensureConvexJwtTemplate(client: ReturnType<typeof createClerkClient>) {
  const templates = await client.jwtTemplates.list();
  const existing = templates.data.find((template) => template.name === 'convex');

  if (existing) {
    return existing;
  }

  return await client.jwtTemplates.create({
    name: 'convex',
    claims: {
      aud: 'convex',
      email: '{{user.primary_email_address}}',
      phone_number: '{{user.primary_phone_number}}',
      name: '{{user.full_name}}',
      given_name: '{{user.first_name}}',
      family_name: '{{user.last_name}}',
      picture: '{{user.image_url}}',
    },
    lifetime: 60,
    allowedClockSkew: 5,
  });
}

async function markPrimaryEmailVerified(client: ReturnType<typeof createClerkClient>, userId: string) {
  const user = await client.users.getUser(userId);
  const emailAddress = user.emailAddresses[0];

  if (!emailAddress) {
    throw new Error('E2E owner was created without an email address.');
  }

  await client.emailAddresses.updateEmailAddress(emailAddress.id, {
    verified: true,
    primary: true,
  });
}

export default async function globalSetup(_config: FullConfig) {
  loadEnvConfig(process.cwd());

  const secretKey = process.env.CLERK_SECRET_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for Playwright global setup.');
  }

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for Playwright global setup.');
  }

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerEmail = `opsuite-e2e-owner-${uniqueSuffix}@example.com`;
  const ownerName = 'OpSuite E2E Owner';

  const clerk = createClerkClient({ secretKey });
  const convex = new ConvexHttpClient(convexUrl);

  await ensureConvexJwtTemplate(clerk);

  const owner = await clerk.users.createUser({
    emailAddress: [ownerEmail],
    password: OWNER_PASSWORD,
    firstName: 'OpSuite',
    lastName: 'E2E Owner',
    skipLegalChecks: true,
  });

  await markPrimaryEmailVerified(clerk, owner.id);

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
        userId: owner.id,
      },
      null,
      2,
    ),
    'utf8',
  );
}
