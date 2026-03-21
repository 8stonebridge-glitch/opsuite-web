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

  // Use Playwright request context instead of page.evaluate(fetch(...))
  // to avoid Clerk dev-browser handshake interference (ERR_ABORTED).
  const baseURL = page.url().startsWith('http')
    ? new URL(page.url()).origin
    : 'http://localhost:4010';

  const response = await page.request.post(`${baseURL}/api/e2e/sign-in-owner`, {
    data: { userId: owner.userId },
  });

  expect(response.status(), await response.text()).toBe(200);

  // Extract set-cookie headers and inject into browser context
  const setCookieHeaders = response.headersArray().filter(
    (h) => h.name.toLowerCase() === 'set-cookie',
  );

  const cookies = setCookieHeaders.map((h) => {
    const parts = h.value.split(';')[0].split('=');
    const name = parts[0];
    const value = parts.slice(1).join('=');
    return {
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    };
  });

  await page.context().addCookies(cookies);

  // Navigate to admin overview — cookies are already set, no handshake needed
  await page.goto('/admin/overview', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await expect(page).toHaveURL(/\/admin\/overview/, { timeout: 15000 });

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
