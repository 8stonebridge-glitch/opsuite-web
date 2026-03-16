import { expect, test } from '@playwright/test';
import { bootstrapSignedInOwner, signInAsE2EOwner } from './helpers/auth';

test.setTimeout(60_000);

test('admin can create and remove a person from People', async ({ page }) => {
  await signInAsE2EOwner(page);
  const bootstrap = await bootstrapSignedInOwner(page, ['E2E Primary Site']);
  const primarySiteName = bootstrap.sites[0]?.name ?? 'E2E Primary Site';

  await page.goto('/admin/people');
  await expect(page.getByRole('button', { name: 'Add Person' })).toBeVisible();

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const personName = `Playwright Person ${uniqueSuffix}`;
  const personEmail = `opsuite-e2e-person-${uniqueSuffix}@example.com`;
  const updatedPhone = `+234801${Date.now().toString().slice(-7)}`;

  await page.getByRole('button', { name: 'Add Person' }).click();
  await expect(page.getByPlaceholder('Ada Nwobi')).toBeVisible();

  await page.getByPlaceholder('Ada Nwobi').fill(personName);
  await page.getByPlaceholder('ada@company.com').fill(personEmail);
  await page.getByPlaceholder('+2348012345678').fill('+2348012345678');
  await page.getByPlaceholder('At least 8 characters').fill('OpsuiteUser!234');
  await page.getByRole('button', { name: 'Choose a site' }).click();
  await page.getByRole('button', { name: primarySiteName }).click();

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/people') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  );

  await page.getByRole('button', { name: 'Create Person' }).click();
  await createResponsePromise;
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Add Person' })).toBeVisible();

  await expect(page.getByText(personName, { exact: true })).toBeVisible();

  await page.getByText(personName, { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();

  const phoneInput = page.getByPlaceholder('+2348012345678');
  await phoneInput.fill(updatedPhone);

  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/people/') &&
      response.request().method() === 'PATCH' &&
      response.status() === 200,
  );

  await page.getByRole('button', { name: 'Save Changes' }).click();
  await saveResponsePromise;
  await expect(page.getByText('Edit Person', { exact: true })).not.toBeVisible();
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Add Person' })).toBeVisible();

  await expect(page.getByText(personName, { exact: true })).toBeVisible();
  await page.getByText(personName, { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove Person' })).toBeEnabled();
  await expect(page.getByPlaceholder('+2348012345678')).toHaveValue(updatedPhone);

  page.once('dialog', (dialog) => dialog.accept());

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/people/') &&
      response.request().method() === 'DELETE',
  );

  await page.getByRole('button', { name: 'Remove Person' }).click();
  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.status(), await deleteResponse.text()).toBe(200);
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Add Person' })).toBeVisible();

  await expect(page.getByText(personName, { exact: true })).not.toBeVisible();
});
