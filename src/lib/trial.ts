import type { Plan } from './domain';

export type ProTrial = {
  status: 'available' | 'active' | 'expired' | 'unavailable';
  endsAt: string | null;
};

export type AccountBilling = {
  plan: Plan;
  trial: ProTrial;
  hasBillingCustomer: boolean;
  complimentaryBusiness: boolean;
  paymentNeedsAttention: boolean;
};

export const freeAccountBilling: AccountBilling = {
  plan: 'free',
  trial: { status: 'available', endsAt: null },
  hasBillingCustomer: false,
  complimentaryBusiness: false,
  paymentNeedsAttention: false,
};

export const proTrialFeatures = [
  'Scheduled announcements and automatic expiry',
  'Custom widget colours, branding and layout',
  'All three website widgets and unlimited hours updates',
  'Social post and story creation',
];
