import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('social drafts restore and export correctly sized posts and stories', async ({
  page,
}, info) => {
  await page.goto('/demo');
  async function openStudio() {
    if (info.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Social studio', exact: true }).click();
  }
  await openStudio();
  await page.getByLabel('Start with your business details').selectOption('weekly');
  await expect(page.getByRole('textbox', { name: 'Announcement', exact: true })).toHaveValue(
    /Monday/,
  );
  await page.getByLabel('Headline', { exact: true }).fill('Holiday opening hours');
  await page
    .getByRole('textbox', { name: 'Announcement', exact: true })
    .fill('Friday: 9 am – 2 pm\nSaturday: Closed\nSee you on Monday!');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await openStudio();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  await expect(page.getByLabel('Headline', { exact: true })).toHaveValue('Holiday opening hours');
  for (const format of ['post', 'story']) {
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption(format);
    await page
      .getByRole('combobox', { name: 'Platform', exact: true })
      .selectOption(format === 'story' ? 'Facebook' : 'Instagram');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const download = await downloadPromise;
    const png = await readFile((await download.path())!);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(format === 'story' ? 1920 : 1080);
    expect(download.suggestedFilename()).toContain(format);
    await page.screenshot({
      path: `test-results/social-${format}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(
    page.getByText('Demo images are never posted to social media.', { exact: false }),
  ).toBeVisible();
});
