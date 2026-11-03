import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { stripe, pricePlan } from '@/lib/stripe';
import { apiError, appUrl, billingConfigured, checkOrigin, locationAccess } from '@/lib/server';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!billingConfigured()) throw new Error('Stripe billing setup required');
    const body = await req.json();
    const { location, role, user } = await locationAccess(z.uuid().parse(body.id));
    if (role !== 'owner') throw new Error('Only the owner can manage billing');
    const org = location.organizationId;
    const client = stripe();
    const sub = await db().transaction(async (tx) => {
      await tx.execute(sql`select id from organizations where id=${org} for update`);
      const [existing] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, org));
      if (existing?.customerId) return existing;
      const customer = await client.customers.create(
        { email: user.email, metadata: { organizationId: org } },
        { idempotencyKey: `organization-${org}` },
      );
      const [created] = await tx
        .insert(subscriptions)
        .values({ organizationId: org, customerId: customer.id })
        .onConflictDoUpdate({
          target: subscriptions.organizationId,
          set: { customerId: customer.id },
        })
        .returning();
      return created;
    });
    if (body.portal || sub.subscriptionId) {
      const session = await client.billingPortal.sessions.create({
        customer: sub.customerId!,
        return_url: `${appUrl()}/dashboard?tab=billing`,
      });
      return Response.json({ url: session.url });
    }
    const plan = z.enum(['pro', 'business']).parse(body.plan);
    const priceId =
      plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID! : process.env.STRIPE_BUSINESS_PRICE_ID!;
    if (pricePlan(await client.prices.retrieve(priceId)) !== plan)
      throw new Error('Stripe price setup required: use CAD monthly prices of $9 or $19');
    const session = await db().transaction(async (tx) => {
      await tx.execute(
        sql`select organization_id from subscriptions where organization_id=${org} for update`,
      );
      const [current] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, org));
      const existing = await client.subscriptions.list({
        customer: sub.customerId!,
        status: 'all',
        limit: 100,
      });
      if (existing.data.some((s) => !['canceled', 'incomplete_expired'].includes(s.status)))
        return client.billingPortal.sessions.create({
          customer: sub.customerId!,
          return_url: `${appUrl()}/dashboard?tab=billing`,
        });
      if (current.checkoutSessionId) {
        const pending = await client.checkout.sessions.retrieve(current.checkoutSessionId);
        if (pending.status === 'open' && pending.metadata?.plan === plan) return pending;
        if (pending.status === 'open') await client.checkout.sessions.expire(pending.id);
      }
      const checkout = await client.checkout.sessions.create(
        {
          mode: 'subscription',
          customer: sub.customerId!,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${appUrl()}/dashboard?tab=billing`,
          cancel_url: `${appUrl()}/dashboard?tab=billing`,
          subscription_data: { metadata: { organizationId: org } },
          allow_promotion_codes: true,
          metadata: { plan },
        },
        { idempotencyKey: `checkout-${org}-${plan}-${current.checkoutSessionId || 'first'}` },
      );
      await tx
        .update(subscriptions)
        .set({ checkoutSessionId: checkout.id })
        .where(eq(subscriptions.organizationId, org));
      return checkout;
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return apiError(e);
  }
}
