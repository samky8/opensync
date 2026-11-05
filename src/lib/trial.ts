export type ProTrial = {
  status: 'available' | 'active' | 'expired' | 'unavailable';
  endsAt: string | null;
};

export const proTrialFeatures = [
  'Scheduled announcements and automatic expiry',
  'Custom widget colours, branding and layout',
  'All three website widgets and unlimited hours updates',
  'Social post and story creation',
];
