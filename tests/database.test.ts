import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const shared = vi.hoisted(() => ({
  database: null as unknown,
  user: '11111111-1111-4111-8111-111111111111',
  googleCalls: [] as { path: string; body: string }[],
  googleFailure: 0,
}));
vi.mock('../src/db', () => ({ db: () => shared.database }));
vi.mock('../src/lib/supabase', () => ({
  requireUser: async () => ({ id: shared.user, email: 'test@example.com' }),
}));
vi.mock('../src/lib/google', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/google')>();
  return {
    ...actual,
    assertGoogle: () => {},
    googleAccess: async () => ({
      connection: { remoteId: 'locations/123', status: 'connected' },
      token: 'test-token',
    }),
    googleFetch: async (path: string, _token: string, init?: RequestInit) => {
      shared.googleCalls.push({ path, body: String(init?.body) });
      if (shared.googleFailure) throw new actual.GoogleError(shared.googleFailure);
      return {};
    },
  };
});
import { POST, GET as manageGet } from '../src/app/api/manage/route';
import { GET as publicGet } from '../src/app/api/public/[id]/route';
import { GET as cron } from '../src/app/api/cron/route';
import { defaultSchedule, resetWidgetToDefaults } from '../src/lib/domain';
import { POST as claimTrial } from '../src/app/api/trial/route';
import { entitlementsFor, planFor } from '../src/lib/server';
const pg = new PGlite();
// postgres-js returns rows directly while PGlite wraps them; all SQL and query builders still execute against PostgreSQL.
function adapt(value: object): object {
  return new Proxy(value, {
    get(target, key, receiver) {
      if (key === 'execute')
        return async (...args: unknown[]) => {
          const result = await Reflect.get(target, key, receiver).apply(target, args);
          return result.rows;
        };
      if (key === 'transaction')
        return (callback: (tx: unknown) => Promise<unknown>) =>
          Reflect.get(target, key, receiver).call(target, (tx: object) => callback(adapt(tx)));
      const result = Reflect.get(target, key, receiver);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  });
}
beforeAll(async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.DEV_PAID_FEATURES = 'false';
  await pg.exec(
    `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
  );
  const migration = (await readFile('migrations/001_initial.sql', 'utf8')).replace(
    'create extension if not exists pgcrypto;',
    '',
  );
  await pg.exec(migration);
  await pg.exec(await readFile('migrations/002_billing_idempotency.sql', 'utf8'));
  await pg.exec(await readFile('migrations/003_publication_constraints.sql', 'utf8'));
  await pg.exec(await readFile('migrations/005_pro_trials.sql', 'utf8'));
  await pg.query(
    'insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',
    [shared.user, 'test@example.com', '22222222-2222-4222-8222-222222222222', 'other@example.com'],
  );
  shared.database = adapt(drizzle(pg));
}, 30000);
afterAll(async () => pg.close());
const post = async (body: unknown) => {
  const response = await POST(
    new Request('http://localhost:3000/api/manage', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
};
let id = '',
  version = 1;
async function trialRequest(origin = 'http://localhost:3000') {
  const response = await claimTrial(
    new Request('http://localhost:3000/api/trial', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    }),
  );
  return { status: response.status, body: await response.json() };
}
describe('real SQL application flows', () => {
  it('creates an isolated organization and clean business', async () => {
    const result = await post({ op: 'create', name: 'Test Café', timezone: 'America/Toronto' });
    expect(result.status).toBe(200);
    id = result.body.location.id;
    expect(result.body.location.draft.announcements).toEqual([]);
    const detail = await manageGet(new Request(`http://localhost:3000/api/manage?id=${id}`));
    expect((await detail.json()).published).toBeNull();
  });
  it('saves drafts, rejects stale updates and publishes idempotently', async () => {
    const draft = defaultSchedule('Updated Café');
    draft.weekly[0] = [{ open: '08:00', close: '14:00' }];
    const saved = await post({ op: 'save', id, draft, version: 1 });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    version = saved.body.location.draftVersion;
    expect((await post({ op: 'save', id, draft, version: 1 })).status).toBe(400);
    const key = randomUUID();
    const first = await post({ op: 'publish', id, version, key });
    expect(first.status).toBe(200);
    const repeated = await post({ op: 'publish', id, version, key });
    expect(repeated.body.revision.id).toBe(first.body.revision.id);
    const result = await pg.query(
      'select count(*)::int as count from revisions where location_id=$1',
      [id],
    );
    expect(result.rows[0]).toEqual({ count: 1 });
  });
  it('public endpoint returns published state only', async () => {
    const draft = defaultSchedule('Private unpublished name');
    await post({ op: 'save', id, draft, version });
    version++;
    const response = await publicGet(new Request(`http://localhost:3000/api/public/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schedule.name).toBe('Updated Café');
    expect(body).not.toHaveProperty('organizationId');
    expect(body).not.toHaveProperty('encryptedTokens');
    const detail = await manageGet(new Request(`http://localhost:3000/api/manage?id=${id}`));
    const managed = await detail.json();
    expect(managed.published).toEqual(body.schedule);
    expect(managed.location.draft.name).toBe('Private unpublished name');
  });
  it('blocks second-user writes and client-supplied tenancy', async () => {
    shared.user = '22222222-2222-4222-8222-222222222222';
    const res = await post({ op: 'save', id, version, draft: defaultSchedule('Attacker') });
    expect(res.status).toBe(403);
    const detail = await manageGet(new Request(`http://localhost:3000/api/manage?id=${id}`));
    expect(detail.status).toBe(403);
    shared.user = '11111111-1111-4111-8111-111111111111';
  });
  it('enforces RLS when using a direct authenticated database session', async () => {
    await pg.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);`,
    );
    try {
      expect((await pg.query('select * from locations')).rows).toEqual([]);
      await expect(pg.query('select * from connections')).rejects.toThrow(/permission denied/);
    } finally {
      await pg.exec('reset role');
    }
  });
  it('enforces paid features on the server', async () => {
    const draft = defaultSchedule('Private unpublished name');
    draft.widget.accent = '#ff0000';
    const res = await post({ op: 'save', id, version, draft });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/requires Pro/);
    expect((await post({ op: 'create', name: 'Second', timezone: 'UTC' })).body.error).toMatch(
      /requires Business/,
    );
  });
  it('rejects cross-origin writes', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/manage', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
        body: JSON.stringify({ op: 'create' }),
      }),
    );
    expect(response.status).toBe(403);
  });
  it('only lets the workspace owner claim a trial through the application', async () => {
    expect((await trialRequest('https://evil.example')).status).toBe(403);
    const organization = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    shared.user = '22222222-2222-4222-8222-222222222222';
    try {
      expect((await trialRequest()).status).toBe(403);
      await pg.query(
        "insert into memberships(organization_id,user_id,role) values($1,$2,'editor')",
        [organization, shared.user],
      );
      expect((await trialRequest()).status).toBe(403);
      await pg.exec('set role authenticated');
      await expect(pg.query('select * from pro_trials')).rejects.toThrow(/permission denied/);
    } finally {
      await pg.exec('reset role');
      await pg.query('delete from memberships where organization_id=$1 and user_id=$2', [
        organization,
        shared.user,
      ]);
      shared.user = '11111111-1111-4111-8111-111111111111';
    }
  });
  it('grants exactly 14 days of Pro once, including concurrent and repeated claims', async () => {
    const organization = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    expect((await entitlementsFor(organization)).trial.status).toBe('available');
    const results = await Promise.all([trialRequest(), trialRequest()]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body.trial.endsAt).toBe(results[1].body.trial.endsAt);
    expect(await planFor(organization)).toBe('pro');
    const trial = (
      await pg.query<{ hours: number; count: number }>(
        'select extract(epoch from (ends_at-started_at))/3600 as hours, count(*) over()::int as count from pro_trials where organization_id=$1',
        [organization],
      )
    ).rows[0];
    expect(Number(trial.hours)).toBe(336);
    expect(trial.count).toBe(1);
    const draft = defaultSchedule('Trial business');
    draft.widget.accent = '#ff0000';
    const result = await post({ op: 'save', id, version, draft });
    expect(result.status).toBe(200);
    version = result.body.location.draftVersion;
  });
  it('expires trials without a scheduler, prevents reclaiming and preserves paid plans', async () => {
    const organization = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    await pg.query(
      "update pro_trials set started_at=started_at-interval '15 days', ends_at=ends_at-interval '15 days' where organization_id=$1",
      [organization],
    );
    expect(await planFor(organization)).toBe('free');
    expect((await entitlementsFor(organization)).trial.status).toBe('expired');
    expect((await trialRequest()).status).toBe(400);
    const draft = defaultSchedule('Trial business');
    draft.widget.accent = '#00ff00';
    expect((await post({ op: 'save', id, version, draft })).status).toBe(400);
    const reset = await post({ op: 'save', id, version, draft: resetWidgetToDefaults(draft) });
    expect(reset.status).toBe(200);
    version = reset.body.location.draftVersion;
    const publication = await post({ op: 'publish', id, version, key: randomUUID() });
    expect(publication.status).toBe(200);
    expect(publication.body.revision.snapshot.widget).toEqual(defaultSchedule().widget);
    await pg.query(
      "insert into subscriptions(organization_id,plan,status) values($1,'business','active')",
      [organization],
    );
    try {
      expect(await planFor(organization)).toBe('business');
      expect((await entitlementsFor(organization)).trial.status).toBe('unavailable');
      expect((await trialRequest()).status).toBe(400);
    } finally {
      await pg.query('delete from subscriptions where organization_id=$1', [organization]);
    }
  });
  it('durable worker skips older revisions and sends only authorized Google fields', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const organization = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    await pg.query(
      "insert into subscriptions(organization_id,plan,status) values($1,'pro','active')",
      [organization],
    );
    await pg.query(
      "insert into connections(location_id,encrypted_tokens,remote_id,status) values($1,'test-only','locations/123','connected')",
      [id],
    );
    await post({ op: 'publish', id, version, key: randomUUID() });
    const saved = await post({
      op: 'save',
      id,
      version,
      draft: defaultSchedule('Newest revision'),
    });
    version = saved.body.location.draftVersion;
    await post({ op: 'publish', id, version, key: randomUUID() });
    const invoke = () =>
      cron(
        new Request('http://localhost:3000/api/cron', {
          headers: { authorization: 'Bearer test-cron-secret' },
        }),
      );
    expect((await invoke()).status).toBe(200);
    expect(shared.googleCalls).toHaveLength(0);
    await invoke();
    expect(shared.googleCalls).toHaveLength(1);
    expect(shared.googleCalls[0].path).toContain('updateMask=regularHours,specialHours');
    expect(Object.keys(JSON.parse(shared.googleCalls[0].body))).toEqual([
      'regularHours',
      'specialHours',
    ]);
    expect(
      (await pg.query("select status from jobs where destination='google' order by created_at"))
        .rows,
    ).toEqual([{ status: 'superseded' }, { status: 'accepted' }]);
  });
  it('durably backs off transient provider failures, then recovers', async () => {
    shared.googleFailure = 429;
    await post({ op: 'publish', id, version, key: randomUUID() });
    const invoke = () =>
      cron(
        new Request('http://localhost:3000/api/cron', {
          headers: { authorization: 'Bearer test-cron-secret' },
        }),
      );
    await invoke();
    const retry = (
      await pg.query<{ status: string; attempts: number; id: string; next_attempt: Date }>(
        "select * from jobs where status='retry'",
      )
    ).rows[0];
    expect(retry.attempts).toBe(1);
    expect(new Date(retry.next_attempt).getTime()).toBeGreaterThan(Date.now());
    await pg.query("update jobs set next_attempt=now()-interval '1 minute' where id=$1", [
      retry.id,
    ]);
    shared.googleFailure = 0;
    await invoke();
    expect(
      (await pg.query('select status,attempts from jobs where id=$1', [retry.id])).rows[0],
    ).toEqual({ status: 'accepted', attempts: 2 });
    expect((await cron(new Request('http://localhost:3000/api/cron'))).status).toBe(401);
  });
  it('protects immutable publication snapshots at the database layer', async () => {
    await expect(
      pg.query("update revisions set snapshot='{}' where location_id=$1", [id]),
    ).rejects.toThrow(/immutable/);
  });
  it('account deletion trigger removes owned public data atomically', async () => {
    await pg.query('delete from auth.users where id=$1', [shared.user]);
    expect((await pg.query('select * from locations')).rows).toHaveLength(0);
    expect((await pg.query('select * from revisions')).rows).toHaveLength(0);
  });
});
