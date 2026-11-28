import { expect, test } from '@playwright/test';

test('homepage presents a tappable demo without the old setup steps', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'See one update go everywhere.' })).toBeVisible();
  await expect(page.getByText('Make yourself at home.')).toHaveCount(0);
  await expect(page.getByText('Connect your little corner of the web.')).toHaveCount(0);
  await expect(page.getByText('Change once. Get on with your day.')).toHaveCount(0);

  const playButton = page.getByRole('button', { name: 'Play video' });
  await expect(playButton).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await playButton.tap();
  } else {
    await playButton.click();
  }

  await expect(playButton).toBeHidden();
  await expect(page.locator('.home-promo-video video')).toHaveJSProperty('paused', false);
});
