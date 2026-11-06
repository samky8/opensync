import { test, expect } from '@playwright/test';

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
  };
  await startOnboarding();
  await page.getByLabel('Business name', { exact: true }).fill('Fresh demo business');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await expect(page.getByText('Step 3 of 6', { exact: true })).toBeVisible();
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
