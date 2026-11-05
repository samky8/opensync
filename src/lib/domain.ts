import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid time');
export const intervalSchema = z
  .object({ open: time, close: time })
  .refine((x) => x.open !== x.close, 'Opening and closing times must differ');
export type Interval = z.infer<typeof intervalSchema>;
export const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
function intervalsValid(intervals: Interval[]) {
  const ranges = intervals
    .map((i) => [mins(i.open), mins(i.close) + (i.close < i.open ? 1440 : 0)])
    .sort((a, b) => a[0] - b[0]);
  return ranges.every((r, i) => i === 0 || r[0] >= ranges[i - 1][1]);
}
const intervals = z.array(intervalSchema).max(8).refine(intervalsValid, 'Opening periods overlap');
const safeUrl = z.union([
  z.literal(''),
  z.url().refine((s) => /^https?:\/\//.test(s), 'Use an http or https URL'),
]);
export const scheduleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    category: z.string().max(80),
    website: safeUrl,
    address: z.string().max(300),
    logo: z.union([
      safeUrl,
      z
        .string()
        .max(400000)
        .regex(
          /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/,
          'Choose a valid PNG logo',
        ),
    ]),
    timezone: z.string().refine((s) => {
      try {
        Temporal.Now.zonedDateTimeISO(s);
        return true;
      } catch {
        return false;
      }
    }, 'Choose a valid IANA time zone'),
    weekly: z.array(intervals).length(7),
    exceptions: z
      .array(
        z
          .object({
            id: z.string(),
            start: z.iso.date(),
            end: z.iso.date(),
            label: z.string().max(120),
            intervals,
          })
          .refine((x) => x.end >= x.start, 'End date must follow start date'),
      )
      .max(100),
    announcements: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().max(100),
            message: z.string().min(1).max(500),
            type: z.enum(['information', 'warning', 'closure', 'special hours']),
            start: z.iso.datetime(),
            end: z.union([z.iso.datetime(), z.literal('')]),
            enabled: z.boolean(),
            ctaText: z.string().max(60),
            ctaUrl: safeUrl,
          })
          .refine(
            (x) => !x.end || Date.parse(x.end) > Date.parse(x.start),
            'Expiry must be after activation',
          ),
      )
      .max(50),
    widget: z.object({
      accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
      theme: z.enum(['light', 'dark']),
      radius: z.number().min(0).max(32),
      showName: z.boolean(),
      compact: z.boolean(),
      font: z.enum(['system', 'serif']),
      alignment: z.enum(['left', 'center']),
      dismissible: z.boolean(),
      placement: z.enum(['inline', 'top', 'floating']),
    }),
  })
  .superRefine((s, ctx) => {
    const ranges = s.weekly.flatMap((ints, d) =>
      ints.map((i) => [
        d * 1440 + mins(i.open),
        d * 1440 + mins(i.close) + (i.close < i.open ? 1440 : 0),
      ]),
    );
    const expanded = [...ranges, ...ranges.map(([a, b]) => [a + 10080, b + 10080])].sort(
      (a, b) => a[0] - b[0],
    );
    if (expanded.some((r, i) => i > 0 && r[0] < expanded[i - 1][1]))
      ctx.addIssue({
        code: 'custom',
        path: ['weekly'],
        message: 'Overnight hours overlap the next day',
      });
    const exc = [...s.exceptions].sort((a, b) => a.start.localeCompare(b.start));
    if (exc.some((e, i) => i > 0 && e.start <= exc[i - 1].end))
      ctx.addIssue({
        code: 'custom',
        path: ['exceptions'],
        message: 'Special-hour date ranges overlap',
      });
  });
