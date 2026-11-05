import { test, expect } from '@playwright/test';
import sharp from 'sharp';
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
  await page.getByRole('button', { name: 'Edit Announcement', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Announcement', exact: true })).toHaveValue(
    /Monday/,
  );
  await page.getByRole('button', { name: 'Edit Headline', exact: true }).click();
  await page.getByLabel('Headline', { exact: true }).fill('Holiday opening hours');
  await page.getByRole('button', { name: 'Edit Announcement', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Announcement', exact: true })
    .fill('Friday: 9 am – 2 pm\nSaturday: Closed\nSee you on Monday!');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await openStudio();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  await page.getByRole('button', { name: 'Edit Headline', exact: true }).click();
  await expect(page.getByLabel('Headline', { exact: true })).toHaveValue('Holiday opening hours');
  await page.getByRole('button', { name: 'Done editing Headline', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Facebook', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Instagram', exact: true })).toBeChecked();
  await page.getByLabel('Font colour', { exact: true }).fill('#cc2244');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  await expect(page.getByLabel('Font colour', { exact: true })).toHaveValue('#cc2244');
  await expect(page.getByRole('checkbox', { name: 'Facebook', exact: true })).toBeChecked();
  for (const format of ['post', 'story']) {
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption(format);

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
    page.getByText('Demo images are never posted to social media.', { exact: false }).first(),
  ).toBeVisible();
});

test('social background presets and custom uploads restore and export', async ({ page }, info) => {
  await page.goto('/demo');
  async function openStudio() {
    if (info.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Social studio', exact: true }).click();
  }
  await openStudio();
  for (const name of ['Botanical', 'Sunset', 'Waves', 'Arches']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toBeEnabled();
  }
  const upload = page.getByLabel('Upload your own image', { exact: false });
  await upload.setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.getByText('Choose a JPG, PNG or WebP image up to 10 MB.')).toBeVisible();
  const buffer = await sharp({
    create: { width: 600, height: 900, channels: 3, background: '#2266aa' },
  })
    .png()
    .toBuffer();
  await upload.setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer });
  await expect(page.getByRole('button', { name: 'Your image', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await openStudio();
  await expect(page.getByRole('button', { name: 'Your image', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (const format of ['post', 'story']) {
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption(format);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
    const asset = await pending;
    const pixel = await sharp((await asset.path())!)
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(pixel[2]).toBeGreaterThan(pixel[0]);
  }
  await page.getByRole('button', { name: 'Botanical', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toBeEnabled();
  await page.screenshot({
    path: 'test-results/social-backgrounds-' + info.project.name + '.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
