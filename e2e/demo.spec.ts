import { test, expect } from '@playwright/test';
test('demo changes persist, publish, and render in the widget preview', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/overview-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Closed today', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Publish changes', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Demo published');
  await page.reload();
  await expect(page.getByText('You’re closed.', { exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Website widgets', exact: true }).click();
  await expect(page.getByText('YOUR WIDGET · DRAFT PREVIEW')).toBeVisible();
  await expect(
    page.locator('.browser-preview').getByText('Closed now', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/widgets-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('all navigation screens work without placeholder actions', async ({ page }, testInfo) => {
  await page.goto('/demo');
  for (const name of [
    'Opening hours',
    'Special hours',
    'Announcements',
    'Connections',
    'Activity',
    'Settings',
  ]) {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: `test-results/settings-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('marketing and credential gates are honest', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Change your hours once. Update everywhere.' }),
  ).toBeVisible();
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
});
test('existing announcements can be edited and temporary-hour periods do not submit early', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Close early', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add period', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Close early', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Announcements', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit announcement', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('A newly edited café announcement.');
  await page.getByRole('button', { name: 'Review announcement' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Publish changes', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Demo published');
  await expect(page.locator('.announcement-widget')).toContainText(
    'A newly edited café announcement.',
  );
});
