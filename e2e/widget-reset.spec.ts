import { test, expect } from '@playwright/test';

test('Pro widget settings hide upgrade crowns and reset to included defaults', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await expect(page.getByRole('img', { name: 'Pro feature' })).toHaveCount(0);
  await page.getByLabel('Accent colour').fill('#ff0000');
  await page.getByLabel('Appearance', { exact: false }).selectOption('dark');
  await page.getByRole('button', { name: 'Reset to Free defaults', exact: true }).click();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#4f46e5');
  await expect(page.getByLabel('Appearance', { exact: false })).toHaveValue('light');
  await expect(page.getByRole('status')).toContainText('Save or publish to apply');
});

test('reset is available directly in the banner and widget changes can be saved', async ({
  page,
}) => {
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
  await page
    .locator('.error-banner')
    .getByRole('button', { name: 'Reset to Free defaults' })
    .click();
  await page.getByLabel('Accent colour').fill('#00ff00');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');
  await page.reload();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#00ff00');
});

test('hours display settings update the preview and persist per widget', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const hours = page.locator('.preview-body .widget-type-hours');
  const content = page.getByRole('button', { name: 'Content', exact: true });
  const language = page.getByRole('combobox', { name: 'Language', exact: true });
  await content.click();
  await language.selectOption('fr');
  await page.getByRole('combobox', { name: 'Time format', exact: true }).selectOption('24');
  await page.getByLabel('Week starts on').selectOption('sunday');
  await page.getByLabel('Show time zone').uncheck();
  await expect(hours.getByText('Aujourd’hui', { exact: true })).toBeVisible();
  await expect(hours.locator('.widget-week > div').first()).toContainText('dimanche');
  await expect(hours.locator('.widget-zone')).toHaveCount(0);

  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('slider', { name: 'Shadow strength' }).fill('3');
  await expect(hours).toHaveCSS('box-shadow', 'rgba(23, 33, 60, 0.16) 0px 12px 30px 0px');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');

  await page.reload();
  await content.click();
  await expect(language).toHaveValue('fr');
  await expect(page.getByLabel('Show time zone')).not.toBeChecked();
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(language).toHaveValue('auto');
  await expect(page.getByLabel('Week starts on')).toHaveCount(0);
});
