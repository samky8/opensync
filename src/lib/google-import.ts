import { Temporal } from '@js-temporal/polyfill';
import { days, scheduleSchema, type Schedule } from './domain';
type GoogleTime = { hours?: number; minutes?: number };
type GoogleDate = { year: number; month: number; day: number };
export type GoogleHours = {
  regularHours?: {
    periods?: { openDay: string; openTime: GoogleTime; closeDay: string; closeTime: GoogleTime }[];
  };
  specialHours?: {
    specialHourPeriods?: {
      startDate: GoogleDate;
      endDate?: GoogleDate;
      closed?: boolean;
      openTime?: GoogleTime;
      closeTime?: GoogleTime;
    }[];
  };
};
export function importGoogleHours(remote: GoogleHours, draft: Schedule): Schedule {
  const unsupported = () =>
    new Error(
      'Google includes hours that cannot be represented safely. Review and enter these hours manually.',
    );
  const clock = (t?: GoogleTime) => {
    if (
      !t ||
      (t.hours ?? 0) < 0 ||
      (t.hours ?? 0) > 23 ||
      (t.minutes ?? 0) < 0 ||
      (t.minutes ?? 0) > 59
    )
      throw unsupported();
    return `${String(t.hours ?? 0).padStart(2, '0')}:${String(t.minutes ?? 0).padStart(2, '0')}`;
  };
  const date = (d: GoogleDate) => Temporal.PlainDate.from(d).toString();
  const weekly: Schedule['weekly'] = days.map(() => []);
  for (const p of remote.regularHours?.periods || []) {
    const index = days.findIndex((d) => d.toUpperCase() === p.openDay),
      open = clock(p.openTime),
      close = clock(p.closeTime);
    if (
      index < 0 ||
      open === close ||
      days[(index + (close < open ? 1 : 0)) % 7].toUpperCase() !== p.closeDay
    )
      throw unsupported();
    weekly[index].push({ open, close });
  }
  const grouped = new Map<string, Schedule['exceptions'][number]>();
  for (const p of remote.specialHours?.specialHourPeriods || []) {
    const start = date(p.startDate),
      end = p.endDate ? date(p.endDate) : start;
    const item = grouped.get(start) || {
      id: `google-${start}`,
      start,
      end: start,
      label: 'Imported from Google',
      intervals: [],
    };
    if (p.closed) {
      if (end !== start || item.intervals.length) throw unsupported();
      item.label = 'Imported Google closure';
    } else {
      const open = clock(p.openTime),
        close = clock(p.closeTime),
        expectedEnd = Temporal.PlainDate.from(start)
          .add({ days: close < open ? 1 : 0 })
          .toString();
      if (open === close || end !== expectedEnd || item.label === 'Imported Google closure')
        throw unsupported();
      item.intervals.push({ open, close });
    }
    grouped.set(start, item);
  }
  return scheduleSchema.parse({ ...draft, weekly, exceptions: [...grouped.values()] });
}
