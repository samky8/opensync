import { test, expect } from '@playwright/test';
test('verified account creates a location, publishes hours and exposes its public widget', async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    'Requires a dedicated verified Supabase test user with no locations',
  );
  await page.goto('/login');
  await page.getByLabel('Email address').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s get started' }).click();
  await page.getByLabel('Business name', { exact: true }).fill(`Integration Café ${Date.now()}`);
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Save hours & continue' }).click();
  await page.getByRole('button', { name: 'Continue to website' }).click();
  await expect(page.locator('pre')).toContainText('data-opensync');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Review & publish' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish changes' }).click();
  await expect(page.getByRole('status')).toContainText('Published');
  const id = await page
    .locator('[data-profile-id][aria-current="true"]')
    .getAttribute('data-profile-id');
  await page.goto(`/embed/${id}`);
  await expect(page.getByRole('region')).toContainText('Integration Café');
});
