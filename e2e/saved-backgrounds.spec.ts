import { expect, test } from '@playwright/test';
import sharp from 'sharp';

test('saved backgrounds enforce the five-image limit and deletion frees a slot', async ({
  page,
}, info) => {
  await page.goto('/demo');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Social Studio', exact: true }).click();

  const buffer = await sharp({
    create: { width: 40, height: 40, channels: 3, background: '#2266aa' },
  })
    .jpeg()
    .toBuffer();
  const upload = page.getByLabel('Upload your own image', { exact: false });
  for (let index = 1; index <= 5; index++) {
    await upload.setInputFiles({
      name: `background-${index}.jpg`,
      mimeType: 'image/jpeg',
      buffer,
    });
    await expect(page.locator('.social-saved-background')).toHaveCount(index);
  }

  await expect(upload).toBeDisabled();
  await expect(page.getByText('5/5 saved.')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete saved image 1' }).click();
  await expect(page.locator('.social-saved-background')).toHaveCount(4);
  await expect(upload).toBeEnabled();
  await expect(page.getByText('Saved background deleted.')).toBeVisible();
});
