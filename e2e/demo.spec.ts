import { test, expect } from '@playwright/test';
import { demoSchedule } from '../src/lib/demo';
test('demo changes persist, publish, and render in the widget preview', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  await expect(page.locator('main h1')).toBeVisible();
  await page.screenshot({
    path: `test-results/overview-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: /^Update today/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Closing early', exact: true }).click();
  await dialog.getByLabel('Closing time').fill('13:00');
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog.getByText(/1:00 PM/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Demo published');
  await page.reload();
  const published = await page.evaluate(
    () => JSON.parse(localStorage.getItem('opensync-demo-v1')!).published,
  );
  expect(published.weekly).toEqual(demoSchedule.weekly);
  expect(published.exceptions).toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Closing early',
      intervals: [expect.objectContaining({ close: '13:00' })],
    }),
  ]));
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Website widgets', exact: true }).click();
  await expect(page.getByText('YOUR WIDGET · DRAFT PREVIEW')).toBeVisible();
  await expect(page.locator('.browser-preview .widget')).toBeVisible();
  await page.screenshot({
    path: `test-results/widgets-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('all navigation screens work without placeholder actions', async ({ page }, testInfo) => {
  await page.goto('/demo');
  for (const name of [
    'Schedule',
    'Activity',
    'Settings',
  ]) {
    if (testInfo.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: `test-results/settings-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('header icon and business name return to overview', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const openBusinessHours = async () => {
    await page.getByRole('button', { name: /^Change usual hours/ }).click();
    await expect(page).toHaveURL(/tab=hours/);
  };

  await openBusinessHours();
  await page.locator('.breadcrumb-business-name').click();
  await expect(page.locator('.sidebar button[aria-label="Home"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page).toHaveURL(/tab=overview/);

  if (testInfo.project.name === 'desktop') {
    await openBusinessHours();
    await page.getByRole('button', { name: 'Go to overview' }).click();
    await expect(page.locator('.sidebar button[aria-label="Home"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page).toHaveURL(/tab=overview/);
  }
});
test('marketing and credential gates are honest', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Change your hours once. Update everywhere.' }),
  ).toBeVisible();
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
});
test('existing announcements can be edited and temporary-hour periods do not submit early', async ({
  page,
}, testInfo) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /^Update today/ }).click();
  await page.getByRole('button', { name: 'Different hours today', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add period', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Different hours today', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Announcements', exact: true }).click();
  const liveSection = page.locator('.announcement-section').filter({
    has: page.getByRole('heading', { name: 'Live announcements', exact: true }),
  });
  const draftsSection = page.locator('.announcement-section').filter({
    has: page.getByRole('heading', { name: 'Drafts', exact: true }),
  });
  await expect(liveSection.locator('.announcement-widget')).toContainText(
    'Our winter menu is here.',
  );
  await expect(page.getByRole('checkbox', { name: 'Enabled', exact: true })).toHaveCount(0);
  await expect(
    page.locator('.page-heading').getByRole('button', { name: 'Publish changes', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'New announcement', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Create a website update' }),
  ).toBeVisible();
  const newAnnouncementDialog = page.getByRole('dialog');
  await expect(newAnnouncementDialog.getByLabel('Quick style', { exact: true })).toHaveValue(
    'none',
  );
  await newAnnouncementDialog
    .getByLabel('Quick start', { exact: true })
    .selectOption('Back open as usual');
  await expect(newAnnouncementDialog.getByText('We’re back', { exact: true })).toBeVisible();
  await expect(newAnnouncementDialog.getByLabel('Message', { exact: true })).toHaveValue(
    'Good news—we’re open again and following our regular hours.',
  );
  await expect(newAnnouncementDialog.getByLabel('Quick style', { exact: true })).toHaveValue(
    'success',
  );
  await expect(newAnnouncementDialog.locator('.announcement-draft-card')).toHaveClass(
    /announcement-success/,
  );
  await expect(
    newAnnouncementDialog.locator('.announcement-style-select .lucide-circle-check'),
  ).toBeVisible();
  await expect(
    newAnnouncementDialog.locator('.announcement-draft-heading > .lucide-circle-check'),
  ).toBeVisible();
  await page.getByLabel('Font colour', { exact: true }).fill('#123456');
  await page.getByLabel('Background colour', { exact: true }).fill('#abcdef');
  await page.getByLabel('Border colour', { exact: true }).fill('#654321');
  await expect(page.getByRole('dialog').locator('.announcement-draft-card')).toHaveAttribute(
    'style',
    /--announcement-font-colour: #123456/,
  );
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await liveSection.getByRole('button', { name: 'Edit', exact: true }).click();
  const announcementDialog = page.getByRole('dialog');
  await expect(
    announcementDialog.getByRole('heading', { name: 'Fine-tune your update' }),
  ).toBeVisible();
  await expect(announcementDialog.locator('.announcement-draft-content')).toHaveClass(/is-inline/);
  await announcementDialog
    .getByRole('button', { name: 'Move message below title', exact: true })
    .click();
  await expect(announcementDialog.locator('.announcement-draft-content')).not.toHaveClass(
    /is-inline/,
  );
  await announcementDialog
    .getByRole('button', { name: 'Move message beside title', exact: true })
    .click();
  await expect(announcementDialog.locator('.announcement-draft-content')).toHaveClass(/is-inline/);
  await announcementDialog.getByRole('button', { name: 'Hide message', exact: true }).click();
  await expect(announcementDialog.locator('.announcement-draft-content')).toHaveClass(/is-inline/);
  await expect(
    announcementDialog.getByRole('button', { name: 'Edit message', exact: true }),
  ).toHaveCount(0);
  await expect(
    announcementDialog.getByRole('button', { name: 'Move message beside title', exact: true }),
  ).toHaveCount(0);
  await announcementDialog.getByRole('button', { name: 'Add message', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('A newly edited café announcement.');
  await page.getByRole('button', { name: 'Save announcement' }).click();
  await expect(page.getByRole('status')).toContainText('Announcement saved to Drafts');
  await expect(draftsSection.locator('.announcement-widget')).toContainText(
    'A newly edited café announcement.',
  );
  await expect(liveSection.locator('.announcement-widget')).toContainText(
    'Our winter menu is here.',
  );
  await liveSection.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Demo published');
  await expect(liveSection.locator('.announcement-widget')).toContainText(
    'A newly edited café announcement.',
  );
  await expect(draftsSection.locator('.announcement-widget')).toContainText(
    'Our winter menu is here.',
  );
});
test('live announcements show expiry and can be removed from the website widget', async ({
  page,
}) => {
  await page.goto('/demo?tab=announcements');
  const liveSection = page.locator('.announcement-section').filter({
    has: page.getByRole('heading', { name: 'Live announcements', exact: true }),
  });
  await expect(liveSection.getByText(/Expires Dec 31, 2026/)).toBeVisible();

  await page.evaluate((schedule) => {
    const draft = structuredClone(schedule);
    const published = structuredClone(schedule);
    draft.announcements[0].end = '';
    published.announcements[0].end = '';
    localStorage.setItem(
      'opensync-demo-v1',
      JSON.stringify({ draft, published, version: 1, history: [] }),
    );
  }, demoSchedule);
  await page.reload();
  await expect(liveSection.getByText('No expiry', { exact: true })).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await liveSection.getByRole('button', { name: 'Remove', exact: true }).click();
  const publishDialog = page.getByRole('dialog');
  await expect(publishDialog.getByText('Hidden from website', { exact: false })).toBeVisible();
  await publishDialog.getByRole('button', { name: 'Next', exact: true }).click();
  await publishDialog.getByRole('button', { name: 'Next', exact: true }).click();
  await publishDialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await publishDialog.getByRole('button', { name: 'Done', exact: true }).click();

  await expect(liveSection.getByRole('heading', { name: 'No live announcement' })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!));
  expect(state.published.announcements.every((item: { enabled: boolean }) => !item.enabled)).toBe(
    true,
  );
});
