import 'server-only';
import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as t from '@/db/schema';
import { requireUser } from './supabase';
import { scheduleSchema, type Plan } from './domain';
import { freeAccountBilling, type AccountBilling } from './trial';
import { bearerToken } from './mobile-auth';
import { preferencesFromMask } from './notification-preferences';
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const googleConfigured = () =>
  !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.TOKEN_ENCRYPTION_KEY &&
    process.env.GOOGLE_BUSINESS_PROFILE_APPROVED === 'true'
  );
export const billingConfigured = () =>
  !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRO_PRICE_ID &&
    process.env.STRIPE_BUSINESS_PRICE_ID
  );
export async function locationAccess(id: string, write = false) {
  const user = await requireUser();
  const [row] = await db()
    .select({ location: t.locations, role: t.memberships.role })
    .from(t.locations)
    .innerJoin(
      t.memberships,
      and(
        eq(t.memberships.organizationId, t.locations.organizationId),
        eq(t.memberships.userId, user.id),
      ),
    )
    .where(eq(t.locations.id, id));
  if (!row || (write && !['owner', 'admin', 'editor'].includes(row.role)))
    throw new Error('Location not found or access denied');
  return { ...row, user };
}
export async function planFor(
  org: string,
  executor: Pick<ReturnType<typeof db>, 'select'> = db(),
): Promise<Plan> {
  return (await entitlementsFor(org, executor)).plan;
}
export async function entitlementsFor(
  org: string,
  executor: Pick<ReturnType<typeof db>, 'select'> = db(),
): Promise<AccountBilling> {
  const owner = await billingOwnerForWorkspace(org, executor);
  return owner ? accountEntitlementsFor(owner, executor) : freeAccountBilling;
}

export async function billingOwnerForWorkspace(
  org: string,
  executor: Pick<ReturnType<typeof db>, 'select'> = db(),
) {
  const [owner] = await executor
    .select({ id: t.memberships.userId })
    .from(t.memberships)
    .where(and(eq(t.memberships.organizationId, org), eq(t.memberships.role, 'owner')));
  return owner?.id;
}

export async function accountOwnsWorkspace(accountId: string) {
  const [workspace] = await db()
    .select({ id: t.memberships.organizationId })
    .from(t.memberships)
    .where(and(eq(t.memberships.userId, accountId), eq(t.memberships.role, 'owner')))
    .limit(1);
  return !!workspace;
}

