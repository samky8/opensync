import { test, expect } from '@playwright/test';

test('tabs survive reload and follow browser Back and Forward', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const navigate = async (name: string) => {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
  };
  await navigate('Opening hours');
  await expect(page).toHaveURL(/tab=hours/);
  await navigate('Website widgets');
  await expect(page).toHaveURL(/tab=widgets/);
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Opening hours');
  await page.goForward();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
});

test('saved drafts stay visibly unpublished after reload until published', async ({ page }) => {
  await page.goto('/demo?tab=settings');
  await page.getByLabel('Business name', { exact: true }).fill('Saved draft business');
  await expect(page.locator('.draft-notice')).toContainText('Unsaved changes');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.draft-notice')).toContainText('Saved draft');
  await page.reload();
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'Saved draft business',
  );
  await expect(page.locator('.draft-notice')).toContainText('not published');
  await page.goto('/demo?tab=widgets');
  await page.getByText('View last published demo', { exact: true }).click();
  await expect(page.locator('.published-demo')).not.toContainText('Saved draft business');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Publish changes', exact: true })
    .click();
  await expect(page.locator('.draft-notice')).toHaveCount(0);
  await expect(page.locator('.published-demo')).toContainText('Saved draft business');
  await page.reload();
  await expect(page.locator('.draft-notice')).toHaveCount(0);
});
