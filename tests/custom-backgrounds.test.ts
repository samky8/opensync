import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const shared = vi.hoisted(() => ({
  database: null as unknown,
  user: '11111111-1111-4111-8111-111111111111',
}));
vi.mock('../src/db', () => ({ db: () => shared.database }));
vi.mock('../src/lib/supabase', () => ({ requireUser: async () => ({ id: shared.user }) }));

import { DELETE, GET, POST } from '../src/app/api/social/backgrounds/route';

const pg = new PGlite();
const organizationId = randomUUID();
const locationId = randomUUID();
const otherLocationId = randomUUID();

function adapt(value: object): object {
  return new Proxy(value, {
    get(target, key, receiver) {
      if (key === 'execute')
        return async (...args: unknown[]) =>
          (await Reflect.get(target, key, receiver).apply(target, args)).rows;
      if (key === 'transaction')
        return (callback: (tx: unknown) => Promise<unknown>) =>
          Reflect.get(target, key, receiver).call(target, (tx: object) => callback(adapt(tx)));
      const result = Reflect.get(target, key, receiver);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  });
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://opensync.example';
  process.env.DEV_PAID_FEATURES = 'false';
  await pg.exec(
    `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;`,
  );
  for (const file of (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort())
    await pg.exec(
      (await readFile(`migrations/${file}`, 'utf8')).replace(
        'create extension if not exists pgcrypto;',
        '',
      ),
    );
  await pg.query('insert into auth.users(id) values($1)', [shared.user]);
  await pg.query('insert into organizations(id,name) values($1,$2)', [
    organizationId,
    'Test business',
  ]);
  await pg.query('insert into memberships(organization_id,user_id,role) values($1,$2,$3)', [
    organizationId,
    shared.user,
    'owner',
  ]);
  for (const id of [locationId, otherLocationId])
    await pg.query('insert into locations(id,organization_id,draft) values($1,$2,$3)', [
      id,
      organizationId,
      {},
    ]);
  await pg.query("insert into account_billing(account_id,plan,status) values($1,'pro','active')", [
    shared.user,
  ]);
  shared.database = adapt(drizzle(pg));
}, 30000);

afterAll(async () => pg.close());

const image = (value: number) =>
  `data:image/jpeg;base64,${Buffer.from(`background-${value}`).toString('base64')}`;

async function post(id: string, value: number) {
  const response = await POST(
    new Request('https://opensync.example/api/social/backgrounds', {
      method: 'POST',
      headers: { origin: 'https://opensync.example', 'content-type': 'application/json' },
      body: JSON.stringify({ id, image: image(value) }),
    }),
  );
  return { response, body: await response.json() };
}

describe('saved custom backgrounds', () => {
  it('keeps images isolated by profile and caps each profile at five', async () => {
    for (let value = 1; value <= 5; value++)
      expect((await post(locationId, value)).response.status).toBe(200);

    const limited = await post(locationId, 6);
    expect(limited.response.status).toBe(400);
    expect(limited.body.error).toMatch(/limit reached/i);

    const firstProfile = await GET(
      new Request(`https://opensync.example/api/social/backgrounds?id=${locationId}`),
    );
    expect((await firstProfile.json()).images).toHaveLength(5);

    const secondProfile = await GET(
      new Request(`https://opensync.example/api/social/backgrounds?id=${otherLocationId}`),
    );
    expect((await secondProfile.json()).images).toEqual([]);
  });

  it('allows another upload after a confirmed client deletion', async () => {
    const listed = await GET(
      new Request(`https://opensync.example/api/social/backgrounds?id=${locationId}`),
    );
    const [saved] = (await listed.json()).images;
    const removed = await DELETE(
      new Request('https://opensync.example/api/social/backgrounds', {
        method: 'DELETE',
        headers: { origin: 'https://opensync.example', 'content-type': 'application/json' },
        body: JSON.stringify({ id: locationId, imageId: saved.id }),
      }),
    );
    expect(removed.status).toBe(200);
    expect((await post(locationId, 7)).response.status).toBe(200);
  });
});
