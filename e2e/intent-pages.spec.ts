import { expect, test } from '@playwright/test';

const pages = [
  ['/free-business-hours-widget', 'Website hours that stay'],
  ['/holiday-hours', 'Special hours now.'],
  ['/for-restaurants', 'Your guests know when'],
  ['/for-food-trucks', 'Turn today’s stop into'],
  ['/for-web-developers', 'Ship the hours block.'],
  ['/google-business-profile-sync', 'Change your hours once.'],
  ['/free-holiday-hours-generator', 'Make holiday hours'],
] as const;

for (const [path, heading] of pages) {
  test(`${path} is indexable, responsive, and has a direct signup path`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(/OpenSync/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /create your free account/i })).toHaveAttribute('href', '/signup');
    await expect(page.locator('#product-demo .intent-tool')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('the widget designer updates its live preview', async ({ page }) => {
  await page.goto('/free-business-hours-widget');
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('.sample-site .widget')).toHaveClass(/dark/);
});

test('the holiday graphic generator has editable inputs and a download action', async ({ page }) => {
  await page.goto('/free-holiday-hours-generator');
  await page.getByLabel('Business name').fill('Corner Market');
  await expect(page.locator('.graphic-preview')).toContainText('Corner Market');
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});
