import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
const shared = vi.hoisted(() => ({
  database: null as unknown,
  user: '11111111-1111-4111-8111-111111111111',
  graph: vi.fn(),
  exchange: vi.fn(),
  pages: vi.fn(),
  cookie: '',
}));
vi.mock('../src/db', () => ({ db: () => shared.database }));
vi.mock('../src/lib/supabase', () => ({ requireUser: async () => ({ id: shared.user }) }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ value: shared.cookie }),
    set: (_name: string, value: string) => {
      shared.cookie = value;
    },
  }),
}));
vi.mock('../src/lib/meta', async (original) => ({
  ...(await original<typeof import('../src/lib/meta')>()),
  graph: shared.graph,
  exchangeMeta: shared.exchange,
  metaPages: shared.pages,
}));
import { encrypt } from '../src/lib/google';
import { MetaError, stateHash } from '../src/lib/meta';
import { POST } from '../src/app/api/social/publish/route';
import { GET as getMedia } from '../src/app/api/social/media/[key]/route';
import { GET as getAccounts, DELETE as disconnect } from '../src/app/api/social/accounts/route';
import { GET as callback } from '../src/app/api/social/callback/route';
const pg = new PGlite();
const locationId = randomUUID(),
  accountId = randomUUID(),
  org = randomUUID();
let jpeg = '',
  storyJpeg = '';
