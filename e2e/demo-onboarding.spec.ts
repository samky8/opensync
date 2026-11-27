import { test, expect } from '@playwright/test';
import { defaultSchedule } from '../src/lib/domain';

test('demo repairs an old onboarding reset and keeps onboarding unavailable', async ({
  page,
}, testInfo) => {
  await page.addInitScript((blank) => {
    localStorage.setItem(
      'opensync-demo-v1',
      JSON.stringify({ draft: blank, published: blank, version: 0, history: [] }),
    );
  }, defaultSchedule('Your business'));

  await page.goto('/demo?tab=settings');
  await expect(page.getByText('Step 1 of 6', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Juniper & Oak');
  const restart = page.getByRole('button', { name: 'Restart setup unavailable', exact: true });
  await expect(restart).toBeDisabled();
  await expect(page.getByText(/Onboarding is unavailable in the demo workspace/)).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!));
  expect(stored.version).toBe(1);
  expect(stored.draft.name).toBe('Juniper & Oak');
  expect(stored.published.name).toBe('Juniper & Oak');

  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByText('Step 1 of 6', { exact: true })).toHaveCount(0);
});
