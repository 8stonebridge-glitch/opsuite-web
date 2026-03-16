import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

type E2EOwner = {
  email: string;
  password: string;
  ownerName: string;
  userId: string;
};

const OWNER_PATH = path.join(process.cwd(), 'test-results', 'e2e-owner.json');

export async function readE2EOwner(): Promise<E2EOwner> {
  const raw = await readFile(OWNER_PATH, 'utf8');
  return JSON.parse(raw) as E2EOwner;
}

export async function signInAsE2EOwner(page: Page) {
  const owner = await readE2EOwner();

  await page.goto('/sign-in');

  const result = await page.evaluate(async (payload) => {
    const response = await fetch('/api/e2e/sign-in-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      status: response.status,
      body: await response.json().catch(() => ({})),
    };
  }, { userId: owner.userId });

  expect(result.status, JSON.stringify(result.body)).toBe(200);
  await page.goto('/admin/overview', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/admin\/overview$/, { timeout: 15000 });

  return owner;
}

export async function bootstrapSignedInOwner(page: Page, siteNames = ['E2E Primary Site']) {
  const result = await page.evaluate(async (requestedSiteNames) => {
    const response = await fetch('/api/e2e/bootstrap-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ siteNames: requestedSiteNames }),
    });

    return {
      status: response.status,
      body: await response.json().catch(() => ({})),
    };
  }, siteNames);

  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return result.body as { sites: { id: string; name: string }[] };
}
