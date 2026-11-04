import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { graph, metaPages, exchangeMeta, MetaError } from '../src/lib/meta';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  process.env.META_APP_SECRET = 'secret';
  process.env.META_APP_ID = '123';
  process.env.NEXT_PUBLIC_APP_URL = 'https://opensync.example';
  process.env.META_GRAPH_VERSION = 'v25.0';
});
afterEach(() => vi.unstubAllGlobals());
it('keeps bearer tokens out of graph URLs and sends app-secret proof', async () => {
  fetchMock.mockResolvedValue(Response.json({ id: 'published' }));
  await graph('123/feed', 'private-token', { message: 'Holiday hours' }, 'POST');
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://graph.facebook.com/v25.0/123/feed');
  expect(options.headers.Authorization).toBe('Bearer private-token');
  expect(options.body.get('appsecret_proof')).toMatch(/^[a-f0-9]{64}$/);
  expect(options.body.get('message')).toBe('Holiday hours');
});
it('never forwards provider error text or tokens to clients', async () => {
  fetchMock.mockResolvedValue(
    Response.json({ error: { code: 190, message: 'sensitive private-token' } }, { status: 400 }),
  );
  await expect(graph('123', 'private-token')).rejects.toThrow('Meta authorization expired');
});
it('classifies lost connections as uncertain, with no automatic retry', async () => {
  fetchMock.mockRejectedValue(new TypeError('network failure'));
  await expect(graph('123/feed', 'token', {}, 'POST')).rejects.toMatchObject({ ambiguous: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('paginates using cursors on a fixed host, never provider-supplied URLs', async () => {
  fetchMock
    .mockResolvedValueOnce(
      Response.json({
        data: [{ id: '1', name: 'Page', access_token: 'token', tasks: ['CREATE_CONTENT'] }],
        paging: { next: 'https://evil.example/?token=secret', cursors: { after: 'cursor' } },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        data: [{ id: '2', name: 'Read only', access_token: 'token', tasks: ['ANALYZE'] }],
      }),
    );
  expect(await metaPages('user-token')).toHaveLength(1);
  expect(fetchMock.mock.calls[1][0]).toContain('https://graph.facebook.com/v25.0/me/accounts?');
  expect(fetchMock.mock.calls[1][0]).toContain('after=cursor');
});
it('exchanges authorization code and long-lived token using secret-free URLs', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ access_token: 'short' }))
    .mockResolvedValueOnce(Response.json({ access_token: 'long' }));
  expect((await exchangeMeta('authorization-code')).access_token).toBe('long');
  expect(fetchMock.mock.calls[0][1].body.get('redirect_uri')).toBe(
    'https://opensync.example/api/social/callback',
  );
  expect(fetchMock.mock.calls[1][1].body.get('fb_exchange_token')).toBe('short');
  expect(fetchMock.mock.calls.every(([url]) => !url.includes('secret'))).toBe(true);
});
it('rejects paths that could target another host', async () => {
  await expect(graph('https://evil.example', 'token')).rejects.toThrow('Invalid Meta path');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(new MetaError(200).message).toContain('permission denied');
});
