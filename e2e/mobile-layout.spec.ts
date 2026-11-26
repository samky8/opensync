import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/demo',
  '/login',
  '/signup',
  '/free-business-hours-widget',
  '/holiday-hours',
  '/free-holiday-hours-generator',
  '/google-business-profile-sync',
  '/for-restaurants',
  '/for-food-trucks',
  '/for-web-developers',
  '/help',
  '/privacy',
  '/terms',
];

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 320, height: 844 } });

  for (const route of publicRoutes) {
    test(`${route} fits a narrow phone viewport`, async ({ page }) => {
      await page.goto(route);

      const viewport = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
    });
  }

  test('home hero actions stay inside the viewport', async ({ page }) => {
    await page.goto('/');

    const actionBoxes = await page.locator('.hero-actions .btn').evaluateAll((actions) =>
      actions.map((action) => {
        const box = action.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
    );

    for (const box of actionBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
    }
  });

  test('holiday graphic preview fits its card', async ({ page }) => {
    await page.goto('/free-holiday-hours-generator');

    const bounds = await page.locator('.graphic-preview').evaluate((preview) => {
      const previewBox = preview.getBoundingClientRect();
      const cardBox = preview.parentElement!.getBoundingClientRect();
      return {
        previewLeft: previewBox.left,
        previewRight: previewBox.right,
        cardLeft: cardBox.left,
        cardRight: cardBox.right,
      };
    });

    expect(bounds.previewLeft).toBeGreaterThanOrEqual(bounds.cardLeft);
    expect(bounds.previewRight).toBeLessThanOrEqual(bounds.cardRight);
  });
});