function adapt(value: object): object {
  return new Proxy(value, {
    get(target, key, receiver) {
      if (key === 'execute')
        return async (...args: unknown[]) =>
          (await Reflect.get(target, key, receiver).apply(target, args)).rows;
      const result = Reflect.get(target, key, receiver);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  });
}
beforeAll(async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://opensync.example';
  process.env.META_APP_ID = 'app';
  process.env.META_APP_SECRET = 'secret';
  process.env.TOKEN_ENCRYPTION_KEY = 'aa'.repeat(32);
  await pg.exec(
    `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;`,
  );
  for (const file of (await readdir('migrations')).filter((f) => f.endsWith('.sql')).sort())
    await pg.exec(
      (await readFile(`migrations/${file}`, 'utf8')).replace(
        'create extension if not exists pgcrypto;',
        '',
      ),
    );
  await pg.query('insert into auth.users(id) values($1)', [shared.user]);
  await pg.query('insert into organizations(id,name) values($1,$2)', [org, 'Test business']);
  await pg.query('insert into memberships(organization_id,user_id,role) values($1,$2,$3)', [
    org,
    shared.user,
    'owner',
  ]);
  await pg.query('insert into locations(id,organization_id,draft) values($1,$2,$3)', [
    locationId,
    org,
    {},
  ]);
  await pg.query(
    'insert into social_accounts(id,location_id,page_id,name,instagram_id,instagram_type,encrypted_token) values($1,$2,$3,$4,$5,$6,$7)',
    [
      accountId,
      locationId,
      '123',
      'Test Page',
      '456',
      'BUSINESS',
      encrypt({ access_token: 'never-expose-this' }),
    ],
  );
  shared.database = adapt(drizzle(pg));
  const makeImage = async (height: number) =>
    `data:image/jpeg;base64,${(
      await sharp({ create: { width: 1080, height, channels: 3, background: '#faf5eb' } })
        .jpeg()
        .toBuffer()
    ).toString('base64')}`;
  jpeg = await makeImage(1080);
  storyJpeg = await makeImage(1920);
}, 30000);
afterAll(async () => pg.close());
beforeEach(() => {
  shared.graph.mockReset();
  shared.exchange.mockReset();
  shared.pages.mockReset();
});
const payload = (platform = 'Facebook', format = 'post') => ({
  id: locationId,
  accountId,
  requestId: randomUUID(),
  platform,
  format,
  caption: 'Holiday hours',
  image: format === 'story' ? storyJpeg : jpeg,
});
async function post(body: unknown, origin = 'https://opensync.example') {
  const response = await POST(
    new Request('https://opensync.example/api/social/publish', {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}
const advance = (id: string) => post({ op: 'continue', id: locationId, publicationId: id });
describe('direct publishing with real PostgreSQL state and mocked Meta', () => {
  it('publishes a Facebook feed photo once and keeps tokens and media private in history', async () => {
    shared.graph.mockResolvedValueOnce({ id: 'photo' }).mockResolvedValueOnce({ id: 'page_post' });
    const input = payload();
    expect((await post(input)).body.publication.status).toBe('ready');
    expect((await advance(input.requestId)).body.publication.remoteId).toBe('page_post');
    expect((await post(input)).body.publication.status).toBe('published');
    await advance(input.requestId);
    expect(shared.graph).toHaveBeenCalledTimes(2);
    expect(shared.graph.mock.calls[0][2]).toMatchObject({ published: 'false' });
    expect(shared.graph.mock.calls[1]).toEqual([
      '123/feed',
      'never-expose-this',
      { message: 'Holiday hours', attached_media: '[{"media_fbid":"photo"}]' },
      'POST',
    ]);
    const history = await (
      await getAccounts(
        new Request(`https://opensync.example/api/social/accounts?id=${locationId}`),
      )
    ).text();
    expect(history).not.toContain('never-expose-this');
    expect(history).not.toContain('mediaKey');
    expect(history).not.toContain('payloadHash');
    expect((await post({ ...input, caption: 'Different content' })).status).toBe(400);
  });
  it('publishes Facebook stories through photo_stories without a feed caption', async () => {
    shared.graph
      .mockResolvedValueOnce({ id: 'photo_story' })
      .mockResolvedValueOnce({ success: true, post_id: 'story_id' });
    const input = payload('Facebook', 'story');
    await post(input);
    expect((await advance(input.requestId)).body.publication.status).toBe('published');
    expect(shared.graph.mock.calls[1]).toEqual([
      '123/photo_stories',
      'never-expose-this',
      { photo_id: 'photo_story' },
      'POST',
    ]);
  });
  it('waits for Instagram readiness and never treats container creation as publication', async () => {
    shared.graph
      .mockResolvedValueOnce({ id: 'container' })
      .mockResolvedValueOnce({ status_code: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ status_code: 'FINISHED' })
      .mockResolvedValueOnce({ id: 'ig_media' });
    const input = payload('Instagram', 'story');
    expect((await post(input)).body.publication.status).toBe('ready');
    expect(shared.graph.mock.calls[0][2]).toMatchObject({ media_type: 'STORIES' });
    expect(shared.graph.mock.calls[0][2]).not.toHaveProperty('caption');
    expect((await advance(input.requestId)).body.publication.status).toBe('ready');
    expect((await advance(input.requestId)).body.publication.remoteId).toBe('ig_media');
    expect(shared.graph.mock.calls[3][0]).toBe('456/media_publish');
  });
  it('retains unknown outcomes and never automatically repeats a timed-out publish', async () => {
    shared.graph
      .mockResolvedValueOnce({ id: 'photo' })
      .mockRejectedValueOnce(new MetaError(0, true));
    const input = payload();
    await post(input);
    expect((await advance(input.requestId)).body.publication.status).toBe('unknown');
    await advance(input.requestId);
    await post(input);
    expect(shared.graph).toHaveBeenCalledTimes(2);
  });
  it('serializes concurrent publish attempts', async () => {
    shared.graph.mockResolvedValueOnce({ id: 'photo' }).mockResolvedValue({ id: 'one_post' });
    const input = payload();
    await post(input);
    await Promise.all([advance(input.requestId), advance(input.requestId)]);
    expect(shared.graph.mock.calls.filter((call) => call[0] === '123/feed')).toHaveLength(1);
  });
  it('rejects cross-origin, cross-location, and viewer publishing before any provider call', async () => {
    expect((await post(payload(), 'https://evil.example')).status).toBe(403);
    expect((await post({ ...payload(), id: randomUUID() })).status).toBe(403);
    await pg.query("update memberships set role='viewer' where user_id=$1", [shared.user]);
    expect((await post(payload())).status).toBe(403);
    await pg.query("update memberships set role='owner' where user_id=$1", [shared.user]);
    expect(shared.graph).not.toHaveBeenCalled();
  });
  it('rejects corrupt images and non-Business Instagram stories', async () => {
    expect((await post({ ...payload(), image: 'data:image/jpeg;base64,YWJj' })).status).toBe(400);
    await pg.query("update social_accounts set instagram_type='MEDIA_CREATOR' where id=$1", [
      accountId,
    ]);
    expect((await post(payload('Instagram', 'story'))).status).toBe(400);
    await pg.query("update social_accounts set instagram_type='BUSINESS' where id=$1", [accountId]);
    expect(shared.graph).not.toHaveBeenCalled();
  });
  it('serves only valid unexpired image capabilities', async () => {
    const result = await pg.query<{ media_key: string; id: string }>(
      'select media_key,id from social_publications limit 1',
    );
    const row = result.rows[0];
    const read = (key: string) =>
      getMedia(new Request('https://opensync.example'), { params: Promise.resolve({ key }) });
    expect((await read('bad')).status).toBe(404);
    const response = await read(row.media_key);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await pg.query(
      "update social_publications set media_expires_at=now()-interval '1 second' where id=$1",
      [row.id],
    );
    expect((await read(row.media_key)).status).toBe(404);
  });
  it('consumes OAuth state once and binds it to the initiating user', async () => {
    const state = 'b'.repeat(64);
    shared.cookie = state;
    await pg.query(
      "insert into social_oauth(state_hash,location_id,user_id,expires_at) values($1,$2,$3,now()+interval '10 minutes')",
      [stateHash(state), locationId, shared.user],
    );
    shared.exchange.mockResolvedValue({ access_token: 'user-token' });
    shared.pages.mockResolvedValue([
      {
        id: '123',
        name: 'Test Page',
        access_token: 'page-token',
        instagram_business_account: { id: '456', account_type: 'BUSINESS' },
      },
    ]);
    const call = () =>
      callback(
        new Request(`https://opensync.example/api/social/callback?state=${state}&code=code`),
      );
    const user = shared.user;
    shared.user = randomUUID();
    expect((await call()).headers.get('location')).toContain('error=');
    shared.user = user;
    shared.cookie = state;
    expect((await call()).headers.get('location')).toContain(`location=${locationId}`);
    shared.cookie = state;
    expect((await call()).headers.get('location')).toContain('error=');
    expect(shared.exchange).toHaveBeenCalledTimes(1);
  });
  it('removes local tokens on disconnect without deleting published history', async () => {
    const response = await disconnect(
      new Request('https://opensync.example/api/social/accounts', {
        method: 'DELETE',
        headers: { origin: 'https://opensync.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: locationId, accountId }),
      }),
    );
    expect(response.status).toBe(200);
    expect(
      (await pg.query('select * from social_accounts where id=$1', [accountId])).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query('select * from social_publications where location_id=$1', [locationId])).rows
        .length,
    ).toBeGreaterThan(0);
  });
});
