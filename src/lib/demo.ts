import { defaultSchedule, type Schedule } from './domain';
export const demoSchedule: Schedule = {
  ...defaultSchedule('Juniper & Oak'),
  category: 'Coffee shop',
  address: '120 Wellington Street, Ottawa',
  weekly: [
    ...Array.from({ length: 5 }, () => [{ open: '07:00', close: '18:00' }]),
    [{ open: '08:00', close: '17:00' }],
    [{ open: '08:00', close: '16:00' }],
  ],
  exceptions: [
    {
      id: 'demo-holiday',
      start: '2026-12-25',
      end: '2026-12-25',
      label: 'Christmas Day',
      intervals: [],
    },
  ],
  announcements: [
    {
      id: 'demo-welcome',
      title: 'A little more time for coffee',
      message: 'Our winter menu is here. Come in, warm up, and find your new favourite.',
      type: 'information',
      start: '2026-01-01T00:00:00.000Z',
      end: '2027-01-01T00:00:00.000Z',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ],
};
