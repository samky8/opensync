import { expect, test } from '@playwright/test';

test('connections lists upcoming ChatGPT, Bing, and Apple Maps destinations', async ({ page }) => {
  await page.goto('/demo?tab=integrations');

  const upcoming = page.locator('.connection-card-coming-soon');
  await expect(upcoming).toHaveCount(3);
  await expect(upcoming.getByRole('heading')).toHaveText([
    'ChatGPT',
    'Microsoft Bing',
    'Apple Maps',
  ]);
  await expect(upcoming.getByText('Coming soon', { exact: true })).toHaveCount(3);

  for (const brand of ['chatgpt', 'bing', 'apple']) {
    await expect(upcoming.locator(`.${brand}-brand`)).toHaveCSS(
      'background-image',
      new RegExp(`${brand}\\.svg`),
    );
  }
});
