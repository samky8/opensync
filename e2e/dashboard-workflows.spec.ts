import { test, expect } from '@playwright/test';
import { demoSchedule } from '../src/lib/demo';

test('the banner preview opens the announcement editor', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await expect(page.getByRole('button', { name: 'Edit hours', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Banner', exact: true }).click();
  const createBanner = page.getByRole('button', { name: 'Create banner', exact: true });
  await expect(createBanner.locator('.lucide-megaphone')).toBeVisible();
  await createBanner.click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Create a website update' }),
  ).toBeVisible();
});

test('banner scrolls only overflowing text and can publish the setting off', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const selectBannerLayout = async () => {
    await page.getByRole('button', { name: 'Banner', exact: true }).click();
    await page.getByRole('button', { name: 'Layout', exact: true }).click();
  };
  const longText = page.getByRole('combobox', { name: 'Long text' });
  const preview = page.locator('.preview-body .announcement-widget');
  const track = preview.locator('.announcement-scroll-track');
  const seedBanner = async (message: string) => {
    await page.evaluate(
      ({ schedule, message }) => {
        Object.assign(schedule.announcements[0], {
          title: 'Update',
          message,
          start: '2020-01-01T00:00:00Z',
          end: '',
        });
        localStorage.setItem(
          'opensync-demo-v1',
          JSON.stringify({ draft: schedule, published: schedule, version: 1, history: [] }),
        );
      },
      { schedule: demoSchedule, message },
    );
    await page.reload();
    await selectBannerLayout();
  };

  await seedBanner('Hello.');
  await expect(longText).toHaveValue('scroll');
  await expect(track).toHaveCSS('animation-name', 'none');

  await seedBanner('Check our opening hours before your next visit. '.repeat(9).trim());
  await expect(track).toHaveCSS('animation-name', 'announcement-scroll');
  await expect(track).toHaveCSS('animation-direction', 'normal');
  await expect(track.locator('.announcement-scroll-item')).toHaveCount(2);
  await expect(track.locator('.announcement-scroll-item').nth(1)).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(track).toHaveCSS('animation-name', 'announcement-scroll');

  await longText.selectOption('wrap');
  await expect(track).toHaveCount(0);
  await expect(preview.getByText(/Check our opening hours/)).toBeVisible();
  const height = page.getByRole('slider', { name: 'Height', exact: true });
  const width = page.getByRole('slider', { name: 'Width', exact: true });
  await expect(height).toHaveValue('23');
  await expect(width).toHaveValue('100');
  const fullWidthBanner = (await preview.boundingBox())!;
  const demoScreen = (await page.locator('.preview-body').boundingBox())!;
  expect(fullWidthBanner.x).toBeCloseTo(demoScreen.x, 0);
  expect(fullWidthBanner.width).toBeCloseTo(demoScreen.width, 0);
  await height.press('Home');
  await expect(preview).toHaveCSS('padding-top', '8px');
  const heightSlider = (await height.boundingBox())!;
  await height.click({ position: { x: Math.floor(heightSlider.width) - 2, y: 16 } });
  await expect(height).toHaveValue('40');
  await expect(preview).toHaveCSS('padding-top', '40px');
  await width.click({ position: { x: 2, y: 16 } });
  await expect(width).toHaveValue('50');
  await expect
    .poll(async () => (await preview.boundingBox())!.width)
    .toBeLessThan(fullWidthBanner.width);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved to your draft.');
  await page.goto('/demo?tab=overview');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const published = await page.evaluate(
    () => JSON.parse(localStorage.getItem('opensync-demo-v1')!).published,
  );
  expect(published.widget.overrides.banner).toMatchObject({
    scrollText: false,
    verticalPadding: 40,
    widthPercent: 50,
  });
});

test('Home opens a simple website message form with a publish review', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /^Tell customers something/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'What should customers know?' })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Message' }).fill('The front entrance is open again.');
  await dialog.getByRole('button', { name: 'Review message' }).click();
  await expect(dialog.getByText(/The front entrance is open again/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Demo published');
});

