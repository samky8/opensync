import { test, expect } from '@playwright/test';

test('publish destinations restore social artwork and customize inline', async ({ page }, info) => {
  await page.goto('/demo?tab=hours');
  await page.evaluate(() =>
    localStorage.setItem(
      'opensync-social-v1:demo',
      JSON.stringify({
        title: 'Our holiday update',
        message: 'Closed this Friday.',
        footer: 'See you soon',
        caption: '',
        format: 'story',
        platform: 'Instagram',
        theme: 'dark',
        accent: '#6655aa',
      }),
    ),
  );
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Where this update will go' })).toBeVisible();
  await expect(dialog.getByRole('checkbox')).toHaveCount(6);
  const instagram = dialog.locator('.publish-social-channel').first();
  await expect(instagram.locator('canvas')).toHaveAttribute('aria-label', /Our holiday update/);
  await expect(instagram.locator('canvas')).toHaveAttribute('height', '1920');
  await instagram.getByRole('button', { name: 'Customize', exact: true }).click();
  await instagram.getByLabel('Headline', { exact: true }).fill('Updated inline');
  await instagram.getByRole('button', { name: 'Done customizing' }).click();
  await instagram.getByRole('checkbox').check();
  await expect(instagram.getByRole('button', { name: 'Download PNG' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(dialog.locator('.publish-social-channel').first().locator('canvas')).toHaveAttribute(
    'aria-label',
    /Updated inline/,
  );
  await expect(dialog.locator('.publish-social-channel').last().locator('canvas')).toHaveAttribute(
    'aria-label',
    /Our holiday update/,
  );
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/publish-destinations-${info.project.name}.png` });
  await dialog.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
