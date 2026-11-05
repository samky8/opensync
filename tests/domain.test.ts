import { describe, it, expect } from 'vitest';
import {
  defaultSchedule,
  getStatus,
  scheduleSchema,
  entitled,
  retryDelay,
  validateEntitlements,
  localDate,
  replaceException,
  resetWidgetToDefaults,
} from '../src/lib/domain';
describe('business-local schedules', () => {
  it('does not invent a closing at the edge of the lookup window', () => {
    const s = defaultSchedule();
    s.weekly = s.weekly.map(() => [
      { open: '00:00', close: '12:00' },
      { open: '12:00', close: '00:00' },
    ]);
    expect(getStatus(s, new Date('2026-11-02T15:00:00Z')).next).toBeNull();
    s.exceptions = [
      { id: 'holiday', start: '2026-12-25', end: '2026-12-25', label: 'Holiday', intervals: [] },
    ];
    expect(getStatus(s, new Date('2026-11-02T15:00:00Z')).next).toBe('2026-12-25T05:00:00Z');
  });
  it('finds the next opening after a closure longer than a week', () => {
    const s = defaultSchedule();
    s.exceptions = [
      { id: 'break', start: '2026-11-01', end: '2026-11-20', label: 'Break', intervals: [] },
    ];
    expect(getStatus(s, new Date('2026-11-02T15:00:00Z')).next).toBe('2026-11-21T14:00:00Z');
  });
  it('includes overnight carry in today’s displayed hours', () => {
    const s = defaultSchedule();
    s.weekly[0] = [{ open: '20:00', close: '02:00' }];
    expect(getStatus(s, new Date('2026-11-03T06:00:00Z')).today[0]).toEqual({
      open: '00:00',
      close: '02:00',
    });
  });
  it('updates today inside a longer exception without losing surrounding dates', () => {
    const s = defaultSchedule();
    s.exceptions = [
      { id: 'week', start: '2026-11-01', end: '2026-11-05', label: 'Holiday week', intervals: [] },
    ];
    const updated = replaceException(s, {
      id: 'today',
      start: '2026-11-03',
      end: '2026-11-03',
      label: 'Special opening',
      intervals: [{ open: '10:00', close: '12:00' }],
    });
    expect(updated.exceptions.map((e) => [e.start, e.end])).toEqual([
      ['2026-11-01', '2026-11-02'],
      ['2026-11-04', '2026-11-05'],
      ['2026-11-03', '2026-11-03'],
    ]);
    expect(scheduleSchema.safeParse(updated).success).toBe(true);
  });
  it('opens on regular days and closes at the boundary', () => {
    const s = defaultSchedule();
    expect(getStatus(s, new Date('2026-11-02T14:00:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-11-02T22:00:00Z')).open).toBe(false);
  });
  it('stays closed on closed days', () =>
    expect(getStatus(defaultSchedule(), new Date('2026-11-01T17:00:00Z')).open).toBe(false));
  it('handles overnight intervals from the previous date', () => {
    const s = defaultSchedule();
    s.weekly[0] = [{ open: '20:00', close: '02:00' }];
    expect(getStatus(s, new Date('2026-11-03T06:00:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-11-03T07:00:00Z')).open).toBe(false);
  });
  it('a holiday closure overrides the normal week and overnight carry-over', () => {
    const s = defaultSchedule();
    s.weekly[0] = [{ open: '20:00', close: '02:00' }];
    s.exceptions = [
      { id: 'holiday', start: '2026-11-03', end: '2026-11-03', label: 'Holiday', intervals: [] },
    ];
    expect(getStatus(s, new Date('2026-11-03T06:00:00Z')).open).toBe(false);
    expect(getStatus(s, new Date('2026-11-03T17:00:00Z')).open).toBe(false);
    expect(getStatus(s, new Date('2026-11-04T17:00:00Z')).open).toBe(true);
  });
  it('special closing time wins and weekly hours resume tomorrow', () => {
    const s = defaultSchedule();
    s.exceptions = [
      {
        id: 'early',
        start: '2026-11-02',
        end: '2026-11-02',
        label: 'Early',
        intervals: [{ open: '09:00', close: '14:00' }],
      },
    ];
    expect(getStatus(s, new Date('2026-11-02T18:59:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-11-02T19:00:00Z')).open).toBe(false);
    expect(getStatus(s, new Date('2026-11-03T20:00:00Z')).open).toBe(true);
  });
  it('uses the business date rather than UTC date', () =>
    expect(localDate('America/Los_Angeles', new Date('2026-11-03T03:00:00Z'))).toBe('2026-11-02'));
  it('handles spring DST gap with compatible disambiguation', () => {
    const s = defaultSchedule();
    s.weekly[6] = [{ open: '01:00', close: '04:00' }];
    expect(getStatus(s, new Date('2026-03-08T07:30:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-03-08T08:00:00Z')).open).toBe(false);
  });
  it('keeps an interval open across both autumn repeated hours', () => {
    const s = defaultSchedule();
    s.weekly[6] = [{ open: '00:00', close: '03:00' }];
    expect(getStatus(s, new Date('2026-11-01T05:30:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-11-01T06:30:00Z')).open).toBe(true);
    expect(getStatus(s, new Date('2026-11-01T08:00:00Z')).open).toBe(false);
  });
  it('merges adjacent periods for an accurate next closing time', () => {
    const s = defaultSchedule();
    s.weekly[0] = [
      { open: '09:00', close: '12:00' },
      { open: '12:00', close: '17:00' },
    ];
    expect(getStatus(s, new Date('2026-11-02T15:00:00Z')).next).toBe('2026-11-02T22:00:00Z');
  });
  it('rejects overlaps across days and week boundaries', () => {
    const s = defaultSchedule();
    s.weekly[6] = [{ open: '23:00', close: '10:00' }];
    expect(scheduleSchema.safeParse(s).success).toBe(false);
  });
  it('rejects overlapping exceptions, impossible dates and unsafe links', () => {
    const s = defaultSchedule();
    s.exceptions = [
      { id: 'a', start: '2026-12-25', end: '2026-12-26', label: 'A', intervals: [] },
      { id: 'b', start: '2026-12-26', end: '2026-12-27', label: 'B', intervals: [] },
    ];
    expect(scheduleSchema.safeParse(s).success).toBe(false);
    s.exceptions = [];
    s.website = 'javascript:alert(1)';
    expect(scheduleSchema.safeParse(s).success).toBe(false);
  });
});
describe('announcements', () => {
  const s = defaultSchedule();
  s.announcements = [
    {
      id: 'a',
      title: 'Test',
      message: 'Hello',
      type: 'information',
      start: '2026-11-02T15:00:00.000Z',
      end: '2026-11-02T16:00:00.000Z',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ];
  it('does not show future announcements', () =>
    expect(getStatus(s, new Date('2026-11-02T14:59:00Z')).announcement).toBeNull());
  it('activates on schedule and expires without mutation or timers', () => {
    expect(getStatus(s, new Date('2026-11-02T15:30:00Z')).announcement?.message).toBe('Hello');
    expect(getStatus(s, new Date('2026-11-02T16:00:00Z')).announcement).toBeNull();
    expect(getStatus(s, new Date('2026-11-03T15:00:00Z')).announcement).toBeNull();
  });
  it('rejects premium scheduling for Free while preserving existing data', () => {
    expect(() =>
      validateEntitlements(s, defaultSchedule(), 'free', new Date('2026-11-02T14:00:00Z')),
    ).toThrow(/require Pro/);
    expect(() => validateEntitlements(s, s, 'free')).not.toThrow();
    expect(() => validateEntitlements(s, defaultSchedule(), 'pro')).not.toThrow();
  });
});
describe('entitlements and retries', () => {
  it('enforces plan capabilities', () => {
    expect(entitled('free', 'google')).toBe(false);
    expect(entitled('pro', 'google')).toBe(true);
    expect(entitled('pro', 'locations')).toBe(false);
    expect(entitled('business', 'team')).toBe(true);
  });
  it('uses bounded exponential backoff', () => {
    expect([1, 2, 3, 20].map(retryDelay)).toEqual([30, 60, 120, 3600]);
  });
  it('keeps branding locked for new Free changes', () => {
    const original = defaultSchedule(),
      next = structuredClone(original);
    next.widget.accent = '#000000';
    expect(() => validateEntitlements(next, original, 'free')).toThrow(/requires Pro/);
  });
  it('lets downgraded accounts restore Free defaults without changing business data', () => {
    const previous = defaultSchedule('Keep my business');
    previous.widget.accent = '#123456';
    previous.widget.theme = 'dark';
    previous.widget.placement = 'floating';
    previous.widget.dismissible = false;
    const reset = resetWidgetToDefaults(previous);
    expect(reset.widget).toEqual(defaultSchedule().widget);
    expect({ ...reset, widget: previous.widget }).toEqual(previous);
    expect(previous.widget.accent).toBe('#123456');
    expect(() => validateEntitlements(reset, previous, 'free')).not.toThrow();
    const partial = { ...previous, widget: { ...previous.widget, accent: '#4f46e5' } };
    expect(() => validateEntitlements(partial, previous, 'free')).toThrow(/requires Pro/);
  });
});
