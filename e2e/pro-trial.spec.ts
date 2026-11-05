import { test, expect } from '@playwright/test';

test('trial welcome animates, lists features, and closes accessibly', async ({
  page,
}, testInfo) => {
  await page.goto('/demo?tab=billing');
  const card = page.getByRole('region', { name: 'Pro trial' });
  await expect(card).toContainText('Free for 14 days');
  const claim = page.getByRole('button', { name: 'Preview free trial', exact: true });
  await claim.click();
  await expect(page.getByRole('button', { name: 'Unlocking Pro' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  const welcome = page.getByRole('dialog', { name: 'This is your Pro welcome!' });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText('Scheduled announcements');
  await expect(welcome).toContainText('Custom widget');
  await expect(welcome).toContainText('No card required');
  await expect(welcome).toContainText('demo preview');
  await expect(page.getByRole('region', { name: 'Pro trial' })).toContainText(
    'Your Pro trial is active',
  );
  await page.screenshot({
    path: `test-results/pro-trial-${testInfo.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /explore Pro/ }).click();
  await expect(welcome).toHaveCount(0);
});

test('trial welcome respects reduced motion and Escape dismissal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Preview free trial', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.trial-confetti')).toBeHidden();
  expect(
    await page
      .locator('.trial-celebration')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
