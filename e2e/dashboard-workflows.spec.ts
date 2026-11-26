import { test, expect } from '@playwright/test';

test('Home opens a simple website message form with a publish review', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /^Tell customers something/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'What should customers know?' })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Message' }).fill('The front entrance is open again.');
  await dialog.getByRole('button', { name: 'Review message' }).click();
  await expect(dialog.getByText(/The front entrance is open again/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Demo published');
});

test('tabs survive reload and follow browser Back and Forward', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const navigate = async (name: string) => {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
  };
  await page.getByRole('button', { name: /^Change usual hours/ }).click();
  await expect(page).toHaveURL(/tab=hours/);
  await navigate('Settings');
  await navigate('Website widgets');
  await expect(page).toHaveURL(/tab=widgets/);
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Business settings');
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Regular hours');
  await page.goForward();
  await page.goForward();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
});

test('widget changes save as a draft and the preview links to hours safely', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const saveButton = page.getByRole('button', { name: 'Save changes', exact: true });
  await expect(saveButton).toBeDisabled();

  await page.getByLabel('Accent colour').fill('#ff0000');
  await expect(saveButton).toBeEnabled();

  let warningMessage = '';
  page.once('dialog', async (dialog) => {
    warningMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Edit hours', exact: true }).click();
  expect(warningMessage).toContain('unsaved widget changes');
  await expect(page.locator('main h1')).toHaveText('Website widgets');

  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Edit hours', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Regular hours');

  await page.goBack();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#ff0000');
  await saveButton.click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');
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
  const publishedName = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!).published.name);
  expect(await publishedName()).not.toBe('Saved draft business');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.draft-notice')).toHaveCount(0);
  await page.goto('/demo?tab=widgets');
  expect(await publishedName()).toBe('Saved draft business');
  await expect(page.getByText('View last published demo', { exact: true })).toHaveCount(0);
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
  await expect(page.getByText(/status inside an existing footer column/)).toBeVisible();
  const footerStyle = 'width:min(100%, 420px);border-radius:12px;overflow:hidden';
  await expect(page.locator('.installation > .code-block')).toContainText(footerStyle);
  await page.getByText('Iframe alternative & strict website policies', { exact: true }).click();
  await expect(page.locator('.installation details .code-block')).toContainText(footerStyle);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('widget typography, background and border controls update the preview', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const preview = page.locator('.browser-preview .widget');

  await page.getByLabel('Typography').selectOption('mono');
  await page.getByLabel('Font size').selectOption('18');
  await page.getByLabel('Background colour mode').selectOption('custom');
  await page.getByLabel('Custom background colour').fill('#123456');
  await page.getByLabel('Border colour mode').selectOption('custom');
  await page.getByLabel('Custom border colour').fill('#abcdef');
  await page.getByLabel('Border thickness').selectOption('4');

  await expect(preview).toHaveCSS('font-size', '18px');
  await expect(preview).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(preview).toHaveCSS('border-color', 'rgb(171, 205, 239)');
  await expect(preview).toHaveCSS('border-width', '4px');
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

  await page.getByLabel('Background colour mode').selectOption('none');
  await expect(preview).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  const settingsGroups = page.getByRole('group', { name: 'Widget settings groups' });
  await settingsGroups.getByRole('button', { name: 'Content' }).click();
  await page.getByLabel("Highlight today's hours").uncheck();
  await page.getByLabel('Show current status').uncheck();
  await page.getByLabel('Let visitors collapse hours').uncheck();
  await expect(preview.locator('.widget-today')).toHaveCount(0);
  await expect(preview.locator('.widget-status')).toHaveCount(0);
  await expect(preview.locator('.widget-expand')).toHaveCount(0);
  await expect(preview.locator('.widget-week')).toBeVisible();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await settingsGroups.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByLabel('Background colour mode')).toHaveValue('auto');
  await expect(preview.locator('.widget-heading .widget-credit')).toBeVisible();
});
