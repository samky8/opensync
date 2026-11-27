import { expect, test } from '@playwright/test';

test('guidance rotates, supports direct selection, and links to the matching screen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/demo');

  const tips = page.getByRole('region', { name: 'Tips & guidance' });
  const first = tips.getByRole('button', { name: /^Tip 1:/ });
  const second = tips.getByRole('button', { name: /^Tip 2:/ });
  const third = tips.getByRole('button', { name: /^Tip 3:/ });
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await tips.getByRole('button', { name: 'Pause tip rotation' }).click();
  await tips.getByRole('button', { name: 'Resume tip rotation' }).click();
  await page.locator('main h1').click();
  await page.clock.runFor(30_000);
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await third.click();
  await expect(third).toHaveAttribute('aria-pressed', 'true');
  await expect(tips.getByRole('button', { name: /^Plan holiday or seasonal hours/ })).toHaveCount(0);
  await page.clock.runFor(350);
  await tips.getByRole('button', { name: /^Share a timely update/ }).click();
  await expect(page).toHaveURL(/tab=announcements/);
});

test('dismissing setup fills the space and lasts for the tab session', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 1496, height: 900 });
  }
  await page.goto('/demo');

  const setup = page.getByRole('heading', { name: 'Setup progress' });
  const channels = page.getByRole('heading', { name: 'Connected channels' });
  await expect(setup).toBeVisible();
  const channelsCard = page.locator('section').filter({ has: channels }).filter({
    has: page.getByRole('button', { name: 'Manage', exact: true }),
  }).last();
  const before = (await channelsCard.boundingBox())!;
  await page.getByRole('button', { name: 'Dismiss setup progress for this session' }).click();
  await expect(setup).toBeHidden();
  await expect(channels).toBeFocused();
  if (testInfo.project.name === 'desktop') {
    const after = (await channelsCard.boundingBox())!;
    expect(after.x).toBeLessThan(before.x);
    expect(after.width).toBeGreaterThan(before.width);
  }
  await page.reload();
  await expect(setup).toBeHidden();
  const freshPage = await page.context().newPage();
  await freshPage.goto('/demo');
  await expect(freshPage.getByRole('heading', { name: 'Setup progress' })).toBeVisible();
});
