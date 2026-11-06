import { defaultSchedule, days, formatIntervals, type Schedule } from './domain';

export const publishScopes = [
  'hours',
  'special',
  'announcements',
  'widgets',
  'settings',
  'all',
] as const;
export type PublishScope = (typeof publishScopes)[number];
export const scopeLabels: Record<PublishScope, string> = {
  hours: 'opening hours',
  special: 'special hours',
  announcements: 'announcements',
  widgets: 'website widgets',
  settings: 'business settings',
  all: 'all updates',
};
const fields: Record<PublishScope, (keyof Schedule)[]> = {
  hours: ['weekly'],
  special: ['exceptions'],
  announcements: ['announcements'],
  widgets: ['widget'],
  settings: ['name', 'category', 'website', 'address', 'logo', 'timezone'],
  all: [
    'name',
    'category',
    'website',
    'address',
    'logo',
    'timezone',
    'weekly',
    'exceptions',
    'announcements',
    'widget',
  ],
};
export function scopedSchedule(
  draft: Schedule,
  published: Schedule | null | undefined,
  scope: PublishScope,
): Schedule {
  const baseline = published || {
    ...defaultSchedule(draft.name, draft.timezone),
    weekly: days.map(() => []),
    category: '',
  };
  return {
    ...baseline,
    ...Object.fromEntries(fields[scope].map((field) => [field, draft[field]])),
  };
}
export function publishChanges(
  draft: Schedule,
  published: Schedule | null | undefined,
  scope: PublishScope,
) {
  const rows: { label: string; before: string; after: string }[] = [];
  const add = (label: string, before: string, after: string) => {
    if (before !== after) rows.push({ label, before, after });
  };
  for (const field of fields[scope]) {
    if (field === 'weekly') {
      draft.weekly.forEach((hours, i) =>
        add(
          days[i],
          published ? formatIntervals(published.weekly[i]) : 'Not published',
          formatIntervals(hours),
        ),
      );
    } else if (field === 'exceptions' || field === 'announcements') {
      const previous = published?.[field] || [];
      const next = draft[field];
      for (const id of new Set([...previous, ...next].map((item) => item.id))) {
        const before = previous.find((item) => item.id === id);
        const after = next.find((item) => item.id === id);
        const describe = (item: typeof before) =>
          !item
            ? ''
            : 'intervals' in item
              ? `${item.label} · ${item.start} – ${item.end} · ${formatIntervals(item.intervals)}`
              : `${item.title}: ${item.message} · ${item.enabled ? 'Enabled' : 'Disabled'} · ${item.start}${item.end ? ` – ${item.end}` : ''}${item.ctaText ? ` · ${item.ctaText}: ${item.ctaUrl}` : ''}`;
        add(
          field === 'exceptions' ? 'Holidays & exceptions' : 'Announcement',
          describe(before),
          describe(after),
        );
      }
    } else if (field === 'widget') {
      for (const key of Object.keys(draft.widget) as (keyof Schedule['widget'])[])
        add(key, String(published?.widget[key] ?? ''), String(draft.widget[key]));
    } else
      add(
        field,
        field === 'logo'
          ? published?.logo
            ? 'Previous logo'
            : ''
          : String(published?.[field] ?? ''),
        field === 'logo'
          ? draft.logo === published?.logo
            ? draft.logo
              ? 'Previous logo'
              : ''
            : draft.logo
              ? 'New logo'
              : ''
          : String(draft[field]),
      );
  }
  return rows;
}
