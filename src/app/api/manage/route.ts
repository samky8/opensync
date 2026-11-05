import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as t from '@/db/schema';
import { requireUser } from '@/lib/supabase';
import { apiError, checkOrigin, detail, locationAccess, planFor, rateLimit } from '@/lib/server';
import { defaultSchedule, scheduleSchema, validateEntitlements } from '@/lib/domain';
import { googleDisconnect } from '@/lib/google';
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
      const source = body.sourceLocationId
        ? await locationAccess(z.uuid().parse(body.sourceLocationId), true)
        : null;
      const location = await db().transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
        const [member] = await tx
          .select()
          .from(t.memberships)
          .where(
            and(
              eq(t.memberships.userId, user.id),
              source ? eq(t.memberships.organizationId, source.location.organizationId) : undefined,
            ),
          );
        if (source && !member) throw new Error('Location not found or access denied');
        let org = member?.organizationId;
        if (org) {
          await tx.execute(sql`select id from organizations where id=${org} for update`);
          if (!['owner', 'admin'].includes(member.role))
            throw new Error('Only an owner or admin can add locations');
          if ((await planFor(org, tx)) === 'free') throw new Error('Multiple profiles require Pro');
          const count = await tx
            .select()
            .from(t.locations)
            .where(eq(t.locations.organizationId, org));
          if (count.length >= Number(process.env.BUSINESS_LOCATION_LIMIT || 10))
            throw new Error('Profile limit reached');
        } else {
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
      await db()
        .insert(t.preferences)
        .values({ userId: user.id, emailNotifications: body.enabled ? 1 : 0 })
        .onConflictDoUpdate({
          target: t.preferences.userId,
          set: { emailNotifications: body.enabled ? 1 : 0 },
        });
      return Response.json({ ok: true });
    }
    if (op === 'delete') {
      if (body.confirmation !== 'DELETE') throw new Error('Type DELETE for confirmation');
      const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secretKey) throw new Error('Account deletion setup required');
      const owned = await db()
        .select()
        .from(t.memberships)
        .where(and(eq(t.memberships.userId, user.id), eq(t.memberships.role, 'owner')));
      for (const m of owned) {
        const [sub] = await db()
          .select()
          .from(t.subscriptions)
          .where(eq(t.subscriptions.organizationId, m.organizationId));
        if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) {
          if (body.cancelSubscriptions !== true)
            throw new Error(
              'Please cancel your subscription in the billing portal before deleting your account',
            );
          if (!sub.subscriptionId) throw new Error('Subscription cancellation setup required');
          const { stripe } = await import('@/lib/stripe');
          const provider = stripe();
          const current = await provider.subscriptions.retrieve(sub.subscriptionId);
          if (current.status !== 'canceled')
            await provider.subscriptions.cancel(sub.subscriptionId);
          await db()
            .update(t.subscriptions)
            .set({ status: 'canceled', plan: 'free' })
            .where(eq(t.subscriptions.organizationId, m.organizationId));
        }
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
      await googleDisconnect(id);
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
        validateEntitlements(draft, fresh.draft, plan);
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
      const version = fresh.publishedVersion + 1;
      const [revision] = await tx
        .insert(t.revisions)
        .values({
          locationId: id,
          version,
          snapshot: fresh.draft,
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
      if (connection?.remoteId && connection.status === 'connected' && plan !== 'free')
        await tx.insert(t.jobs).values({
          locationId: id,
          revisionId: revision.id,
          destination: 'google',
          status: 'queued',
        });
      await tx.insert(t.activity).values({
        locationId: id,
        actorId: user.id,
        message: `Published revision ${version} to website widgets${connection?.remoteId && plan !== 'free' ? '; Google queued. Announcements are website-only.' : ''}`,
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
