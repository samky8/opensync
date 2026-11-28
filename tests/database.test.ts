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
  billingPortal: vi.fn(),
  subscriptionList: vi.fn(),
}));
vi.mock('../src/db', () => ({ db: () => shared.database }));
vi.mock('../src/lib/supabase', () => ({
  requireUser: async () => ({ id: shared.user, email: 'test@example.com' }),
}));
vi.mock('../src/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/stripe')>();
  return {
    ...actual,
    stripe: () => ({
      billingPortal: { sessions: { create: shared.billingPortal } },
      subscriptions: { list: shared.subscriptionList },
      webhooks: { constructEvent: (payload: string) => JSON.parse(payload) },
    }),
  };
});
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
import { POST as billing } from '../src/app/api/billing/route';
import { POST as webhook } from '../src/app/api/billing/webhook/route';
import { accountEntitlementsFor, entitlementsFor, planFor } from '../src/lib/server';
import { runNotificationChecks, sendOneNotificationEmail } from '../src/lib/notification-system';
const pg = new PGlite();
const migratedAccount = randomUUID();
const legacyPaidWorkspace = randomUUID();
const legacyTrialWorkspace = randomUUID();
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
  await pg.exec(await readFile('migrations/004_social_publishing.sql', 'utf8'));
  await pg.exec(await readFile('migrations/005_pro_trials.sql', 'utf8'));
  await pg.query('insert into auth.users(id) values($1)', [migratedAccount]);
  await pg.query("insert into organizations(id,name) values($1,'Paid'),($2,'Trial')", [
    legacyPaidWorkspace,
    legacyTrialWorkspace,
  ]);
  await pg.query(
    "insert into memberships(organization_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner')",
    [legacyPaidWorkspace, legacyTrialWorkspace, migratedAccount],
  );
  await pg.query(
    "insert into subscriptions(organization_id,customer_id,subscription_id,plan,status) values($1,'cus_migrated','sub_migrated','business','active')",
    [legacyPaidWorkspace],
  );
  await pg.query(
    `insert into pro_trials(organization_id,claimed_by,started_at,ends_at)
     values($1,$3,now()-interval '1 day',now()+interval '13 days'),
           ($2,$3,now(),now()+interval '14 days')`,
    [legacyPaidWorkspace, legacyTrialWorkspace, migratedAccount],
  );
  await pg.exec(await readFile('migrations/007_account_billing.sql', 'utf8'));
  await pg.exec(await readFile('migrations/008_notification_settings.sql', 'utf8'));
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
async function trialRequest(origin = 'http://localhost:3000', locationId = id) {
  const response = await claimTrial(
    new Request('http://localhost:3000/api/trial', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ id: locationId }),
    }),
  );
  return { status: response.status, body: await response.json() };
}
describe('real SQL application flows', () => {
  it('migrates a Stripe subscription and the latest trial across workspaces', async () => {
    expect(await planFor(legacyPaidWorkspace)).toBe('business');
    expect(await planFor(legacyTrialWorkspace)).toBe('business');
    expect(
      (
        await pg.query(
          'select customer_id,subscription_id from account_billing where account_id=$1',
          [migratedAccount],
        )
      ).rows,
    ).toEqual([{ customer_id: 'cus_migrated', subscription_id: 'sub_migrated' }]);
    expect(
      (
        await pg.query(
          `select t.ends_at = (select max(ends_at) from pro_trials where claimed_by=$1) as original_expiry
         from account_pro_trials t where account_id=$1`,
          [migratedAccount],
        )
      ).rows,
    ).toEqual([{ original_expiry: true }]);
  });
  it('uses only the signed-in account for the portal and reconciles its shared plan through webhooks', async () => {
    const originalUser = shared.user;
    const request = () =>
      billing(
        new Request('http://localhost:3000/api/billing', {
          method: 'POST',
          headers: { origin: 'http://localhost:3000' },
          body: JSON.stringify({
            portal: true,
            id: legacyPaidWorkspace,
            accountId: migratedAccount,
          }),
        }),
      );
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_example');
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro');
    vi.stubEnv('STRIPE_BUSINESS_PRICE_ID', 'price_business');
    try {
      expect((await request()).status).toBe(400);
      expect(shared.billingPortal).not.toHaveBeenCalled();
      shared.user = migratedAccount;
      shared.billingPortal.mockResolvedValueOnce({ url: 'https://example.com/portal' });
      expect(await (await request()).json()).toEqual({ url: 'https://example.com/portal' });
      expect(shared.billingPortal).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_migrated' }),
      );

      const subscription = {
        id: 'sub_migrated',
        customer: 'cus_migrated',
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_pro',
                currency: 'cad',
                unit_amount: 900,
                recurring: { interval: 'month', interval_count: 1 },
              },
            },
          ],
        },
      };
      shared.subscriptionList.mockResolvedValueOnce({ data: [subscription] });
      const event = () =>
        webhook(
          new Request('http://localhost:3000/api/billing/webhook', {
            method: 'POST',
            body: JSON.stringify({
              id: 'evt_migration_test',
              type: 'customer.subscription.updated',
              data: { object: subscription },
            }),
          }),
        );
      expect((await event()).status).toBe(200);
      expect((await event()).status).toBe(200);
      expect(shared.subscriptionList).toHaveBeenCalledTimes(1);
      expect(await planFor(legacyPaidWorkspace)).toBe('pro');
      expect(await planFor(legacyTrialWorkspace)).toBe('pro');
    } finally {
      shared.user = originalUser;
      vi.unstubAllEnvs();
    }
  });
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
      await expect(pg.query('select * from account_billing')).rejects.toThrow(/permission denied/);
      await expect(pg.query('select * from account_pro_trials')).rejects.toThrow(
        /permission denied/,
      );
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
  it('shares account Business across new workspaces and enforces the combined profile limit', async () => {
    const originalOrganization = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    await pg.query(
      'insert into account_billing(account_id,complimentary_business) values($1,true)',
      [shared.user],
    );
    try {
      const result = await post({
        op: 'create',
        newWorkspace: true,
        name: 'Second business',
        timezone: 'America/Toronto',
      });
      expect(result.status, JSON.stringify(result.body)).toBe(200);
      const workspace = (
        await pg.query<{ organization_id: string; user_id: string; role: string }>(
          `select l.organization_id,m.user_id,m.role
           from locations l
           join memberships m on m.organization_id=l.organization_id
           where l.id=$1`,
          [result.body.location.id],
        )
      ).rows[0];
      expect(workspace.organization_id).not.toBe(originalOrganization);
      expect(workspace.user_id).toBe(shared.user);
      expect(workspace.role).toBe('owner');
      expect(await planFor(workspace.organization_id)).toBe('business');
      const added = await post({
        op: 'create',
        targetLocationId: result.body.location.id,
        name: 'Second business location',
        timezone: 'America/Toronto',
      });
      expect(added.status).toBe(200);
      expect(added.body.location.organizationId).toBe(workspace.organization_id);
      const third = await post({
        op: 'create',
        newWorkspace: true,
        name: 'Third business',
        timezone: 'UTC',
      });
      expect(third.status).toBe(200);
      expect(third.body.location.organizationId).not.toBe(workspace.organization_id);
      expect(await planFor(third.body.location.organizationId)).toBe('business');
      vi.stubEnv('BUSINESS_LOCATION_LIMIT', '4');
      expect(
        (
          await post({
            op: 'create',
            newWorkspace: true,
            name: 'Over the limit',
            timezone: 'UTC',
          })
        ).body.error,
      ).toMatch(/Account profile limit/);
    } finally {
      vi.unstubAllEnvs();
      await pg.query('delete from account_billing where account_id=$1', [shared.user]);
    }
  });
  it('uses the workspace owner’s plan for staff without changing their own account plan', async () => {
    const owner = shared.user;
    const staff = '22222222-2222-4222-8222-222222222222';
    const org = (
      await pg.query<{ organization_id: string }>(
        'select organization_id from locations where id=$1',
        [id],
      )
    ).rows[0].organization_id;
    await pg.query(
      'insert into account_billing(account_id,complimentary_business) values($1,true)',
      [owner],
    );
    await pg.query("insert into memberships(organization_id,user_id,role) values($1,$2,'admin')", [
      org,
      staff,
    ]);
    shared.user = staff;
    try {
      const managed = await manageGet(new Request(`http://localhost:3000/api/manage?id=${id}`));
      expect(await managed.json()).toMatchObject({
        plan: 'business',
        accountBilling: { plan: 'free' },
      });
      const own = await post({ op: 'create', name: 'Staff’s own business', timezone: 'UTC' });
      expect(own.status).toBe(200);
      expect(own.body.location.organizationId).not.toBe(org);
      expect(await planFor(own.body.location.organizationId)).toBe('free');
      const second = await post({
        op: 'create',
        sourceLocationId: id,
        name: 'Extra',
        timezone: 'UTC',
      });
      expect(second.body.error).toMatch(/requires Business on your account/);
      await pg.query('delete from organizations where id=$1', [own.body.location.organizationId]);
    } finally {
      shared.user = owner;
      await pg.query('delete from memberships where organization_id=$1 and user_id=$2', [
        org,
        staff,
      ]);
      await pg.query('delete from account_billing where account_id=$1', [owner]);
    }
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
      expect((await accountEntitlementsFor(shared.user)).trial.status).toBe('available');
    } finally {
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
    const [other] = (
      await pg.query<{ id: string; organization_id: string }>(
        'select id,organization_id from locations where organization_id<>$1 limit 1',
        [organization],
      )
    ).rows;
    const results = await Promise.all([
      trialRequest(),
      trialRequest('http://localhost:3000', other.id),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body.trial.endsAt).toBe(results[1].body.trial.endsAt);
    expect(await planFor(organization)).toBe('pro');
    expect(await planFor(other.organization_id)).toBe('pro');
    const trial = (
      await pg.query<{ hours: number; count: number }>(
        'select extract(epoch from (ends_at-started_at))/3600 as hours, count(*) over()::int as count from account_pro_trials where account_id=$1',
        [shared.user],
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
      "update account_pro_trials set started_at=started_at-interval '15 days', ends_at=ends_at-interval '15 days' where account_id=$1",
      [shared.user],
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
      "insert into account_billing(account_id,plan,status) values($1,'business','active')",
      [shared.user],
    );
    try {
      expect(await planFor(organization)).toBe('business');
      expect((await entitlementsFor(organization)).trial.status).toBe('unavailable');
      expect((await trialRequest()).status).toBe(400);
    } finally {
      await pg.query('delete from account_billing where account_id=$1', [shared.user]);
    }
  });
  it('durable worker skips older revisions and sends only authorized Google fields', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    await pg.query(
      "insert into account_billing(account_id,plan,status) values($1,'pro','active')",
      [shared.user],
    );
    await pg.query(
      "insert into connections(location_id,encrypted_tokens,remote_id,status) values($1,'test-only','locations/123','connected')",
      [id],
    );
    expect((await post({ op: 'publish', id, version, key: randomUUID() })).status).toBe(200);
    expect((await pg.query("select id from jobs where destination='google'")).rows).toEqual([]);
    await post({ op: 'publish', id, version, key: randomUUID(), google: true });
    const saved = await post({
      op: 'save',
      id,
      version,
      draft: defaultSchedule('Newest revision'),
    });
    version = saved.body.location.draftVersion;
    await post({ op: 'publish', id, version, key: randomUUID(), google: true });
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
    await post({ op: 'publish', id, version, key: randomUUID(), google: true });
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
  it('deduplicates Christmas reminders, honors opt-outs at delivery time and sends opted-in email', async () => {
    const preferences = {
      hoursDiscrepancy: false,
      upcomingHoliday: true,
      publishingIssue: false,
      weeklySummary: false,
    };
    expect((await post({ op: 'preferences', preferences })).body.preferences).toEqual(preferences);
    const detail = await manageGet(new Request(`http://localhost:3000/api/manage?id=${id}`));
    expect((await detail.json()).notificationPreferences).toEqual(preferences);
    const date = new Date('2026-12-18T18:00:00Z');
    expect((await runNotificationChecks(date)).holidays).toBeGreaterThan(0);
    expect((await runNotificationChecks(date)).holidays).toBe(0);
    const mockEmail = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', mockEmail);
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('NOTIFICATION_EMAIL_FROM', 'updates@example.com');
    try {
      await post({ op: 'preferences', preferences: { ...preferences, upcomingHoliday: false } });
      expect(await sendOneNotificationEmail()).toBe(false);
      expect(mockEmail).not.toHaveBeenCalled();
      await post({ op: 'preferences', preferences });
      expect(await sendOneNotificationEmail()).toBe(true);
      expect(mockEmail).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ body: expect.stringContaining('Christmas Day') }),
      );
      expect(
        (await pg.query('select status from notification_deliveries where location_id=$1', [id]))
          .rows,
      ).toEqual([{ status: 'sent' }]);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
  it('cleans up expired privacy data while retaining active state and publication history', async () => {
    const expiredPublication = randomUUID();
    const activePublication = randomUUID();
    await pg.exec(`
      insert into rate_limits(key, bucket) values
        ('auth:test@example.com', now()),
        ('auth-v2:expired', now() - interval '2 days'),
        ('auth-v2:active', now());
    `);
    await pg.query(
      `insert into social_oauth(state_hash, location_id, user_id, expires_at) values
        ('expired', $1, $2, now() - interval '1 minute'),
        ('active', $1, $2, now() + interval '1 minute')`,
      [id, shared.user],
    );
    await pg.query(
      `insert into social_publications
        (id, location_id, account_name, platform, format, caption, payload_hash, image, media_key,
         media_expires_at, status) values
        ($1, $3, 'Test Page', 'Facebook', 'post', 'Caption', 'hash', 'jpeg', 'expired-image',
         now() - interval '1 minute', 'published'),
        ($2, $3, 'Test Page', 'Facebook', 'post', 'Caption', 'hash', 'jpeg', 'active-image',
         now() + interval '1 hour', 'ready')`,
      [expiredPublication, activePublication, id],
    );
    vi.stubEnv('CRON_SECRET', 'cleanup-test');
    vi.stubEnv('RESEND_API_KEY', '');
    try {
      const url = 'http://localhost:3000/api/cron?notifications=1';
      expect((await cron(new Request(url))).status).toBe(401);
      const authorized = new Request(url, { headers: { authorization: 'Bearer cleanup-test' } });
      expect((await cron(authorized)).status).toBe(200);
      expect((await pg.query("select key from rate_limits where key like 'auth%'")).rows).toEqual([
        { key: 'auth-v2:active' },
      ]);
      expect((await pg.query('select state_hash from social_oauth')).rows).toEqual([
        { state_hash: 'active' },
      ]);
      expect(
        (await pg.query('select image, status from social_publications order by media_key')).rows,
      ).toEqual([
        { image: 'jpeg', status: 'ready' },
        { image: null, status: 'published' },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('account deletion trigger removes owned public data atomically', async () => {
    await pg.query('delete from auth.users where id=$1', [shared.user]);
    expect((await pg.query('select * from locations')).rows).toHaveLength(0);
    expect((await pg.query('select * from revisions')).rows).toHaveLength(0);
    expect(
      (await pg.query('select account_id from account_billing where account_id=$1', [shared.user]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query('select account_id from account_pro_trials where account_id=$1', [
          shared.user,
        ])
      ).rows,
    ).toHaveLength(0);
  });
});
