import { test, expect } from '@playwright/test';

test('widget settings show Pro crowns and reset to included defaults', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await expect(page.getByRole('img', { name: 'Pro feature' }).first()).toBeVisible();
  await page.getByLabel('Accent colour').fill('#ff0000');
  await page.getByLabel('Appearance', { exact: false }).selectOption('dark');
  await page.getByRole('button', { name: 'Reset to Free defaults', exact: true }).click();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#4f46e5');
  await expect(page.getByLabel('Appearance', { exact: false })).toHaveValue('light');
  await expect(page.getByRole('status')).toContainText('Save or publish to apply');
});

test('reset is available directly in the banner and publish error', async ({ page }) => {
  const error = encodeURIComponent(
    'Widget customization requires Pro. Reset to Free defaults to save and publish.',
  );
  await page.goto(`/demo?tab=widgets&error=${error}`);
  await page.getByLabel('Accent colour').fill('#ff0000');
  await page
    .locator('.error-banner')
    .getByRole('button', { name: 'Reset to Free defaults' })
    .click();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#4f46e5');
  await expect(page.locator('.error-banner')).toHaveCount(0);
  await page.goto(`/demo?tab=widgets&error=${error}`);
  await page.getByLabel('Accent colour').fill('#ff0000');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reset to Free defaults' }).click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Demo published');
  await page.reload();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#4f46e5');
});
