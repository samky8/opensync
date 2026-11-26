import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('business settings are separate and uploaded logos persist in the workspace selector', async ({
  page,
}, testInfo) => {
  await page.goto('/demo?tab=settings');
  await expect(page.getByRole('heading', { name: 'Business settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your account', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Plans & billing', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Locations & team' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Brand kit', exact: true })).toBeVisible();
  await expect(page.getByLabel('Address (optional)')).toBeVisible();
  await expect(page.getByLabel('Website (optional)')).toBeVisible();
  const input = page.getByLabel('Business logo (optional)');
  await input.setInputFiles({
    name: 'invalid.png',
    mimeType: 'image/png',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.locator('.logo-upload').getByRole('alert')).toContainText(
    'Could not read this image',
  );
  const buffer = await sharp({
    create: { width: 500, height: 300, channels: 4, background: '#267c55' },
  })
    .png()
    .toBuffer();
  await input.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer });
  await expect(page.getByAltText('Business logo preview')).toBeVisible();
  await expect(page.locator('.business-avatar img')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  await expect(page.getByRole('status')).toContainText('Business profile saved automatically');
  await page.reload();
  await expect(page.getByAltText('Business logo preview')).toBeVisible();
  await expect(page.locator('.business-avatar img')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  await page.locator('.topbar').getByRole('button', { name: 'Account settings' }).click();
  await expect(page.getByRole('heading', { name: 'Account settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Business profile' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Plans & billing', exact: true })).toBeVisible();
  await expect(page.getByText("You're on the Pro plan.", { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveClass(
    /btn-danger/,
  );
  await expect(page.locator('.account-button > svg')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export data', exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Address (optional)').fill('123 Auto Save Street');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Address (optional)')).toHaveValue('123 Auto Save Street');
  await page.getByRole('button', { name: 'Remove logo' }).click();
  await expect(page.locator('.business-avatar img')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Business profile saved automatically');
  await page.reload();
  await expect(page.getByAltText('Business logo preview')).toHaveCount(0);
});
