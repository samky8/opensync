import { describe, it, expect, beforeAll, vi } from 'vitest';
import Stripe from 'stripe';
vi.mock('../src/db', () => ({
  db: () => {
    throw new Error('Database must not be called for invalid or unrelated events');
  },
}));
import { POST } from '../src/app/api/billing/webhook/route';
import { pricePlan } from '../src/lib/stripe';
const secret = 'whsec_test_fixture_only';
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only';
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
  process.env.STRIPE_BUSINESS_PRICE_ID = 'price_business';
});
describe('Stripe contract', () => {
  it('rejects an unsigned payload', async () => {
    const res = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        body: '{"type":"customer.subscription.updated"}',
      }),
    );
    expect(res.status).toBe(400);
  });
  it('verifies a real SDK signature against the exact raw body', async () => {
    const client = new Stripe('sk_test_fixture_only'),
      payload = JSON.stringify({
        id: 'evt_test',
        object: 'event',
        type: 'invoice.created',
        data: { object: { id: 'in_test' } },
      });
    const signature = client.webhooks.generateTestHeaderString({ payload, secret });
    const res = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body: payload,
      }),
    );
    expect(res.status).toBe(200);
    const tampered = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body: payload + ' ',
      }),
    );
    expect(tampered.status).toBe(400);
  });
  it('grants only the configured CAD monthly price', () => {
    const price = {
      id: 'price_pro',
      currency: 'cad',
      unit_amount: 900,
      recurring: {
        interval: 'month',
        interval_count: 1,
        usage_type: 'licensed',
        meter: null,
        trial_period_days: null,
      } as Stripe.Price.Recurring,
    };
    expect(pricePlan(price)).toBe('pro');
    expect(pricePlan({ ...price, id: 'unknown' })).toBe('free');
    expect(pricePlan({ ...price, currency: 'usd' })).toBe('free');
    expect(pricePlan({ ...price, unit_amount: 100 })).toBe('free');
    expect(pricePlan({ ...price, recurring: { ...price.recurring, interval: 'year' } })).toBe(
      'free',
    );
  });
});
