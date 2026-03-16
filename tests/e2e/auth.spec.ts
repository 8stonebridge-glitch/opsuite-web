import { expect, test } from '@playwright/test';

test('sign-in page loads the custom auth form', async ({ page }) => {
  await page.goto('/sign-in');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
});

test('sign-up page loads the custom auth form', async ({ page }) => {
  await page.goto('/sign-up');

  await expect(page.getByRole('heading', { name: 'Create admin account' })).toBeVisible();
  await expect(page.getByLabel('First name')).toBeVisible();
  await expect(page.getByLabel('Last name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google as admin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create admin account', exact: true })).toBeVisible();
});
