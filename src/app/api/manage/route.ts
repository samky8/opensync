import { z } from 'zod';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as t from '@/db/schema';
import { requireUser } from '@/lib/supabase';
import {
  accountEntitlementsFor,
  apiError,
  billingOwnerForWorkspace,
  checkOrigin,
  detail,
  locationAccess,
  planFor,
  rateLimit,
} from '@/lib/server';
import { defaultSchedule, scheduleSchema, validateEntitlements } from '@/lib/domain';
import { googleDisconnect } from '@/lib/google';
import { publishScopes, scopedSchedule } from '@/lib/publish-scope';
import { notificationPreferencesSchema, preferencesToMask } from '@/lib/notification-preferences';
import { queueNotification } from '@/lib/notification-system';
export async function GET(req: Request) {
  try {
    const id = z.uuid().parse(new URL(req.url).searchParams.get('id'));
    return Response.json(await detail(id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req, true);
    const user = await requireUser();
    await rateLimit(`manage:${user.id}`, 90);
    const body = await req.json();
    const op = z
      .enum([
        'create',
        'save',
        'publish',
        'interest',
        'support',
        'read',
        'disconnect',
        'delete',
        'preferences',
        'team',
      ])
      .parse(body.op);
    if (op === 'create') {
      const name = z.string().trim().min(1).max(100).parse(body.name);
      const timezone = z.string().parse(body.timezone);
      const draft = scheduleSchema.parse(defaultSchedule(name, timezone));
      // Older dashboard versions supplied a source location to signal a new workspace.
      if (body.sourceLocationId != null) z.uuid().parse(body.sourceLocationId);
      const newWorkspace = body.newWorkspace === true || body.sourceLocationId != null;
      const target =
        body.targetLocationId != null
          ? await locationAccess(z.uuid().parse(body.targetLocationId), true)
          : null;
      if (target && newWorkspace) throw new Error('Select one destination for the new profile');
      if (target && !['owner', 'admin'].includes(target.role))
        throw new Error('Only an owner or admin can add locations');
      const accountId = target
        ? await billingOwnerForWorkspace(target.location.organizationId)
        : user.id;
      if (!accountId) throw new Error('Workspace billing owner not found');
      const location = await db().transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${accountId}))`);
        const [owned] = await tx
          .select({ id: t.memberships.organizationId })
          .from(t.memberships)
          .innerJoin(t.organizations, eq(t.memberships.organizationId, t.organizations.id))
          .where(and(eq(t.memberships.userId, accountId), eq(t.memberships.role, 'owner')))
          .orderBy(asc(t.organizations.createdAt), asc(t.organizations.id))
          .limit(1);
        if (owned || target) {
          if ((await accountEntitlementsFor(accountId, tx)).plan !== 'business')
            throw new Error(
              newWorkspace
                ? 'Creating another workspace requires Business on your account'
                : 'Adding multiple profiles requires Business',
            );
          const [count] = await tx
            .select({ total: sql<number>`count(*)::int` })
            .from(t.locations)
            .innerJoin(t.memberships, eq(t.memberships.organizationId, t.locations.organizationId))
            .where(and(eq(t.memberships.userId, accountId), eq(t.memberships.role, 'owner')));
          if (count.total >= Number(process.env.BUSINESS_LOCATION_LIMIT || 10))
            throw new Error('Account profile limit reached');
        }
        let org = target?.location.organizationId ?? (newWorkspace ? undefined : owned?.id);
        if (!org) {
          const [o] = await tx.insert(t.organizations).values({ name }).returning();
          org = o.id;
          await tx
            .insert(t.memberships)
            .values({ organizationId: org, userId: user.id, role: 'owner' });
        }
        const [loc] = await tx
          .insert(t.locations)
          .values({ organizationId: org, draft })
          .returning();
        return loc;
      });
      return Response.json({ location });
    }
    if (op === 'interest') {
      await db()
        .insert(t.interests)
        .values({ userId: user.id, feature: z.enum(['instagram', 'facebook']).parse(body.feature) })
        .onConflictDoNothing();
      return Response.json({ ok: true });
    }
    if (op === 'support') {
      await db()
        .insert(t.support)
        .values({
          userId: user.id,
          message: z.string().trim().min(10).max(3000).parse(body.message),
        });
      return Response.json({ ok: true });
    }
    if (op === 'preferences') {
      const preferences = notificationPreferencesSchema.parse(body.preferences);
      await db()
        .insert(t.preferences)
        .values({ userId: user.id, emailNotifications: preferencesToMask(preferences) })
        .onConflictDoUpdate({
          target: t.preferences.userId,
          set: { emailNotifications: preferencesToMask(preferences) },
        });
      return Response.json({ ok: true, preferences });
    }
    if (op === 'delete') {
      if (body.confirmation !== 'DELETE') throw new Error('Type DELETE for confirmation');
      const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secretKey) throw new Error('Account deletion setup required');
      const owned = await db()
        .select()
        .from(t.memberships)
        .where(and(eq(t.memberships.userId, user.id), eq(t.memberships.role, 'owner')));
      const [sub] = await db()
        .select()
        .from(t.accountBilling)
        .where(eq(t.accountBilling.accountId, user.id));
      if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) {
        if (body.cancelSubscriptions !== true)
          throw new Error(
            'Please cancel your subscription in the billing portal before deleting your account',
          );
        if (!sub.subscriptionId) throw new Error('Subscription cancellation setup required');
        const { stripe } = await import('@/lib/stripe');
        const provider = stripe();
        const current = await provider.subscriptions.retrieve(sub.subscriptionId);
        if (current.status !== 'canceled') await provider.subscriptions.cancel(sub.subscriptionId);
        await db()
          .update(t.accountBilling)
          .set({ status: 'canceled', plan: 'free' })
          .where(eq(t.accountBilling.accountId, user.id));
      }
      for (const m of owned) {
        const locs = await db()
          .select()
          .from(t.locations)
          .where(eq(t.locations.organizationId, m.organizationId));
        for (const l of locs) await googleDisconnect(l.id);
      }
      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
        auth: { persistSession: false },
      });
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw new Error('Account deletion failed. Please contact support');
      // The auth.users deletion trigger atomically removes owned organizations and personal records.
      return Response.json({ ok: true });
    }
    const id = z.uuid().parse(body.id);
    const { location, role } = await locationAccess(id, op !== 'read');
    const plan = await planFor(location.organizationId);
    if (op === 'disconnect') {
      const connection = await googleDisconnect(id);
      if (connection?.remoteId)
        await queueNotification(db(), {
          organizationId: location.organizationId,
          locationId: id,
          kind: 'publishing_issue',
          dedupeKey: `google-disconnect:${id}:${connection.updatedAt.toISOString()}`,
          message: 'Google Business Profile was disconnected.',
          subject: 'Google Business Profile disconnected',
          body: 'Google Business Profile was disconnected in OpenSync. You can reconnect it from Connections.',
        });
      return Response.json({ ok: true });
    }
    if (op === 'read') {
      await db()
        .update(t.notifications)
        .set({ readAt: new Date() })
        .where(eq(t.notifications.organizationId, location.organizationId));
      return Response.json({ ok: true });
    }
    if (op === 'team') {
      if (role !== 'owner' || plan !== 'business')
        throw new Error('Team management requires a Business owner');
      const email = z.email().parse(body.email),
        newRole = z.enum(['editor', 'viewer', 'admin']).parse(body.role);
      const result = await db().execute(
        sql`select id from auth.users where lower(email)=lower(${email}) and email_confirmed_at is not null limit 1`,
      );
      if (!result[0])
        throw new Error('Ask this staff member to sign up and verify their email first');
      if (result[0].id === user.id) throw new Error('The owner role cannot be changed here');
      await db()
        .insert(t.memberships)
        .values({
          organizationId: location.organizationId,
          userId: String(result[0].id),
          role: newRole,
        })
        .onConflictDoUpdate({
          target: [t.memberships.organizationId, t.memberships.userId],
          set: { role: newRole },
        });
      return Response.json({ ok: true });
    }
    const result = await db().transaction(async (tx) => {
      await tx.execute(sql`select id from locations where id=${id} for update`);
      const [fresh] = await tx.select().from(t.locations).where(eq(t.locations.id, id));
      if (op === 'save') {
        const draft = scheduleSchema.parse(body.draft);
        validateEntitlements(draft, scheduleSchema.parse(fresh.draft), plan);
        if (z.number().int().parse(body.version) !== fresh.draftVersion)
          throw new Error('This location changed in another tab. Refresh before saving');
        const [saved] = await tx
          .update(t.locations)
          .set({
            draft,
            draftVersion: fresh.draftVersion + 1,
            onboardingStep: z
              .number()
              .int()
              .min(1)
              .max(6)
              .parse(body.step || fresh.onboardingStep),
          })
          .where(eq(t.locations.id, id))
          .returning();
        await tx
          .insert(t.activity)
          .values({ locationId: id, actorId: user.id, message: 'Saved changes to draft' });
        return { location: saved };
      }
      const key = z.uuid().parse(body.key);
      const [existing] = await tx
        .select()
        .from(t.revisions)
        .where(and(eq(t.revisions.locationId, id), eq(t.revisions.idempotencyKey, key)));
      if (existing) return { revision: existing };
      if (body.version !== fresh.draftVersion)
        throw new Error('Draft version changed. Refresh and review before publishing');
      const scope = z.enum(publishScopes).parse(body.scope ?? 'all');
      if (body.publishedVersion !== undefined && body.publishedVersion !== fresh.publishedVersion)
        throw new Error('Published version changed. Refresh and review before publishing');
      const [previous] = await tx
        .select({ snapshot: t.revisions.snapshot })
        .from(t.revisions)
        .where(
          and(eq(t.revisions.locationId, id), eq(t.revisions.version, fresh.publishedVersion)),
        );
      const currentDraft = scheduleSchema.parse(fresh.draft);
      const previousSnapshot = previous ? scheduleSchema.parse(previous.snapshot) : null;
      const snapshot = scheduleSchema.parse(scopedSchedule(currentDraft, previousSnapshot, scope));
      validateEntitlements(snapshot, previousSnapshot ?? currentDraft, plan);
      const version = fresh.publishedVersion + 1;
      const [revision] = await tx
        .insert(t.revisions)
        .values({
          locationId: id,
          version,
          snapshot,
          actorId: user.id,
          idempotencyKey: key,
        })
        .returning();
      await tx
        .update(t.locations)
        .set({ publishedVersion: version, onboardingStep: 6 })
        .where(eq(t.locations.id, id));
      await tx.insert(t.jobs).values({
        locationId: id,
        revisionId: revision.id,
        destination: 'website',
        status: 'published',
      });
      const [connection] = await tx
        .select()
        .from(t.connections)
        .where(eq(t.connections.locationId, id));
      const queueGoogle =
        body.google !== false &&
        ['hours', 'special', 'all'].includes(scope) &&
        connection?.remoteId &&
        connection.status === 'connected' &&
        plan !== 'free';
      if (queueGoogle)
        await tx.insert(t.jobs).values({
          locationId: id,
          revisionId: revision.id,
          destination: 'google',
          status: 'queued',
        });
      await tx.insert(t.activity).values({
        locationId: id,
        actorId: user.id,
        message: `Published ${scope} revision ${version} to website widgets${queueGoogle ? '; Google queued.' : ''}`,
      });
      return { revision };
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues.map((i) => i.message).join('. ') }, { status: 400 });
    return apiError(e);
  }
}
