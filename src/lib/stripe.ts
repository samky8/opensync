import 'server-only';
import Stripe from 'stripe';
import type { Plan } from './domain';
export function pricePlan(
  price: Pick<Stripe.Price, 'id' | 'currency' | 'recurring' | 'unit_amount'>,
): Plan {
  if (
    price.currency !== 'cad' ||
    price.recurring?.interval !== 'month' ||
    price.recurring.interval_count !== 1
  )
    return 'free';
  if (price.id === process.env.STRIPE_PRO_PRICE_ID && price.unit_amount === 900) return 'pro';
  if (price.id === process.env.STRIPE_BUSINESS_PRICE_ID && price.unit_amount === 1900)
    return 'business';
  return 'free';
}
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe setup required');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