export type Schedule = z.infer<typeof scheduleSchema>;
export function replaceException(
  schedule: Schedule,
  replacement: Schedule['exceptions'][number],
  previousId?: string,
): Schedule {
  const exceptions: Schedule['exceptions'] = [];
  for (const item of schedule.exceptions) {
    if (item.id === previousId) continue;
    if (item.end < replacement.start || item.start > replacement.end) {
      exceptions.push(item);
      continue;
    }
    if (item.start < replacement.start)
      exceptions.push({
        ...item,
        end: Temporal.PlainDate.from(replacement.start).subtract({ days: 1 }).toString(),
      });
    if (item.end > replacement.end)
      exceptions.push({
        ...item,
        id: `${item.id}-after-${replacement.end}`,
        start: Temporal.PlainDate.from(replacement.end).add({ days: 1 }).toString(),
      });
  }
  return { ...schedule, exceptions: [...exceptions, replacement] };
}
export const defaultSchedule = (
  name = 'Your business',
  timezone = 'America/Toronto',
): Schedule => ({
  name,
  timezone,
  category: 'Café',
  website: '',
  address: '',
  logo: '',
  weekly: days.map((_, i) => (i === 6 ? [] : [{ open: '09:00', close: '17:00' }])),
  exceptions: [],
  announcements: [],
  widget: {
    accent: '#4f46e5',
    theme: 'light',
    radius: 16,
    showName: true,
    compact: false,
    font: 'system',
    alignment: 'left',
    dismissible: true,
    placement: 'inline',
  },
});
export function localDate(timezone: string, now = new Date()) {
  return Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}
