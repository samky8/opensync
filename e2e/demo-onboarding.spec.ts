import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'Australia/Adelaide' });

test('demo onboarding starts fresh, completes locally, and can restart', async ({ page }, testInfo) => {
  const accountRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/manage')) accountRequests.push(request.url());
  });
  await page.goto('/demo');
  const startOnboarding = async () => {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
    await expect(page.getByText('Step 1 of 6', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /get started/ }).click();
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Your business');
    await expect(page.getByRole('combobox', { name: /Time zone/ })).toHaveValue('Australia/Adelaide');
  };
  await startOnboarding();
  const timezone = page.getByRole('combobox', { name: /Time zone/ });
  expect(await timezone.locator('option').count()).toBeGreaterThan(400);
  await expect(timezone.locator('option[value="Asia/Kolkata"], option[value="Asia/Calcutta"]')).toHaveText(/UTC\+05:30/);
  await timezone.selectOption('Asia/Tokyo');
  await page.getByLabel('Business name', { exact: true }).fill('Fresh demo business');
  await page.getByRole('textbox', { name: /Website/ }).fill('example.com/business');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await expect(page.getByText('Step 3 of 6', { exact: true })).toBeVisible();
  const business = await page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!).draft);
  expect(business.timezone).toBe('Asia/Tokyo');
  expect(business.website).toBe('https://example.com/business');
  await page.getByRole('button', { name: 'Save hours & continue' }).click();
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  await expect(page.getByText('Step 5 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  await expect(page.getByText('Step 6 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByText('Step 6 of 6', { exact: true })).toBeHidden();
  await expect(page.locator('.sidebar button[aria-label="Overview"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await startOnboarding();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!));
  expect(stored.version).toBe(0);
  expect(stored.history).toEqual([]);
  expect(stored.draft.announcements).toEqual([]);
  expect(stored.draft.exceptions).toEqual([]);
  expect(accountRequests).toEqual([]);
});
