import { expect, test } from '@playwright/test';

test('the footer links to the notice for analytics and Google user data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline analytics' }).click();
  await page.locator('footer').getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Google user data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Analytics, cookies, and widgets' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google API Services User Data Policy' })).toHaveAttribute(
    'href',
    'https://developers.google.com/terms/api-services-user-data-policy',
  );
});

test('analytics requires consent, omits query data, and stops after withdrawal', async ({ page }) => {
  const tags: string[] = [];
  await page.route('https://www.googletagmanager.com/gtag/js?*', async (route) => {
    tags.push(route.request().url());
    await route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  await page.goto('/?private=test-value');
  const accept = page.getByRole('button', { name: 'Accept analytics' });
  const decline = page.getByRole('button', { name: 'Decline analytics' });
  const settings = page.getByRole('button', { name: 'Cookie settings' });

  await expect(accept).toBeVisible();
  expect(tags).toHaveLength(0);
  await decline.click();
  await page.reload();
  await expect(settings).toBeVisible();
  expect(tags).toHaveLength(0);

  await settings.click();
  await accept.click();
  await expect.poll(() => tags.length).toBe(1);
  const pageLocation = await page.evaluate(() => {
    const browser = window as Window & { dataLayer?: ArrayLike<unknown>[] };
    const pageView = browser.dataLayer?.find((event) => event[1] === 'page_view');
    return (pageView?.[2] as { page_location?: string })?.page_location;
  });
  expect(pageLocation).toBe(new URL('/', page.url()).href);

  for (const path of ['/embed/00000000-0000-4000-8000-000000000000', '/login']) {
    await page.goto(path);
    await expect(settings).toHaveCount(0);
    await expect(accept).toHaveCount(0);
    expect(tags).toHaveLength(1);
  }
  await page.goto('/');
  await expect.poll(() => tags.length).toBe(2);
  await settings.click();
  await decline.click();
  await expect(settings).toBeVisible();
  await page.reload();
  await expect(settings).toBeVisible();
  expect(tags).toHaveLength(2);
});
