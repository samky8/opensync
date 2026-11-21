import { expect, test } from '@playwright/test';

test('widget selector layout', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const selector = page.locator('.widget-type-tabs');
  const appearance = page.getByRole('heading', { name: /Widget appearance/ });
  await expect(selector).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Visible on your website' }).locator('input[type="checkbox"]'),
  ).toHaveCount(1);
  expect((await selector.boundingBox())!.y).toBeLessThan((await appearance.boundingBox())!.y);
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByLabel('Show live status')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/widget-tabs-visual.png', fullPage: true });
});