export async function accountEntitlementsFor(
  accountId: string,
  executor: Pick<ReturnType<typeof db>, 'select'> = db(),
): Promise<AccountBilling> {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_PAID_FEATURES === 'true')
    return {
      ...freeAccountBilling,
      plan: 'business',
      trial: { status: 'unavailable', endsAt: null },
    };
  const [s] = await executor
    .select()
    .from(t.accountBilling)
    .where(eq(t.accountBilling.accountId, accountId));
  const billing = {
    hasBillingCustomer: !!s?.customerId,
    complimentaryBusiness: !!s?.complimentaryBusiness,
    paymentNeedsAttention: s?.status === 'past_due',
  };
  const paidPlan =
    s && ['active', 'trialing'].includes(s.status) && (s.plan === 'pro' || s.plan === 'business')
      ? s.plan
      : null;
  const premium = billing.complimentaryBusiness ? 'business' : paidPlan;
  if (premium) return { ...billing, plan: premium, trial: { status: 'unavailable', endsAt: null } };
  const [trial] = await executor
    .select({
      endsAt: t.accountProTrials.endsAt,
      active: sql<boolean>`${t.accountProTrials.endsAt} > now()`,
    })
    .from(t.accountProTrials)
    .where(eq(t.accountProTrials.accountId, accountId));
  if (trial)
    return {
      ...billing,
      plan: trial.active ? 'pro' : 'free',
      trial: { status: trial.active ? 'active' : 'expired', endsAt: trial.endsAt.toISOString() },
    };
  return {
    ...billing,
    plan: 'free',
    trial: { status: s?.subscriptionId ? 'unavailable' : 'available', endsAt: null },
  };
}
export async function dashboardData() {
  const user = await requireUser();
  const rows = await db()
    .select({ location: t.locations, role: t.memberships.role })
    .from(t.locations)
    .innerJoin(
      t.memberships,
      and(
        eq(t.memberships.organizationId, t.locations.organizationId),
        eq(t.memberships.userId, user.id),
      ),
    )
    .orderBy(t.locations.createdAt);
  return {
    email: user.email,
    accountBilling: await accountEntitlementsFor(user.id),
    ownsWorkspace: rows.some(({ role }) => role === 'owner'),
    locations: rows.map((x) => ({
      ...x.location,
      draft: scheduleSchema.parse(x.location.draft),
    })),
  };
}
export async function detail(id: string) {
  const { location, role, user } = await locationAccess(id);
  const account = accountEntitlementsFor(user.id);
  const [history, destinations, connection, notes, plan, publication, accountBilling, preferences] =
    await Promise.all([
      db()
        .select()
        .from(t.activity)
        .where(eq(t.activity.locationId, id))
        .orderBy(desc(t.activity.createdAt))
        .limit(30),
      db()
        .select()
        .from(t.jobs)
        .where(eq(t.jobs.locationId, id))
        .orderBy(desc(t.jobs.createdAt))
        .limit(30),
      db()
        .select({ status: t.connections.status, remoteId: t.connections.remoteId })
        .from(t.connections)
        .where(eq(t.connections.locationId, id)),
      db()
        .select()
        .from(t.notifications)
        .where(eq(t.notifications.organizationId, location.organizationId))
        .orderBy(desc(t.notifications.createdAt))
        .limit(20),
      role === 'owner' ? account : entitlementsFor(location.organizationId),
      db()
        .select({ snapshot: t.revisions.snapshot })
        .from(t.revisions)
        .where(
          and(eq(t.revisions.locationId, id), eq(t.revisions.version, location.publishedVersion)),
        )
        .limit(1),
      account,
      db().select().from(t.preferences).where(eq(t.preferences.userId, user.id)).limit(1),
    ]);
  return {
    location: { ...location, draft: scheduleSchema.parse(location.draft) },
    published: publication[0] ? scheduleSchema.parse(publication[0].snapshot) : null,
    role,
    history,
    jobs: destinations,
    connection: connection[0] || null,
    notifications: notes,
    notificationPreferences: preferencesFromMask(preferences[0]?.emailNotifications),
    plan: plan.plan,
    trial: plan.trial,
    accountBilling,
    googleConfigured: googleConfigured(),
    billingConfigured: billingConfigured(),
  };
}
export async function rateLimit(key: string, limit = 120) {
  const result = await db().execute(sql`select public.take_rate_limit(${key},${limit}) as allowed`);
  if (!result[0]?.allowed) throw new Error('Too many requests. Please try again in a minute.');
}
export function checkOrigin(req: Request, allowBearer = false) {
  // Callers opting in MUST call requireUser before reading or mutating user data.
  if (allowBearer && bearerToken(req.headers.get('authorization'))) return;
  const origin = req.headers.get('origin');
  if (origin !== new URL(appUrl()).origin) throw new Error('Invalid request origin');
}
export function apiError(e: unknown) {
  const message = e instanceof Error ? e.message : 'Request failed';
  const safe =
    /setup required|sign in|access denied|not found|requires|overlap|changed|Publish|Invalid|Too many|confirmation|cancel|owner|configured|Google|Meta|Stripe|date|limit|Select|Pro|Business|expiry|scheduled|subscription|Refresh|version|connection/i.test(
      message,
    );
  if (!safe)
    console.error(
      JSON.stringify({ event: 'request_failed', type: e instanceof Error ? e.name : 'unknown' }),
    );
  return Response.json(
    { error: safe ? message : 'Unable to complete this request. Please try again.' },
    {
      status: /sign in/.test(message)
        ? 401
        : /access denied|origin/.test(message)
          ? 403
          : /Too many/.test(message)
            ? 429
            : 400,
    },
  );
}
