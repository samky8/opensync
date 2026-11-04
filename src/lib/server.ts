import 'server-only';
import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as t from '@/db/schema';
import { requireUser } from './supabase';
import type { Plan } from './domain';
import { bearerToken } from './mobile-auth';
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
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_PAID_FEATURES === 'true')
    return 'business';
  const [s] = await executor
    .select()
    .from(t.subscriptions)
    .where(eq(t.subscriptions.organizationId, org));
  return s && ['active', 'trialing'].includes(s.status) && ['pro', 'business'].includes(s.plan)
    ? (s.plan as Plan)
    : 'free';
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
  return { email: user.email, locations: rows.map((x) => x.location) };
}
export async function detail(id: string) {
  const { location, role } = await locationAccess(id);
  const [history, destinations, connection, notes, plan] = await Promise.all([
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
    planFor(location.organizationId),
  ]);
  return {
    location,
    role,
    history,
    jobs: destinations,
    connection: connection[0] || null,
    notifications: notes,
    plan,
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
