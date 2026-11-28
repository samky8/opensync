import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountBilling } from '@/db/schema';
import { stripe, pricePlan } from '@/lib/stripe';
import { apiError, appUrl, billingConfigured, checkOrigin } from '@/lib/server';
import { requireUser } from '@/lib/supabase';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!billingConfigured()) throw new Error('Stripe billing setup required');
    const user = await requireUser();
    const body = z
      .object({ portal: z.boolean().optional(), plan: z.string().optional() })
      .parse(await req.json());
    const accountId = user.id;
    const client = stripe();
    const billingUrl = `${appUrl()}/dashboard?tab=billing`;
    if (body.portal) {
      const [existing] = await db()
        .select({ customerId: accountBilling.customerId })
        .from(accountBilling)
        .where(eq(accountBilling.accountId, accountId));
      if (!existing?.customerId) throw new Error('No billing profile for this account yet');
      const session = await client.billingPortal.sessions.create({
        customer: existing.customerId,
        return_url: billingUrl,
      });
      return Response.json({ url: session.url });
    }
    const plan = z.enum(['pro', 'business']).parse(body.plan);
    const sub = await db().transaction(async (tx) => {
      await tx.insert(accountBilling).values({ accountId }).onConflictDoNothing();
      await tx.execute(
        sql`select account_id from account_billing where account_id=${accountId} for update`,
      );
      const [existing] = await tx
        .select()
        .from(accountBilling)
        .where(eq(accountBilling.accountId, accountId));
      if (existing.complimentaryBusiness && !existing.subscriptionId)
        throw new Error('Business is already included with your account');
      if (existing?.customerId) return existing;
      const customer = await client.customers.create(
        { email: user.email, metadata: { accountId } },
        { idempotencyKey: `account-${accountId}` },
      );
      const [created] = await tx
        .update(accountBilling)
        .set({ customerId: customer.id })
        .where(eq(accountBilling.accountId, accountId))
        .returning();
      return created;
    });
    if (sub.subscriptionId) {
      const session = await client.billingPortal.sessions.create({
        customer: sub.customerId!,
        return_url: billingUrl,
      });
      return Response.json({ url: session.url });
    }
    const priceId =
      plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID! : process.env.STRIPE_BUSINESS_PRICE_ID!;
    if (pricePlan(await client.prices.retrieve(priceId)) !== plan)
      throw new Error('Stripe price setup required: use CAD monthly prices of $9 or $19');
    const session = await db().transaction(async (tx) => {
      await tx.execute(
        sql`select account_id from account_billing where account_id=${accountId} for update`,
      );
      const [current] = await tx
        .select()
        .from(accountBilling)
        .where(eq(accountBilling.accountId, accountId));
      if (current.complimentaryBusiness)
        throw new Error('Business is already included with your account');
      const existing = await client.subscriptions.list({
        customer: sub.customerId!,
        status: 'all',
        limit: 100,
      });
      if (existing.data.some((s) => !['canceled', 'incomplete_expired'].includes(s.status)))
        return client.billingPortal.sessions.create({
          customer: sub.customerId!,
          return_url: billingUrl,
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
          success_url: billingUrl,
          cancel_url: billingUrl,
          subscription_data: { metadata: { accountId } },
          allow_promotion_codes: true,
          metadata: { plan },
        },
        {
          idempotencyKey: `account-checkout-${accountId}-${plan}-${current.checkoutSessionId || 'first'}`,
        },
      );
      await tx
        .update(accountBilling)
        .set({ checkoutSessionId: checkout.id })
        .where(eq(accountBilling.accountId, accountId));
      return checkout;
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return apiError(e);
  }
}
