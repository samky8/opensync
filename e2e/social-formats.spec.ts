import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('logo checkboxes and simultaneous formats persist and export', async ({ page }, info) => {
  await page.goto('/demo');
  async function openStudio() {
    if (info.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Social posts', exact: true }).click();
  }
  await openStudio();
  await page.getByRole('checkbox', { name: 'Facebook', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Story', exact: true }).check();
  await expect(page.locator('.social-platform-logo > svg:first-child')).toHaveCount(2);
  await expect(page.locator('canvas.social-artwork')).toHaveCount(2);
  const post = await page.getByRole('region', { name: 'post preview', exact: true }).boundingBox();
  const story = await page
    .getByRole('region', { name: 'story preview', exact: true })
    .boundingBox();
  expect(post!.y).toBe(story!.y);
  expect(story!.x).toBeGreaterThan(post!.x);
  await page.reload();
  await openStudio();
  for (const name of ['Instagram', 'Facebook', 'Post', 'Story']) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
  }
  const downloads: import('@playwright/test').Download[] = [];
  page.on('download', (download) => downloads.push(download));
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  await expect.poll(() => downloads.length).toBe(2);
  for (const download of downloads) {
    const png = await readFile((await download.path())!);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(download.suggestedFilename().includes('story') ? 1920 : 1080);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('checkbox', { name: 'Post', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Story', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Story', exact: true })).toBeChecked();
});
