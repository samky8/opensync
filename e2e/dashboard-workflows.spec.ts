import { test, expect } from '@playwright/test';

test('tabs survive reload and follow browser Back and Forward', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const navigate = async (name: string) => {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
  };
  await navigate('Regular hours');
  await expect(page).toHaveURL(/tab=hours/);
  await navigate('Website');
  await expect(page).toHaveURL(/tab=widgets/);
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Business hours');
  await page.goForward();
  await expect(page.locator('main h1')).toHaveText('Add to your website');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Add to your website');
});

test('saved drafts stay visibly unpublished after reload until published', async ({ page }) => {
  await page.goto('/demo?tab=settings');
  const publishButton = page.getByRole('button', { name: 'Publish changes', exact: true });
  await expect(publishButton).toBeDisabled();
  await page.getByLabel('Business name', { exact: true }).fill('Saved draft business');
  await expect(publishButton).toBeEnabled();
  await expect(page.locator('.draft-notice')).toContainText('Unsaved changes');
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await publishButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.draft-notice')).toContainText('Saved draft');
  await page.reload();
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'Saved draft business',
  );
  await expect(publishButton).toBeEnabled();
  await expect(page.locator('.draft-notice')).toContainText('not published');
  await page.goto('/demo?tab=widgets');
  await page.getByText('View last published demo', { exact: true }).click();
  await expect(page.locator('.published-demo')).not.toContainText('Saved draft business');
  await page.goto('/demo?tab=settings');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.draft-notice')).toHaveCount(0);
  await page.goto('/demo?tab=widgets');
  await page.getByText('View last published demo', { exact: true }).click();
  await expect(page.locator('.published-demo')).toContainText('Saved draft business');
  await page.reload();
  await expect(page.locator('.draft-notice')).toHaveCount(0);
});

test('website instructions open from Connections and stay separate from widget settings', async ({
  page,
}) => {
  await page.goto('/demo?tab=widgets');
  await expect(page.getByRole('heading', { name: 'Make it part of your website.' })).toHaveCount(0);

  await page.goto('/demo?tab=integrations');
  await page.getByRole('button', { name: 'View website instructions' }).click();
  await expect(page).toHaveURL(/tab=website/);
  await expect(page.getByRole('heading', { name: 'Add to your website' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Make it part of your website.' })).toBeVisible();
  await expect(page.getByText('Copy the embed code', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('widget typography, font size and background controls update the preview', async ({
  page,
}) => {
  await page.goto('/demo?tab=widgets');
  const preview = page.locator('.browser-preview .widget');

  await page.getByLabel('Typography').selectOption('mono');
  await page.getByLabel('Font size').selectOption('18');
  await page.getByLabel('Background colour mode').selectOption('custom');
  await page.getByLabel('Custom background colour').fill('#123456');

  await expect(preview).toHaveCSS('font-size', '18px');
  await expect(preview).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  expect(await preview.evaluate((element) => getComputedStyle(element).fontFamily)).toContain(
    'ui-monospace',
  );

  await page.getByLabel('Typography').selectOption('auto');
  await page.getByLabel('Font size').selectOption('auto');
  const inherited = await preview.evaluate((element) => ({
    widgetFamily: getComputedStyle(element).fontFamily,
    parentFamily: getComputedStyle(element.parentElement!).fontFamily,
    widgetSize: getComputedStyle(element).fontSize,
    parentSize: getComputedStyle(element.parentElement!).fontSize,
  }));
  expect(inherited.widgetFamily).toBe(inherited.parentFamily);
  expect(inherited.widgetSize).toBe(inherited.parentSize);

  await page.getByLabel("Highlight today's hours").uncheck();
  await page.getByLabel('Show current status').uncheck();
  await page.getByLabel('Let visitors collapse hours').uncheck();
  await expect(preview.locator('.widget-today')).toHaveCount(0);
  await expect(preview.locator('.widget-status')).toHaveCount(0);
  await expect(preview.locator('.widget-expand')).toHaveCount(0);
  await expect(preview.locator('.widget-week')).toBeVisible();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  const statusLayout = await preview.evaluate((element) => {
    const widget = element.getBoundingClientRect();
    const credit = element.querySelector('.widget-credit')!.getBoundingClientRect();
    return {
      padding: getComputedStyle(element).padding,
      creditFromTop: credit.top - widget.top,
      creditFromRight: widget.right - credit.right,
    };
  });
  expect(statusLayout.padding).toBe('13px 15px');
  expect(statusLayout.creditFromTop).toBeLessThan(18);
  expect(statusLayout.creditFromRight).toBeLessThan(18);
});
