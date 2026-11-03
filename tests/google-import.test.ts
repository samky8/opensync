import { it, expect } from 'vitest';
import { importGoogleHours } from '../src/lib/google-import';
import { defaultSchedule } from '../src/lib/domain';
it('imports overnight regular and special hours without changing unrelated local fields', () => {
  const s = importGoogleHours(
    {
      regularHours: {
        periods: [
          {
            openDay: 'MONDAY',
            openTime: { hours: 20 },
            closeDay: 'TUESDAY',
            closeTime: { hours: 2 },
          },
        ],
      },
      specialHours: {
        specialHourPeriods: [
          {
            startDate: { year: 2026, month: 12, day: 24 },
            endDate: { year: 2026, month: 12, day: 25 },
            openTime: { hours: 20 },
            closeTime: { hours: 2 },
          },
        ],
      },
    },
    defaultSchedule('Local name'),
  );
  expect(s.name).toBe('Local name');
  expect(s.weekly[0]).toEqual([{ open: '20:00', close: '02:00' }]);
  expect(s.exceptions[0].intervals).toEqual([{ open: '20:00', close: '02:00' }]);
});
it('rejects multi-day or full-day Google intervals instead of shortening them silently', () => {
  for (const closeDay of ['MONDAY', 'WEDNESDAY'])
    expect(() =>
      importGoogleHours(
        {
          regularHours: {
            periods: [
              { openDay: 'MONDAY', openTime: { hours: 9 }, closeDay, closeTime: { hours: 9 } },
            ],
          },
        },
        defaultSchedule(),
      ),
    ).toThrow(/cannot be represented/);
  expect(() =>
    importGoogleHours(
      {
        regularHours: {
          periods: [
            {
              openDay: 'MONDAY',
              openTime: { hours: 9 },
              closeDay: 'TUESDAY',
              closeTime: { hours: 17 },
            },
          ],
        },
      },
      defaultSchedule(),
    ),
  ).toThrow(/cannot be represented/);
});
