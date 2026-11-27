import { stripe, pricePlan } from '@/lib/stripe';
import { db } from '@/db';
import { accountBilling } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Billing setup required', { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      req.headers.get('stripe-signature') || '',
      secret,
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }
  if (event.type.startsWith('customer.subscription.')) {
    const incoming = event.data.object as Stripe.Subscription;
    const customer =
      typeof incoming.customer === 'string' ? incoming.customer : incoming.customer.id;
    await db().transaction(async (tx) => {
      await tx.execute(
        sql`select account_id from account_billing where customer_id=${customer} for update`,
      );
      const [row] = await tx
        .select()
        .from(accountBilling)
        .where(eq(accountBilling.customerId, customer));
      if (!row) return;
      const prior = await tx.execute(
        sql`select event_id from webhook_events where event_id=${event.id}`,
      );
      if (prior.length) return;
      // Fetch current provider state after taking the lock: out-of-order webhook deliveries cannot roll back entitlements.
      const list = await stripe().subscriptions.list({ customer, status: 'all', limit: 100 });
      const active =
        list.data.find((s) => ['active', 'trialing'].includes(s.status)) ||
        list.data.find((s) => s.id === incoming.id) ||
        incoming;
      const price = active.items.data[0]?.price;
      const plan = price ? pricePlan(price) : 'free';
      await tx
        .update(accountBilling)
        .set({
          subscriptionId: ['canceled', 'incomplete_expired'].includes(active.status)
            ? null
            : active.id,
          plan,
          status: active.status,
          updatedAt: new Date(),
        })
        .where(eq(accountBilling.accountId, row.accountId));
      await tx.execute(
        sql`insert into webhook_events(event_id,account_id) values(${event.id},${row.accountId}) on conflict do nothing`,
      );
    });
  }
  return Response.json({ received: true });
}