test('a new announcement can apply and publish the saved banner preset', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await page.getByRole('button', { name: 'Banner', exact: true }).click();
  await page.getByRole('group', { name: 'Style presets' })
    .getByRole('button', { name: 'Modern', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved to your draft.');

  await page.goto('/demo?tab=announcements');
  await page.getByRole('button', { name: 'New announcement', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const message = 'The patio is open.';
  await dialog.getByRole('textbox', { name: 'Message' }).fill(message);
  await dialog.getByRole('combobox', { name: 'Apply saved preset' }).selectOption('banner');
  await expect(dialog.getByRole('textbox', { name: 'Message' })).toHaveValue(message);
  await expect(dialog.getByLabel('Font colour')).toHaveValue('#2563eb');
  const preview = dialog.locator('.announcement-draft-card');
  await expect(preview).toHaveCSS('padding-top', '10px');
  await expect(preview).toHaveCSS('border-top-right-radius', '10px');
  await dialog.getByRole('button', { name: 'Save announcement', exact: true }).click();
  const draft = page.locator('.announcement-banner-record').filter({ hasText: message });
  await expect(draft.locator('.announcement-widget')).toHaveCSS('padding-top', '10px');
  await draft.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const live = page.locator('.announcement-section').filter({
    has: page.getByRole('heading', { name: 'Live announcements' }),
  });
  await expect(live.locator('.announcement-widget')).toContainText(message);
  await expect(live.locator('.announcement-widget')).toHaveCSS('padding-top', '10px');
});

test('tabs survive reload and follow browser Back and Forward', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const navigate = async (name: string) => {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
  };
  await page.getByRole('button', { name: /^Change usual hours/ }).click();
  await expect(page).toHaveURL(/tab=hours/);
  await navigate('Settings');
  await navigate('Website widgets');
  await expect(page).toHaveURL(/tab=widgets/);
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Business settings');
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Regular hours');
  await page.goForward();
  await page.goForward();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Website widgets');
});

test('widget changes save as a draft and the preview links to hours safely', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const saveButton = page.getByRole('button', { name: 'Save changes', exact: true });
  await expect(saveButton).toBeDisabled();

  await page.getByLabel('Accent colour').fill('#ff0000');
  await expect(saveButton).toBeEnabled();

  let warningMessage = '';
  page.once('dialog', async (dialog) => {
    warningMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Edit hours', exact: true }).click();
  expect(warningMessage).toContain('unsaved widget changes');
  await expect(page.locator('main h1')).toHaveText('Website widgets');

  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Edit hours', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Regular hours');

  await page.goBack();
  await expect(page.getByLabel('Accent colour')).toHaveValue('#ff0000');
  await saveButton.click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');
});

test('saved drafts stay visibly unpublished after reload until published', async ({ page }) => {
  await page.goto('/demo?tab=settings');
  const publishButton = page.getByRole('button', { name: 'Publish changes', exact: true });
  await expect(publishButton).toBeDisabled();
  await page.getByLabel('Business name', { exact: true }).fill('Saved draft business');
  await expect(publishButton).toBeEnabled();
  const pendingButton = page.getByRole('button', { name: 'Pending changes', exact: true });
  await expect(pendingButton).toBeVisible();
  await pendingButton.click();
  await expect(page.getByRole('dialog')).toContainText(
    'These edits are not saved or published yet.',
  );
  await expect(page.getByRole('dialog').getByText('Saved draft business')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await publishButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await pendingButton.click();
  await expect(page.getByRole('dialog')).toContainText(
    'This saved draft has not been published yet.',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'Saved draft business',
  );
  await expect(publishButton).toBeEnabled();
  await expect(pendingButton).toBeVisible();
  const publishedName = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!).published.name);
  expect(await publishedName()).not.toBe('Saved draft business');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(pendingButton).toHaveCount(0);
  await page.goto('/demo?tab=widgets');
  expect(await publishedName()).toBe('Saved draft business');
  await expect(page.getByText('View last published demo', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(pendingButton).toHaveCount(0);
});

test('website instructions open from Connections and stay separate from widget settings', async ({
  page,
}) => {
  await page.goto('/demo?tab=widgets');
  await expect(page.getByRole('heading', { name: 'Make it part of your website.' })).toHaveCount(0);

  await page.goto('/demo?tab=integrations');
  await expect(page.getByRole('button', { name: 'Connect Google', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Manage manually on Google' })).toBeDisabled();
  await page.getByRole('button', { name: 'View website instructions' }).click();
  await expect(page).toHaveURL(/tab=website/);
  await expect(page.getByRole('heading', { name: 'Add to your website' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Make it part of your website.' })).toBeVisible();
  await expect(page.getByText('Copy the embed code', { exact: true })).toBeVisible();
  await expect(page.getByText(/status inside an existing footer column/)).toBeVisible();
  const footerStyle = 'width:min(100%, 420px);border-radius:12px;overflow:hidden';
  await expect(page.locator('.installation > .code-block')).toContainText(footerStyle);
  await page.getByText('Iframe alternative & strict website policies', { exact: true }).click();
  await expect(page.locator('.installation details .code-block')).toContainText(footerStyle);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('hours presets restore their own content and layout settings', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const preview = page.locator('.browser-preview .widget-type-hours');
  const presets = page.getByRole('group', { name: 'Style presets' });
  const selectPreset = (name: string) => presets.getByRole('button', { name, exact: true }).click();

  await page.getByRole('button', { name: 'Content', exact: true }).click();
  for (const preset of ['Modern', 'Card', 'Dark']) {
    await selectPreset('Minimal');
    await expect(preview.locator('.widget-logo, .widget-name, .widget-today')).toHaveCount(0);
    await expect(preview.locator('.widget-status')).toBeVisible();
    await expect(page.getByLabel('Default hours state')).toHaveValue('closed');
    await expect(preview.locator('.widget-expand')).toHaveAttribute('aria-expanded', 'false');
    await expect(preview.locator('.widget-week')).toHaveCount(0);
    await preview.locator('.widget-expand').click();
    await expect(preview.locator('.widget-week')).toBeVisible();
    await page.getByLabel('Show current status').uncheck();

    await selectPreset(preset);
    const visibleIdentity = preset === 'Dark' ? '.widget-name' : '.widget-logo';
    const hiddenIdentity = preset === 'Dark' ? '.widget-logo' : '.widget-name';
    await expect(preview.locator(visibleIdentity)).toBeVisible();
    await expect(preview.locator(hiddenIdentity)).toHaveCount(0);
    await expect(preview.locator('.widget-expand')).toBeVisible();
    await expect(preview.locator('.widget-status')).toBeVisible();
    await expect(page.getByLabel('Default hours state')).toHaveValue('open');
    await expect(preview.locator('.widget-today')).toBeVisible();
  }
});

test('the Modern banner preset applies its size and corner radius', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await page.getByRole('button', { name: 'Banner', exact: true }).click();
  await page.getByRole('group', { name: 'Style presets' })
    .getByRole('button', { name: 'Modern', exact: true }).click();
  const preview = page.locator('.preview-body .announcement-widget');
  await expect(preview).toHaveCSS('padding-top', '10px');
  await expect(preview).toHaveCSS('border-top-right-radius', '10px');
  await page.getByRole('button', { name: 'Layout', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Width', exact: true })).toHaveValue('90');
});

test('status presets apply their branding defaults', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  const preview = page.locator('.browser-preview .widget-type-status');
  const presets = page.getByRole('group', { name: 'Style presets' });

  await presets.getByRole('button', { name: 'Minimal', exact: true }).click();
  await expect(preview.locator('.widget-logo')).toHaveCount(0);
  await expect(preview.locator('.widget-name')).toBeVisible();

  await presets.getByRole('button', { name: 'Modern', exact: true }).click();
  await expect(preview.locator('.widget-logo')).toBeVisible();
  await expect(preview.locator('.widget-name')).toHaveCount(0);
});

test('default hours state persists and visitors can override it', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const preview = page.locator('.browser-preview .widget-type-hours');
  const toggle = preview.getByRole('button', { name: 'Business hours' });
  const week = preview.locator('.widget-week');
  const content = page.getByRole('button', { name: 'Content', exact: true });
  const defaultState = page.getByLabel('Default hours state');

  await content.click();
  await defaultState.selectOption('closed');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(week).toHaveCount(0);
  await toggle.click();
  await expect(week).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Widget changes saved');

  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await content.click();
  await expect(defaultState).toHaveValue('closed');
  await page.getByLabel('Let visitors collapse hours').uncheck();
  await expect(defaultState).toHaveCount(0);
  await expect(toggle).toHaveCount(0);
  await expect(week).toBeVisible();
});

test('widget typography, background and border controls update the preview', async ({ page }) => {
  await page.goto('/demo?tab=widgets');
  const preview = page.locator('.browser-preview .widget');

  await page.getByLabel('Typography').selectOption('mono');
  await page.getByLabel('Font size').selectOption('18');
  await page.getByLabel('Background colour mode').selectOption('custom');
  await page.getByLabel('Custom background colour').fill('#123456');
  await page.getByLabel('Border colour mode').selectOption('custom');
  await page.getByLabel('Custom border colour').fill('#abcdef');
  await page.getByLabel('Border thickness').selectOption('4');

  await expect(preview).toHaveCSS('font-size', '18px');
  await expect(preview).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(preview).toHaveCSS('border-color', 'rgb(171, 205, 239)');
  await expect(preview).toHaveCSS('border-width', '4px');
  expect(await preview.evaluate((element) => getComputedStyle(element).fontFamily)).toContain(
    'ui-monospace',
  );

  await page.getByLabel('Typography').selectOption('auto');
  await page.getByLabel('Font size').selectOption('auto');
  const inherited = await preview.evaluate((element) => ({
    widgetFamily: getComputedStyle(element).fontFamily,
    parentFamily: getComputedStyle(element.parentElement!).fontFamily,
    widgetSize: getComputedStyle(element).fontSize,
    parentSize: getComputedStyle(element.parentElement!).fontSize,
  }));
  expect(inherited.widgetFamily).toBe(inherited.parentFamily);
  expect(inherited.widgetSize).toBe(inherited.parentSize);

  await page.getByLabel('Background colour mode').selectOption('none');
  await expect(preview).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  const settingsGroups = page.getByRole('group', { name: 'Widget settings groups' });
  await settingsGroups.getByRole('button', { name: 'Content' }).click();
  await page.getByLabel("Highlight today's hours").uncheck();
  await page.getByLabel('Show current status').uncheck();
  await page.getByLabel('Let visitors collapse hours').uncheck();
  await expect(preview.locator('.widget-today')).toHaveCount(0);
  await expect(preview.locator('.widget-status')).toHaveCount(0);
  await expect(preview.locator('.widget-expand')).toHaveCount(0);
  await expect(preview.locator('.widget-week')).toBeVisible();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await settingsGroups.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByLabel('Background colour mode')).toHaveValue('auto');
  await expect(preview.locator('.widget-heading .widget-credit')).toBeVisible();
});
