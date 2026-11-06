import { test, expect } from '@playwright/test';

test('profile dropdown keeps creation below profiles and dismisses with Escape', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Switch business location' }).click();
  const popup = page.locator('.profile-dropdown');
  await expect(popup).toBeVisible();
  const create = popup.getByRole('link', { name: 'Create new profile' });
  await expect(create).toHaveAttribute('href', '/signup');
  const list = await popup.locator('.profile-list').boundingBox();
  const footer = await create.boundingBox();
  expect(footer!.y).toBeGreaterThanOrEqual(list!.y + list!.height);
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
});

test('sidebar collapses, keeps navigation usable, and remembers the preference', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop sidebar control');
  await page.goto('/demo');
  const content = page.locator('.app-content');
  const original = (await content.boundingBox())!.width;
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect
    .poll(async () => (await content.boundingBox())!.width)
    .toBeGreaterThan(original + 100);
  await page.getByRole('button', { name: 'Add to your website', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add to your website', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await expect
    .poll(async () => Math.round((await page.locator('.sidebar').boundingBox())!.width))
    .toBe(76);
  await expect.poll(async () => Math.round((await content.boundingBox())!.x)).toBe(76);
  await page.screenshot({ path: 'test-results/sidebar-collapsed.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(
    page.locator('.sidebar .sidebar-text').filter({ hasText: 'Add to your website' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Collapse sidebar', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect
    .poll(async () => (await page.locator('.sidebar').boundingBox())!.width)
    .toBeGreaterThan(200);
});