export function dayIntervals(s: Schedule, date: string) {
  const exception = s.exceptions.find((e) => e.start <= date && e.end >= date);
  return exception ? exception.intervals : s.weekly[Temporal.PlainDate.from(date).dayOfWeek - 1];
}
export function formatTime(time: string) {
  const h = Number(time.slice(0, 2));
  return `${h % 12 || 12}:${time.slice(3)} ${h >= 12 ? 'PM' : 'AM'}`;
}
export function formatIntervals(ints: Interval[]) {
  return ints.length
    ? ints
        .map(
          (i) =>
            `${formatTime(i.open)} – ${formatTime(i.close)}${i.close < i.open ? ' (+1 day)' : ''}`,
        )
        .join(', ')
    : 'Closed';
}
export function getStatus(s: Schedule, now = new Date()) {
  const instant = Temporal.Instant.from(now.toISOString()),
    date = instant.toZonedDateTimeISO(s.timezone).toPlainDate();
  const spans: { start: Temporal.Instant; end: Temporal.Instant }[] = [];
  const candidateDates = new Set<string>();
  for (let offset = -1; offset <= 8; offset++)
    candidateDates.add(date.add({ days: offset }).toString());
  for (const exception of s.exceptions) {
    if (exception.end < date.toString()) continue;
    if (exception.start >= date.toString()) {
      candidateDates.add(exception.start);
      candidateDates.add(Temporal.PlainDate.from(exception.start).subtract({ days: 1 }).toString());
    }
    for (let offset = 0; offset <= 7; offset++)
      candidateDates.add(Temporal.PlainDate.from(exception.end).add({ days: offset }).toString());
  }
  const spanCache = new Map<string, typeof spans>();
  function spansFor(ds: string) {
    const cached = spanCache.get(ds);
    if (cached) return cached;
    const result: typeof spans = [];
    const d = Temporal.PlainDate.from(ds);
    for (const i of dayIntervals(s, ds)) {
      const endDate = i.close < i.open ? d.add({ days: 1 }) : d;
      const start = Temporal.ZonedDateTime.from(`${d}T${i.open}[${s.timezone}]`, {
        disambiguation: 'compatible',
      }).toInstant();
      let end = Temporal.ZonedDateTime.from(`${endDate}T${i.close}[${s.timezone}]`, {
        disambiguation: 'compatible',
      }).toInstant();
      // An explicit next-day exception overrides an overnight carry-over at midnight.
      if (
        i.close < i.open &&
        s.exceptions.some((e) => e.start <= endDate.toString() && e.end >= endDate.toString())
      )
        end = Temporal.ZonedDateTime.from(`${endDate}T00:00[${s.timezone}]`).toInstant();
      result.push({ start, end });
    }
    spanCache.set(ds, result);
    return result;
  }
  for (const ds of [...candidateDates].sort()) spans.push(...spansFor(ds));
  spans.sort((a, b) => Temporal.Instant.compare(a.start, b.start));
  const merged: typeof spans = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && Temporal.Instant.compare(span.start, last.end) <= 0) {
      if (Temporal.Instant.compare(span.end, last.end) > 0) last.end = span.end;
    } else merged.push({ ...span });
  }
  const active = merged.find(
    (x) =>
      Temporal.Instant.compare(x.start, instant) <= 0 &&
      Temporal.Instant.compare(instant, x.end) < 0,
  );
  // Test actual local state at each candidate boundary, so a finite search window
  // never fabricates a closing time for adjacent or continuously open periods.
  const boundaries = [...new Set(spans.flatMap((x) => [x.start.toString(), x.end.toString()]))]
    .map((x) => Temporal.Instant.from(x))
    .filter((x) => Temporal.Instant.compare(x, instant) > 0)
    .sort(Temporal.Instant.compare);
  const next = boundaries.find((boundary) => {
    const day = boundary.toZonedDateTimeISO(s.timezone).toPlainDate();
    const localSpans = [
      ...spansFor(day.toString()),
      ...spansFor(day.subtract({ days: 1 }).toString()),
    ];
    const open = localSpans.some(
      (x) =>
        Temporal.Instant.compare(x.start, boundary) <= 0 &&
        Temporal.Instant.compare(boundary, x.end) < 0,
    );
    return open !== !!active;
  });
  const announcement =
    s.announcements
      .filter(
        (a) =>
          a.enabled &&
          Date.parse(a.start) <= now.getTime() &&
          (!a.end || Date.parse(a.end) > now.getTime()),
      )
      .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))[0] || null;
  const today = dayIntervals(s, date.toString());
  const carries = s.exceptions.some((e) => e.start <= date.toString() && e.end >= date.toString())
    ? []
    : dayIntervals(s, date.subtract({ days: 1 }).toString())
        .filter((i) => i.close < i.open && i.close !== '00:00')
        .map((i) => ({ open: '00:00', close: i.close }));
  return {
    open: !!active,
    date: date.toString(),
    today: [...carries, ...today],
    next: next?.toString() || null,
    nextLabel: next
      ? `${active ? 'Closes' : 'Opens'} ${new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(next.toString()))}`
      : active
        ? 'Open with no scheduled closing'
        : 'No upcoming opening hours',
    announcement,
  };
}
export type Plan = 'free' | 'pro' | 'business';
// PostgreSQL JSONB reorders object keys; equality must be semantic, not insertion-order dependent.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function entitled(
  plan: Plan,
  feature: 'google' | 'scheduling' | 'branding' | 'locations' | 'team',
) {
  return feature === 'locations' || feature === 'team' ? plan === 'business' : plan !== 'free';
}
export function retryDelay(attempt: number) {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
}
export function validateEntitlements(
  next: Schedule,
  previous: Schedule,
  plan: Plan,
  now = new Date(),
) {
  if (plan !== 'free') return;
  if (
    canonical(next.widget) !== canonical(previous.widget) &&
    canonical(next.widget) !== canonical(defaultSchedule().widget)
  )
    throw new Error(
      'Widget customization requires Pro. Reset to Free defaults to save and publish.',
    );
  for (const a of next.announcements) {
    const old = previous.announcements.find((x) => x.id === a.id);
    if (canonical(a) !== canonical(old) && (a.end || Date.parse(a.start) > now.getTime() + 60000))
      throw new Error('Scheduled announcements and automatic expiry require Pro.');
  }
}
export function resetWidgetToDefaults(schedule: Schedule): Schedule {
  return { ...schedule, widget: defaultSchedule().widget };
}
