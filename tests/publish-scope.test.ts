import { describe, expect, it } from 'vitest';
import {
  customizeWidget,
  defaultSchedule,
  formatIntervals,
  scheduleSchema,
  validateEntitlements,
  widgetAppearanceFor,
} from '../src/lib/domain';
import { publishChanges, scopedSchedule } from '../src/lib/publish-scope';
describe('page-specific publication', () => {
  it('publishes hours without including unrelated drafts', () => {
    const published = defaultSchedule('Cafe');
    const draft = structuredClone(published);
    draft.weekly[0] = [{ open: '10:00', close: '18:00' }];
    draft.name = 'Unpublished name';
    draft.exceptions = [
      { id: 'holiday', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    const snapshot = scopedSchedule(draft, published, 'hours');
    expect(snapshot.weekly).toEqual(draft.weekly);
    expect(snapshot.name).toBe(published.name);
    expect(snapshot.exceptions).toEqual([]);
    expect(publishChanges(draft, published, 'hours')).toEqual([
      {
        label: 'Monday',
        before: formatIntervals(published.weekly[0]),
        after: formatIntervals(draft.weekly[0]),
      },
    ]);
  });
  it('does not include unrelated content in first publication', () => {
    const draft = defaultSchedule('Cafe');
    draft.exceptions = [
      { id: 'a', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    expect(scopedSchedule(draft, null, 'hours').exceptions).toEqual([]);
    expect(scopedSchedule(draft, null, 'special').weekly).toEqual(
      Array.from({ length: 7 }, () => []),
    );
  });
  it('reviews removed special hours', () => {
    const published = defaultSchedule();
    published.exceptions = [
      { id: 'a', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    expect(publishChanges({ ...published, exceptions: [] }, published, 'special')[0]).toMatchObject(
      { after: '' },
    );
  });
  it('reviews announcements with a readable local date and no status prefix', () => {
    const published = defaultSchedule();
    const draft = structuredClone(published);
    draft.timezone = 'America/Toronto';
    draft.announcements = [
      {
        id: 'late-night',
        title: 'Open late tonight!',
        message: 'Open late tonight!',
        type: 'information',
        start: '2026-11-17T15:55:13.350Z',
        end: '',
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];

    expect(publishChanges(draft, published, 'announcements')).toEqual([
      {
        label: 'Website update',
        before: '',
        after: 'Open late tonight! (Tuesday, November 17)',
      },
    ]);
  });
  it('reviews an announcement removed from the website', () => {
    const published = defaultSchedule();
    published.announcements = [
      {
        id: 'live',
        title: 'Today only',
        message: 'Open late tonight!',
        type: 'information',
        start: '2026-11-17T15:55:13.350Z',
        end: '',
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];
    const draft = structuredClone(published);
    draft.announcements[0].enabled = false;

    expect(publishChanges(draft, published, 'announcements')[0]).toMatchObject({
      before: expect.not.stringContaining('Hidden from website'),
      after: expect.stringContaining('Hidden from website'),
    });
  });
  it('publishes website widget visibility with widget settings', () => {
    const published = defaultSchedule();
    const draft = structuredClone(published);
    draft.widgetVisibility.banner = false;
    const snapshot = scopedSchedule(draft, published, 'widgets');
    expect(snapshot.widgetVisibility.banner).toBe(false);
    expect(publishChanges(draft, published, 'widgets')).toContainEqual({
      label: 'Banner widget',
      before: 'Visible',
      after: 'Hidden',
    });
  });
  it('publishes widget-specific appearance without affecting other widgets', () => {
    const published = defaultSchedule();
    const draft = scheduleSchema.parse({
      ...published,
      widget: customizeWidget(published.widget, 'status', { showBranding: false }),
    });
    expect(() => validateEntitlements(draft, published, 'free')).toThrow(/requires Pro/);
    const snapshot = scopedSchedule(draft, published, 'widgets');
    expect(widgetAppearanceFor(snapshot.widget, 'status').showBranding).toBe(false);
    expect(widgetAppearanceFor(snapshot.widget, 'hours').showBranding).toBe(true);
    expect(publishChanges(draft, published, 'widgets')).toContainEqual({
      label: 'Status · OpenSync branding',
      before: 'Visible',
      after: 'Hidden',
    });
  });
});
