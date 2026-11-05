import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

let bundle = '';
test.beforeAll(async () => {
  // Mount the production component with mocked APIs, without requiring live Supabase/Meta credentials.
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {SocialPublishing} from './src/components/social-publishing';
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');ctx.fillStyle='#faf5eb';ctx.fillRect(0,0,1080,1080);
      createRoot(document.getElementById('social-test')).render(<SocialPublishing locationId="11111111-1111-4111-8111-111111111111" platform="Instagram" format="post" caption="Holiday hours: Friday 9–2" demo={false} readonly={false} saveDraft={()=>{}} getImage={()=>canvas.toDataURL('image/jpeg')}/>);`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
    plugins: [
      {
        name: 'workspace-resolution',
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) => {
            const base = args.resolveDir || process.cwd();
            const name = args.path.startsWith('@/')
              ? resolve(process.cwd(), 'src', args.path.slice(2))
              : args.path;
            const candidate = resolve(base, name);
            if (name.startsWith('.') || /^[A-Za-z]:/.test(name)) {
              for (const extension of ['', '.tsx', '.ts', '.js', '.json'])
                if (existsSync(candidate + extension)) return { path: candidate + extension };
            }
            return { path: createRequire(resolve(base, '_resolve.cjs')).resolve(name) };
          });
          builder.onLoad({ filter: /.*/ }, async (args) => ({
            contents: await readFile(args.path, 'utf8'),
            loader:
              extname(args.path) === '.tsx'
                ? 'tsx'
                : extname(args.path) === '.ts'
                  ? 'ts'
                  : extname(args.path) === '.json'
                    ? 'json'
                    : 'js',
            resolveDir: dirname(args.path),
          }));
        },
      },
    ],
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
  });
  bundle = result.outputFiles[0].text;
});

test('direct publishing captures the preview and posts only after confirmation', async ({
  page,
}, info) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/social/accounts?*', (route) =>
    route.fulfill({
      json: {
        configured: true,
        canPublish: true,
        accounts: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Test Cafe',
            instagramId: '123',
            instagramName: 'testcafe',
            instagramType: 'BUSINESS',
          },
        ],
        publications: [],
      },
    }),
  );
  await page.route('**/api/social/publish', async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    await route.fulfill({
      json: {
        publication: {
          id: 'publication',
          accountName: 'testcafe',
          platform: 'Instagram',
          format: 'post',
          status: body.op === 'continue' && requests.length >= 3 ? 'published' : 'ready',
          remoteId: body.op === 'continue' ? 'remote-123' : null,
          error: null,
          createdAt: new Date().toISOString(),
        },
      },
    });
  });
  await page.goto('/demo');
  await page.clock.install();
  await page.evaluate(() => {
    document.body.innerHTML =
      '<main class="card padded" style="max-width:650px;margin:24px auto" id="social-test"></main>';
  });
  await page.addScriptTag({ content: bundle });
  await page
    .getByRole('combobox', { name: 'Publish destination' })
    .selectOption('22222222-2222-4222-8222-222222222222');
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm social publication' })).toContainText(
    'testcafe on Instagram',
  );
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
  await page.screenshot({
    path: `test-results/social-confirm-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Confirm publish', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Publishing...', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue publishing', exact: true })).toHaveCount(
    0,
  );
  await expect.poll(() => requests.length).toBe(2);
  await page.clock.runFor(61000);
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent publications' })).toHaveCount(0);
  expect(requests).toHaveLength(3);
  expect(requests[0]).toMatchObject({
    platform: 'Instagram',
    format: 'post',
    caption: 'Holiday hours: Friday 9–2',
  });
  expect(requests[1]).toMatchObject({ op: 'continue', publicationId: 'publication' });
  await expect(page.locator('.social-publish-success')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
