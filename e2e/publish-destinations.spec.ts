import { test, expect } from '@playwright/test';
import { demoSchedule } from '../src/lib/demo';

test('page-specific publishing reviews selected formats and progress', async ({ page }, info) => {
  await page.goto('/demo?tab=hours');
  const publishButton = page.getByRole('button', { name: 'Publish changes', exact: true });
  await expect(publishButton).toBeDisabled();
  await page.getByLabel('Opening time 1').first().fill('08:30');
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Publish opening hours' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Review changes', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Where this update will go' })).toBeVisible();
  for (const label of ['Instagram post', 'Instagram story', 'Facebook post', 'Facebook story']) {
    await expect(dialog.getByRole('checkbox', { name: new RegExp(label) })).toBeVisible();
  }
  await dialog.getByRole('checkbox', { name: /Instagram story/ }).check();
  await dialog.getByRole('checkbox', { name: /Facebook post/ }).check();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Review Instagram story' })).toBeVisible();
  await dialog.getByLabel('Title', { exact: true }).fill('Our new hours');
  await expect(dialog.locator('canvas')).toHaveAttribute('height', '1920');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Our new hours');
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/publish-wizard-${info.project.name}.png` });
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Review Facebook post' })).toBeVisible();
  await expect(dialog.locator('canvas')).toHaveAttribute('height', '1080');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Demo update complete' })).toBeVisible();
  await expect(dialog.locator('.wizard-outcome.done')).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('publishing hours preserves unrelated drafts and shows before and after', async ({ page }) => {
  await page.goto('/demo?tab=hours');
  await page.evaluate((schedule) => {
    const state = {
      draft: structuredClone(schedule),
      published: schedule,
      version: 1,
      history: [],
    };
    state.draft.weekly[0] = [{ open: '10:00', close: '18:00' }];
    state.draft.name = 'Unpublished business name';
    localStorage.setItem('opensync-demo-v1', JSON.stringify(state));
  }, demoSchedule);
  await page.reload();
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('del')).toBeVisible();
  await expect(dialog.locator('ins')).toContainText('10:00');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Demo update complete' })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('opensync-demo-v1')!));
  expect(state.published.weekly[0]).toEqual([{ open: '10:00', close: '18:00' }]);
  expect(state.published.name).not.toBe('Unpublished business name');
  expect(state.draft.name).toBe('Unpublished business name');
});

test('announcement publishing uses its title, message, and saved Social Studio presets', async ({
  page,
}) => {
  await page.goto('/demo?tab=announcements');
  await page.evaluate((schedule) => {
    const published = structuredClone(schedule);
    const draft = structuredClone(schedule);
    draft.announcements = [
      {
        id: 'late-night',
        title: 'Open late tonight!',
        message: 'The kitchen is serving until 10 pm.',
        type: 'special hours',
        start: '2026-11-18T15:00:00Z',
        end: '',
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];
    localStorage.setItem(
      'opensync-demo-v1',
      JSON.stringify({ draft, published, version: 1, history: [] }),
    );
    localStorage.setItem(
      'opensync-social-presets-v1:demo',
      JSON.stringify([
        {
          id: 'evening',
          name: 'Evening update',
          style: {
            theme: 'dark',
            accent: '#234d43',
            showBusinessName: false,
          },
        },
      ]),
    );
  }, demoSchedule);
  await page.reload();
  const drafts = page.locator('.announcement-section').filter({
    has: page.getByRole('heading', { name: 'Drafts', exact: true }),
  });
  await drafts.getByRole('button', { name: 'Publish', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('checkbox', { name: /Instagram story/ }).check();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Open late tonight!');
  await expect(dialog.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    'The kitchen is serving until 10 pm.',
  );
  await dialog.getByRole('combobox', { name: 'Style preset', exact: true }).selectOption('evening');
  await expect(dialog.getByRole('combobox', { name: 'Base style', exact: true })).toHaveValue(
    'dark',
  );
  await expect(dialog.getByLabel('Business name', { exact: true })).not.toBeChecked();
});
