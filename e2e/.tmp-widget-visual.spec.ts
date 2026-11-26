import { expect, test } from '@playwright/test';

test('widget selector layout', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const selector = page.locator('.widget-type-tabs');
  const appearance = page.getByRole('heading', { name: /Widget appearance/ });
  await expect(selector).toBeVisible();
  await expect(page.getByRole('button', { name: 'View all', exact: true })).toHaveCount(0);
  const groups = page.getByRole('group', { name: 'Widget settings groups' });
  const appearanceGroup = groups.getByRole('button', { name: 'Appearance', exact: true });
  const layoutGroup = groups.getByRole('button', { name: 'Layout', exact: true });
  const contentGroup = groups.getByRole('button', { name: 'Content', exact: true });
  const layout = page.getByRole('combobox', { name: 'Layout', exact: true });
  await expect(appearanceGroup).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Typography')).toBeVisible();
  await expect(layout).toBeHidden();
  await expect(page.getByLabel('Show current status')).toBeHidden();
  const published = page.getByText('View last published demo', { exact: true });
  await published.click();
  await expect(page.locator('.published-demo .widget-type-hours')).toBeVisible();
  await published.click();
  const hoursVisibility = page.getByRole('switch', { name: 'Show business hours' });
  await expect(hoursVisibility).toBeChecked();
  await hoursVisibility.click();
  await expect(hoursVisibility).not.toBeChecked();
  await expect(page.locator('.preview-body .widget-type-hours')).toHaveCount(0);
  await expect(page.getByText('Customise with Pro, or use the included Free defaults.')).toHaveCount(0);
  expect((await selector.boundingBox())!.y).toBeLessThan((await appearance.boundingBox())!.y);
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  const visibility = page.getByRole('switch', { name: 'Show live status' });
  const preview = page.locator('.preview-body .widget-type-status');
  await expect(visibility).toBeChecked();
  await expect(preview).toBeVisible();
  const full = await preview.boundingBox();
  await layoutGroup.click();
  await expect(page.getByLabel('Typography')).toBeHidden();
  await layout.selectOption('compact');
  await expect(preview).toHaveClass(/compact/);
  expect((await preview.boundingBox())!.height).toBeLessThan(full!.height);

  const branding = page.getByLabel('Show OpenSync branding');
  await contentGroup.click();
  await expect(layout).toBeHidden();
  await expect(page.getByLabel('Typography')).toBeHidden();
  await expect(preview.locator('.widget-credit')).toBeVisible();
  await branding.uncheck();
  await expect(preview.locator('.widget-credit')).toHaveCount(0);

  await visibility.click();
  await expect(visibility).not.toBeChecked();
  await expect(page.locator('.widget-visibility-state')).toHaveText('Hide');
  await expect(preview).toHaveCount(0);
  await visibility.click();
  await expect(preview).toBeVisible();

  await page.getByRole('button', { name: 'Hours', exact: true }).click();
  await expect(hoursVisibility).not.toBeChecked();
  await hoursVisibility.click();
  await expect(page.locator('.preview-body .widget-type-hours')).toBeVisible();
  await layoutGroup.click();
  await expect(layout).toHaveValue('full');
  await contentGroup.click();
  await expect(page.getByLabel('Show OpenSync branding')).toBeChecked();
  await expect(page.getByLabel('Show current status')).toBeVisible();

  await page.getByRole('button', { name: 'Banner', exact: true }).click();
  await expect(contentGroup).toHaveCount(0);
  await expect(appearanceGroup).toHaveAttribute('aria-pressed', 'true');
  const bannerVisibility = page.getByRole('switch', { name: 'Show announcement banner' });
  await expect(bannerVisibility).toBeChecked();
  const bannerPreview = page.locator('.preview-panel');
  const settings = page.locator('.widget-config .card');
  const bannerBounds = (await bannerPreview.boundingBox())!;
  const settingsBounds = (await settings.boundingBox())!;
  if (page.viewportSize()!.width > 900) {
    expect(bannerBounds.x).toBeGreaterThan(settingsBounds.x + settingsBounds.width);
    expect(bannerBounds.y).toBeLessThan(settingsBounds.y + settingsBounds.height);
  } else {
    expect(bannerBounds.y).toBeGreaterThan(settingsBounds.y + settingsBounds.height);
    expect(bannerBounds.width).toBeCloseTo(settingsBounds.width, 0);
  }
  await expect(page.getByRole('combobox', { name: 'Layout', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Show business name')).toHaveCount(0);
  await expect(page.getByLabel('Background colour mode')).toHaveCount(0);
  await expect(page.getByLabel('Typography')).toBeVisible();
  await page.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('18');
  const draftBanner = bannerPreview.locator('.preview-body .announcement-widget');
  await expect(draftBanner).toHaveCSS('font-size', '18px');
  await bannerVisibility.press('Space');
  await expect(bannerVisibility).not.toBeChecked();
  await expect(draftBanner).toHaveCount(0);
  await expect(page.getByText(/Preview updates as you edit/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/widget-tabs-visual.png', fullPage: true });
});

test('only Hours can hide section dividers and the choice survives saving', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const layout = page
    .getByRole('group', { name: 'Widget settings groups' })
    .getByRole('button', { name: 'Layout', exact: true });
  const dividers = page.getByRole('checkbox', { name: 'Show section dividers' });
  const divider = page.locator('.preview-body .widget-expand');

  await layout.click();
  await expect(dividers).toBeChecked();
  await expect(divider).toHaveCSS('border-top-color', 'rgb(231, 233, 238)');
  await dividers.uncheck();
  await expect(divider).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');
  await page.reload();
  await layout.click();
  await expect(dividers).not.toBeChecked();
  await expect(divider).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');

  for (const name of ['Status', 'Banner']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(layout).toHaveAttribute('aria-pressed', 'true');
    await expect(dividers).toHaveCount(0);
  }
});
